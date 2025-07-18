-- 大規模SaaS向け顧客データエクスポートRPC関数群
-- 5000店舗×大量顧客データに対応した高性能エクスポート実装

-- 1. 顧客データエクスポート用RPC関数
CREATE OR REPLACE FUNCTION export_customer_data_optimized(
  p_tenant_id TEXT,
  p_org_id TEXT,
  p_export_type TEXT, -- 'all', 'by_ids', 'by_count'
  p_customer_uids TEXT[] DEFAULT NULL,
  p_max_count INTEGER DEFAULT NULL,
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
  filter_obj JSONB := COALESCE(p_filters, '{}'::JSONB);
  customer_data JSONB := '[]'::JSONB;
  total_customers INTEGER := 0;
  actual_exported INTEGER := 0;
  has_more_data BOOLEAN := FALSE;
BEGIN
  -- 一時テーブルを作成してパフォーマンス最適化
  CREATE TEMP TABLE temp_customers ON COMMIT DROP AS
  SELECT DISTINCT
    c.uid,
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
    AND (
      CASE 
        WHEN p_export_type = 'by_ids' THEN c.uid = ANY(p_customer_uids)
        ELSE TRUE
      END
    )
    AND (
      CASE 
        WHEN filter_obj ? 'customerType' THEN c.customer_type = (filter_obj->>'customerType')
        ELSE TRUE
      END
    )
    AND (
      CASE 
        WHEN filter_obj ? 'hasReservations' AND (filter_obj->>'hasReservations')::BOOLEAN = true 
        THEN c.total_reservation_count > 0
        WHEN filter_obj ? 'hasReservations' AND (filter_obj->>'hasReservations')::BOOLEAN = false 
        THEN COALESCE(c.total_reservation_count, 0) = 0
        ELSE TRUE
      END
    )
    AND (
      CASE 
        WHEN filter_obj ? 'registrationDateFrom' 
        THEN c.created_at >= (filter_obj->>'registrationDateFrom')::TIMESTAMP
        ELSE TRUE
      END
    )
    AND (
      CASE 
        WHEN filter_obj ? 'registrationDateTo' 
        THEN c.created_at <= (filter_obj->>'registrationDateTo')::TIMESTAMP
        ELSE TRUE
      END
    )
  ORDER BY c.created_at DESC;

  -- 総件数を取得
  SELECT COUNT(*) INTO total_customers FROM temp_customers;

  -- エクスポート対象データを選択
  WITH export_customers AS (
    SELECT tc.*
    FROM temp_customers tc
    ORDER BY tc.created_at DESC
    LIMIT CASE 
      WHEN p_export_type = 'by_count' THEN COALESCE(p_max_count, 1000)
      WHEN p_export_type = 'all' THEN NULL
      ELSE NULL
    END
    OFFSET p_offset
  ),
  enriched_customers AS (
    SELECT 
      ec.*,
      -- 詳細情報（オプション）
      CASE 
        WHEN p_include_details THEN cd.gender 
        ELSE NULL 
      END as detail_gender,
      CASE 
        WHEN p_include_details THEN cd.birthday 
        ELSE NULL 
      END as detail_birthday,
      CASE 
        WHEN p_include_details THEN cd.age 
        ELSE NULL 
      END as detail_age,
      CASE 
        WHEN p_include_details THEN cd.notes 
        ELSE NULL 
      END as detail_notes,
      -- ポイント情報（オプション）
      CASE 
        WHEN p_include_points THEN cp.total_points 
        ELSE NULL 
      END as total_points,
      CASE 
        WHEN p_include_points THEN cp.last_transaction_date_unix 
        ELSE NULL 
      END as last_transaction_date_unix,
      -- 予約統計（オプション - 簡略化版）
      CASE 
        WHEN p_include_reservation_stats THEN COALESCE(ec.total_reservation_count, 0)
        ELSE NULL 
      END as reservation_total_count,
      CASE 
        WHEN p_include_reservation_stats THEN 0 -- 簡略化：詳細統計は別途計算
        ELSE NULL 
      END as reservation_completed_count,
      CASE 
        WHEN p_include_reservation_stats THEN 0 -- 簡略化：詳細統計は別途計算  
        ELSE NULL 
      END as reservation_cancelled_count,
      CASE 
        WHEN p_include_reservation_stats THEN 0 -- 簡略化：詳細統計は別途計算
        ELSE NULL 
      END as reservation_total_amount
    FROM export_customers ec
    LEFT JOIN customer_detail cd ON cd.customer_uid = ec.uid 
      AND cd.tenant_id = p_tenant_id 
      AND cd.org_id = p_org_id 
      AND cd.is_archive = false
      AND p_include_details
    LEFT JOIN customer_points cp ON cp.customer_uid = ec.uid 
      AND cp.tenant_id = p_tenant_id 
      AND cp.org_id = p_org_id 
      AND cp.is_archive = false
      AND p_include_points
  )
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'uid', enc.uid,
        'email', enc.email,
        'first_name', enc.first_name,
        'last_name', enc.last_name,
        'phone', enc.phone,
        'line_id', enc.line_id,
        'line_user_name', enc.line_user_name,
        'customer_type', enc.customer_type,
        'total_reservation_count', enc.total_reservation_count,
        'last_reservation_date_unix', enc.last_reservation_date_unix,
        'created_at', enc.created_at,
        'detail_gender', enc.detail_gender,
        'detail_birthday', enc.detail_birthday,
        'detail_age', enc.detail_age,
        'detail_notes', enc.detail_notes,
        'total_points', enc.total_points,
        'last_transaction_date_unix', enc.last_transaction_date_unix,
        'reservation_total_count', enc.reservation_total_count,
        'reservation_completed_count', enc.reservation_completed_count,
        'reservation_cancelled_count', enc.reservation_cancelled_count,
        'reservation_total_amount', enc.reservation_total_amount
      )
    ),
    COUNT(*)::INTEGER
  INTO customer_data, actual_exported
  FROM enriched_customers enc;

  -- さらにデータがあるかチェック
  has_more_data := (p_offset + actual_exported) < total_customers;

  -- 結果を返す
  RETURN QUERY
  SELECT 
    COALESCE(customer_data, '[]'::JSONB) as customers,
    total_customers as total_count,
    COALESCE(actual_exported, 0) as exported_count,
    has_more_data as has_more;

END;
$$;

-- 2. CSVエクスポート用RPC関数
CREATE OR REPLACE FUNCTION export_customers_csv_optimized(
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
  csv_header TEXT := 'uid,email,firstName,lastName,phone,customerType,totalReservations,createdAt';
  total_customers INTEGER := 0;
  has_more_data BOOLEAN := FALSE;
BEGIN
  -- 総件数を取得
  SELECT COUNT(*) INTO total_customers
  FROM customer c
  WHERE c.tenant_id = p_tenant_id 
    AND c.org_id = p_org_id
    AND c.is_archive = false
    AND (
      CASE 
        WHEN p_customer_uids IS NOT NULL THEN c.uid = ANY(p_customer_uids)
        ELSE TRUE
      END
    );

  -- CSVヘッダーを追加
  IF p_include_headers THEN
    csv_content := csv_header || E'\n';
  END IF;

  -- CSVデータを生成（PostgreSQLのCSV形式を使用）
  SELECT 
    csv_content || string_agg(
      quote_literal(c.uid) || ',' ||
      COALESCE(quote_literal(c.email), 'NULL') || ',' ||
      COALESCE(quote_literal(c.first_name), 'NULL') || ',' ||
      COALESCE(quote_literal(c.last_name), 'NULL') || ',' ||
      COALESCE(quote_literal(c.phone), 'NULL') || ',' ||
      COALESCE(quote_literal(c.customer_type), 'NULL') || ',' ||
      COALESCE(c.total_reservation_count::TEXT, '0') || ',' ||
      quote_literal(c.created_at::TEXT),
      E'\n'
    )
  INTO csv_content
  FROM (
    SELECT *
    FROM customer c
    WHERE c.tenant_id = p_tenant_id 
      AND c.org_id = p_org_id
      AND c.is_archive = false
      AND (
        CASE 
          WHEN p_customer_uids IS NOT NULL THEN c.uid = ANY(p_customer_uids)
          ELSE TRUE
        END
      )
    ORDER BY c.created_at DESC
    LIMIT p_batch_size
    OFFSET p_offset
  ) c;

  -- さらにデータがあるかチェック
  has_more_data := (p_offset + p_batch_size) < total_customers;

  -- 結果を返す
  RETURN QUERY
  SELECT 
    COALESCE(csv_content, '') as csv_data,
    total_customers as total_count,
    has_more_data as has_more;

END;
$$;

-- パフォーマンス最適化用インデックス
CREATE INDEX IF NOT EXISTS idx_customer_export_optimization
ON customer (tenant_id, org_id, created_at DESC) 
WHERE is_archive = false;

CREATE INDEX IF NOT EXISTS idx_customer_type_export
ON customer (tenant_id, org_id, customer_type) 
WHERE is_archive = false;

CREATE INDEX IF NOT EXISTS idx_customer_reservation_count
ON customer (tenant_id, org_id, total_reservation_count) 
WHERE is_archive = false;

-- 統計情報更新
ANALYZE customer;
ANALYZE customer_detail;
ANALYZE customer_points;

-- 使用例
/*
-- 全件エクスポート
SELECT * FROM export_customer_data_optimized(
  'tenant-id',
  'org-id', 
  'all',
  NULL,
  NULL,
  0,
  NULL,
  true,  -- 詳細情報含む
  true,  -- ポイント情報含む  
  false  -- 予約統計は除外
);

-- ID指定エクスポート
SELECT * FROM export_customer_data_optimized(
  'tenant-id',
  'org-id',
  'by_ids',
  ARRAY['customer-uid-1', 'customer-uid-2'],
  NULL,
  0,
  NULL,
  false,
  false,
  false
);

-- 件数指定エクスポート
SELECT * FROM export_customer_data_optimized(
  'tenant-id',
  'org-id',
  'by_count',
  NULL,
  100,  -- 100件
  0,    -- オフセット0
  '{"customerType": "regular", "hasReservations": true}'::JSONB,
  true,
  true,
  true
);

-- CSV形式エクスポート
SELECT * FROM export_customers_csv_optimized(
  'tenant-id',
  'org-id',
  500,   -- バッチサイズ
  0,     -- オフセット
  NULL,  -- 全顧客
  true   -- ヘッダー含む
);
*/