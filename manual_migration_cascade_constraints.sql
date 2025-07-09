-- =================================================================================
-- MANUAL MIGRATION: CASCADE CONSTRAINTS FOR CUSTOMER DELETION
-- =================================================================================
-- 目的: customer テーブル削除時のエラー解決のため、CASCADE制約を設定
-- 実行環境: 開発環境→本番環境の順で実行
-- 実行方法: Supabaseダッシュボード > SQL Editor > 以下をコピー＆ペーストして実行
-- =================================================================================

-- Step 1: customer_detail.customer_uid 外部キーを ON DELETE CASCADE に変更
-- (20250701120000_set_customer_detail_fk_cascade.sql)

DO $$
BEGIN
    RAISE NOTICE 'Starting CASCADE constraint migration for customer_detail...';
END;
$$ LANGUAGE plpgsql;

-- Drop existing foreign key constraint
ALTER TABLE customer_detail
DROP CONSTRAINT IF EXISTS customer_detail_customer_uid_fkey;

-- Recreate the foreign key constraint with ON DELETE CASCADE
ALTER TABLE customer_detail
ADD CONSTRAINT customer_detail_customer_uid_fkey
FOREIGN KEY (customer_uid)
REFERENCES customer(uid)
ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_customer_detail_customer_uid
ON customer_detail(customer_uid);

-- Step 2: 他のテーブルの外部キー制約をCASCADEに変更
-- (20250701160000_set_customer_cascade_delete.sql)

DO $$
BEGIN
    RAISE NOTICE 'Starting CASCADE constraint migration for all customer-related tables...';
END;
$$ LANGUAGE plpgsql;

-- Rename customer_id to customer_uid in tables (if needed)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'carte' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE "public"."carte" RENAME COLUMN "customer_id" TO "customer_uid";
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'point_task_queue' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE "public"."point_task_queue" RENAME COLUMN "customer_id" TO "customer_uid";
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'point_transaction' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE "public"."point_transaction" RENAME COLUMN "customer_id" TO "customer_uid";
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reservation' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE "public"."reservation" RENAME COLUMN "customer_id" TO "customer_uid";
    END IF;
END $$;

-- Drop existing foreign key constraints
ALTER TABLE "public"."carte_detail"
DROP CONSTRAINT IF EXISTS "carte_detail_carte_id_fkey";

ALTER TABLE "public"."carte"
DROP CONSTRAINT IF EXISTS "carte_customer_id_fkey";

ALTER TABLE "public"."customer_points"
DROP CONSTRAINT IF EXISTS "customer_points_customer_uid_fkey";

ALTER TABLE "public"."point_task_queue"
DROP CONSTRAINT IF EXISTS "point_task_queue_customer_id_fkey";

ALTER TABLE "public"."point_transaction"
DROP CONSTRAINT IF EXISTS "point_transaction_customer_id_fkey";

-- Recreate foreign key constraints with ON DELETE CASCADE
ALTER TABLE "public"."carte_detail"
ADD CONSTRAINT "carte_detail_carte_id_fkey"
FOREIGN KEY (carte_id)
REFERENCES "public"."carte"(id)
ON DELETE CASCADE;

ALTER TABLE "public"."carte"
ADD CONSTRAINT "carte_customer_uid_fkey"
FOREIGN KEY (customer_uid)
REFERENCES "public"."customer"(uid)
ON DELETE CASCADE;

ALTER TABLE "public"."customer_points"
ADD CONSTRAINT "customer_points_customer_uid_fkey"
FOREIGN KEY (customer_uid)
REFERENCES "public"."customer"(uid)
ON DELETE CASCADE;

ALTER TABLE "public"."point_task_queue"
ADD CONSTRAINT "point_task_queue_customer_uid_fkey"
FOREIGN KEY (customer_uid)
REFERENCES "public"."customer"(uid)
ON DELETE CASCADE;

ALTER TABLE "public"."point_transaction"
ADD CONSTRAINT "point_transaction_customer_uid_fkey"
FOREIGN KEY (customer_uid)
REFERENCES "public"."customer"(uid)
ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_carte_customer_uid"
ON "public"."carte"("customer_uid");

CREATE INDEX IF NOT EXISTS "idx_point_task_queue_customer_uid"
ON "public"."point_task_queue"("customer_uid");

CREATE INDEX IF NOT EXISTS "idx_point_transaction_customer_uid"
ON "public"."point_transaction"("customer_uid");

CREATE INDEX IF NOT EXISTS "idx_reservation_customer_uid"
ON "public"."reservation"("customer_uid");

-- Step 3: coupon_transaction テーブルのcustomer_id → customer_uid 変更
-- (20250708130000_fix_dev_coupon_transaction_customer_uid.sql)

DO $$
BEGIN
    RAISE NOTICE 'Starting coupon_transaction customer_uid migration...';
END;
$$ LANGUAGE plpgsql;

-- Rename customer_id to customer_uid if column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'coupon_transaction' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE "public"."coupon_transaction" RENAME COLUMN "customer_id" TO "customer_uid";
        RAISE NOTICE 'Renamed coupon_transaction.customer_id to customer_uid';
    ELSE
        RAISE NOTICE 'coupon_transaction.customer_id column does not exist, skipping rename';
    END IF;
END;
$$;

-- Drop existing foreign key constraint
ALTER TABLE "public"."coupon_transaction"
DROP CONSTRAINT IF EXISTS "coupon_transaction_customer_id_fkey";

-- Add new foreign key constraint with CASCADE
ALTER TABLE "public"."coupon_transaction"
ADD CONSTRAINT "coupon_transaction_customer_uid_fkey"
FOREIGN KEY (customer_uid)
REFERENCES "public"."customer"(uid)
ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS "idx_coupon_transaction_customer_uid"
ON "public"."coupon_transaction"("customer_uid");

-- Step 4: reservation テーブルのcustomer_id → customer_uid 外部キー制約追加

-- Drop existing foreign key constraint
ALTER TABLE "public"."reservation"
DROP CONSTRAINT IF EXISTS "reservation_customer_id_fkey";

-- Add new foreign key constraint with CASCADE
ALTER TABLE "public"."reservation"
ADD CONSTRAINT "reservation_customer_uid_fkey"
FOREIGN KEY (customer_uid)
REFERENCES "public"."customer"(uid)
ON DELETE CASCADE;

-- Final verification: Check all CASCADE constraints
DO $$
BEGIN
    RAISE NOTICE 'Migration completed! Verifying CASCADE constraints...';
    RAISE NOTICE 'Please verify the following constraints are set to CASCADE:';
    RAISE NOTICE '- customer_detail_customer_uid_fkey';
    RAISE NOTICE '- carte_customer_uid_fkey';
    RAISE NOTICE '- customer_points_customer_uid_fkey';
    RAISE NOTICE '- point_task_queue_customer_uid_fkey';
    RAISE NOTICE '- point_transaction_customer_uid_fkey';
    RAISE NOTICE '- coupon_transaction_customer_uid_fkey';
    RAISE NOTICE '- reservation_customer_uid_fkey';
    RAISE NOTICE '- carte_detail_carte_id_fkey';
END;
$$ LANGUAGE plpgsql;

-- =================================================================================
-- 実行後の確認クエリ (以下を実行して CASCADE 制約が正しく設定されているか確認)
-- =================================================================================

/*
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
*/