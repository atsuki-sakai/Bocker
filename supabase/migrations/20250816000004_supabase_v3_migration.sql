-- increment_sales_with_guard_v3: 差額配賦版売上集計関数
-- オプション・指名料・割引をメニューに按分配賦して集計の整合性を確保
-- 
-- 使用方法:
-- このSQLファイルをSupabaseのSQL Editorで実行してください
-- 既存のincrement_sales_with_guard_v2と併存可能な設計です

CREATE OR REPLACE FUNCTION public.increment_sales_with_guard_v3(
  p_reservation_id text, 
  p_tenant_id text, 
  p_org_id text, 
  p_business_date text, 
  p_amount numeric, 
  p_staff_id text DEFAULT NULL, 
  p_staff_name text DEFAULT NULL, 
  p_menus jsonb DEFAULT NULL,
  p_options jsonb DEFAULT NULL,
  p_extra_charge numeric DEFAULT 0,
  p_coupon_discount numeric DEFAULT 0,
  p_use_points numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB := '{"status": "success", "operations": [], "partitions_created": []}';
  op_log JSONB[] := '{}';
  partition_log JSONB[] := '{}';
  daily_part_name text;
  monthly_part_name text;
  summary_month_var date;
  business_date_parsed date;
  
  -- 配賦計算用変数
  menu_subtotal numeric := 0;
  option_subtotal numeric := 0;
  total_extra_amount numeric := 0; -- オプション+指名料+割引の合計
  allocation_ratio numeric := 1.0;
BEGIN
  -- 重複チェック
  IF EXISTS (SELECT 1 FROM sales_aggregation_log WHERE reservation_id = p_reservation_id) THEN
    RETURN '{"status": "duplicate", "message": "Already processed"}';
  END IF;

  -- 日付解析
  business_date_parsed := p_business_date::date;
  summary_month_var := date_trunc('month', business_date_parsed);

  -- ログ記録
  INSERT INTO sales_aggregation_log (reservation_id, tenant_id, org_id, total_amount)
  VALUES (p_reservation_id, p_tenant_id, p_org_id, p_amount);

  -- 1. 日別集計更新（従来通り）
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
      'partition', daily_part_name
    ));
    partition_log := array_append(partition_log, to_jsonb(daily_part_name));
  EXCEPTION WHEN OTHERS THEN
    DELETE FROM sales_aggregation_log WHERE reservation_id = p_reservation_id;
    RETURN jsonb_build_object('status', 'error', 'operation', 'daily_sales', 'message', SQLERRM);
  END;

  -- 2. スタッフ別集計更新（従来通り）
  IF p_staff_id IS NOT NULL AND p_staff_id != '' THEN
    BEGIN
      monthly_part_name := 'staff_sales_summary_' || to_char(summary_month_var, 'YYYYMM');

      INSERT INTO staff_sales_summary (tenant_id, org_id, staff_id, summary_month, staff_name, total_amount, booking_count, last_booking_date, created_at, updated_at)
      VALUES (p_tenant_id, p_org_id, p_staff_id, summary_month_var, p_staff_name, p_amount, 1, business_date_parsed, NOW(), NOW())
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
        'partition', monthly_part_name
      ));
      partition_log := array_append(partition_log, to_jsonb(monthly_part_name));
    EXCEPTION WHEN OTHERS THEN
      DELETE FROM sales_aggregation_log WHERE reservation_id = p_reservation_id;
      RETURN jsonb_build_object('status', 'error', 'operation', 'staff_sales', 'message', SQLERRM);
    END;
  END IF;

  -- 3. メニュー別集計更新（配賦ロジック付き）
  IF p_menus IS NOT NULL AND jsonb_array_length(p_menus) > 0 THEN
    BEGIN
      monthly_part_name := 'menu_sales_summary_' || to_char(summary_month_var, 'YYYYMM');

      -- メニュー基本金額合計を計算
      SELECT COALESCE(SUM((m.price::numeric) * (m.quantity::int)), 0)
      INTO menu_subtotal
      FROM jsonb_to_recordset(p_menus) AS m(id text, name text, price text, quantity text)
      WHERE m.id IS NOT NULL AND m.id != '';

      -- オプション金額合計を計算
      IF p_options IS NOT NULL AND jsonb_array_length(p_options) > 0 THEN
        SELECT COALESCE(SUM((o.price::numeric) * (o.quantity::int)), 0)
        INTO option_subtotal
        FROM jsonb_to_recordset(p_options) AS o(id text, name text, price text, quantity text)
        WHERE o.id IS NOT NULL AND o.id != '';
      END IF;

      -- 追加料金の合計（オプション + 指名料 - 割引）
      total_extra_amount := option_subtotal + COALESCE(p_extra_charge, 0) - COALESCE(p_coupon_discount, 0) - COALESCE(p_use_points, 0);

      -- 配賦比率計算（p_amount ÷ menu_subtotal）
      IF menu_subtotal > 0 THEN
        allocation_ratio := p_amount / menu_subtotal;
      END IF;

      -- メニューごとに配賦した金額で集計
      WITH menu_items AS (
        SELECT
          m.id as menu_id,
          m.name as menu_name,
          (m.price::numeric) * (m.quantity::int) as base_amount,
          m.quantity::int as item_count,
          -- 配賦後の金額（基本金額 × 配賦比率）
          ((m.price::numeric) * (m.quantity::int)) * allocation_ratio as allocated_amount
        FROM jsonb_to_recordset(p_menus) AS m(id text, name text, price text, quantity text)
        WHERE m.id IS NOT NULL AND m.id != ''
      )
      INSERT INTO menu_sales_summary (tenant_id, org_id, menu_id, summary_month, menu_name, total_amount, booking_count, created_at, updated_at)
      SELECT
        p_tenant_id,
        p_org_id,
        menu_id,
        summary_month_var,
        menu_name,
        allocated_amount, -- 配賦済み金額
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
        'menu_subtotal', menu_subtotal,
        'option_subtotal', option_subtotal,
        'total_extra_amount', total_extra_amount,
        'allocation_ratio', allocation_ratio,
        'partition', monthly_part_name
      ));
      partition_log := array_append(partition_log, to_jsonb(monthly_part_name));
    EXCEPTION WHEN OTHERS THEN
      DELETE FROM sales_aggregation_log WHERE reservation_id = p_reservation_id;
      RETURN jsonb_build_object('status', 'error', 'operation', 'menu_sales', 'message', SQLERRM);
    END;
  END IF;

  result := jsonb_set(result, '{operations}', to_jsonb(op_log));
  result := jsonb_set(result, '{partitions_created}', to_jsonb(partition_log));
  RETURN result;

EXCEPTION WHEN OTHERS THEN
  DELETE FROM sales_aggregation_log WHERE reservation_id = p_reservation_id;
  RETURN jsonb_build_object('status', 'error', 'operation', 'global', 'message', SQLERRM);
END;
$function$;

-- テスト用デバッグ関数
CREATE OR REPLACE FUNCTION public.debug_increment_sales_v3(
  p_reservation_id text, 
  p_tenant_id text, 
  p_org_id text, 
  p_business_date text, 
  p_amount numeric, 
  p_staff_id text DEFAULT NULL, 
  p_staff_name text DEFAULT NULL, 
  p_menus jsonb DEFAULT NULL,
  p_options jsonb DEFAULT NULL,
  p_extra_charge numeric DEFAULT 0,
  p_coupon_discount numeric DEFAULT 0,
  p_use_points numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB := '{"status": "debug", "debug_info": [], "calculations": {}}';
  debug_log JSONB[] := '{}';
  menu_subtotal numeric := 0;
  option_subtotal numeric := 0;
  total_extra_amount numeric := 0;
  allocation_ratio numeric := 1.0;
BEGIN
  -- デバッグ開始
  debug_log := array_append(debug_log, jsonb_build_object(
    'step', 'start',
    'p_amount', p_amount,
    'menus_count', CASE WHEN p_menus IS NOT NULL THEN jsonb_array_length(p_menus) ELSE 0 END,
    'options_count', CASE WHEN p_options IS NOT NULL THEN jsonb_array_length(p_options) ELSE 0 END
  ));

  -- メニュー基本金額合計を計算
  IF p_menus IS NOT NULL AND jsonb_array_length(p_menus) > 0 THEN
    SELECT COALESCE(SUM((m.price::numeric) * (m.quantity::int)), 0)
    INTO menu_subtotal
    FROM jsonb_to_recordset(p_menus) AS m(id text, name text, price text, quantity text)
    WHERE m.id IS NOT NULL AND m.id != '';
    
    debug_log := array_append(debug_log, jsonb_build_object(
      'step', 'menu_calculation',
      'menu_subtotal', menu_subtotal
    ));
  END IF;

  -- オプション金額合計を計算
  IF p_options IS NOT NULL AND jsonb_array_length(p_options) > 0 THEN
    SELECT COALESCE(SUM((o.price::numeric) * (o.quantity::int)), 0)
    INTO option_subtotal
    FROM jsonb_to_recordset(p_options) AS o(id text, name text, price text, quantity text)
    WHERE o.id IS NOT NULL AND o.id != '';
    
    debug_log := array_append(debug_log, jsonb_build_object(
      'step', 'option_calculation',
      'option_subtotal', option_subtotal
    ));
  END IF;

  -- 追加料金の合計計算
  total_extra_amount := option_subtotal + COALESCE(p_extra_charge, 0) - COALESCE(p_coupon_discount, 0) - COALESCE(p_use_points, 0);
  
  -- 配賦比率計算
  IF menu_subtotal > 0 THEN
    allocation_ratio := p_amount / menu_subtotal;
  END IF;

  debug_log := array_append(debug_log, jsonb_build_object(
    'step', 'final_calculation',
    'total_extra_amount', total_extra_amount,
    'allocation_ratio', allocation_ratio,
    'expected_menu_total_after_allocation', menu_subtotal * allocation_ratio
  ));

  -- 計算結果をまとめる
  result := jsonb_set(result, '{debug_info}', to_jsonb(debug_log));
  result := jsonb_set(result, '{calculations}', jsonb_build_object(
    'p_amount', p_amount,
    'menu_subtotal', menu_subtotal,
    'option_subtotal', option_subtotal,
    'extra_charge', COALESCE(p_extra_charge, 0),
    'coupon_discount', COALESCE(p_coupon_discount, 0),
    'use_points', COALESCE(p_use_points, 0),
    'total_extra_amount', total_extra_amount,
    'allocation_ratio', allocation_ratio,
    'difference_check', p_amount - (menu_subtotal + option_subtotal + COALESCE(p_extra_charge, 0) - COALESCE(p_coupon_discount, 0) - COALESCE(p_use_points, 0))
  ));

  RETURN result;
END;
$function$;

-- 使用例とテストケース
/*
-- テスト実行例:
SELECT debug_increment_sales_v3(
  'test_reservation_debug',
  'test_tenant',
  'test_org',
  '2025-01-15',
  15000, -- total_price
  'staff123',
  'Test Staff',
  '[{"id": "menu1", "name": "カット", "price": "5000", "quantity": "1"}, {"id": "menu2", "name": "カラー", "price": "8000", "quantity": "1"}]'::jsonb, -- 合計13000
  '[{"id": "option1", "name": "トリートメント", "price": "1000", "quantity": "1"}]'::jsonb, -- 1000
  500, -- 指名料
  200, -- クーポン割引
  300  -- ポイント使用
);

-- 期待される結果:
-- p_amount: 15000
-- menu_subtotal: 13000 (5000 + 8000)
-- option_subtotal: 1000
-- extra_charge: 500
-- coupon_discount: 200
-- use_points: 300
-- total_extra_amount: 1000 + 500 - 200 - 300 = 1000
-- 実際の合計: 13000 + 1000 = 14000
-- 差額: 15000 - 14000 = 1000 (何かが足りない可能性)
-- allocation_ratio: 15000 / 13000 = 1.1538...

-- 実際の集計実行例:
SELECT increment_sales_with_guard_v3(
  'test_reservation_actual',
  'your_tenant_id',
  'your_org_id',
  '2025-01-15',
  15000,
  'staff123',
  'Test Staff',
  '[{"id": "menu1", "name": "カット", "price": "5000", "quantity": "1"}, {"id": "menu2", "name": "カラー", "price": "8000", "quantity": "1"}]'::jsonb,
  '[{"id": "option1", "name": "トリートメント", "price": "1000", "quantity": "1"}]'::jsonb,
  500,
  200,
  300
);
*/