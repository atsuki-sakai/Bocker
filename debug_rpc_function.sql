-- デバッグ用RPC関数（詳細ログ付き）
CREATE OR REPLACE FUNCTION debug_increment_sales_v2(
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
  result JSONB := '{"status": "success", "debug_info": [], "operations": [], "partitions_created": []}';
  debug_log JSONB[] := '{}';
  op_log JSONB[] := '{}';
  partition_log JSONB[] := '{}';
  daily_part_name text;
  monthly_part_name text;
  summary_month date;
  error_msg text;
BEGIN
  debug_log := array_append(debug_log, ('{"step": "start", "staff_id": "' || COALESCE(p_staff_id, 'NULL') || '", "menus_provided": ' || CASE WHEN p_menus IS NOT NULL THEN 'true' ELSE 'false' END || '}')::jsonb);
  
  -- 重複チェック
  IF EXISTS (SELECT 1 FROM sales_aggregation_log WHERE reservation_id = p_reservation_id) THEN
    RETURN '{"status": "duplicate", "message": "Already processed"}';
  END IF;
  
  -- 集計月を計算（YYYY-MM-01形式）
  summary_month := date_trunc('month', p_business_date::date);
  debug_log := array_append(debug_log, ('{"step": "summary_month_calculated", "summary_month": "' || summary_month || '"}')::jsonb);
  
  -- ログ記録
  INSERT INTO sales_aggregation_log (reservation_id, tenant_id, org_id, total_amount)
  VALUES (p_reservation_id, p_tenant_id, p_org_id, p_amount);
  debug_log := array_append(debug_log, ('{"step": "log_recorded"}')::jsonb);
  
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
      
    op_log := array_append(op_log, ('{"table": "daily_sales_summary", "amount": ' || p_amount || ', "partition": "' || daily_part_name || '"}')::jsonb);
    partition_log := array_append(partition_log, ('"' || daily_part_name || '"')::jsonb);
    debug_log := array_append(debug_log, ('{"step": "daily_sales_completed"}')::jsonb);
  EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;
    debug_log := array_append(debug_log, ('{"step": "daily_sales_error", "error": "' || error_msg || '"}')::jsonb);
    RAISE WARNING 'Daily sales update failed: %', error_msg;
  END;
  
  -- 2. スタッフ別集計更新（月次パーティション対応）
  debug_log := array_append(debug_log, ('{"step": "staff_check_start", "staff_id_is_null": ' || (p_staff_id IS NULL)::text || '}')::jsonb);
  
  IF p_staff_id IS NOT NULL THEN
    BEGIN
      monthly_part_name := 'staff_sales_summary_' || to_char(summary_month, 'YYYYMM');
      debug_log := array_append(debug_log, ('{"step": "staff_partition_name", "partition": "' || monthly_part_name || '"}')::jsonb);
      
      INSERT INTO staff_sales_summary (tenant_id, org_id, staff_id, summary_month, staff_name, total_amount, booking_count, last_booking_date)
      VALUES (p_tenant_id, p_org_id, p_staff_id, summary_month, p_staff_name, p_amount, 1, p_business_date::date)
      ON CONFLICT (tenant_id, org_id, staff_id, summary_month)
      DO UPDATE SET
        total_amount = staff_sales_summary.total_amount + p_amount,
        booking_count = staff_sales_summary.booking_count + 1,
        last_booking_date = GREATEST(staff_sales_summary.last_booking_date, p_business_date::date),
        staff_name = COALESCE(p_staff_name, staff_sales_summary.staff_name),
        updated_at = NOW();
        
      op_log := array_append(op_log, ('{"table": "staff_sales_summary", "staff_id": "' || p_staff_id || '", "partition": "' || monthly_part_name || '"}')::jsonb);
      partition_log := array_append(partition_log, ('"' || monthly_part_name || '"')::jsonb);
      debug_log := array_append(debug_log, ('{"step": "staff_sales_completed"}')::jsonb);
    EXCEPTION WHEN OTHERS THEN
      error_msg := SQLERRM;
      debug_log := array_append(debug_log, ('{"step": "staff_sales_error", "error": "' || error_msg || '"}')::jsonb);
      RAISE WARNING 'Staff sales update failed: %', error_msg;
    END;
  ELSE
    debug_log := array_append(debug_log, ('{"step": "staff_sales_skipped", "reason": "staff_id_is_null"}')::jsonb);
  END IF;
  
  -- 3. メニュー別集計更新（月次パーティション対応）
  debug_log := array_append(debug_log, ('{"step": "menu_check_start", "menus_is_null": ' || (p_menus IS NULL)::text || '}')::jsonb);
  
  IF p_menus IS NOT NULL THEN
    BEGIN
      monthly_part_name := 'menu_sales_summary_' || to_char(summary_month, 'YYYYMM');
      debug_log := array_append(debug_log, ('{"step": "menu_partition_name", "partition": "' || monthly_part_name || '"}')::jsonb);
      
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
        
      op_log := array_append(op_log, ('{"table": "menu_sales_summary", "menu_count": ' || jsonb_array_length(p_menus) || ', "partition": "' || monthly_part_name || '"}')::jsonb);
      partition_log := array_append(partition_log, ('"' || monthly_part_name || '"')::jsonb);
      debug_log := array_append(debug_log, ('{"step": "menu_sales_completed"}')::jsonb);
    EXCEPTION WHEN OTHERS THEN
      error_msg := SQLERRM;
      debug_log := array_append(debug_log, ('{"step": "menu_sales_error", "error": "' || error_msg || '"}')::jsonb);
      RAISE WARNING 'Menu sales update failed: %', error_msg;
    END;
  ELSE
    debug_log := array_append(debug_log, ('{"step": "menu_sales_skipped", "reason": "menus_is_null"}')::jsonb);
  END IF;
  
  result := jsonb_set(result, '{operations}', to_jsonb(op_log));
  result := jsonb_set(result, '{partitions_created}', to_jsonb(partition_log));
  result := jsonb_set(result, '{debug_info}', to_jsonb(debug_log));
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- エラー時はログ削除してロールバック
  DELETE FROM sales_aggregation_log WHERE reservation_id = p_reservation_id;
  debug_log := array_append(debug_log, ('{"step": "global_error", "error": "' || SQLERRM || '"}')::jsonb);
  result := jsonb_build_object('status', 'error', 'message', SQLERRM, 'debug_info', debug_log);
  RETURN result;
END;
$$;