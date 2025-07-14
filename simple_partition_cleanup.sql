-- シンプルなパーティションクリーンアップスクリプト
-- 全分析系パーティションテーブルのデータを削除

-- 1. 現在のパーティション一覧を確認
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

-- 2. 存在するメインテーブルの確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'daily_sales_summary',
    'weekly_sales_summary', 
    'staff_sales_summary',
    'menu_sales_summary'
);

-- 3. 全データ削除実行（以下のコメントアウトを解除して実行）

/*
-- 日別売上サマリーパーティション削除
DO $$
DECLARE rec RECORD;
BEGIN
    FOR rec IN SELECT tablename FROM pg_tables WHERE tablename LIKE 'daily_sales_summary_%' AND schemaname = 'public'
    LOOP
        EXECUTE 'DELETE FROM ' || rec.tablename;
    END LOOP;
END $$;

-- 週別売上サマリーパーティション削除  
DO $$
DECLARE rec RECORD;
BEGIN
    FOR rec IN SELECT tablename FROM pg_tables WHERE tablename LIKE 'weekly_sales_summary_%' AND schemaname = 'public'
    LOOP
        EXECUTE 'DELETE FROM ' || rec.tablename;
    END LOOP;
END $$;

-- スタッフ売上サマリーパーティション削除
DO $$
DECLARE rec RECORD;
BEGIN
    FOR rec IN SELECT tablename FROM pg_tables WHERE tablename LIKE 'staff_sales_summary_%' AND schemaname = 'public'
    LOOP
        EXECUTE 'DELETE FROM ' || rec.tablename;
    END LOOP;
END $$;

-- メニュー売上サマリーパーティション削除
DO $$
DECLARE rec RECORD;
BEGIN
    FOR rec IN SELECT tablename FROM pg_tables WHERE tablename LIKE 'menu_sales_summary_%' AND schemaname = 'public'
    LOOP
        EXECUTE 'DELETE FROM ' || rec.tablename;
    END LOOP;
END $$;
*/

-- 4. 削除後の確認
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