-- salon_idをtenant_idとorg_idで完全に置き換える (customer関連のみ)

-- 1. customerテーブルからsalon_idを削除し、tenant_idとorg_idを追加
ALTER TABLE public.customer 
DROP COLUMN IF EXISTS salon_id;

ALTER TABLE public.customer 
ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS org_id TEXT NOT NULL DEFAULT '';

-- 2. customer_pointsテーブルからもsalon_idを削除し、tenant_idとorg_idを追加  
ALTER TABLE public.customer_points
DROP COLUMN IF EXISTS salon_id;

ALTER TABLE public.customer_points
ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS org_id TEXT NOT NULL DEFAULT '';

-- 3. customer_detailテーブルにもtenant_idとorg_idを追加
ALTER TABLE public.customer_detail
ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS org_id TEXT NOT NULL DEFAULT '';

-- 4. インデックスを再作成
DROP INDEX IF EXISTS customer_tenant_org_idx;
CREATE INDEX customer_tenant_org_idx 
ON public.customer (tenant_id, org_id, is_archive);

-- 5. customer_pointsのインデックスも作成
CREATE INDEX customer_points_tenant_org_idx 
ON public.customer_points (tenant_id, org_id, customer_uid);

-- 6. create_customer_with_details_and_pointsファンクションを更新
DROP FUNCTION IF EXISTS create_customer_with_details_and_points;

CREATE OR REPLACE FUNCTION create_customer_with_details_and_points(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT,
  p_tenant_id TEXT,
  p_org_id TEXT,
  p_line_id TEXT,
  p_line_user_name TEXT,
  p_password_hash TEXT,
  p_detail_email TEXT,
  p_detail_gender TEXT,
  p_detail_birthday TEXT,
  p_detail_age INTEGER,
  p_detail_notes TEXT,
  p_initial_points INTEGER
)
RETURNS TABLE (
  uid TEXT,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  tenant_id TEXT,
  org_id TEXT,
  line_id TEXT,
  line_user_name TEXT,
  _creation_time TEXT,
  updated_time TEXT,
  searchable_text TEXT,
  is_archive BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  customer_uid TEXT;
  customer_detail_uid TEXT;
  customer_points_uid TEXT;
BEGIN
  -- UIDを生成
  customer_uid := gen_random_uuid()::TEXT;
  customer_detail_uid := gen_random_uuid()::TEXT;
  customer_points_uid := gen_random_uuid()::TEXT;

  -- 顧客を作成
  INSERT INTO public.customer (
    uid, email, first_name, last_name, phone, tenant_id, org_id,
    line_id, line_user_name, password_hash, _creation_time, updated_time, is_archive
  ) VALUES (
    customer_uid, p_email, p_first_name, p_last_name, p_phone, p_tenant_id, p_org_id,
    p_line_id, p_line_user_name, p_password_hash, NOW(), NOW(), false
  );

  -- 顧客詳細を作成
  INSERT INTO public.customer_detail (
    uid, customer_uid, tenant_id, org_id, email, gender, birthday, age, notes, 
    _creation_time, updated_time, is_archive
  ) VALUES (
    customer_detail_uid, customer_uid, p_tenant_id, p_org_id, p_detail_email, 
    p_detail_gender, p_detail_birthday, p_detail_age, p_detail_notes,
    NOW(), NOW(), false
  );

  -- 顧客ポイントを作成
  INSERT INTO public.customer_points (
    uid, customer_uid, tenant_id, org_id, total_points, 
    _creation_time, updated_time, is_archive
  ) VALUES (
    customer_points_uid, customer_uid, p_tenant_id, p_org_id, p_initial_points,
    NOW(), NOW(), false
  );

  -- 作成された顧客情報を返す
  RETURN QUERY
  SELECT 
    c.uid,
    c.email,
    c.first_name,
    c.last_name,
    c.phone,
    c.tenant_id,
    c.org_id,
    c.line_id,
    c.line_user_name,
    c._creation_time,
    c.updated_time,
    c.searchable_text,
    c.is_archive
  FROM public.customer c
  WHERE c.uid = customer_uid;
END;
$$;

-- 7. コメント追加
COMMENT ON COLUMN public.customer.tenant_id IS 'テナントID（salon_idの置き換え）';
COMMENT ON COLUMN public.customer.org_id IS '組織ID';
COMMENT ON COLUMN public.customer_detail.tenant_id IS 'テナントID';
COMMENT ON COLUMN public.customer_detail.org_id IS '組織ID';
COMMENT ON COLUMN public.customer_points.tenant_id IS 'テナントID';
COMMENT ON COLUMN public.customer_points.org_id IS '組織ID'; 