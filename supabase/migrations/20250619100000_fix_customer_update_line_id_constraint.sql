-- 顧客更新時のline_id重複エラーを修正
-- line_idとline_user_nameが空文字列の場合は更新しないようにする

-- 既存の関数を削除
DROP FUNCTION IF EXISTS public.update_customer_with_details_and_points;

-- 新しい関数を作成（line_idとline_user_nameが空文字列の場合は既存の値を保持）
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
BEGIN
    -- ステップ1: 顧客の存在確認と既存のline_id、line_user_nameを取得
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

    -- 既存のline_idとline_user_nameを取得
    SELECT line_id, line_user_name INTO existing_line_id, existing_line_user_name
    FROM public.customer
    WHERE uid = p_customer_uid
    AND tenant_id = p_tenant_id
    AND org_id = p_org_id;

    -- ステップ2: customerテーブルを更新
    -- line_idとline_user_nameは空文字列の場合は既存の値を保持
    UPDATE public.customer SET
        email = p_email,
        first_name = p_first_name,
        last_name = p_last_name,
        phone = p_phone,
        line_id = CASE 
            WHEN p_line_id = '' OR p_line_id IS NULL THEN COALESCE(existing_line_id, '')
            ELSE p_line_id
        END,
        line_user_name = CASE 
            WHEN p_line_user_name = '' OR p_line_user_name IS NULL THEN COALESCE(existing_line_user_name, '')
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
        -- エラーログの出力と例外の再送出
        RAISE INFO 'Error in update_customer_with_details_and_points: SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
        RAISE;
END;
$function$;