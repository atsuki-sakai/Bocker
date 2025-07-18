-- 最終版：予約データエクスポート関数
-- 構造ミスマッチを完全に解決

-- 既存関数の完全削除
DROP FUNCTION IF EXISTS export_all_reservations_optimized CASCADE;

-- シンプルで確実な関数
CREATE OR REPLACE FUNCTION export_all_reservations_optimized(
  p_batch_size INTEGER DEFAULT 1000,
  p_end_date TEXT DEFAULT NULL,
  p_org_id TEXT DEFAULT NULL,
  p_start_date TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_tenant_id TEXT DEFAULT NULL
)
RETURNS TABLE(
  reservation_uid TEXT,
  reservation_convex_id TEXT,
  customer_uid TEXT,
  customer_name TEXT,
  staff_id TEXT,
  staff_name TEXT,
  status TEXT,
  payment_status TEXT,
  start_time_unix BIGINT,
  end_time_unix BIGINT,
  start_date TEXT,
  start_time TEXT,
  end_time TEXT,
  total_price INTEGER,
  payment_method TEXT,
  menus_json TEXT,
  options_json TEXT,
  created_at TEXT,
  total_count INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_unix BIGINT;
  end_unix BIGINT;
  total_records INTEGER := 0;
BEGIN
  -- 必須パラメータチェック
  IF p_tenant_id IS NULL OR p_org_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id and org_id are required';
  END IF;
  
  -- 日付変換
  IF p_start_date IS NOT NULL AND p_start_date != '' THEN
    IF p_start_date ~ '^\d+$' THEN
      start_unix := p_start_date::BIGINT;
    ELSE
      start_unix := EXTRACT(EPOCH FROM p_start_date::DATE) * 1000;
    END IF;
  END IF;
  
  IF p_end_date IS NOT NULL AND p_end_date != '' THEN
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
  
  -- データ返却 (確実に19列)
  RETURN QUERY
  SELECT 
    r.uid::TEXT,                                  -- 1
    COALESCE(r._convex_id, ''),                  -- 2
    COALESCE(r.customer_uid, ''),                -- 3
    COALESCE(r.customer_name, ''),               -- 4
    COALESCE(r.staff_id, ''),                    -- 5
    COALESCE(r.staff_name, ''),                  -- 6
    COALESCE(r.status, ''),                      -- 7
    COALESCE(r.payment_status, ''),              -- 8
    COALESCE(r.start_time_unix, 0),              -- 9
    COALESCE(r.end_time_unix, 0),                -- 10
    COALESCE(to_timestamp(COALESCE(r.start_time_unix, 0) / 1000.0)::DATE::TEXT, ''), -- 11
    COALESCE(to_timestamp(COALESCE(r.start_time_unix, 0) / 1000.0)::TIME::TEXT, ''), -- 12
    COALESCE(to_timestamp(COALESCE(r.end_time_unix, 0) / 1000.0)::TIME::TEXT, ''),   -- 13
    COALESCE(rd.total_price, 0),                 -- 14
    COALESCE(rd.payment_method, ''),             -- 15
    COALESCE(rd.menus::TEXT, ''),                -- 16
    COALESCE(rd.options::TEXT, ''),              -- 17
    COALESCE(r.created_at::TEXT, ''),            -- 18
    total_records                                -- 19
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
  LIMIT LEAST(p_batch_size, 10000);
  
END;
$$;

-- 関数の確認
SELECT 
  routine_name,
  data_type,
  ordinal_position,
  column_name
FROM information_schema.routine_columns 
WHERE routine_name = 'export_all_reservations_optimized'
ORDER BY ordinal_position;