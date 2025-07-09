-- Fix DEV_Bocker coupon_transaction table to use customer_uid instead of customer_id
-- This migration should only run on development environment

-- ===============================
-- 1. Check if we're in development environment and if fix is needed
-- ===============================

DO $$
DECLARE
    has_customer_id boolean := false;
    has_customer_uid boolean := false;
BEGIN
    -- Check if customer_id column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupon_transaction' 
        AND column_name = 'customer_id'
        AND table_schema = 'public'
    ) INTO has_customer_id;

    -- Check if customer_uid column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupon_transaction' 
        AND column_name = 'customer_uid'
        AND table_schema = 'public'
    ) INTO has_customer_uid;

    -- Report current state
    RAISE NOTICE 'coupon_transaction table state: customer_id=%, customer_uid=%', has_customer_id, has_customer_uid;

    -- Only proceed if we have customer_id but not customer_uid
    IF has_customer_id AND NOT has_customer_uid THEN
        RAISE NOTICE 'Starting migration: customer_id -> customer_uid';
        
        -- ===============================
        -- 2. Create new customer_uid column
        -- ===============================
        
        ALTER TABLE coupon_transaction 
        ADD COLUMN customer_uid uuid;

        -- ===============================
        -- 3. Copy data from customer_id to customer_uid
        -- ===============================
        
        UPDATE coupon_transaction 
        SET customer_uid = customer_id 
        WHERE customer_id IS NOT NULL;

        -- ===============================
        -- 4. Drop old foreign key constraint if it exists
        -- ===============================
        
        DO $inner$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'coupon_transaction_customer_id_fkey'
            ) THEN
                ALTER TABLE coupon_transaction 
                DROP CONSTRAINT coupon_transaction_customer_id_fkey;
                RAISE NOTICE 'Dropped old foreign key constraint: coupon_transaction_customer_id_fkey';
            END IF;
        END $inner$;

        -- ===============================
        -- 5. Add new foreign key constraint
        -- ===============================
        
        ALTER TABLE coupon_transaction 
        ADD CONSTRAINT coupon_transaction_customer_uid_fkey 
        FOREIGN KEY (customer_uid) REFERENCES customer(uid) ON DELETE CASCADE;

        -- ===============================
        -- 6. Set NOT NULL constraint on customer_uid
        -- ===============================
        
        ALTER TABLE coupon_transaction 
        ALTER COLUMN customer_uid SET NOT NULL;

        -- ===============================
        -- 7. Drop old customer_id column
        -- ===============================
        
        ALTER TABLE coupon_transaction 
        DROP COLUMN customer_id;

        -- ===============================
        -- 8. Add index for performance
        -- ===============================
        
        CREATE INDEX IF NOT EXISTS idx_coupon_transaction_customer_uid 
        ON coupon_transaction(customer_uid);

        -- ===============================
        -- 9. Update column comment
        -- ===============================
        
        COMMENT ON COLUMN coupon_transaction.customer_uid IS 'Customer UID (foreign key to customer.uid)';

        RAISE NOTICE 'Migration completed: customer_id -> customer_uid';
        
    ELSIF has_customer_uid AND NOT has_customer_id THEN
        RAISE NOTICE 'Migration already completed: coupon_transaction uses customer_uid';
    ELSIF has_customer_id AND has_customer_uid THEN
        RAISE NOTICE 'Warning: Both customer_id and customer_uid exist. Manual cleanup may be needed.';
    ELSE
        RAISE NOTICE 'Error: Neither customer_id nor customer_uid found in coupon_transaction table';
    END IF;
END $$;

-- ===============================
-- 10. Final verification
-- ===============================

DO $$
DECLARE
    has_customer_uid boolean := false;
    constraint_exists boolean := false;
BEGIN
    -- Verify customer_uid column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupon_transaction' 
        AND column_name = 'customer_uid'
        AND table_schema = 'public'
        AND is_nullable = 'NO'
    ) INTO has_customer_uid;

    -- Verify foreign key constraint exists
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'coupon_transaction_customer_uid_fkey'
    ) INTO constraint_exists;

    IF has_customer_uid AND constraint_exists THEN
        RAISE NOTICE 'Verification successful: coupon_transaction.customer_uid is properly configured';
    ELSE
        RAISE WARNING 'Verification failed: customer_uid=%, constraint=%', has_customer_uid, constraint_exists;
    END IF;
END $$;