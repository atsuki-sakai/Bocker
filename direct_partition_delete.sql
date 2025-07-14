-- 直接パーティション削除実行
-- コメントアウトなしで実際に削除を実行

-- 各パーティションテーブルを直接削除
DELETE FROM daily_sales_summary_202501;
DELETE FROM daily_sales_summary_202502;
DELETE FROM daily_sales_summary_202503;
DELETE FROM daily_sales_summary_202504;
DELETE FROM daily_sales_summary_202505;
DELETE FROM daily_sales_summary_202506;
DELETE FROM daily_sales_summary_202507;
DELETE FROM daily_sales_summary_202508;
DELETE FROM daily_sales_summary_202509;
DELETE FROM daily_sales_summary_202510;
DELETE FROM daily_sales_summary_202511;
DELETE FROM daily_sales_summary_202512;
DELETE FROM daily_sales_summary_202601;

DELETE FROM staff_sales_summary_202501;
DELETE FROM staff_sales_summary_202502;
DELETE FROM staff_sales_summary_202503;
DELETE FROM staff_sales_summary_202504;
DELETE FROM staff_sales_summary_202505;
DELETE FROM staff_sales_summary_202506;
DELETE FROM staff_sales_summary_202507;
DELETE FROM staff_sales_summary_202508;
DELETE FROM staff_sales_summary_202509;
DELETE FROM staff_sales_summary_202510;
DELETE FROM staff_sales_summary_202511;
DELETE FROM staff_sales_summary_202512;
DELETE FROM staff_sales_summary_202601;

DELETE FROM menu_sales_summary_202501;
DELETE FROM menu_sales_summary_202502;
DELETE FROM menu_sales_summary_202503;
DELETE FROM menu_sales_summary_202504;
DELETE FROM menu_sales_summary_202505;
DELETE FROM menu_sales_summary_202506;
DELETE FROM menu_sales_summary_202507;
DELETE FROM menu_sales_summary_202508;
DELETE FROM menu_sales_summary_202509;
DELETE FROM menu_sales_summary_202510;
DELETE FROM menu_sales_summary_202511;
DELETE FROM menu_sales_summary_202512;
DELETE FROM menu_sales_summary_202601;

-- 統計情報更新


-- 確認クエリ
SELECT 'Cleanup completed. Checking table sizes:' as status;

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