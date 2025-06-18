-- 既存の一意制約を削除して、部分インデックスに置き換える
-- 空文字列やNULLは一意制約の対象外にする

-- 1. 既存のemail一意制約を確認
DO $$
DECLARE
    constraint_exists boolean;
BEGIN
    -- customer_tenant_org_email_unique制約が存在するか確認
    SELECT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'customer_tenant_org_email_unique'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        -- 制約が存在する場合は削除
        ALTER TABLE public.customer DROP CONSTRAINT customer_tenant_org_email_unique;
        RAISE NOTICE 'Dropped constraint customer_tenant_org_email_unique';
    END IF;
    
    -- インデックスとして存在する可能性もあるので確認
    IF EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'customer_tenant_org_email_unique'
    ) THEN
        DROP INDEX IF EXISTS public.customer_tenant_org_email_unique;
        RAISE NOTICE 'Dropped index customer_tenant_org_email_unique';
    END IF;
END $$;

-- 2. 既存のline_id一意制約を確認
DO $$
DECLARE
    constraint_exists boolean;
BEGIN
    -- customer_tenant_org_line_id_unique制約が存在するか確認
    SELECT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'customer_tenant_org_line_id_unique'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        -- 制約が存在する場合は削除
        ALTER TABLE public.customer DROP CONSTRAINT customer_tenant_org_line_id_unique;
        RAISE NOTICE 'Dropped constraint customer_tenant_org_line_id_unique';
    END IF;
    
    -- インデックスとして存在する可能性もあるので確認
    IF EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'customer_tenant_org_line_id_unique'
    ) THEN
        DROP INDEX IF EXISTS public.customer_tenant_org_line_id_unique;
        RAISE NOTICE 'Dropped index customer_tenant_org_line_id_unique';
    END IF;
END $$;

-- 3. 新しい部分インデックスを作成
-- emailが空文字列でもNULLでもない場合のみ一意性を保証
CREATE UNIQUE INDEX IF NOT EXISTS customer_tenant_org_email_unique 
ON public.customer (tenant_id, org_id, email) 
WHERE email IS NOT NULL 
  AND email != '' 
  AND is_archive = false;

-- line_idが空文字列でもNULLでもない場合のみ一意性を保証
CREATE UNIQUE INDEX IF NOT EXISTS customer_tenant_org_line_id_unique 
ON public.customer (tenant_id, org_id, line_id) 
WHERE line_id IS NOT NULL 
  AND line_id != '' 
  AND is_archive = false;

-- 4. update_customer_with_details_and_points関数を簡略化
-- 重複チェックは不要になったので削除
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
    -- NULLの場合は更新しない（COALESCEで既存の値を保持）
    UPDATE public.customer SET
        email = COALESCE(p_email, email),
        first_name = COALESCE(p_first_name, first_name),
        last_name = COALESCE(p_last_name, last_name),
        phone = COALESCE(p_phone, phone),
        line_id = COALESCE(p_line_id, line_id),
        line_user_name = COALESCE(p_line_user_name, line_user_name),
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
        -- エラーログの出力
        RAISE INFO 'Error in update_customer_with_details_and_points: SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
        RAISE;
END;
$function$;

-- 5. 現在のデータ状況を確認（デバッグ用）
DO $$
DECLARE
    empty_email_count integer;
    null_email_count integer;
    empty_line_count integer;
    null_line_count integer;
BEGIN
    -- 空のメールアドレスの数を確認
    SELECT COUNT(*) INTO empty_email_count
    FROM public.customer
    WHERE email = ''
    AND is_archive = false;
    
    SELECT COUNT(*) INTO null_email_count
    FROM public.customer
    WHERE email IS NULL
    AND is_archive = false;
    
    -- 空のLINE IDの数を確認
    SELECT COUNT(*) INTO empty_line_count
    FROM public.customer
    WHERE line_id = ''
    AND is_archive = false;
    
    SELECT COUNT(*) INTO null_line_count
    FROM public.customer
    WHERE line_id IS NULL
    AND is_archive = false;
    
    RAISE NOTICE 'Empty emails: %, NULL emails: %', empty_email_count, null_email_count;
    RAISE NOTICE 'Empty line_ids: %, NULL line_ids: %', empty_line_count, null_line_count;
END $$;