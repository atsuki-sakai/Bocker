-- PostgreSQL関数のデフォルト値付き引数を正しい順序に修正
-- デフォルト値付きの引数は必ず最後にまとめる必要があります

-- 既存の関数を削除
DROP FUNCTION IF EXISTS public.create_customer_with_details_and_points;

-- 新しい関数を作成（デフォルト値なしの引数を先に、デフォルト値ありを最後に）
CREATE OR REPLACE FUNCTION public.create_customer_with_details_and_points(
  -- デフォルト値なしの引数（必須パラメータ）
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_tenant_id text,
  p_org_id text,
  p_line_id text,
  p_line_user_name text,
  p_detail_email text,
  p_detail_gender text,
  p_detail_birthday text,
  p_detail_age integer,
  p_detail_notes text,
  -- デフォルト値ありの引数（オプションパラメータ）を最後にまとめる
  p_password_hash text DEFAULT '',
  p_initial_points integer DEFAULT 0
)
RETURNS SETOF customer
LANGUAGE plpgsql
SECURITY DEFINER
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
$function$;

-- 顧客データ更新用RPC関数を追加
CREATE OR REPLACE FUNCTION public.update_customer_with_details_and_points(
  -- 必須パラメータ（顧客特定用）
  p_customer_uid uuid,
  p_tenant_id text,
  p_org_id text,
  -- 更新データ
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_line_id text,
  p_line_user_name text,
  p_detail_email text,
  p_detail_gender text,
  p_detail_birthday text,
  p_detail_age integer,
  p_detail_notes text,
  p_total_points integer,
  -- タグ配列パラメータ
  p_tags text[] DEFAULT ARRAY[]::text[]
)
RETURNS SETOF customer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    customer_exists boolean := false;
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

    -- ステップ2: customerテーブルを更新
    UPDATE public.customer SET
        email = p_email,
        first_name = p_first_name,
        last_name = p_last_name,
        phone = p_phone,
        line_id = p_line_id,
        line_user_name = p_line_user_name,
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