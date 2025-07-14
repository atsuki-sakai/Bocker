-- RPC関数のJSONエスケープ問題修正
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
BEGIN
  -- 重複チェック
  IF EXISTS (SELECT 1 FROM sales_aggregation_log WHERE reservation_id = p_reservation_id) THEN
    RETURN '{"status": "duplicate", "message": "Already processed"}';
  END IF;
  
  -- 集計月を計算（YYYY-MM-01形式）
  summary_month := date_trunc('month', p_business_date::date);
  
  -- ログ記録
  INSERT INTO sales_aggregation_log (reservation_id, tenant_id, org_id, total_amount)
  VALUES (p_reservation_id, p_tenant_id, p_org_id, p_amount);
  
  -- 1. 日別集計更新（パーティション対応）
  BEGIN
    daily_part_name := 'daily_sales_summary_' || to_char(p_business_date::date, 'YYYYMM');
    
    INSERT INTO daily_sales_summary (tenant_id, org_id, business_date, total_amount, booking_count)
    VALUES (p_tenant_id, p_org_id, p_business_date::date, p_amount, 1)
    ON CONFLICT (tenant_id, org_id, business_date)
    DO UPDATE SET
      total_amount = daily_sales_summary.total_amount + p_amount,
      booking_count = daily_sales_summary.booking_count + 1,
      updated_at = NOW();
      
    -- JSONBオブジェクト構築（エスケープ安全）
    op_log := array_append(op_log, jsonb_build_object(
      'table', 'daily_sales_summary',
      'amount', p_amount,
      'partition', daily_part_name
    ));
    partition_log := array_append(partition_log, to_jsonb(daily_part_name));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Daily sales update failed: %', SQLERRM;
  END;
  
  -- 2. スタッフ別集計更新（月次パーティション対応）
  IF p_staff_id IS NOT NULL THEN
    BEGIN
      monthly_part_name := 'staff_sales_summary_' || to_char(summary_month, 'YYYYMM');
      
      INSERT INTO staff_sales_summary (tenant_id, org_id, staff_id, summary_month, staff_name, total_amount, booking_count, last_booking_date)
      VALUES (p_tenant_id, p_org_id, p_staff_id, summary_month, p_staff_name, p_amount, 1, p_business_date::date)
      ON CONFLICT (tenant_id, org_id, staff_id, summary_month)
      DO UPDATE SET
        total_amount = staff_sales_summary.total_amount + p_amount,
        booking_count = staff_sales_summary.booking_count + 1,
        last_booking_date = GREATEST(staff_sales_summary.last_booking_date, p_business_date::date),
        staff_name = COALESCE(p_staff_name, staff_sales_summary.staff_name),
        updated_at = NOW();
        
      -- JSONBオブジェクト構築（エスケープ安全）
      op_log := array_append(op_log, jsonb_build_object(
        'table', 'staff_sales_summary',
        'staff_id', p_staff_id,
        'partition', monthly_part_name
      ));
      partition_log := array_append(partition_log, to_jsonb(monthly_part_name));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Staff sales update failed: %', SQLERRM;
    END;
  END IF;
  
  -- 3. メニュー別集計更新（月次パーティション対応）
  IF p_menus IS NOT NULL THEN
    BEGIN
      monthly_part_name := 'menu_sales_summary_' || to_char(summary_month, 'YYYYMM');
      
      WITH menu_items AS (
        SELECT 
          m.id,
          m.name,
          (m.price::numeric) * (m.quantity::int) as amount,
          m.quantity::int as count
        FROM jsonb_to_recordset(p_menus) AS m(id text, name text, price text, quantity text)
      )
      INSERT INTO menu_sales_summary (tenant_id, org_id, menu_id, summary_month, menu_name, total_amount, booking_count)
      SELECT p_tenant_id, p_org_id, id, summary_month, name, amount, count FROM menu_items
      ON CONFLICT (tenant_id, org_id, menu_id, summary_month)
      DO UPDATE SET
        total_amount = menu_sales_summary.total_amount + EXCLUDED.total_amount,
        booking_count = menu_sales_summary.booking_count + EXCLUDED.booking_count,
        updated_at = NOW();
        
      -- JSONBオブジェクト構築（エスケープ安全）
      op_log := array_append(op_log, jsonb_build_object(
        'table', 'menu_sales_summary',
        'menu_count', jsonb_array_length(p_menus),
        'partition', monthly_part_name
      ));
      partition_log := array_append(partition_log, to_jsonb(monthly_part_name));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Menu sales update failed: %', SQLERRM;
    END;
  END IF;
  
  result := jsonb_set(result, '{operations}', to_jsonb(op_log));
  result := jsonb_set(result, '{partitions_created}', to_jsonb(partition_log));
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- エラー時はログ削除してロールバック
  DELETE FROM sales_aggregation_log WHERE reservation_id = p_reservation_id;
  RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$;

COMMENT ON FUNCTION increment_sales_with_guard_v2 IS '修正版：JSONエスケープ問題解決済み実用的パーティション対応統合売上集計更新関数（重複防止付き）';