-- Migrate all customer_id columns to customer_uid in production environment
-- This migration safely renames customer_id to customer_uid in all remaining tables

DO $$ 
BEGIN
    -- Check and rename customer_id to customer_uid in all tables
    
    -- 1. carte table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'carte' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE "public"."carte" RENAME COLUMN "customer_id" TO "customer_uid";
        RAISE NOTICE 'Renamed customer_id to customer_uid in carte table';
    ELSE
        RAISE NOTICE 'carte table already has customer_uid column';
    END IF;

    -- 2. point_task_queue table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'point_task_queue' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE "public"."point_task_queue" RENAME COLUMN "customer_id" TO "customer_uid";
        RAISE NOTICE 'Renamed customer_id to customer_uid in point_task_queue table';
    ELSE
        RAISE NOTICE 'point_task_queue table already has customer_uid column';
    END IF;

    -- 3. point_transaction table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'point_transaction' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE "public"."point_transaction" RENAME COLUMN "customer_id" TO "customer_uid";
        RAISE NOTICE 'Renamed customer_id to customer_uid in point_transaction table';
    ELSE
        RAISE NOTICE 'point_transaction table already has customer_uid column';
    END IF;

    -- 4. coupon_transaction table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'coupon_transaction' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE "public"."coupon_transaction" RENAME COLUMN "customer_id" TO "customer_uid";
        RAISE NOTICE 'Renamed customer_id to customer_uid in coupon_transaction table';
    ELSE
        RAISE NOTICE 'coupon_transaction table already has customer_uid column';
    END IF;

    -- 5. reservation table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reservation' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE "public"."reservation" RENAME COLUMN "customer_id" TO "customer_uid";
        RAISE NOTICE 'Renamed customer_id to customer_uid in reservation table';
    ELSE
        RAISE NOTICE 'reservation table already has customer_uid column';
    END IF;

END $$;

-- Drop existing foreign key constraints that might reference old customer_id columns
DO $$
BEGIN
    -- Drop old constraints if they exist
    PERFORM pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conname = 'carte_customer_id_fkey' AND contype = 'f';
    
    IF FOUND THEN
        ALTER TABLE "public"."carte" DROP CONSTRAINT IF EXISTS "carte_customer_id_fkey";
        RAISE NOTICE 'Dropped old carte_customer_id_fkey constraint';
    END IF;

    -- Drop other old constraints
    ALTER TABLE "public"."point_task_queue" DROP CONSTRAINT IF EXISTS "point_task_queue_customer_id_fkey";
    ALTER TABLE "public"."point_task_queue" DROP CONSTRAINT IF EXISTS "fk_point_task_queue_customer";
    ALTER TABLE "public"."point_transaction" DROP CONSTRAINT IF EXISTS "point_transaction_customer_id_fkey";
    ALTER TABLE "public"."point_transaction" DROP CONSTRAINT IF EXISTS "fk_point_transaction_customer";
    ALTER TABLE "public"."coupon_transaction" DROP CONSTRAINT IF EXISTS "coupon_transaction_customer_id_fkey";
    ALTER TABLE "public"."reservation" DROP CONSTRAINT IF EXISTS "reservation_customer_id_fkey";
    ALTER TABLE "public"."reservation" DROP CONSTRAINT IF EXISTS "fk_reservation_customer";

    RAISE NOTICE 'Dropped all old customer_id foreign key constraints';
END $$;

-- Recreate foreign key constraints with customer_uid and ON DELETE CASCADE
DO $$
BEGIN
    -- carte table
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'carte_customer_uid_fkey'
    ) THEN
        ALTER TABLE "public"."carte"
        ADD CONSTRAINT "carte_customer_uid_fkey"
        FOREIGN KEY (customer_uid)
        REFERENCES "public"."customer"(uid)
        ON DELETE CASCADE;
        RAISE NOTICE 'Created carte_customer_uid_fkey constraint';
    END IF;

    -- point_task_queue table
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'point_task_queue_customer_uid_fkey'
    ) THEN
        ALTER TABLE "public"."point_task_queue"
        ADD CONSTRAINT "point_task_queue_customer_uid_fkey"
        FOREIGN KEY (customer_uid)
        REFERENCES "public"."customer"(uid)
        ON DELETE CASCADE;
        RAISE NOTICE 'Created point_task_queue_customer_uid_fkey constraint';
    END IF;

    -- point_transaction table
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'point_transaction_customer_uid_fkey'
    ) THEN
        ALTER TABLE "public"."point_transaction"
        ADD CONSTRAINT "point_transaction_customer_uid_fkey"
        FOREIGN KEY (customer_uid)
        REFERENCES "public"."customer"(uid)
        ON DELETE CASCADE;
        RAISE NOTICE 'Created point_transaction_customer_uid_fkey constraint';
    END IF;

    -- coupon_transaction table
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'coupon_transaction_customer_uid_fkey'
    ) THEN
        ALTER TABLE "public"."coupon_transaction"
        ADD CONSTRAINT "coupon_transaction_customer_uid_fkey"
        FOREIGN KEY (customer_uid)
        REFERENCES "public"."customer"(uid)
        ON DELETE CASCADE;
        RAISE NOTICE 'Created coupon_transaction_customer_uid_fkey constraint';
    END IF;

    -- reservation table
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'reservation_customer_uid_fkey'
    ) THEN
        ALTER TABLE "public"."reservation"
        ADD CONSTRAINT "reservation_customer_uid_fkey"
        FOREIGN KEY (customer_uid)
        REFERENCES "public"."customer"(uid)
        ON DELETE CASCADE;
        RAISE NOTICE 'Created reservation_customer_uid_fkey constraint';
    END IF;
END $$;

-- Create performance indexes on customer_uid columns
DO $$
BEGIN
    -- carte table index
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'idx_carte_customer_uid' 
        AND n.nspname = 'public'
    ) THEN
        CREATE INDEX "idx_carte_customer_uid" ON "public"."carte"("customer_uid");
        RAISE NOTICE 'Created idx_carte_customer_uid index';
    END IF;

    -- point_task_queue table index
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'idx_point_task_queue_customer_uid' 
        AND n.nspname = 'public'
    ) THEN
        CREATE INDEX "idx_point_task_queue_customer_uid" ON "public"."point_task_queue"("customer_uid");
        RAISE NOTICE 'Created idx_point_task_queue_customer_uid index';
    END IF;

    -- point_transaction table index
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'idx_point_transaction_customer_uid' 
        AND n.nspname = 'public'
    ) THEN
        CREATE INDEX "idx_point_transaction_customer_uid" ON "public"."point_transaction"("customer_uid");
        RAISE NOTICE 'Created idx_point_transaction_customer_uid index';
    END IF;

    -- coupon_transaction table index
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'idx_coupon_transaction_customer_uid' 
        AND n.nspname = 'public'
    ) THEN
        CREATE INDEX "idx_coupon_transaction_customer_uid" ON "public"."coupon_transaction"("customer_uid");
        RAISE NOTICE 'Created idx_coupon_transaction_customer_uid index';
    END IF;

    -- reservation table index
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'idx_reservation_customer_uid' 
        AND n.nspname = 'public'
    ) THEN
        CREATE INDEX "idx_reservation_customer_uid" ON "public"."reservation"("customer_uid");
        RAISE NOTICE 'Created idx_reservation_customer_uid index';
    END IF;
END $$;

-- Drop old indexes on customer_id if they exist
DO $$
BEGIN
    DROP INDEX IF EXISTS "public"."idx_carte_customer_id";
    DROP INDEX IF EXISTS "public"."idx_point_task_queue_customer_id";  
    DROP INDEX IF EXISTS "public"."idx_point_transaction_customer_id";
    DROP INDEX IF EXISTS "public"."idx_coupon_transaction_customer_id";
    DROP INDEX IF EXISTS "public"."idx_reservation_customer_id";
    RAISE NOTICE 'Dropped old customer_id indexes if they existed';
END $$;

-- Final verification
DO $$
DECLARE
    table_names text[] := ARRAY['carte', 'point_task_queue', 'point_transaction', 'coupon_transaction', 'reservation'];
    current_table text;
    has_customer_id boolean;
    has_customer_uid boolean;
BEGIN
    RAISE NOTICE 'Migration verification:';
    
    FOREACH current_table IN ARRAY table_names LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = current_table 
            AND column_name = 'customer_id'
        ) INTO has_customer_id;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = current_table 
            AND column_name = 'customer_uid'
        ) INTO has_customer_uid;
        
        RAISE NOTICE 'Table %: customer_id=%, customer_uid=%', current_table, has_customer_id, has_customer_uid;
    END LOOP;
    
    RAISE NOTICE 'Migration completed successfully!';
END $$;