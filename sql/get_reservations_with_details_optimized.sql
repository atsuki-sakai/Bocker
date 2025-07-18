-- 予約詳細取得の最適化されたRPC関数
-- N+1クエリ問題を解決し、1万件でも高速処理を実現

CREATE OR REPLACE FUNCTION get_reservations_with_details_optimized(
  p_tenant_id TEXT,
  p_org_id TEXT,
  p_status TEXT DEFAULT NULL,
  p_start_date_from BIGINT DEFAULT NULL,
  p_start_date_to BIGINT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 10
)
RETURNS TABLE(
  -- 予約データ
  reservation_uid UUID,
  reservation_convex_id TEXT,
  reservation_tenant_id TEXT,
  reservation_org_id TEXT,
  reservation_customer_uid TEXT,
  reservation_staff_id TEXT,
  reservation_customer_name TEXT,
  reservation_staff_name TEXT,
  reservation_status TEXT,
  reservation_payment_status TEXT,
  reservation_start_time_unix BIGINT,
  reservation_end_time_unix BIGINT,
  reservation_is_archive BOOLEAN,
  reservation_created_at TIMESTAMP WITH TIME ZONE,
  reservation_updated_at TIMESTAMP WITH TIME ZONE,
  
  -- 予約詳細データ（NULL可能）
  detail_uid UUID,
  detail_convex_reservation_id TEXT,
  detail_menus JSONB,
  detail_options JSONB,
  detail_total_price INTEGER,
  detail_payment_method TEXT,
  detail_is_archive BOOLEAN,
  detail_created_at TIMESTAMP WITH TIME ZONE,
  detail_updated_at TIMESTAMP WITH TIME ZONE,
  
  -- メタデータ
  total_count INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  offset_value INTEGER;
  total_records INTEGER;
BEGIN
  -- 入力バリデーション
  IF p_page < 1 THEN
    RAISE EXCEPTION 'Page must be greater than 0';
  END IF;
  
  IF p_page_size < 1 OR p_page_size > 1000 THEN
    RAISE EXCEPTION 'Page size must be between 1 and 1000';
  END IF;
  
  -- オフセット計算
  offset_value := (p_page - 1) * p_page_size;
  
  -- 総件数取得（最適化されたカウントクエリ）
  SELECT COUNT(*)
  INTO total_records
  FROM reservation r
  WHERE r.tenant_id = p_tenant_id
    AND r.org_id = p_org_id
    AND r.is_archive = false
    AND (p_status IS NULL OR r.status = p_status)
    AND (p_start_date_from IS NULL OR r.start_time_unix >= p_start_date_from)
    AND (p_start_date_to IS NULL OR r.start_time_unix <= p_start_date_to);
  
  -- メインクエリ：LEFT JOINで一度に取得
  RETURN QUERY
  SELECT 
    -- 予約データ
    r.uid,
    r._convex_id,
    r.tenant_id,
    r.org_id,
    r.customer_uid,
    r.staff_id,
    r.customer_name,
    r.staff_name,
    r.status,
    r.payment_status,
    r.start_time_unix,
    r.end_time_unix,
    r.is_archive,
    r.created_at,
    r.updated_at,
    
    -- 予約詳細データ（NULL可能）
    rd.uid,
    rd._convex_reservation_id,
    rd.menus,
    rd.options,
    rd.total_price,
    rd.payment_method,
    rd.is_archive,
    rd.created_at,
    rd.updated_at,
    
    -- 総件数を全行に含める
    total_records
  FROM reservation r
  LEFT JOIN reservation_detail rd ON rd._convex_reservation_id = r._convex_id
    AND rd.tenant_id = p_tenant_id 
    AND rd.org_id = p_org_id 
    AND rd.is_archive = false
  WHERE r.tenant_id = p_tenant_id
    AND r.org_id = p_org_id
    AND r.is_archive = false
    AND (p_status IS NULL OR r.status = p_status)
    AND (p_start_date_from IS NULL OR r.start_time_unix >= p_start_date_from)
    AND (p_start_date_to IS NULL OR r.start_time_unix <= p_start_date_to)
  ORDER BY r.start_time_unix ASC
  LIMIT p_page_size
  OFFSET offset_value;
  
END;
$$;

-- パフォーマンス最適化のためのインデックス
-- 既存インデックスがない場合のみ作成

-- 1. 予約テーブルの複合インデックス（最重要）
CREATE INDEX IF NOT EXISTS idx_reservation_tenant_org_status_time 
ON reservation (tenant_id, org_id, is_archive, status, start_time_unix) 
INCLUDE (uid, _convex_id, customer_uid, staff_id, customer_name, staff_name, end_time_unix, payment_status, created_at, updated_at);

-- 2. 予約詳細テーブルの結合用インデックス
CREATE INDEX IF NOT EXISTS idx_reservation_detail_convex_id_tenant_org 
ON reservation_detail (tenant_id, org_id, _convex_reservation_id, is_archive)
INCLUDE (uid, menus, options, total_price, payment_method, created_at, updated_at);

-- 3. 日付範囲検索用インデックス（時間軸でのクエリ最適化）
CREATE INDEX IF NOT EXISTS idx_reservation_time_range_tenant_org 
ON reservation (start_time_unix, tenant_id, org_id) 
WHERE is_archive = false;

-- パフォーマンス統計更新
ANALYZE reservation;
ANALYZE reservation_detail;

-- 使用例
/*
-- 基本的な使用例
SELECT * FROM get_reservations_with_details_optimized(
  'tenant-123',
  'org-456', 
  NULL,    -- 全ステータス
  NULL,    -- 開始日フィルタなし
  NULL,    -- 終了日フィルタなし
  1,       -- 1ページ目
  10       -- 10件取得
);

-- ステータス指定 + 日付範囲フィルタ
SELECT * FROM get_reservations_with_details_optimized(
  'tenant-123',
  'org-456',
  'confirmed',                                    -- 確定済み予約のみ
  EXTRACT(EPOCH FROM '2024-01-01'::timestamp) * 1000,  -- 開始日
  EXTRACT(EPOCH FROM '2024-12-31'::timestamp) * 1000,  -- 終了日
  1,
  50
);

-- 大量データでのページネーション例
SELECT * FROM get_reservations_with_details_optimized(
  'tenant-123',
  'org-456',
  NULL,
  NULL,
  NULL,
  100,     -- 100ページ目
  100      -- 100件ずつ取得
);
*/