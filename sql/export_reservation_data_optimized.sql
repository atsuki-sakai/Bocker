-- =========================================================================
-- 予約データエクスポート最適化RPC関数（N+1クエリ問題解決版）
-- =========================================================================
-- 作成日: 2025年7月18日
-- 目的: findByOrganizationWithDetailsのN+1クエリ問題を解決
-- パフォーマンス目標: 1万件のデータで2秒以内のレスポンス
-- =========================================================================

-- 1. 最適化された予約データ取得関数（JOIN使用）
CREATE OR REPLACE FUNCTION get_reservations_with_details_optimized(
  p_tenant_id TEXT,
  p_org_id TEXT,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 10,
  p_status TEXT DEFAULT NULL,
  p_start_date TEXT DEFAULT NULL,
  p_end_date TEXT DEFAULT NULL,
  p_include_count BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
  reservations JSONB,
  total_count INTEGER,
  current_page INTEGER,
  page_size INTEGER,
  has_more BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  filter_conditions TEXT := '';
  date_filter TEXT := '';
  data_query TEXT;
  count_query TEXT;
  
  v_total_count INT := 0;
  v_offset INT := 0;
  v_has_more BOOLEAN := false;
BEGIN
  -- 入力バリデーション
  IF p_tenant_id IS NULL OR p_org_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id and org_id are required';
  END IF;
  
  IF p_page < 1 THEN
    p_page := 1;
  END IF;
  
  IF p_page_size < 1 OR p_page_size > 10000 THEN
    p_page_size := 10;
  END IF;
  
  -- オフセット計算
  v_offset := (p_page - 1) * p_page_size;
  
  -- 基本フィルタリング条件
  filter_conditions := format(
    'r.tenant_id = %L AND r.org_id = %L AND r.is_archive = false',
    p_tenant_id, p_org_id
  );
  
  -- ステータスフィルター
  IF p_status IS NOT NULL AND p_status != '' AND p_status != 'all' THEN
    filter_conditions := filter_conditions || format(
      ' AND r.status = %L',
      p_status
    );
  END IF;
  
  -- 日付範囲フィルター
  IF p_start_date IS NOT NULL AND p_start_date != '' THEN
    date_filter := date_filter || format(
      ' AND r.start_time_unix >= %L',
      extract(epoch from p_start_date::timestamp) * 1000
    );
  END IF;
  
  IF p_end_date IS NOT NULL AND p_end_date != '' THEN
    date_filter := date_filter || format(
      ' AND r.start_time_unix <= %L',
      extract(epoch from (p_end_date::timestamp + interval '1 day')) * 1000
    );
  END IF;
  
  -- 全体の条件を結合
  filter_conditions := filter_conditions || date_filter;
  
  -- 総件数取得（カウントが必要な場合のみ）
  IF p_include_count THEN
    count_query := format(
      'SELECT COUNT(*) FROM reservation r WHERE %s',
      filter_conditions
    );
    
    EXECUTE count_query INTO v_total_count;
  END IF;
  
  -- メインデータ取得クエリ（LEFT JOIN使用でN+1を解決）
  data_query := format(
    $DATA$
    SELECT jsonb_agg(
      jsonb_build_object(
        'reservation', jsonb_build_object(
          'uid', r.uid,
          'tenant_id', r.tenant_id,
          'org_id', r.org_id,
          'customer_uid', r.customer_uid,
          'staff_id', r.staff_id,
          'customer_name', r.customer_name,
          'staff_name', r.staff_name,
          'status', r.status,
          'payment_status', r.payment_status,
          'stripe_checkout_session_id', r.stripe_checkout_session_id,
          'is_free_nomination', r.is_free_nomination,
          'date', r.date,
          'start_time_unix', r.start_time_unix,
          'end_time_unix', r.end_time_unix,
          'created_at', r.created_at,
          'updated_at', r.updated_at,
          '_convex_id', r._convex_id,
          '_creation_time', r._creation_time
        ),
        'detail', CASE 
          WHEN rd.uid IS NOT NULL THEN jsonb_build_object(
            'uid', rd.uid,
            'tenant_id', rd.tenant_id,
            'org_id', rd.org_id,
            'reservation_id', rd.reservation_id,
            'coupon_id', rd.coupon_id,
            'total_price', rd.total_price,
            'payment_method', rd.payment_method,
            'menus', rd.menus,
            'options', rd.options,
            'extra_charge', rd.extra_charge,
            'use_points', rd.use_points,
            'coupon_discount', rd.coupon_discount,
            'featured_hair_images', rd.featured_hair_images,
            'notes', rd.notes,
            'created_at', rd.created_at,
            'updated_at', rd.updated_at,
            '_convex_id', rd._convex_id,
            '_convex_reservation_id', rd._convex_reservation_id,
            '_creation_time', rd._creation_time
          )
          ELSE NULL
        END
      )
      ORDER BY r.start_time_unix ASC
    )
    FROM reservation r
    LEFT JOIN reservation_detail rd ON rd._convex_reservation_id = r._convex_id
      AND rd.tenant_id = r.tenant_id 
      AND rd.org_id = r.org_id 
      AND rd.is_archive = false
    WHERE %s
    ORDER BY r.start_time_unix ASC
    LIMIT %s
    OFFSET %s
    $DATA$,
    filter_conditions,
    p_page_size,
    v_offset
  );
  
  -- クエリ実行
  EXECUTE data_query INTO reservations;
  
  -- メタデータ計算
  IF p_include_count THEN
    v_has_more := (v_offset + p_page_size) < v_total_count;
  ELSE
    -- カウントを取得していない場合は、結果の件数で判定
    v_has_more := COALESCE(jsonb_array_length(reservations), 0) = p_page_size;
    v_total_count := -1; -- カウント未取得を示す
  END IF;
  
  RETURN QUERY 
  SELECT 
    COALESCE(reservations, '[]'::JSONB),
    v_total_count,
    p_page,
    p_page_size,
    v_has_more;
  
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Reservation export error: %', SQLERRM;
END;
$$;

-- 2. 大量データ用全件取得関数（エクスポート専用）
CREATE OR REPLACE FUNCTION export_all_reservations_optimized(
  p_tenant_id TEXT,
  p_org_id TEXT,
  p_status TEXT DEFAULT NULL,
  p_start_date TEXT DEFAULT NULL,
  p_end_date TEXT DEFAULT NULL,
  p_batch_size INTEGER DEFAULT 5000
)
RETURNS TABLE(
  reservations JSONB,
  total_count INTEGER,
  processing_time_ms INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  filter_conditions TEXT := '';
  date_filter TEXT := '';
  data_query TEXT;
  
  v_total_count INT := 0;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_processing_time_ms INT;
BEGIN
  v_start_time := clock_timestamp();
  
  -- 入力バリデーション
  IF p_tenant_id IS NULL OR p_org_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id and org_id are required';
  END IF;
  
  -- バッチサイズ制限（メモリ保護）
  IF p_batch_size > 50000 THEN
    p_batch_size := 50000;
  END IF;
  
  -- 基本フィルタリング条件
  filter_conditions := format(
    'r.tenant_id = %L AND r.org_id = %L AND r.is_archive = false',
    p_tenant_id, p_org_id
  );
  
  -- ステータスフィルター
  IF p_status IS NOT NULL AND p_status != '' AND p_status != 'all' THEN
    filter_conditions := filter_conditions || format(
      ' AND r.status = %L',
      p_status
    );
  END IF;
  
  -- 日付範囲フィルター
  IF p_start_date IS NOT NULL AND p_start_date != '' THEN
    date_filter := date_filter || format(
      ' AND r.start_time_unix >= %L',
      extract(epoch from p_start_date::timestamp) * 1000
    );
  END IF;
  
  IF p_end_date IS NOT NULL AND p_end_date != '' THEN
    date_filter := date_filter || format(
      ' AND r.start_time_unix <= %L',
      extract(epoch from (p_end_date::timestamp + interval '1 day')) * 1000
    );
  END IF;
  
  -- 全体の条件を結合
  filter_conditions := filter_conditions || date_filter;
  
  -- 総件数取得
  EXECUTE format(
    'SELECT COUNT(*) FROM reservation r WHERE %s',
    filter_conditions
  ) INTO v_total_count;
  
  -- 大量データ用最適化クエリ
  data_query := format(
    $DATA$
    SELECT jsonb_agg(
      jsonb_build_object(
        'reservation', to_jsonb(r.*),
        'detail', to_jsonb(rd.*)
      )
      ORDER BY r.start_time_unix ASC
    )
    FROM reservation r
    LEFT JOIN reservation_detail rd ON rd._convex_reservation_id = r._convex_id
      AND rd.tenant_id = r.tenant_id 
      AND rd.org_id = r.org_id 
      AND rd.is_archive = false
    WHERE %s
    ORDER BY r.start_time_unix ASC
    LIMIT %s
    $DATA$,
    filter_conditions,
    p_batch_size
  );
  
  -- クエリ実行
  EXECUTE data_query INTO reservations;
  
  -- 処理時間計算
  v_end_time := clock_timestamp();
  v_processing_time_ms := extract(milliseconds from (v_end_time - v_start_time))::int;
  
  RETURN QUERY 
  SELECT 
    COALESCE(reservations, '[]'::JSONB),
    v_total_count,
    v_processing_time_ms;
  
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Reservation export error: %', SQLERRM;
END;
$$;

-- 3. パフォーマンス最適化インデックス
-- 既存のインデックスに追加で作成（重複チェック付き）

-- 複合インデックス（tenant_id, org_id, start_time_unix）
CREATE INDEX IF NOT EXISTS idx_reservation_tenant_org_start_time 
ON reservation (tenant_id, org_id, start_time_unix) 
WHERE is_archive = false;

-- ステータス付き複合インデックス
CREATE INDEX IF NOT EXISTS idx_reservation_tenant_org_status_start_time 
ON reservation (tenant_id, org_id, status, start_time_unix) 
WHERE is_archive = false;

-- 予約詳細テーブル用最適化インデックス
CREATE INDEX IF NOT EXISTS idx_reservation_detail_convex_reservation_tenant_org 
ON reservation_detail (_convex_reservation_id, tenant_id, org_id) 
WHERE is_archive = false;

-- 部分インデックス（アクティブなレコードのみ）
CREATE INDEX IF NOT EXISTS idx_reservation_active_only 
ON reservation (tenant_id, org_id, start_time_unix, status) 
WHERE is_archive = false AND status IN ('confirmed', 'pending', 'completed');

-- 4. 統計情報更新
ANALYZE reservation;
ANALYZE reservation_detail;

-- 5. 権限設定
GRANT EXECUTE ON FUNCTION get_reservations_with_details_optimized(TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION export_all_reservations_optimized(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) TO service_role;

-- 6. 使用例とパフォーマンステスト
/*
-- 基本的なページネーション取得
SELECT * FROM get_reservations_with_details_optimized(
  'tenant-id',
  'org-id',
  1,    -- page
  50,   -- page_size
  NULL, -- status (all)
  NULL, -- start_date
  NULL, -- end_date
  true  -- include_count
);

-- 期間指定での取得
SELECT * FROM get_reservations_with_details_optimized(
  'tenant-id',
  'org-id',
  1,
  100,
  'completed',
  '2025-01-01',
  '2025-03-31',
  true
);

-- 大量データエクスポート（最大5000件）
SELECT * FROM export_all_reservations_optimized(
  'tenant-id',
  'org-id',
  NULL,
  '2025-01-01',
  '2025-12-31',
  5000
);

-- パフォーマンステスト（実行プランを確認）
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM get_reservations_with_details_optimized(
  'tenant-id',
  'org-id',
  1,
  1000,
  NULL,
  NULL,
  NULL,
  true
);
*/

-- 7. パフォーマンス監視用ビュー（オプション）
CREATE OR REPLACE VIEW reservation_export_performance AS
SELECT 
  'get_reservations_with_details_optimized' as function_name,
  pg_stat_user_functions.calls,
  pg_stat_user_functions.total_time,
  pg_stat_user_functions.mean_time,
  pg_stat_user_functions.self_time
FROM pg_stat_user_functions 
WHERE funcname = 'get_reservations_with_details_optimized';

COMMENT ON FUNCTION get_reservations_with_details_optimized IS 
'N+1クエリ問題を解決した最適化済み予約データ取得関数。JOINを使用して一度のクエリで予約と詳細を取得。';

COMMENT ON FUNCTION export_all_reservations_optimized IS 
'大量データエクスポート用最適化関数。最大50,000件まで一度に取得可能。処理時間も返却。';