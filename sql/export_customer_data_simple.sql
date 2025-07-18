-- 大規模SaaS向け顧客データエクスポートRPC関数群（シンプル版）
-- UUID型エラーを完全に回避した実装

-- 1. シンプルな顧客データエクスポート関数
CREATE OR REPLACE FUNCTION export_customer_data_optimized_v2(
  p_tenant_id TEXT,
  p_org_id TEXT,
  p_export_type TEXT, -- 'all', 'by_ids', 'by_count'
  p_customer_uids TEXT[] DEFAULT NULL,
  p_max_count INTEGER DEFAULT 1000,
  p_offset INTEGER DEFAULT 0,
  p_filters JSONB DEFAULT NULL,
  p_include_details BOOLEAN DEFAULT FALSE,
  p_include_points BOOLEAN DEFAULT FALSE,
  p_include_reservation_stats BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  customers JSONB,
  total_count INTEGER,
  exported_count INTEGER,
  has_more BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_count INT := 0;
  v_exported_count INT := 0;
  v_has_more BOOLEAN := false;
  result_data JSONB := '[]'::JSONB;
BEGIN
  -- 入力バリデーション
  IF p_export_type NOT IN ('all', 'by_ids', 'by_count') THEN
    RAISE EXCEPTION '無効なエクスポートタイプ: %', p_export_type;
  END IF;
  
  -- 総件数を取得
  SELECT COUNT(*) INTO v_total_count
  FROM customer c
  WHERE c.tenant_id = p_tenant_id 
    AND c.org_id = p_org_id
    AND c.is_archive = false
    AND CASE 
      WHEN p_export_type = 'by_ids' AND p_customer_uids IS NOT NULL 
      THEN c.uid::TEXT = ANY(p_customer_uids)
      ELSE TRUE
    END;
  
  -- データを取得してJSONBに変換
  WITH customer_data AS (
    SELECT 
      c.uid::TEXT as uid,
      c.email,
      c.first_name,
      c.last_name,
      c.phone,
      c.line_id,
      c.line_user_name,
      c.customer_type,
      c.total_reservation_count,
      c.last_reservation_date_unix,
      c.created_at::TEXT as created_at
    FROM customer c
    WHERE c.tenant_id = p_tenant_id 
      AND c.org_id = p_org_id
      AND c.is_archive = false
      AND CASE 
        WHEN p_export_type = 'by_ids' AND p_customer_uids IS NOT NULL 
        THEN c.uid::TEXT = ANY(p_customer_uids)
        ELSE TRUE
      END
    ORDER BY c.created_at DESC
    LIMIT CASE 
      WHEN p_export_type = 'all' THEN NULL
      ELSE p_max_count
    END
    OFFSET p_offset
  )
  SELECT jsonb_agg(row_to_json(customer_data)) INTO result_data
  FROM customer_data;
  
  -- エクスポート件数を計算
  v_exported_count := COALESCE(jsonb_array_length(result_data), 0);
  v_has_more := (p_offset + v_exported_count) < v_total_count;
  
  RETURN QUERY 
  SELECT 
    COALESCE(result_data, '[]'::JSONB),
    v_total_count,
    v_exported_count,
    v_has_more;
END;
$$;

-- 2. シンプルなCSVエクスポート関数
CREATE OR REPLACE FUNCTION export_customers_csv_optimized_v2(
  p_tenant_id TEXT,
  p_org_id TEXT,
  p_batch_size INTEGER DEFAULT 1000,
  p_offset INTEGER DEFAULT 0,
  p_customer_uids TEXT[] DEFAULT NULL,
  p_include_headers BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  csv_data TEXT,
  total_count INTEGER,
  has_more BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  csv_content TEXT := '';
  csv_header TEXT := '顧客ID,メールアドレス,名,姓,電話番号,LINE ID,LINEユーザー名,顧客タイプ,予約回数,最終予約日,登録日';
  v_total_count INTEGER := 0;
  v_has_more BOOLEAN := FALSE;
  csv_rows TEXT;
BEGIN
  -- 総件数取得
  SELECT COUNT(*) INTO v_total_count
  FROM customer
  WHERE tenant_id = p_tenant_id 
    AND org_id = p_org_id 
    AND is_archive = false
    AND CASE 
      WHEN p_customer_uids IS NOT NULL 
      THEN uid::TEXT = ANY(p_customer_uids)
      ELSE TRUE
    END;
  
  -- CSVヘッダー
  IF p_include_headers THEN
    csv_content := csv_header || E'\n';
  END IF;
  
  -- CSVデータ生成（シンプルな文字列連結）
  SELECT string_agg(
    concat_ws(',',
      '"' || COALESCE(uid::TEXT, '') || '"',
      '"' || COALESCE(email, '') || '"',
      '"' || COALESCE(first_name, '') || '"',
      '"' || COALESCE(last_name, '') || '"',
      '"' || COALESCE(phone, '') || '"',
      '"' || COALESCE(line_id, '') || '"',
      '"' || COALESCE(line_user_name, '') || '"',
      '"' || COALESCE(customer_type, '') || '"',
      COALESCE(total_reservation_count, 0)::TEXT,
      CASE 
        WHEN last_reservation_date_unix IS NOT NULL 
        THEN '"' || to_timestamp(last_reservation_date_unix)::DATE::TEXT || '"'
        ELSE '""'
      END,
      '"' || created_at::DATE::TEXT || '"'
    ), E'\n'
  ) INTO csv_rows
  FROM (
    SELECT 
      uid, email, first_name, last_name, phone,
      line_id, line_user_name, customer_type,
      total_reservation_count, last_reservation_date_unix,
      created_at
    FROM customer
    WHERE tenant_id = p_tenant_id 
      AND org_id = p_org_id 
      AND is_archive = false
      AND CASE 
        WHEN p_customer_uids IS NOT NULL 
        THEN uid::TEXT = ANY(p_customer_uids)
        ELSE TRUE
      END
    ORDER BY created_at DESC
    LIMIT p_batch_size
    OFFSET p_offset
  ) sub;
  
  -- CSVコンテンツを結合
  csv_content := csv_content || COALESCE(csv_rows, '');
  
  -- さらにデータがあるか判定
  v_has_more := (p_offset + p_batch_size) < v_total_count;
  
  RETURN QUERY 
  SELECT 
    csv_content,
    v_total_count,
    v_has_more;
END;
$$;

-- インデックス最適化
CREATE INDEX IF NOT EXISTS idx_customer_tenant_org_created 
ON customer (tenant_id, org_id, created_at DESC) 
WHERE is_archive = false;

-- パフォーマンス統計更新
ANALYZE customer;

-- 使用例
/*
-- 全件CSV形式エクスポート（日本語ヘッダー付き）
SELECT * FROM export_customers_csv_optimized_v2(
  'tenant-id',
  'org-id',
  500,   -- バッチサイズ
  0,     -- オフセット
  NULL,  -- 全顧客
  true   -- 日本語ヘッダー含む
);

-- 選択した顧客のみCSVエクスポート
SELECT * FROM export_customers_csv_optimized_v2(
  'tenant-id',
  'org-id',
  1000,
  0,
  ARRAY['customer-uid-1', 'customer-uid-2'],
  true
);
*/