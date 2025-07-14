-- 全分析パーティションテーブルの完全クリーンアップ
-- 対象: 日別売上、週別売上、スタッフ売上、メニュー売上の全パーティション

-- ============================================================================
-- 1. 現在の状況確認
-- ============================================================================

-- 全パーティションテーブルの一覧と状況
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size
FROM pg_tables 
WHERE (
    tablename LIKE 'daily_sales_summary_%' OR 
    tablename LIKE 'weekly_sales_summary_%' OR
    tablename LIKE 'staff_sales_summary_%' OR
    tablename LIKE 'menu_sales_summary_%'
)
AND schemaname = 'public'
ORDER BY tablename;

-- メインテーブルのレコード数確認（テーブルが存在する場合のみ）
DO $$
BEGIN
    -- daily_sales_summary の確認
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'daily_sales_summary') THEN
        RAISE NOTICE 'daily_sales_summary records: %', (SELECT COUNT(*) FROM daily_sales_summary);
    ELSE
        RAISE NOTICE 'daily_sales_summary table does not exist';
    END IF;
    
    -- weekly_sales_summary の確認
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'weekly_sales_summary') THEN
        RAISE NOTICE 'weekly_sales_summary records: %', (SELECT COUNT(*) FROM weekly_sales_summary);
    ELSE
        RAISE NOTICE 'weekly_sales_summary table does not exist';
    END IF;
    
    -- staff_sales_summary の確認
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'staff_sales_summary') THEN
        RAISE NOTICE 'staff_sales_summary records: %', (SELECT COUNT(*) FROM staff_sales_summary);
    ELSE
        RAISE NOTICE 'staff_sales_summary table does not exist';
    END IF;
    
    -- menu_sales_summary の確認
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'menu_sales_summary') THEN
        RAISE NOTICE 'menu_sales_summary records: %', (SELECT COUNT(*) FROM menu_sales_summary);
    ELSE
        RAISE NOTICE 'menu_sales_summary table does not exist';
    END IF;
END $$;

-- ============================================================================
-- 2. 全データ削除実行（必要な場合はコメントアウトを解除）
-- ============================================================================

/*
-- 全パーティションデータ削除
DO $$
DECLARE
    partition_name TEXT;
    deleted_count INTEGER;
    total_deleted INTEGER := 0;
BEGIN
    RAISE NOTICE '=== 全パーティションデータ削除開始 ===';
    
    -- 日別売上サマリーパーティション削除
    FOR partition_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'daily_sales_summary_%'
        AND schemaname = 'public'
    LOOP
        EXECUTE 'SELECT COUNT(*) FROM ' || partition_name INTO deleted_count;
        EXECUTE 'DELETE FROM ' || partition_name;
        total_deleted := total_deleted + deleted_count;
        RAISE NOTICE 'Deleted % records from: %', deleted_count, partition_name;
    END LOOP;
    
    -- 週別売上サマリーパーティション削除
    FOR partition_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'weekly_sales_summary_%'
        AND schemaname = 'public'
    LOOP
        EXECUTE 'SELECT COUNT(*) FROM ' || partition_name INTO deleted_count;
        EXECUTE 'DELETE FROM ' || partition_name;
        total_deleted := total_deleted + deleted_count;
        RAISE NOTICE 'Deleted % records from: %', deleted_count, partition_name;
    END LOOP;
    
    -- スタッフ売上サマリーパーティション削除
    FOR partition_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'staff_sales_summary_%'
        AND schemaname = 'public'
    LOOP
        EXECUTE 'SELECT COUNT(*) FROM ' || partition_name INTO deleted_count;
        EXECUTE 'DELETE FROM ' || partition_name;
        total_deleted := total_deleted + deleted_count;
        RAISE NOTICE 'Deleted % records from: %', deleted_count, partition_name;
    END LOOP;
    
    -- メニュー売上サマリーパーティション削除
    FOR partition_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'menu_sales_summary_%'
        AND schemaname = 'public'
    LOOP
        EXECUTE 'SELECT COUNT(*) FROM ' || partition_name INTO deleted_count;
        EXECUTE 'DELETE FROM ' || partition_name;
        total_deleted := total_deleted + deleted_count;
        RAISE NOTICE 'Deleted % records from: %', deleted_count, partition_name;
    END LOOP;
    
    RAISE NOTICE '=== 削除完了: 合計 % レコード削除 ===', total_deleted;
END $$;
*/

-- ============================================================================
-- 3. 特定条件での削除（必要に応じて使用）
-- ============================================================================

-- 特定テナント・組織のデータ削除
/*
DELETE FROM daily_sales_summary WHERE tenant_id = 'your-tenant-id' AND org_id = 'your-org-id';
DELETE FROM weekly_sales_summary WHERE tenant_id = 'your-tenant-id' AND org_id = 'your-org-id';
DELETE FROM staff_sales_summary WHERE tenant_id = 'your-tenant-id' AND org_id = 'your-org-id';
DELETE FROM menu_sales_summary WHERE tenant_id = 'your-tenant-id' AND org_id = 'your-org-id';
*/

-- 特定期間のデータ削除
/*
DELETE FROM daily_sales_summary WHERE sales_date >= '2024-01-01' AND sales_date <= '2024-12-31';
DELETE FROM weekly_sales_summary WHERE week_start_date >= '2024-01-01' AND week_start_date <= '2024-12-31';
DELETE FROM staff_sales_summary WHERE sales_date >= '2024-01-01' AND sales_date <= '2024-12-31';
DELETE FROM menu_sales_summary WHERE sales_date >= '2024-01-01' AND sales_date <= '2024-12-31';
*/

-- ============================================================================
-- 4. 削除後の処理
-- ============================================================================

-- 統計情報更新
ANALYZE daily_sales_summary;
ANALYZE weekly_sales_summary;
ANALYZE staff_sales_summary;
ANALYZE menu_sales_summary;

-- 削除後の状況確認
DO $$
BEGIN
    RAISE NOTICE '=== 削除後の状況確認 ===';
    
    -- daily_sales_summary の確認
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'daily_sales_summary') THEN
        RAISE NOTICE 'daily_sales_summary remaining records: %', (SELECT COUNT(*) FROM daily_sales_summary);
    END IF;
    
    -- weekly_sales_summary の確認
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'weekly_sales_summary') THEN
        RAISE NOTICE 'weekly_sales_summary remaining records: %', (SELECT COUNT(*) FROM weekly_sales_summary);
    END IF;
    
    -- staff_sales_summary の確認
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'staff_sales_summary') THEN
        RAISE NOTICE 'staff_sales_summary remaining records: %', (SELECT COUNT(*) FROM staff_sales_summary);
    END IF;
    
    -- menu_sales_summary の確認
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'menu_sales_summary') THEN
        RAISE NOTICE 'menu_sales_summary remaining records: %', (SELECT COUNT(*) FROM menu_sales_summary);
    END IF;
END $$;

-- 最終的なパーティション状況確認
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size
FROM pg_tables 
WHERE (
    tablename LIKE 'daily_sales_summary%' OR 
    tablename LIKE 'weekly_sales_summary%' OR
    tablename LIKE 'staff_sales_summary%' OR
    tablename LIKE 'menu_sales_summary%'
)
AND schemaname = 'public'
ORDER BY tablename;

-- 完了メッセージ
SELECT 'パーティションクリーンアップスクリプト実行完了' as status;