-- 売上集計更新RPC関数作成
-- Convex Actionから呼び出される集計更新用関数

-- 日別集計更新関数
CREATE OR REPLACE FUNCTION increment_daily_sales(
  p_tenant_id TEXT,
  p_org_id TEXT, 
  p_business_date TEXT,
  p_amount NUMERIC
) RETURNS VOID 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO daily_sales_summary (tenant_id, org_id, business_date, total_amount, booking_count)
  VALUES (p_tenant_id, p_org_id, p_business_date::date, p_amount, 1)
  ON CONFLICT (tenant_id, org_id, business_date)
  DO UPDATE SET
    total_amount = daily_sales_summary.total_amount + p_amount,
    booking_count = daily_sales_summary.booking_count + 1,
    updated_at = NOW();
END;
$$;

-- スタッフ別集計更新関数  
CREATE OR REPLACE FUNCTION increment_staff_sales(
  p_tenant_id TEXT,
  p_org_id TEXT,
  p_staff_id TEXT,
  p_staff_name TEXT,
  p_amount NUMERIC,
  p_date TEXT
) RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO staff_sales_summary (tenant_id, org_id, staff_id, staff_name, total_amount, booking_count, last_booking_date)
  VALUES (p_tenant_id, p_org_id, p_staff_id, p_staff_name, p_amount, 1, p_date::date)
  ON CONFLICT (tenant_id, org_id, staff_id)
  DO UPDATE SET
    total_amount = staff_sales_summary.total_amount + p_amount,
    booking_count = staff_sales_summary.booking_count + 1,
    last_booking_date = GREATEST(staff_sales_summary.last_booking_date, p_date::date),
    staff_name = COALESCE(p_staff_name, staff_sales_summary.staff_name),
    updated_at = NOW();
END;
$$;

-- メニュー別集計更新関数
CREATE OR REPLACE FUNCTION increment_menu_sales(
  p_tenant_id TEXT,
  p_org_id TEXT,
  p_menu_id TEXT,
  p_menu_name TEXT,
  p_amount NUMERIC,
  p_count INTEGER
) RETURNS VOID
SECURITY DEFINER
SET search_path = public  
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO menu_sales_summary (tenant_id, org_id, menu_id, menu_name, total_amount, booking_count)
  VALUES (p_tenant_id, p_org_id, p_menu_id, p_menu_name, p_amount, p_count)
  ON CONFLICT (tenant_id, org_id, menu_id)
  DO UPDATE SET
    total_amount = menu_sales_summary.total_amount + p_amount,
    booking_count = menu_sales_summary.booking_count + p_count,
    menu_name = COALESCE(p_menu_name, menu_sales_summary.menu_name),
    updated_at = NOW();
END;
$$;

-- 重複防止付き統合集計更新関数（オプション）
CREATE OR REPLACE FUNCTION increment_sales_with_guard(
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
  result JSONB := '{"status": "success", "operations": []}';
  op_log JSONB[] := '{}';
BEGIN
  -- 重複チェック
  IF EXISTS (SELECT 1 FROM sales_aggregation_log WHERE reservation_id = p_reservation_id) THEN
    RETURN '{"status": "duplicate", "message": "Already processed"}';
  END IF;
  
  -- ログ記録
  INSERT INTO sales_aggregation_log (reservation_id, tenant_id, org_id, total_amount)
  VALUES (p_reservation_id, p_tenant_id, p_org_id, p_amount);
  
  -- 日別集計更新
  PERFORM increment_daily_sales(p_tenant_id, p_org_id, p_business_date, p_amount);
  op_log := array_append(op_log, '{"table": "daily_sales_summary", "amount": ' || p_amount || '}');
  
  -- スタッフ別集計更新
  IF p_staff_id IS NOT NULL THEN
    PERFORM increment_staff_sales(p_tenant_id, p_org_id, p_staff_id, p_staff_name, p_amount, p_business_date);
    op_log := array_append(op_log, '{"table": "staff_sales_summary", "staff_id": "' || p_staff_id || '"}');
  END IF;
  
  -- メニュー別集計更新
  IF p_menus IS NOT NULL THEN
    WITH menu_items AS (
      SELECT 
        m.id,
        m.name,
        (m.price::numeric) * (m.quantity::int) as amount,
        m.quantity::int as count
      FROM jsonb_to_recordset(p_menus) AS m(id text, name text, price text, quantity text)
    )
    INSERT INTO menu_sales_summary (tenant_id, org_id, menu_id, menu_name, total_amount, booking_count)
    SELECT p_tenant_id, p_org_id, id, name, amount, count FROM menu_items
    ON CONFLICT (tenant_id, org_id, menu_id)
    DO UPDATE SET
      total_amount = menu_sales_summary.total_amount + EXCLUDED.total_amount,
      booking_count = menu_sales_summary.booking_count + EXCLUDED.booking_count,
      updated_at = NOW();
      
    op_log := array_append(op_log, '{"table": "menu_sales_summary", "menu_count": ' || jsonb_array_length(p_menus) || '}');
  END IF;
  
  result := jsonb_set(result, '{operations}', to_jsonb(op_log));
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- エラー時はログ削除してロールバック
  DELETE FROM sales_aggregation_log WHERE reservation_id = p_reservation_id;
  RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$;

-- Service Role Keyに実行権限付与
GRANT EXECUTE ON FUNCTION increment_daily_sales TO service_role;
GRANT EXECUTE ON FUNCTION increment_staff_sales TO service_role;
GRANT EXECUTE ON FUNCTION increment_menu_sales TO service_role;
GRANT EXECUTE ON FUNCTION increment_sales_with_guard TO service_role;

-- 一般ユーザーには実行権限なし（Service Roleのみ）
REVOKE EXECUTE ON FUNCTION increment_daily_sales FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION increment_staff_sales FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION increment_menu_sales FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION increment_sales_with_guard FROM PUBLIC;