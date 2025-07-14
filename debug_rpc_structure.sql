-- RPC関数の現在の構造と問題を詳細デバッグ

-- 1. 現在のRPC関数の存在確認
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type,
    prosrc as source_preview
FROM pg_proc 
WHERE proname IN ('get_aggregated_staff_sales', 'get_aggregated_menu_sales')
ORDER BY proname;

-- 2. RPC関数の詳細情報を取得
\df+ get_aggregated_staff_sales

-- 3. staff_sales_summaryテーブルの構造確認
\d+ staff_sales_summary

-- 4. 実際のサンプルデータ確認（最初の3件）
SELECT 
    staff_id,
    staff_name,
    summary_month,
    total_amount,
    booking_count,
    last_booking_date,
    created_at,
    updated_at
FROM staff_sales_summary 
LIMIT 3;

-- 5. 現在のRPC関数を直接テスト実行（エラー詳細確認）
DO $$
DECLARE
    result_record RECORD;
    error_msg TEXT;
BEGIN
    BEGIN
        -- テスト実行（実際のtenant_id, org_idに置き換えてください）
        SELECT * INTO result_record 
        FROM get_aggregated_staff_sales('test_tenant', 'test_org', '2025-01-01', '2025-01-31', NULL) 
        LIMIT 1;
        
        RAISE NOTICE 'RPC関数実行成功: %', result_record;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RAISE NOTICE 'RPC関数エラー: %', error_msg;
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
        RAISE NOTICE 'PG_EXCEPTION_DETAIL: %', PG_EXCEPTION_DETAIL;
    END;
END $$;

-- 6. 関数の戻り値型を詳細確認
SELECT 
    a.attname as column_name,
    t.typname as data_type,
    a.attnotnull as not_null,
    a.attnum as column_order
FROM pg_proc p
JOIN pg_type rt ON p.prorettype = rt.oid
JOIN pg_class c ON rt.typrelid = c.oid
JOIN pg_attribute a ON c.oid = a.attrelid
JOIN pg_type t ON a.atttypid = t.oid
WHERE p.proname = 'get_aggregated_staff_sales'
    AND a.attnum > 0
    AND NOT a.attisdropped
ORDER BY a.attnum;

-- 7. 期待される戻り値型と現在の型の比較
WITH expected_columns AS (
    SELECT unnest(ARRAY['staff_id', 'staff_name', 'total_amount', 'booking_count', 'average_amount', 'last_booking_date', 'created_at', 'updated_at']) as col_name,
           unnest(ARRAY['text', 'text', 'numeric', 'integer', 'numeric', 'date', 'timestamp with time zone', 'timestamp with time zone']) as expected_type
),
actual_columns AS (
    SELECT 
        a.attname as col_name,
        t.typname as actual_type,
        a.attnum
    FROM pg_proc p
    JOIN pg_type rt ON p.prorettype = rt.oid
    JOIN pg_class c ON rt.typrelid = c.oid
    JOIN pg_attribute a ON c.oid = a.attrelid
    JOIN pg_type t ON a.atttypid = t.oid
    WHERE p.proname = 'get_aggregated_staff_sales'
        AND a.attnum > 0
        AND NOT a.attisdropped
)
SELECT 
    COALESCE(e.col_name, a.col_name) as column_name,
    e.expected_type,
    a.actual_type,
    CASE 
        WHEN e.expected_type = a.actual_type THEN 'OK'
        WHEN e.expected_type IS NULL THEN 'EXTRA_COLUMN'
        WHEN a.actual_type IS NULL THEN 'MISSING_COLUMN'
        ELSE 'TYPE_MISMATCH'
    END as status
FROM expected_columns e
FULL OUTER JOIN actual_columns a ON e.col_name = a.col_name
ORDER BY COALESCE(a.attnum, 999);

-- 8. 問題の原因を特定するための包括的チェック
SELECT 
    'RPC function status check' as check_type,
    CASE 
        WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_aggregated_staff_sales') 
        THEN 'EXISTS' 
        ELSE 'NOT_EXISTS' 
    END as status,
    (SELECT COUNT(*) FROM pg_proc WHERE proname = 'get_aggregated_staff_sales') as function_count;

-- 9. Supabase RPC呼び出しの実際のテスト
-- 注意: この部分は実際のtenant_idとorg_idに置き換えて実行してください
/*
SELECT 'Direct RPC call test' as test_name;
SELECT * FROM get_aggregated_staff_sales('actual_tenant_id', 'actual_org_id', '2025-01-15', '2025-01-21', NULL);
*/

COMMENT ON FUNCTION get_aggregated_staff_sales IS 'Debug: Function structure investigation completed';
SELECT 'RPC function structure debug completed. Check the results above.' as debug_status;