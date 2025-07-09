-- Fix delete_customer_and_related_data function to handle all customer_uid references
-- This function now properly deletes all related data using customer_uid

CREATE OR REPLACE FUNCTION "public"."delete_customer_and_related_data"("p_customer_uid" "uuid") 
RETURNS "void"
LANGUAGE "plpgsql"
AS $$
BEGIN
    -- Delete from all related tables in the correct order (child to parent)
    -- This ensures foreign key constraints are respected
    
    -- 1. Delete from carte_detail (references carte)
    DELETE FROM "public"."carte_detail" 
    WHERE "carte_id" IN (
        SELECT "id" FROM "public"."carte" 
        WHERE "customer_uid" = p_customer_uid
    );
    
    -- 2. Delete from carte (references customer)
    DELETE FROM "public"."carte" 
    WHERE "customer_uid" = p_customer_uid;
    
    -- 3. Delete from point_task_queue (references customer)
    DELETE FROM "public"."point_task_queue" 
    WHERE "customer_uid" = p_customer_uid;
    
    -- 4. Delete from point_transaction (references customer)
    DELETE FROM "public"."point_transaction" 
    WHERE "customer_uid" = p_customer_uid;
    
    -- 5. Delete from coupon_transaction (references customer)
    DELETE FROM "public"."coupon_transaction" 
    WHERE "customer_uid" = p_customer_uid;
    
    -- 6. Delete from reservation (references customer)
    DELETE FROM "public"."reservation" 
    WHERE "customer_uid" = p_customer_uid;
    
    -- 7. Delete from customer_points (references customer)
    DELETE FROM "public"."customer_points" 
    WHERE "customer_uid" = p_customer_uid;
    
    -- 8. Delete from customer_detail (references customer)
    DELETE FROM "public"."customer_detail" 
    WHERE "customer_uid" = p_customer_uid;
    
    -- 9. Finally, delete from customer (main table)
    DELETE FROM "public"."customer" 
    WHERE "uid" = p_customer_uid;
    
    -- Optional: Log the deletion
    RAISE NOTICE 'Successfully deleted customer with uid: %', p_customer_uid;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise
        RAISE NOTICE 'Error deleting customer with uid %: %', p_customer_uid, SQLERRM;
        RAISE;
END;
$$;

-- Update function ownership
ALTER FUNCTION "public"."delete_customer_and_related_data"("p_customer_uid" "uuid") OWNER TO "postgres";

-- Grant permissions to all roles
GRANT ALL ON FUNCTION "public"."delete_customer_and_related_data"("p_customer_uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_customer_and_related_data"("p_customer_uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_customer_and_related_data"("p_customer_uid" "uuid") TO "service_role";