-- 全分析パーティションテーブルのテストデータ削除スクリプト
-- 注意: このスクリプトは全てのテストデータを削除します。本番環境では実行しないでください。
-- 対象: 日別売上、週別売上、スタッフ売上、メニュー売上の全パーティションテーブル

-- 1. 日別売上サマリーパーティションテーブルのデータ削除
DO $$
DECLARE
    partition_name TEXT;
BEGIN
    RAISE NOTICE '=== 日別売上サマリーパーティション削除開始 ===';
    FOR partition_name IN 
        SELECT schemaname||'.'||tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'daily_sales_summary_%'
        AND schemaname = 'public'
    LOOP
        EXECUTE 'DELETE FROM ' || partition_name;
        RAISE NOTICE 'Deleted data from partition: %', partition_name;
    END LOOP;
END $$;

-- 2. 週別売上サマリーパーティションテーブルのデータ削除
DO $$
DECLARE
    partition_name TEXT;
BEGIN
    RAISE NOTICE '=== 週別売上サマリーパーティション削除開始 ===';
    FOR partition_name IN 
        SELECT schemaname||'.'||tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'weekly_sales_summary_%'
        AND schemaname = 'public'
    LOOP
        EXECUTE 'DELETE FROM ' || partition_name;
        RAISE NOTICE 'Deleted data from partition: %', partition_name;
    END LOOP;
END $$;

-- 3. スタッフ売上サマリーパーティションテーブルのデータ削除
DO $$
DECLARE
    partition_name TEXT;
BEGIN
    RAISE NOTICE '=== スタッフ売上サマリーパーティション削除開始 ===';
    FOR partition_name IN 
        SELECT schemaname||'.'||tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'staff_sales_summary_%'
        AND schemaname = 'public'
    LOOP
        EXECUTE 'DELETE FROM ' || partition_name;
        RAISE NOTICE 'Deleted data from partition: %', partition_name;
    END LOOP;
END $$;

-- 4. メニュー売上サマリーパーティションテーブルのデータ削除
DO $$
DECLARE
    partition_name TEXT;
BEGIN
    RAISE NOTICE '=== メニュー売上サマリーパーティション削除開始 ===';
    FOR partition_name IN 
        SELECT schemaname||'.'||tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'menu_sales_summary_%'
        AND schemaname = 'public'
    LOOP
        EXECUTE 'DELETE FROM ' || partition_name;
        RAISE NOTICE 'Deleted data from partition: %', partition_name;
    END LOOP;
END $$;

-- 5. メインテーブルからも削除（パーティション経由で削除されるが念のため）
DELETE FROM daily_sales_summary WHERE created_at IS NOT NULL;
DELETE FROM weekly_sales_summary WHERE created_at IS NOT NULL;
DELETE FROM staff_sales_summary WHERE created_at IS NOT NULL;
DELETE FROM menu_sales_summary WHERE created_at IS NOT NULL;

-- 6. パーティション統計を更新
ANALYZE daily_sales_summary;
ANALYZE weekly_sales_summary;
ANALYZE staff_sales_summary;
ANALYZE menu_sales_summary;

-- 7. 削除結果の確認
SELECT 
    'daily_sales_summary' as table_name,
    COUNT(*) as remaining_records
FROM daily_sales_summary
UNION ALL
SELECT 
    'weekly_sales_summary' as table_name,
    COUNT(*) as remaining_records
FROM weekly_sales_summary
UNION ALL
SELECT 
    'staff_sales_summary' as table_name,
    COUNT(*) as remaining_records
FROM staff_sales_summary
UNION ALL
SELECT 
    'menu_sales_summary' as table_name,
    COUNT(*) as remaining_records
FROM menu_sales_summary;

-- 8. 全パーティション一覧の確認
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE (
    tablename LIKE 'daily_sales_summary_%' OR 
    tablename LIKE 'weekly_sales_summary_%' OR
    tablename LIKE 'staff_sales_summary_%' OR
    tablename LIKE 'menu_sales_summary_%'
)
AND schemaname = 'public'
ORDER BY tablename;

RAISE NOTICE '全分析パーティションテーブルのテストデータ削除が完了しました。';