-- パーティションデータ削除実行スクリプト
-- 実際に削除を実行します

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

-- 統計情報更新
ANALYZE daily_sales_summary;
ANALYZE staff_sales_summary;
ANALYZE menu_sales_summary;

-- 削除後の状況確認
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