-- 正しいスキーマに基づくパーティション削除スクリプト
-- 実際のテーブル構造を確認してから作成

-- ============================================================================
-- ステップ1: 現在のデータ状況を確認
-- ============================================================================

-- パーティション一覧と現在のレコード数を確認
WITH partition_info AS (
    SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size
    FROM pg_tables 
    WHERE (
        tablename LIKE 'daily_sales_summary_%' OR 
        tablename LIKE 'staff_sales_summary_%' OR
        tablename LIKE 'menu_sales_summary_%'
    )
    AND schemaname = 'public'
)
SELECT * FROM partition_info ORDER BY tablename;

-- メインテーブルのレコード数確認（実際のカラム名を使用）
SELECT 
    'daily_sales_summary' as table_name,
    COUNT(*) as total_records,
    MIN(business_date) as earliest_date,
    MAX(business_date) as latest_date
FROM daily_sales_summary
UNION ALL
SELECT 
    'staff_sales_summary' as table_name,
    COUNT(*) as total_records,
    MIN(summary_month) as earliest_date,
    MAX(summary_month) as latest_date
FROM staff_sales_summary
UNION ALL
SELECT 
    'menu_sales_summary' as table_name,
    COUNT(*) as total_records,
    MIN(summary_month) as earliest_date,
    MAX(summary_month) as latest_date
FROM menu_sales_summary;

-- ============================================================================
-- ステップ2: 全データ削除実行（必要な場合はコメントアウトを解除）
-- ============================================================================

/*
-- 全パーティションデータ削除
DO $$
DECLARE
    partition_name TEXT;
    deleted_count INTEGER;
    total_deleted INTEGER := 0;
BEGIN
    RAISE NOTICE '=== パーティションデータ削除開始 ===';
    
    -- daily_sales_summary パーティション削除
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
    
    -- staff_sales_summary パーティション削除
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
    
    -- menu_sales_summary パーティション削除
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
-- ステップ3: 特定条件での削除（必要に応じて使用）
-- ============================================================================

-- 特定テナント・組織のデータ削除
/*
DELETE FROM daily_sales_summary WHERE tenant_id = 'your-tenant-id' AND org_id = 'your-org-id';
DELETE FROM staff_sales_summary WHERE tenant_id = 'your-tenant-id' AND org_id = 'your-org-id';
DELETE FROM menu_sales_summary WHERE tenant_id = 'your-tenant-id' AND org_id = 'your-org-id';
*/

-- 特定期間のデータ削除（各テーブルの日付カラムを使用）
/*
DELETE FROM daily_sales_summary WHERE business_date >= '2025-01-01' AND business_date <= '2025-12-31';
DELETE FROM staff_sales_summary WHERE summary_month >= '2025-01-01' AND summary_month <= '2025-12-01';
DELETE FROM menu_sales_summary WHERE summary_month >= '2025-01-01' AND summary_month <= '2025-12-01';
*/

-- ============================================================================
-- ステップ4: 削除後の確認
-- ============================================================================

-- 削除後のレコード数確認
SELECT 
    'daily_sales_summary' as table_name,
    COUNT(*) as remaining_records
FROM daily_sales_summary
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

-- 統計情報更新
ANALYZE daily_sales_summary;
ANALYZE staff_sales_summary;
ANALYZE menu_sales_summary;

-- 最終的なパーティション状況確認
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size
FROM pg_tables 
WHERE (
    tablename LIKE 'daily_sales_summary%' OR 
    tablename LIKE 'staff_sales_summary%' OR
    tablename LIKE 'menu_sales_summary%'
)
AND schemaname = 'public'
ORDER BY tablename;