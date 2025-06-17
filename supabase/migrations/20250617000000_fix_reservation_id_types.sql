-- Fix reservation_id column types from uuid to text for Convex ID compatibility
-- This migration changes reservation_id columns from uuid to text type to support Convex ID format

-- 1. point_transaction table
ALTER TABLE "public"."point_transaction" 
ALTER COLUMN "reservation_id" TYPE text USING "reservation_id"::text;

-- 2. point_task_queue table  
ALTER TABLE "public"."point_task_queue"
ALTER COLUMN "reservation_id" TYPE text USING "reservation_id"::text;

-- 3. coupon_transaction table (if it has reservation_id)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'coupon_transaction' 
        AND column_name = 'reservation_id'
    ) THEN
        ALTER TABLE "public"."coupon_transaction" 
        ALTER COLUMN "reservation_id" TYPE text USING "reservation_id"::text;
    END IF;
END $$;

-- 4. carte table (if it has reservation_id)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'carte' 
        AND column_name = 'reservation_id'
    ) THEN
        ALTER TABLE "public"."carte" 
        ALTER COLUMN "reservation_id" TYPE text USING "reservation_id"::text;
    END IF;
END $$;

-- 5. Update any foreign key constraints if they exist
-- Note: Since these are text IDs from Convex, foreign key constraints to a reservation table
-- might not exist or might need to be dropped. This is handled on a case-by-case basis.

COMMENT ON COLUMN "public"."point_transaction"."reservation_id" IS 'Convex reservation ID (text format)';
COMMENT ON COLUMN "public"."point_task_queue"."reservation_id" IS 'Convex reservation ID (text format)';