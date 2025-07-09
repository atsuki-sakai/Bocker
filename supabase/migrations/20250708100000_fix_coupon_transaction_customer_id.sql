-- Fix coupon_transaction table: rename customer_id to customer_uid
-- This migration specifically targets the coupon_transaction table that still has customer_id

DO $$ 
BEGIN
    -- Check if coupon_transaction table still has customer_id column
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'coupon_transaction' 
        AND column_name = 'customer_id'
    ) THEN
        -- Drop existing foreign key constraint if it exists
        ALTER TABLE "public"."coupon_transaction" 
        DROP CONSTRAINT IF EXISTS "coupon_transaction_customer_id_fkey";
        
        -- Rename the column
        ALTER TABLE "public"."coupon_transaction" 
        RENAME COLUMN "customer_id" TO "customer_uid";
        
        -- Create new foreign key constraint
        ALTER TABLE "public"."coupon_transaction"
        ADD CONSTRAINT "coupon_transaction_customer_uid_fkey"
        FOREIGN KEY (customer_uid)
        REFERENCES "public"."customer"(uid)
        ON DELETE CASCADE;
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS "idx_coupon_transaction_customer_uid" 
        ON "public"."coupon_transaction"("customer_uid");
        
        RAISE NOTICE 'Successfully renamed customer_id to customer_uid in coupon_transaction table';
    ELSE
        RAISE NOTICE 'coupon_transaction table already has customer_uid column';
    END IF;
    
    -- Verify the change
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'coupon_transaction' 
        AND column_name = 'customer_uid'
    ) THEN
        RAISE NOTICE 'Verification: coupon_transaction now has customer_uid column';
    ELSE
        RAISE NOTICE 'ERROR: coupon_transaction does not have customer_uid column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'coupon_transaction' 
        AND column_name = 'customer_id'
    ) THEN
        RAISE NOTICE 'Verification: coupon_transaction no longer has customer_id column';
    ELSE
        RAISE NOTICE 'WARNING: coupon_transaction still has customer_id column';
    END IF;
END $$;