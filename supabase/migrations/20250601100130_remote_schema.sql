drop function if exists "public"."create_customer_with_details_and_points"(p_email text, p_first_name text, p_last_name text, p_phone text, p_salon_id text, p_line_id text, p_line_user_name text, p_password_hash text, p_detail_email text, p_detail_gender text, p_detail_birthday date, p_detail_age integer, p_detail_notes text, p_initial_points integer);

drop function if exists "public"."create_customer_with_details_and_points"(p_email text, p_first_name text, p_last_name text, p_phone text, p_salon_id text, p_line_id text, p_line_user_name text, p_password_hash text, p_detail_email text, p_detail_gender text, p_detail_birthday text, p_detail_age integer, p_detail_notes text, p_initial_points integer);

drop index if exists "public"."idx_customer_points_salon_id";

drop index if exists "public"."idx_customer_salon_id";

alter table "public"."customer" drop column "salon_id";

alter table "public"."customer_points" drop column "salon_id";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_customer_with_details_and_points(p_email text, p_first_name text, p_last_name text, p_phone text, p_tenant_id text, p_org_id text, p_line_id text, p_line_user_name text, p_password_hash text, p_detail_email text, p_detail_gender text, p_detail_birthday text, p_detail_age integer, p_detail_notes text, p_initial_points integer)
 RETURNS SETOF customer
 LANGUAGE plpgsql
AS $function$
DECLARE
    new_customer_uid UUID;
BEGIN
    -- ステップ1: customerテーブルに挿入
    INSERT INTO public.customer (
        uid, email, first_name, last_name, phone, tenant_id, org_id, line_id, line_user_name, password_hash,
        _creation_time, updated_time, is_archive, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), p_email, p_first_name, p_last_name, p_phone, p_tenant_id, p_org_id, p_line_id, p_line_user_name, p_password_hash,
        NOW(), NOW(), FALSE, NOW(), NOW()
    ) RETURNING uid INTO new_customer_uid;

    -- ステップ2: customer_detailテーブルに挿入
    INSERT INTO public.customer_detail (
        uid, customer_uid, email, gender, birthday, age, notes,
        _creation_time, updated_time, is_archive, tenant_id, org_id, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), new_customer_uid, p_detail_email, p_detail_gender, 
        CASE 
            WHEN p_detail_birthday IS NOT NULL AND p_detail_birthday != '' 
            THEN p_detail_birthday::date 
            ELSE NULL 
        END, 
        p_detail_age, p_detail_notes,
        NOW(), NOW(), FALSE, p_tenant_id, p_org_id, NOW(), NOW()
    );

    -- ステップ3: customer_pointsテーブルに挿入
    INSERT INTO public.customer_points (
        uid, customer_uid, total_points, last_transaction_date_unix,
        _creation_time, updated_time, is_archive, tenant_id, org_id, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), new_customer_uid, p_initial_points, EXTRACT(EPOCH FROM NOW()),
        NOW(), NOW(), FALSE, p_tenant_id, p_org_id, NOW(), NOW()
    );

    -- ステップ4: 新しく作成されたカスタマーレコードを返す
    RETURN QUERY SELECT * FROM public.customer WHERE uid = new_customer_uid;

EXCEPTION
    WHEN OTHERS THEN
        -- エラーログの出力と例外の再送出
        RAISE INFO 'Error in create_customer_with_details_and_points: SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
        RAISE;
END;
$function$
;


