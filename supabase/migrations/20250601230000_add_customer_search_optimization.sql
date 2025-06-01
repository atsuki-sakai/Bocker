-- 顧客検索のパフォーマンス最適化
-- pg_trgm拡張を使用した高速部分一致検索の実装

-- 1. pg_trgm拡張を有効化（部分一致検索の高速化）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. 検索対象フィールドを統合したsearchable_text列を追加
-- Generated columnとして、名前・電話番号・メールアドレスを小文字で結合
ALTER TABLE public.customer 
ADD COLUMN IF NOT EXISTS searchable_text TEXT 
GENERATED ALWAYS AS (
  lower(
    coalesce(first_name, '') || ' ' ||
    coalesce(last_name, '') || ' ' ||
    coalesce(line_user_name, '') || ' ' ||
    coalesce(phone, '') || ' ' ||
    coalesce(email, '')
  )
) STORED;

-- 3. GINインデックスを作成（pg_trgmを使用した高速部分一致検索）
CREATE INDEX IF NOT EXISTS customer_search_trgm_idx 
ON public.customer 
USING gin (searchable_text gin_trgm_ops);

-- 4. tenant_id + org_id + is_archiveの複合インデックス（基本フィルタ用）
CREATE INDEX IF NOT EXISTS customer_tenant_org_idx 
ON public.customer (tenant_id, org_id, is_archive);

-- 5. searchable_textでフィルタした後のソート用インデックス
CREATE INDEX IF NOT EXISTS customer_creation_time_idx 
ON public.customer (_creation_time DESC) 
WHERE is_archive = false;

-- 6. 検索用RPC関数を作成（類似度順ソート対応）
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
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
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
    c.created_at,
    c.updated_at,
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

-- 7. コメント追加
COMMENT ON COLUMN public.customer.searchable_text IS '検索用統合テキスト（名前・電話・メール等を小文字で結合）';
COMMENT ON INDEX customer_search_trgm_idx IS 'pg_trgmを使用した顧客検索用GINインデックス';
COMMENT ON INDEX customer_tenant_org_idx IS 'テナント・組織での基本フィルタ用インデックス';
COMMENT ON FUNCTION search_customers_by_similarity IS '類似度順での顧客検索RPC関数'; 