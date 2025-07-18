-- 予約データエクスポート用の最適化されたRPC関数
-- N+1クエリ問題を解決し、CSVエクスポート用に設計

-- 既存の関数を削除（型の競合を避けるため）
-- 引数型を明示的に指定してすべてのオーバーロードを削除
DROP FUNCTION IF EXISTS export_all_reservations_optimized(INTEGER, BIGINT, TEXT, BIGINT, TEXT, TEXT);
DROP FUNCTION IF EXISTS export_all_reservations_optimized(INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION export_all_reservations_optimized(
  p_batch_size INTEGER DEFAULT 1000,
  p_end_date TEXT DEFAULT NULL,
  p_org_id TEXT DEFAULT NULL,
  p_start_date TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_tenant_id TEXT DEFAULT NULL
)
RETURNS TABLE(
  reservations JSONB,
  total_count INTEGER,
  processing_time_ms INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  total_records INTEGER;
  start_unix BIGINT;
  end_unix BIGINT;
  start_time TIMESTAMP;
  result_data JSONB;
BEGIN
  -- 入力バリデーション
  IF p_tenant_id IS NULL OR p_org_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id and org_id are required';
  END IF;
  
  IF p_batch_size < 1 OR p_batch_size > 10000 THEN
    RAISE EXCEPTION 'Batch size must be between 1 and 10000';
  END IF;
  
  start_time := clock_timestamp();
  
  -- 日付パラメータをUnixタイムスタンプ（ミリ秒）に変換
  IF p_start_date IS NOT NULL THEN
    IF p_start_date ~ '^\d+$' THEN
      start_unix := p_start_date::BIGINT;
    ELSE
      start_unix := EXTRACT(EPOCH FROM p_start_date::DATE) * 1000;
    END IF;
  END IF;
  
  IF p_end_date IS NOT NULL THEN
    IF p_end_date ~ '^\d+$' THEN
      end_unix := p_end_date::BIGINT;
    ELSE
      end_unix := EXTRACT(EPOCH FROM (p_end_date::DATE + INTERVAL '1 day')) * 1000 - 1;
    END IF;
  END IF;
  
  -- 総件数取得
  SELECT COUNT(*)
  INTO total_records
  FROM reservation r
  WHERE r.tenant_id = p_tenant_id
    AND r.org_id = p_org_id
    AND r.is_archive = false
    AND (p_status IS NULL OR r.status = p_status)
    AND (start_unix IS NULL OR r.start_time_unix >= start_unix)
    AND (end_unix IS NULL OR r.start_time_unix <= end_unix);
  
  -- 構造化データの作成
  WITH ordered_data AS (
    SELECT 
      jsonb_build_object(
        'reservation', to_jsonb(r.*),
        'detail', CASE WHEN rd.uid IS NOT NULL THEN to_jsonb(rd.*) ELSE NULL END
      ) as reservation_data
    FROM reservation r
    LEFT JOIN reservation_detail rd ON rd._convex_reservation_id = r._convex_id
      AND rd.tenant_id = p_tenant_id 
      AND rd.org_id = p_org_id 
      AND rd.is_archive = false
    WHERE r.tenant_id = p_tenant_id
      AND r.org_id = p_org_id
      AND r.is_archive = false
      AND (p_status IS NULL OR r.status = p_status)
      AND (start_unix IS NULL OR r.start_time_unix >= start_unix)
      AND (end_unix IS NULL OR r.start_time_unix <= end_unix)
    ORDER BY r.start_time_unix ASC
    LIMIT p_batch_size
  )
  SELECT jsonb_agg(reservation_data)
  INTO result_data
  FROM ordered_data;
  
  -- 結果を返却
  RETURN QUERY
  SELECT 
    COALESCE(result_data, '[]'::JSONB),
    total_records,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
  
END;
$$;

-- パフォーマンス最適化のためのインデックス（再利用）
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
-- 基本的な使用例（全予約エクスポート）
SELECT * FROM export_all_reservations_optimized(
  1000,        -- p_batch_size
  NULL,        -- p_end_date
  'org-456',   -- p_org_id
  NULL,        -- p_start_date
  NULL,        -- p_status
  'tenant-123' -- p_tenant_id
);

-- ステータス指定 + 日付範囲フィルタ
SELECT * FROM export_all_reservations_optimized(
  5000,        -- p_batch_size
  EXTRACT(EPOCH FROM '2024-12-31'::timestamp) * 1000,  -- p_end_date
  'org-456',   -- p_org_id
  EXTRACT(EPOCH FROM '2024-01-01'::timestamp) * 1000,  -- p_start_date
  'confirmed', -- p_status
  'tenant-123' -- p_tenant_id
);

-- 大量データエクスポート
SELECT * FROM export_all_reservations_optimized(
  10000,       -- p_batch_size
  NULL,        -- p_end_date
  'org-456',   -- p_org_id
  NULL,        -- p_start_date
  NULL,        -- p_status
  'tenant-123' -- p_tenant_id
);
*/