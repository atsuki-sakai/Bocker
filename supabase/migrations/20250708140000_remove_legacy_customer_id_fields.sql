-- Remove legacy customer_id fields completely
-- This migration removes all remaining customer_id fields and ensures only customer_uid is used

-- ===============================
-- 1. Fix coupon_transaction table (change customer_id to customer_uid)
-- ===============================

DO $$
DECLARE
    has_customer_id boolean := false;
    has_customer_uid boolean := false;
BEGIN
    -- Check current state
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupon_transaction' 
        AND column_name = 'customer_id'
        AND table_schema = 'public'
    ) INTO has_customer_id;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupon_transaction' 
        AND column_name = 'customer_uid'
        AND table_schema = 'public'
    ) INTO has_customer_uid;

    RAISE NOTICE 'coupon_transaction: customer_id=%, customer_uid=%', has_customer_id, has_customer_uid;

    -- If we have customer_id but not customer_uid, migrate
    IF has_customer_id AND NOT has_customer_uid THEN
        RAISE NOTICE 'Migrating coupon_transaction.customer_id to customer_uid';
        
        -- Add customer_uid column
        ALTER TABLE coupon_transaction ADD COLUMN customer_uid uuid;
        
        -- Copy data
        UPDATE coupon_transaction SET customer_uid = customer_id WHERE customer_id IS NOT NULL;
        
        -- Drop old foreign key constraint
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupon_transaction_customer_id_fkey') THEN
            ALTER TABLE coupon_transaction DROP CONSTRAINT coupon_transaction_customer_id_fkey;
        END IF;
        
        -- Add new foreign key constraint
        ALTER TABLE coupon_transaction 
        ADD CONSTRAINT coupon_transaction_customer_uid_fkey 
        FOREIGN KEY (customer_uid) REFERENCES customer(uid) ON DELETE CASCADE;
        
        -- Set NOT NULL constraint
        ALTER TABLE coupon_transaction ALTER COLUMN customer_uid SET NOT NULL;
        
        -- Drop old column
        ALTER TABLE coupon_transaction DROP COLUMN customer_id;
        
        -- Add index
        CREATE INDEX IF NOT EXISTS idx_coupon_transaction_customer_uid 
        ON coupon_transaction(customer_uid);
        
        RAISE NOTICE 'coupon_transaction migration completed';
    END IF;
END $$;

-- ===============================
-- 2. Remove legacy customer_id field from customer_detail
-- ===============================

DO $$
BEGIN
    -- Check if legacy customer_id field exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_detail' 
        AND column_name = 'customer_id'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Removing legacy customer_id field from customer_detail';
        
        -- Drop any foreign key constraint on customer_id
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_detail_customer_id_fkey') THEN
            ALTER TABLE customer_detail DROP CONSTRAINT customer_detail_customer_id_fkey;
        END IF;
        
        -- Drop the legacy column
        ALTER TABLE customer_detail DROP COLUMN customer_id;
        
        RAISE NOTICE 'Removed customer_id from customer_detail';
    ELSE
        RAISE NOTICE 'customer_detail.customer_id does not exist (already clean)';
    END IF;
END $$;

-- ===============================
-- 3. Remove legacy customer_id field from customer_points
-- ===============================

DO $$
BEGIN
    -- Check if legacy customer_id field exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_points' 
        AND column_name = 'customer_id'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Removing legacy customer_id field from customer_points';
        
        -- Drop any foreign key constraint on customer_id
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_points_customer_id_fkey') THEN
            ALTER TABLE customer_points DROP CONSTRAINT customer_points_customer_id_fkey;
        END IF;
        
        -- Drop the legacy column
        ALTER TABLE customer_points DROP COLUMN customer_id;
        
        RAISE NOTICE 'Removed customer_id from customer_points';
    ELSE
        RAISE NOTICE 'customer_points.customer_id does not exist (already clean)';
    END IF;
END $$;

-- ===============================
-- 4. Ensure all foreign key constraints are properly named and use CASCADE delete
-- ===============================

-- Fix customer_detail foreign key to use CASCADE delete
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_detail_customer_uid_fkey') THEN
        ALTER TABLE customer_detail DROP CONSTRAINT customer_detail_customer_uid_fkey;
    END IF;
    
    -- Add new constraint with CASCADE delete
    ALTER TABLE customer_detail 
    ADD CONSTRAINT customer_detail_customer_uid_fkey 
    FOREIGN KEY (customer_uid) REFERENCES customer(uid) ON DELETE CASCADE;
    
    RAISE NOTICE 'Updated customer_detail foreign key constraint with CASCADE';
END $$;

-- Fix customer_points foreign key to use CASCADE delete
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_points_customer_uid_fkey') THEN
        ALTER TABLE customer_points DROP CONSTRAINT customer_points_customer_uid_fkey;
    END IF;
    
    -- Add new constraint with CASCADE delete
    ALTER TABLE customer_points 
    ADD CONSTRAINT customer_points_customer_uid_fkey 
    FOREIGN KEY (customer_uid) REFERENCES customer(uid) ON DELETE CASCADE;
    
    RAISE NOTICE 'Updated customer_points foreign key constraint with CASCADE';
END $$;

-- Fix point_transaction foreign key to use CASCADE delete
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'point_transaction_customer_uid_fkey') THEN
        ALTER TABLE point_transaction DROP CONSTRAINT point_transaction_customer_uid_fkey;
    END IF;
    
    -- Add new constraint with CASCADE delete
    ALTER TABLE point_transaction 
    ADD CONSTRAINT point_transaction_customer_uid_fkey 
    FOREIGN KEY (customer_uid) REFERENCES customer(uid) ON DELETE CASCADE;
    
    RAISE NOTICE 'Updated point_transaction foreign key constraint with CASCADE';
END $$;

-- Fix point_task_queue foreign key to use CASCADE delete
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'point_task_queue_customer_uid_fkey') THEN
        ALTER TABLE point_task_queue DROP CONSTRAINT point_task_queue_customer_uid_fkey;
    END IF;
    
    -- Add new constraint with CASCADE delete
    ALTER TABLE point_task_queue 
    ADD CONSTRAINT point_task_queue_customer_uid_fkey 
    FOREIGN KEY (customer_uid) REFERENCES customer(uid) ON DELETE CASCADE;
    
    RAISE NOTICE 'Updated point_task_queue foreign key constraint with CASCADE';
END $$;

-- Fix reservation foreign key to use CASCADE delete
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservation_customer_uid_fkey') THEN
        ALTER TABLE reservation DROP CONSTRAINT reservation_customer_uid_fkey;
    END IF;
    
    -- Add new constraint with CASCADE delete
    ALTER TABLE reservation 
    ADD CONSTRAINT reservation_customer_uid_fkey 
    FOREIGN KEY (customer_uid) REFERENCES customer(uid) ON DELETE CASCADE;
    
    RAISE NOTICE 'Updated reservation foreign key constraint with CASCADE';
END $$;

-- ===============================
-- 5. Update the carte table to use customer_uid instead of customer_id
-- ===============================

DO $$
DECLARE
    has_customer_id boolean := false;
    has_customer_uid boolean := false;
BEGIN
    -- Check current state
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'carte' 
        AND column_name = 'customer_id'
        AND table_schema = 'public'
    ) INTO has_customer_id;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'carte' 
        AND column_name = 'customer_uid'
        AND table_schema = 'public'
    ) INTO has_customer_uid;

    RAISE NOTICE 'carte: customer_id=%, customer_uid=%', has_customer_id, has_customer_uid;

    -- If we have customer_id but not customer_uid, migrate
    IF has_customer_id AND NOT has_customer_uid THEN
        RAISE NOTICE 'Migrating carte.customer_id to customer_uid';
        
        -- Add customer_uid column
        ALTER TABLE carte ADD COLUMN customer_uid uuid;
        
        -- Copy data
        UPDATE carte SET customer_uid = customer_id WHERE customer_id IS NOT NULL;
        
        -- Drop old foreign key constraint
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carte_customer_id_fkey') THEN
            ALTER TABLE carte DROP CONSTRAINT carte_customer_id_fkey;
        END IF;
        
        -- Add new foreign key constraint with CASCADE
        ALTER TABLE carte 
        ADD CONSTRAINT carte_customer_uid_fkey 
        FOREIGN KEY (customer_uid) REFERENCES customer(uid) ON DELETE CASCADE;
        
        -- Set NOT NULL constraint
        ALTER TABLE carte ALTER COLUMN customer_uid SET NOT NULL;
        
        -- Drop old column
        ALTER TABLE carte DROP COLUMN customer_id;
        
        -- Add index
        CREATE INDEX IF NOT EXISTS idx_carte_customer_uid 
        ON carte(customer_uid);
        
        RAISE NOTICE 'carte migration completed';
    ELSIF has_customer_uid AND has_customer_id THEN
        RAISE NOTICE 'Both carte.customer_id and customer_uid exist, dropping customer_id';
        
        -- Drop old foreign key constraint
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carte_customer_id_fkey') THEN
            ALTER TABLE carte DROP CONSTRAINT carte_customer_id_fkey;
        END IF;
        
        -- Drop old column
        ALTER TABLE carte DROP COLUMN customer_id;
        
        RAISE NOTICE 'Dropped legacy customer_id from carte';
    END IF;
END $$;

-- ===============================
-- 6. Final verification
-- ===============================

DO $$
DECLARE
    remaining_customer_id_tables text[] := '{}';
    current_table text;
    tables_to_check text[] := ARRAY['coupon_transaction', 'customer_detail', 'customer_points', 'carte'];
BEGIN
    -- Check for any remaining customer_id fields
    FOREACH current_table IN ARRAY tables_to_check
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = current_table 
            AND column_name = 'customer_id'
            AND table_schema = 'public'
        ) THEN
            remaining_customer_id_tables := array_append(remaining_customer_id_tables, current_table);
        END IF;
    END LOOP;

    IF array_length(remaining_customer_id_tables, 1) > 0 THEN
        RAISE WARNING 'Migration incomplete: customer_id still exists in tables: %', array_to_string(remaining_customer_id_tables, ', ');
    ELSE
        RAISE NOTICE 'Migration successful: All customer_id fields have been removed/converted to customer_uid';
    END IF;
    
    -- Verify all expected customer_uid foreign keys exist
    RAISE NOTICE 'Verifying foreign key constraints...';
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupon_transaction_customer_uid_fkey') THEN
        RAISE WARNING 'Missing foreign key: coupon_transaction_customer_uid_fkey';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_detail_customer_uid_fkey') THEN
        RAISE WARNING 'Missing foreign key: customer_detail_customer_uid_fkey';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_points_customer_uid_fkey') THEN
        RAISE WARNING 'Missing foreign key: customer_points_customer_uid_fkey';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carte_customer_uid_fkey') THEN
        RAISE WARNING 'Missing foreign key: carte_customer_uid_fkey';
    END IF;
    
    RAISE NOTICE 'Foreign key verification completed';
END $$;