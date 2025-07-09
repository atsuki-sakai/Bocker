-- Emergency fix for DEV environment RPC function
-- This script fixes the delete_customer_and_related_data function to use customer_uid

-- Drop existing function
DROP FUNCTION IF EXISTS delete_customer_and_related_data(p_customer_uid uuid);
DROP FUNCTION IF EXISTS delete_customer_and_related_data(p_customer_id uuid);

-- Create new function using customer_uid
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

    -- Delete related data in the correct order (child tables first)
    
    -- 1. Delete carte_detail records (via carte relationship)
    DELETE FROM carte_detail 
    WHERE carte_id IN (
        SELECT id FROM carte WHERE customer_uid = p_customer_uid
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- 2. Delete carte records
    DELETE FROM carte WHERE customer_uid = p_customer_uid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- 3. Delete point_task_queue records
    DELETE FROM point_task_queue WHERE customer_uid = p_customer_uid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- 4. Delete point_transaction records
    DELETE FROM point_transaction WHERE customer_uid = p_customer_uid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- 5. Delete coupon_transaction records
    DELETE FROM coupon_transaction WHERE customer_uid = p_customer_uid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- 6. Delete reservation records
    DELETE FROM reservation WHERE customer_uid = p_customer_uid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- 7. Delete customer_points records
    DELETE FROM customer_points WHERE customer_uid = p_customer_uid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- 8. Delete customer_detail records
    DELETE FROM customer_detail WHERE customer_uid = p_customer_uid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- 9. Finally, delete the main customer record
    DELETE FROM customer WHERE uid = p_customer_uid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count = 0 THEN
        RAISE EXCEPTION 'Failed to delete customer record for UID %', p_customer_uid;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error deleting customer %: %', p_customer_uid, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION delete_customer_and_related_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_customer_and_related_data(uuid) TO service_role;