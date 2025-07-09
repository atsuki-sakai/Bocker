-- =================================================================================
-- DATABASE STATE VERIFICATION SCRIPT
-- =================================================================================
-- 目的: 実際のデータベース状態を確認して、問題の根本原因を特定する
-- 実行方法: Supabase SQL Editor で実行
-- =================================================================================

-- 1. 現在のRPC関数の存在確認
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'delete_customer_and_related_data'
AND n.nspname = 'public';

-- 2. 関連テーブルのカラム名確認
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('customer', 'customer_detail', 'customer_points', 'point_transaction', 'point_task_queue', 'coupon_transaction', 'carte', 'reservation')
AND column_name IN ('customer_id', 'customer_uid')
ORDER BY table_name, column_name;

-- 3. 外部キー制約の現在の状態
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND ccu.table_name = 'customer'
ORDER BY tc.table_name, tc.constraint_name;

-- 4. マイグレーション履歴の確認（もし supabase_migrations テーブルが存在する場合）
SELECT 
    name,
    executed_at
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%customer%'
ORDER BY executed_at DESC;