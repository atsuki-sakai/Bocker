-- customerテーブルにtenant_idとorg_id列を追加

-- 1. tenant_id列とorg_id列を追加（NULLable）
ALTER TABLE public.customer 
ADD COLUMN IF NOT EXISTS tenant_id TEXT,
ADD COLUMN IF NOT EXISTS org_id TEXT;

-- 2. インデックスを作成（tenant_idとorg_idがNULLでない場合のみ）
CREATE INDEX IF NOT EXISTS customer_tenant_org_idx 
ON public.customer (tenant_id, org_id, is_archive)
WHERE tenant_id IS NOT NULL AND org_id IS NOT NULL;

-- 3. 既存のRPC関数を削除
DROP FUNCTION IF EXISTS search_customers_by_similarity(TEXT, TEXT, TEXT, INTEGER, INTEGER);

-- 4. 検索用RPC関数を新規作成（正しいフィールド名を使用）
CREATE OR REPLACE FUNCTION search_customers_by_similarity(
  p_tenant_id TEXT,
  p_org_id TEXT,
  p_search_term TEXT,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  uid TEXT,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  line_id TEXT,
  line_user_name TEXT,
  tenant_id TEXT,
  org_id TEXT,
  _creation_time TEXT,
  updated_time TEXT,
  similarity_score REAL
) 
LANGUAGE sql
AS $$
  SELECT 
    c.uid,
    c.email,
    c.first_name,
    c.last_name,
    c.phone,
    c.line_id,
    c.line_user_name,
    c.tenant_id,
    c.org_id,
    c._creation_time,
    c.updated_time,
    similarity(c.searchable_text, lower(p_search_term)) as similarity_score
  FROM public.customer c
  WHERE 
    c.tenant_id = p_tenant_id 
    AND c.org_id = p_org_id 
    AND c.is_archive = false
    AND c.searchable_text % lower(p_search_term)  -- pg_trgmの類似度フィルタ
  ORDER BY similarity(c.searchable_text, lower(p_search_term)) DESC
  LIMIT p_limit 
  OFFSET p_offset;
$$;

-- 5. コメント追加
COMMENT ON COLUMN public.customer.tenant_id IS 'テナントID';
COMMENT ON COLUMN public.customer.org_id IS '組織ID'; 