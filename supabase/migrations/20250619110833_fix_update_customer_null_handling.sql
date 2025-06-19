-- Fix update_customer_with_details_and_points function to handle NULL values correctly

-- Drop existing function
DROP FUNCTION IF EXISTS public.update_customer_with_details_and_points;

-- Create new function that converts empty strings to NULL
CREATE OR REPLACE FUNCTION public.update_customer_with_details_and_points(
  p_customer_uid uuid,
  p_detail_age integer,
  p_detail_birthday text,
  p_detail_email text,
  p_detail_gender text,
  p_detail_notes text,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_line_id text,
  p_line_user_name text,
  p_org_id text,
  p_phone text,
  p_tags text[],
  p_tenant_id text,
  p_total_points integer
)
RETURNS SETOF customer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    customer_exists boolean := false;
BEGIN
    -- Step 1: Check if customer exists
    SELECT EXISTS(
        SELECT 1 FROM public.customer 
        WHERE uid = p_customer_uid 
        AND tenant_id = p_tenant_id 
        AND org_id = p_org_id
        AND is_archive = false
    ) INTO customer_exists;
    
    IF NOT customer_exists THEN
        RAISE EXCEPTION 'Customer not found with uid: %, tenant_id: %, org_id: %', p_customer_uid, p_tenant_id, p_org_id;
    END IF;

    -- Step 2: Update customer table (convert empty strings to NULL)
    UPDATE public.customer SET
        email = NULLIF(p_email, ''),
        first_name = NULLIF(p_first_name, ''),
        last_name = NULLIF(p_last_name, ''),
        phone = NULLIF(p_phone, ''),
        line_id = NULLIF(p_line_id, ''),
        line_user_name = NULLIF(p_line_user_name, ''),
        tags = p_tags,
        updated_time = NOW(),
        updated_at = NOW()
    WHERE uid = p_customer_uid
    AND tenant_id = p_tenant_id
    AND org_id = p_org_id;

    -- Step 3: Update customer_detail table (UPSERT)
    INSERT INTO public.customer_detail (
        uid, customer_uid, email, gender, birthday, age, notes,
        _creation_time, updated_time, is_archive, tenant_id, org_id, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), 
        p_customer_uid, 
        NULLIF(p_detail_email, ''), 
        NULLIF(p_detail_gender, ''),
        CASE 
            WHEN p_detail_birthday IS NOT NULL AND p_detail_birthday != '' 
            THEN p_detail_birthday::date 
            ELSE NULL 
        END,
        p_detail_age, 
        NULLIF(p_detail_notes, ''),
        NOW(), NOW(), FALSE, p_tenant_id, p_org_id, NOW(), NOW()
    )
    ON CONFLICT (customer_uid, tenant_id, org_id) 
    DO UPDATE SET
        email = NULLIF(EXCLUDED.email, ''),
        gender = NULLIF(EXCLUDED.gender, ''),
        birthday = EXCLUDED.birthday,
        age = EXCLUDED.age,
        notes = NULLIF(EXCLUDED.notes, ''),
        updated_time = NOW(),
        updated_at = NOW();

    -- Step 4: Update customer_points table (UPSERT)
    INSERT INTO public.customer_points (
        uid, customer_uid, total_points, last_transaction_date_unix,
        _creation_time, updated_time, is_archive, tenant_id, org_id, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), p_customer_uid, p_total_points, EXTRACT(EPOCH FROM NOW()),
        NOW(), NOW(), FALSE, p_tenant_id, p_org_id, NOW(), NOW()
    )
    ON CONFLICT (customer_uid, tenant_id, org_id)
    DO UPDATE SET
        total_points = EXCLUDED.total_points,
        last_transaction_date_unix = EXCLUDED.last_transaction_date_unix,
        updated_time = NOW(),
        updated_at = NOW();

    -- Step 5: Return updated customer record
    RETURN QUERY SELECT * FROM public.customer WHERE uid = p_customer_uid;

EXCEPTION
    WHEN OTHERS THEN
        -- Log error and re-raise exception
        RAISE INFO 'Error in update_customer_with_details_and_points: SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
        RAISE;
END;
$function$;