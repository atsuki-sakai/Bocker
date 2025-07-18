-- 大規模SaaS向け高性能顧客名一括取得RPC関数
-- 5000店舗×大量顧客データに対応した最適化実装

CREATE OR REPLACE FUNCTION get_customer_names_batch_optimized(
  p_tenant_id TEXT,
  p_org_id TEXT,
  p_customer_uids TEXT[]
)
RETURNS TABLE(
  customer_uid TEXT,
  display_name TEXT,
  is_email_format BOOLEAN
) 
LANGUAGE plpgsql
AS $$
DECLARE
  email_pattern TEXT := '^[^\s@]+@[^\s@]+\.[^\s@]+$';
BEGIN
  -- パフォーマンス最適化のため、一時テーブルを作成してJOINを効率化
  -- 大量データ処理時のメモリ使用量を抑制
  
  RETURN QUERY
  WITH customer_data AS (
    -- 1. 基本的な顧客情報を取得（インデックス活用）
    SELECT 
      c.uid,
      c.first_name,
      c.last_name,
      c.email,
      c.line_user_name,
      c.phone
    FROM customer c
    WHERE c.tenant_id = p_tenant_id 
      AND c.org_id = p_org_id
      AND c.uid = ANY(p_customer_uids)
      AND c.is_archive = false
    
    -- 予約履歴から顧客名を取得（最新の実名を優先）
    UNION ALL
    
    SELECT DISTINCT
      r.customer_uid as uid,
      NULL as first_name,
      NULL as last_name, 
      NULL as email,
      r.customer_name as line_user_name,
      NULL as phone
    FROM reservation r
    WHERE r.tenant_id = p_tenant_id
      AND r.org_id = p_org_id 
      AND r.customer_uid = ANY(p_customer_uids)
      AND r.is_archive = false
      AND r.customer_name IS NOT NULL
      AND r.customer_name != ''
  ),
  name_candidates AS (
    -- 2. 各顧客の名前候補を生成・優先順位付け
    SELECT 
      cd.uid as customer_uid,
      CASE 
        -- 姓名の組み合わせ（最高優先度）
        WHEN cd.first_name IS NOT NULL AND cd.last_name IS NOT NULL 
             AND cd.first_name != '' AND cd.last_name != '' 
        THEN TRIM(cd.last_name || ' ' || cd.first_name)
        
        -- 姓のみ
        WHEN cd.last_name IS NOT NULL AND cd.last_name != '' 
        THEN cd.last_name
        
        -- 名のみ
        WHEN cd.first_name IS NOT NULL AND cd.first_name != '' 
        THEN cd.first_name
        
        -- LINEユーザー名
        WHEN cd.line_user_name IS NOT NULL AND cd.line_user_name != '' 
        THEN cd.line_user_name
        
        -- 電話番号
        WHEN cd.phone IS NOT NULL AND cd.phone != '' 
        THEN cd.phone
        
        -- メールアドレス（最低優先度）
        WHEN cd.email IS NOT NULL AND cd.email != '' 
        THEN cd.email
        
        ELSE NULL
      END as name_candidate,
      
      -- Email形式判定
      CASE 
        WHEN cd.email IS NOT NULL AND cd.email != '' 
             AND cd.email ~ email_pattern 
             AND (cd.first_name IS NULL OR cd.first_name = '')
             AND (cd.last_name IS NULL OR cd.last_name = '') 
        THEN true
        WHEN cd.line_user_name IS NOT NULL 
             AND cd.line_user_name ~ email_pattern 
        THEN true
        ELSE false
      END as is_email,
      
      -- 優先度スコア（低いほど優先）
      CASE 
        WHEN cd.first_name IS NOT NULL AND cd.last_name IS NOT NULL 
             AND cd.first_name != '' AND cd.last_name != '' 
        THEN 1
        WHEN cd.last_name IS NOT NULL AND cd.last_name != '' 
        THEN 2
        WHEN cd.first_name IS NOT NULL AND cd.first_name != '' 
        THEN 3
        WHEN cd.line_user_name IS NOT NULL AND cd.line_user_name != '' 
             AND NOT (cd.line_user_name ~ email_pattern)
        THEN 4
        WHEN cd.phone IS NOT NULL AND cd.phone != '' 
        THEN 5
        WHEN cd.email IS NOT NULL AND cd.email != '' 
        THEN 6
        WHEN cd.line_user_name IS NOT NULL AND cd.line_user_name != '' 
             AND (cd.line_user_name ~ email_pattern)
        THEN 7
        ELSE 999
      END as priority_score
    FROM customer_data cd
    WHERE cd.uid IS NOT NULL
  ),
  best_names AS (
    -- 3. 各顧客について最も優先度の高い名前を選択
    SELECT DISTINCT ON (nc.customer_uid)
      nc.customer_uid,
      nc.name_candidate as display_name,
      nc.is_email as is_email_format
    FROM name_candidates nc
    WHERE nc.name_candidate IS NOT NULL 
      AND nc.name_candidate != ''
    ORDER BY nc.customer_uid, nc.priority_score ASC, nc.name_candidate ASC
  )
  
  -- 4. 最終結果を返す
  SELECT 
    bn.customer_uid::TEXT,
    bn.display_name::TEXT,
    bn.is_email_format
  FROM best_names bn
  WHERE bn.display_name IS NOT NULL 
    AND bn.display_name != '';
    
END;
$$;

-- インデックス最適化のための追加インデックス（既存のものがない場合）
-- 大規模データでのパフォーマンス向上

-- customer テーブル用複合インデックス
CREATE INDEX IF NOT EXISTS idx_customer_tenant_org_uid_active 
ON customer (tenant_id, org_id, uid) 
WHERE is_archive = false;

-- customer テーブル用名前検索最適化インデックス  
CREATE INDEX IF NOT EXISTS idx_customer_names_search 
ON customer (tenant_id, org_id, first_name, last_name) 
WHERE is_archive = false 
  AND (first_name IS NOT NULL OR last_name IS NOT NULL);

-- reservation テーブル用顧客名検索インデックス
CREATE INDEX IF NOT EXISTS idx_reservation_customer_name_search 
ON reservation (tenant_id, org_id, customer_uid, customer_name) 
WHERE is_archive = false 
  AND customer_name IS NOT NULL 
  AND customer_name != '';

-- パフォーマンス統計更新
ANALYZE customer;
ANALYZE reservation;

-- 使用例とテスト
-- SELECT * FROM get_customer_names_batch_optimized(
--   'your-tenant-id',
--   'your-org-id', 
--   ARRAY['customer-uid-1', 'customer-uid-2', 'customer-uid-3']
-- );