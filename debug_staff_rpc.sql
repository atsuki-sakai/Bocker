-- スタッフRPC関数のデバッグ用クエリ
-- 実際の戻り値構造を確認

-- 1. get_aggregated_staff_sales関数の定義を確認
SELECT 
    proname as function_name,
    pg_get_function_result(oid) as return_type,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'get_aggregated_staff_sales'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 2. 実際のテーブル構造を確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'staff_sales_summary' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. テスト実行（適切なtenant_id、org_idに置き換えて実行）
-- SELECT * FROM get_aggregated_staff_sales('test_tenant', 'test_org', '2025-01-01', '2025-01-31', NULL) LIMIT 3;

-- 4. staff_sales_summaryテーブルのサンプルデータを確認
SELECT * FROM staff_sales_summary 
WHERE booking_count > 0 
LIMIT 3;