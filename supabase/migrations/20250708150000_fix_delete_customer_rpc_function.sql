-- Fix delete_customer_and_related_data RPC function to use customer_uid instead of customer_id
-- This migration updates the RPC function to work with the new schema

-- ===============================
-- 1. Drop existing function if it exists
-- ===============================

DROP FUNCTION IF EXISTS delete_customer_and_related_data(p_customer_uid uuid);
DROP FUNCTION IF EXISTS delete_customer_and_related_data(p_customer_id uuid);

-- ===============================
-- 2. Create new function using customer_uid
-- ===============================

CREATE OR REPLACE FUNCTION delete_customer_and_related_data(p_customer_uid uuid)
RETURNS void AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Validate input parameter
    IF p_customer_uid IS NULL THEN
        RAISE EXCEPTION 'Customer UID cannot be null';
    END IF;

    -- Check if customer exists
    IF NOT EXISTS (SELECT 1 FROM customer WHERE uid = p_customer_uid) THEN
        RAISE EXCEPTION 'Customer with UID % does not exist', p_customer_uid;
    END IF;

    -- Log start of deletion process
    RAISE NOTICE 'Starting deletion of customer % and all related data', p_customer_uid;

    -- ===============================
    -- Delete related data in the correct order (child tables first)
    -- ===============================

    -- 1. Delete carte_detail records (via carte relationship)
    DELETE FROM carte_detail 
    WHERE carte_id IN (
        SELECT id FROM carte WHERE customer_uid = p_customer_uid
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % carte_detail records', deleted_count;

    -- 2. Delete carte records
    DELETE FROM carte WHERE customer_uid = p_customer_uid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % carte records', deleted_count;

    -- 3. Delete point_task_queue records
    DELETE FROM point_task_queue WHERE customer_uid = p_customer_uid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % point_task_queue records', deleted_count;

    -- 4. Delete point_transaction records
    DELETE FROM point_transaction WHERE customer_uid = p_customer_uid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % point_transaction records', deleted_count;

    -- 5. Delete coupon_transaction records
    DELETE FROM coupon_transaction WHERE customer_uid = p_customer_uid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % coupon_transaction records', deleted_count;

    -- 6. Delete reservation records
    DELETE FROM reservation WHERE customer_uid = p_customer_uid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % reservation records', deleted_count;

    -- 7. Delete customer_points records
    DELETE FROM customer_points WHERE customer_uid = p_customer_uid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % customer_points records', deleted_count;

    -- 8. Delete customer_detail records
    DELETE FROM customer_detail WHERE customer_uid = p_customer_uid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % customer_detail records', deleted_count;

    -- 9. Finally, delete the main customer record
    DELETE FROM customer WHERE uid = p_customer_uid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count = 0 THEN
        RAISE EXCEPTION 'Failed to delete customer record for UID %', p_customer_uid;
    END IF;
    
    RAISE NOTICE 'Successfully deleted customer % and all related data', p_customer_uid;

EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise it
        RAISE EXCEPTION 'Error deleting customer %: %', p_customer_uid, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- 3. Grant necessary permissions
-- ===============================

-- Grant execute permission to appropriate roles
GRANT EXECUTE ON FUNCTION delete_customer_and_related_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_customer_and_related_data(uuid) TO service_role;

-- ===============================
-- 4. Add function comment
-- ===============================

COMMENT ON FUNCTION delete_customer_and_related_data(uuid) IS 
'Deletes a customer and all related data in the correct order. Uses customer_uid for all relationships.';

-- ===============================
-- 5. Verification test (optional, can be commented out in production)
-- ===============================

DO $$
BEGIN
    -- Verify the function exists with correct parameter
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'delete_customer_and_related_data'
        AND n.nspname = 'public'
        AND pg_get_function_arguments(p.oid) = 'p_customer_uid uuid'
    ) THEN
        RAISE EXCEPTION 'Function delete_customer_and_related_data(uuid) was not created successfully';
    END IF;
    
    RAISE NOTICE 'Function delete_customer_and_related_data(uuid) created successfully';
END $$;