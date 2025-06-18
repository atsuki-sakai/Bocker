-- メールアドレスの重複チェックと修正

-- 1. 重複しているメールアドレスを確認
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Checking for duplicate emails...';
    FOR r IN 
        SELECT email, tenant_id, org_id, COUNT(*) as count
        FROM public.customer
        WHERE email IS NOT NULL 
        AND email != ''
        AND is_archive = false
        GROUP BY email, tenant_id, org_id
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Duplicate email found: % in tenant: %, org: %, count: %', 
            r.email, r.tenant_id, r.org_id, r.count;
    END LOOP;
END $$;

-- 2. 既存の制約を確認
SELECT 
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class cl ON cl.oid = con.conrelid
WHERE cl.relname = 'customer'
AND con.conname LIKE '%email%';

-- 3. update_customer_with_details_and_points関数を修正
-- 自分自身を更新する場合は除外してチェックする
DROP FUNCTION IF EXISTS public.update_customer_with_details_and_points;

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
    existing_line_id text;
    existing_line_user_name text;
    email_duplicate_count integer;
BEGIN
    -- ステップ1: 顧客の存在確認
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

    -- メールアドレスの重複チェック（自分自身は除外）
    IF p_email IS NOT NULL AND p_email != '' THEN
        SELECT COUNT(*) INTO email_duplicate_count
        FROM public.customer
        WHERE tenant_id = p_tenant_id
        AND org_id = p_org_id
        AND email = p_email
        AND uid != p_customer_uid  -- 自分自身は除外
        AND is_archive = false;
        
        IF email_duplicate_count > 0 THEN
            RAISE EXCEPTION 'Email % already exists for another customer in this organization', p_email;
        END IF;
    END IF;

    -- 既存のline_idとline_user_nameを取得
    SELECT line_id, line_user_name INTO existing_line_id, existing_line_user_name
    FROM public.customer
    WHERE uid = p_customer_uid
    AND tenant_id = p_tenant_id
    AND org_id = p_org_id;

    -- ステップ2: customerテーブルを更新
    UPDATE public.customer SET
        email = p_email,
        first_name = p_first_name,
        last_name = p_last_name,
        phone = p_phone,
        line_id = CASE 
            WHEN p_line_id IS NULL THEN existing_line_id
            WHEN p_line_id = '' THEN existing_line_id
            ELSE p_line_id
        END,
        line_user_name = CASE 
            WHEN p_line_user_name IS NULL THEN existing_line_user_name
            WHEN p_line_user_name = '' THEN existing_line_user_name
            ELSE p_line_user_name
        END,
        tags = p_tags,
        updated_time = NOW(),
        updated_at = NOW()
    WHERE uid = p_customer_uid
    AND tenant_id = p_tenant_id
    AND org_id = p_org_id;

    -- ステップ3: customer_detailテーブルを更新（UPSERT）
    INSERT INTO public.customer_detail (
        uid, customer_uid, email, gender, birthday, age, notes,
        _creation_time, updated_time, is_archive, tenant_id, org_id, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), p_customer_uid, p_detail_email, p_detail_gender,
        CASE 
            WHEN p_detail_birthday IS NOT NULL AND p_detail_birthday != '' 
            THEN p_detail_birthday::date 
            ELSE NULL 
        END,
        p_detail_age, p_detail_notes,
        NOW(), NOW(), FALSE, p_tenant_id, p_org_id, NOW(), NOW()
    )
    ON CONFLICT (customer_uid, tenant_id, org_id) 
    DO UPDATE SET
        email = EXCLUDED.email,
        gender = EXCLUDED.gender,
        birthday = EXCLUDED.birthday,
        age = EXCLUDED.age,
        notes = EXCLUDED.notes,
        updated_time = NOW(),
        updated_at = NOW();

    -- ステップ4: customer_pointsテーブルを更新（UPSERT）
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

    -- ステップ5: 更新された顧客レコードを返す
    RETURN QUERY SELECT * FROM public.customer WHERE uid = p_customer_uid;

EXCEPTION
    WHEN OTHERS THEN
        RAISE INFO 'Error in update_customer_with_details_and_points: SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
        RAISE;
END;
$function$;