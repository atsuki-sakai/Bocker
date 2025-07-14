-- RPC関数のON CONFLICT処理強化版
CREATE OR REPLACE FUNCTION increment_sales_with_guard_v2(
  p_reservation_id TEXT,
  p_tenant_id TEXT,
  p_org_id TEXT, 
  p_business_date TEXT,
  p_amount NUMERIC,
  p_staff_id TEXT,
  p_staff_name TEXT,
  p_menus JSONB DEFAULT NULL
) RETURNS JSONB 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  result JSONB := '{"status": "success", "operations": [], "partitions_created": []}';
  op_log JSONB[] := '{}';
  partition_log JSONB[] := '{}';
  daily_part_name text;
  monthly_part_name text;
  summary_month date;
  business_date_parsed date;
BEGIN
  -- 重複チェック
  IF EXISTS (SELECT 1 FROM sales_aggregation_log WHERE reservation_id = p_reservation_id) THEN
    RETURN '{"status": "duplicate", "message": "Already processed"}';
  END IF;
  
  -- 日付解析
  business_date_parsed := p_business_date::date;
  summary_month := date_trunc('month', business_date_parsed);
  
  -- ログ記録（重複チェック後）
  INSERT INTO sales_aggregation_log (reservation_id, tenant_id, org_id, total_amount)
  VALUES (p_reservation_id, p_tenant_id, p_org_id, p_amount);
  
  -- 1. 日別集計更新（ON CONFLICT強化）
  BEGIN
    daily_part_name := 'daily_sales_summary_' || to_char(business_date_parsed, 'YYYYMM');
    
    INSERT INTO daily_sales_summary (tenant_id, org_id, business_date, total_amount, booking_count, created_at, updated_at)
    VALUES (p_tenant_id, p_org_id, business_date_parsed, p_amount, 1, NOW(), NOW())
    ON CONFLICT (tenant_id, org_id, business_date)
    DO UPDATE SET
      total_amount = daily_sales_summary.total_amount + EXCLUDED.total_amount,
      booking_count = daily_sales_summary.booking_count + EXCLUDED.booking_count,
      updated_at = NOW();
      
    op_log := array_append(op_log, jsonb_build_object(
      'table', 'daily_sales_summary',
      'amount', p_amount,
      'partition', daily_part_name,
      'action', 'upsert'
    ));
    partition_log := array_append(partition_log, to_jsonb(daily_part_name));
  EXCEPTION WHEN OTHERS THEN
    -- エラー時はログ削除してロールバック
    DELETE FROM sales_aggregation_log WHERE reservation_id = p_reservation_id;
    RETURN jsonb_build_object('status', 'error', 'operation', 'daily_sales', 'message', SQLERRM);
  END;
  
  -- 2. スタッフ別集計更新（ON CONFLICT強化）
  IF p_staff_id IS NOT NULL AND p_staff_id != '' THEN
    BEGIN
      monthly_part_name := 'staff_sales_summary_' || to_char(summary_month, 'YYYYMM');
      
      INSERT INTO staff_sales_summary (tenant_id, org_id, staff_id, summary_month, staff_name, total_amount, booking_count, last_booking_date, created_at, updated_at)
      VALUES (p_tenant_id, p_org_id, p_staff_id, summary_month, p_staff_name, p_amount, 1, business_date_parsed, NOW(), NOW())
      ON CONFLICT (tenant_id, org_id, staff_id, summary_month)
      DO UPDATE SET
        total_amount = staff_sales_summary.total_amount + EXCLUDED.total_amount,
        booking_count = staff_sales_summary.booking_count + EXCLUDED.booking_count,
        last_booking_date = GREATEST(staff_sales_summary.last_booking_date, EXCLUDED.last_booking_date),
        staff_name = COALESCE(EXCLUDED.staff_name, staff_sales_summary.staff_name),
        updated_at = NOW();
        
      op_log := array_append(op_log, jsonb_build_object(
        'table', 'staff_sales_summary',
        'staff_id', p_staff_id,
        'partition', monthly_part_name,
        'action', 'upsert'
      ));
      partition_log := array_append(partition_log, to_jsonb(monthly_part_name));
    EXCEPTION WHEN OTHERS THEN
      -- エラー時はログ削除してロールバック
      DELETE FROM sales_aggregation_log WHERE reservation_id = p_reservation_id;
      RETURN jsonb_build_object('status', 'error', 'operation', 'staff_sales', 'message', SQLERRM);
    END;
  END IF;
  
  -- 3. メニュー別集計更新（ON CONFLICT強化）
  IF p_menus IS NOT NULL AND jsonb_array_length(p_menus) > 0 THEN
    BEGIN
      monthly_part_name := 'menu_sales_summary_' || to_char(summary_month, 'YYYYMM');
      
      WITH menu_items AS (
        SELECT 
          m.id as menu_id,
          m.name as menu_name,
          (m.price::numeric) * (m.quantity::int) as item_amount,
          m.quantity::int as item_count
        FROM jsonb_to_recordset(p_menus) AS m(id text, name text, price text, quantity text)
        WHERE m.id IS NOT NULL AND m.id != ''
      )
      INSERT INTO menu_sales_summary (tenant_id, org_id, menu_id, summary_month, menu_name, total_amount, booking_count, created_at, updated_at)
      SELECT 
        p_tenant_id, 
        p_org_id, 
        menu_id, 
        summary_month, 
        menu_name, 
        item_amount, 
        item_count,
        NOW(),
        NOW()
      FROM menu_items
      ON CONFLICT (tenant_id, org_id, menu_id, summary_month)
      DO UPDATE SET
        total_amount = menu_sales_summary.total_amount + EXCLUDED.total_amount,
        booking_count = menu_sales_summary.booking_count + EXCLUDED.booking_count,
        menu_name = COALESCE(EXCLUDED.menu_name, menu_sales_summary.menu_name),
        updated_at = NOW();
        
      op_log := array_append(op_log, jsonb_build_object(
        'table', 'menu_sales_summary',
        'menu_count', jsonb_array_length(p_menus),
        'partition', monthly_part_name,
        'action', 'upsert'
      ));
      partition_log := array_append(partition_log, to_jsonb(monthly_part_name));
    EXCEPTION WHEN OTHERS THEN
      -- エラー時はログ削除してロールバック
      DELETE FROM sales_aggregation_log WHERE reservation_id = p_reservation_id;
      RETURN jsonb_build_object('status', 'error', 'operation', 'menu_sales', 'message', SQLERRM);
    END;
  END IF;
  
  result := jsonb_set(result, '{operations}', to_jsonb(op_log));
  result := jsonb_set(result, '{partitions_created}', to_jsonb(partition_log));
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- 最終的なエラー処理
  DELETE FROM sales_aggregation_log WHERE reservation_id = p_reservation_id;
  RETURN jsonb_build_object('status', 'error', 'operation', 'global', 'message', SQLERRM);
END;
$$;

COMMENT ON FUNCTION increment_sales_with_guard_v2 IS '最終修正版：ON CONFLICT処理強化、詳細エラーハンドリング付き実用的パーティション対応統合売上集計更新関数';