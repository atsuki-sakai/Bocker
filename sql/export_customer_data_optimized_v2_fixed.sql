-- 大規模SaaS向け顧客データエクスポートRPC関数群（修正版v2）
-- UUID型の正規表現エラーを修正

-- 1. 最適化された顧客データエクスポート関数
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
  filter_conditions TEXT := '';
  join_clauses TEXT := '';
  select_fields TEXT := '';
  data_query TEXT;
  
  v_total_count INT := 0;
  v_exported_count INT := 0;
  v_has_more BOOLEAN := false;
BEGIN
  -- 入力バリデーション
  IF p_export_type NOT IN ('all', 'by_ids', 'by_count') THEN
    RAISE EXCEPTION '無効なエクスポートタイプ: %', p_export_type;
  END IF;
  
  IF p_export_type = 'by_ids' AND p_customer_uids IS NULL THEN
    RAISE EXCEPTION 'ID指定エクスポートでは顧客UIDリストが必要です';
  END IF;
  
  -- 基本フィルタリング条件
  filter_conditions := format(
    'c.tenant_id = %L AND c.org_id = %L AND c.is_archive = false',
    p_tenant_id, p_org_id
  );
  
  -- エクスポートタイプによるフィルタリング
  IF p_export_type = 'by_ids' THEN
    filter_conditions := filter_conditions || format(
      ' AND c.uid = ANY(%L::uuid[])',
      p_customer_uids
    );
  END IF;
  
  -- 追加フィルタ処理
  IF p_filters IS NOT NULL THEN
    IF p_filters ? 'customerType' THEN
      filter_conditions := filter_conditions || format(
        ' AND c.customer_type = %L',
        p_filters->>'customerType'
      );
    END IF;
    
    IF p_filters ? 'hasReservations' THEN
      IF (p_filters->>'hasReservations')::BOOLEAN THEN
        filter_conditions := filter_conditions || ' AND c.total_reservation_count > 0';
      ELSE
        filter_conditions := filter_conditions || ' AND COALESCE(c.total_reservation_count, 0) = 0';
      END IF;
    END IF;
    
    IF p_filters ? 'registrationDateFrom' THEN
      filter_conditions := filter_conditions || format(
        ' AND c.created_at >= %L::TIMESTAMP',
        p_filters->>'registrationDateFrom'
      );
    END IF;
    
    IF p_filters ? 'registrationDateTo' THEN
      filter_conditions := filter_conditions || format(
        ' AND c.created_at <= %L::TIMESTAMP',
        p_filters->>'registrationDateTo'
      );
    END IF;
  END IF;
  
  -- オプション項目の結合
  IF p_include_details THEN
    join_clauses := join_clauses || format(
      ' LEFT JOIN customer_detail cd ON cd.customer_uid = c.uid 
        AND cd.tenant_id = %L AND cd.org_id = %L 
        AND cd.is_archive = false',
      p_tenant_id, p_org_id
    );
    select_fields := select_fields || 
      ', cd.gender as detail_gender, cd.birthday as detail_birthday, 
        cd.age as detail_age, cd.notes as detail_notes';
  ELSE
    select_fields := select_fields || 
      ', NULL::TEXT as detail_gender, NULL::DATE as detail_birthday, 
        NULL::INT as detail_age, NULL::TEXT as detail_notes';
  END IF;
  
  IF p_include_points THEN
    join_clauses := join_clauses || format(
      ' LEFT JOIN customer_points cp ON cp.customer_uid = c.uid 
        AND cp.tenant_id = %L AND cp.org_id = %L 
        AND cp.is_archive = false',
      p_tenant_id, p_org_id
    );
    select_fields := select_fields || 
      ', cp.total_points as total_points, 
        cp.last_transaction_date_unix as last_transaction_date_unix';
  ELSE
    select_fields := select_fields || 
      ', NULL::INT as total_points, NULL::BIGINT as last_transaction_date_unix';
  END IF;
  
  IF p_include_reservation_stats THEN
    select_fields := select_fields || 
      ', c.total_reservation_count as reservation_total_count';
  ELSE
    select_fields := select_fields || 
      ', NULL::INT as reservation_total_count';
  END IF;
  
  -- 総件数取得
  EXECUTE format(
    'SELECT COUNT(*) FROM customer c WHERE %s',
    filter_conditions
  ) INTO v_total_count;
  
  -- データ取得クエリ
  data_query := format(
    'SELECT jsonb_agg(sub) FROM (
      SELECT 
        c.uid, c.email, c.first_name, c.last_name, c.phone,
        c.line_id, c.line_user_name, c.customer_type,
        c.total_reservation_count, c.last_reservation_date_unix,
        c.created_at::TEXT as created_at
        %s
      FROM customer c
      %s
      WHERE %s
      ORDER BY c.created_at DESC
      LIMIT %s
      OFFSET %s
    ) sub',
    select_fields,
    join_clauses,
    filter_conditions,
    CASE p_export_type 
      WHEN 'all' THEN 'ALL' 
      ELSE p_max_count::TEXT 
    END,
    p_offset
  );
  
  -- クエリ実行
  EXECUTE data_query INTO customers;
  
  -- メタデータ計算
  v_exported_count := COALESCE(jsonb_array_length(customers), 0);
  v_has_more := (p_offset + v_exported_count) < v_total_count;
  
  RETURN QUERY 
  SELECT 
    COALESCE(customers, '[]'::JSONB),
    v_total_count,
    v_exported_count,
    v_has_more;
  
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'エクスポートエラー: %', SQLERRM;
END;
$$;

-- 2. 修正されたCSVエクスポート関数（UUID型エラー修正）
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
  filter_condition TEXT;
  v_total_count INTEGER := 0;
  v_has_more BOOLEAN := FALSE;
  csv_rows TEXT;
BEGIN
  -- フィルタ条件構築
  filter_condition := format(
    'tenant_id = %L AND org_id = %L AND is_archive = false',
    p_tenant_id, p_org_id
  );
  
  IF p_customer_uids IS NOT NULL THEN
    filter_condition := filter_condition || format(
      ' AND uid = ANY(%L::uuid[])',
      p_customer_uids
    );
  END IF;
  
  -- 総件数取得
  EXECUTE format(
    'SELECT COUNT(*) FROM customer WHERE %s',
    filter_condition
  ) INTO v_total_count;
  
  -- CSVヘッダー
  IF p_include_headers THEN
    csv_content := csv_header || E'\n';
  END IF;
  
  -- CSVデータ生成（UUID型対応、正規表現エラー修正）
  EXECUTE format(
    $COPY$
    SELECT COALESCE(
      string_agg(
        format('%%s,%%s,%%s,%%s,%%s,%%s,%%s,%%s,%%s,%%s,%%s', 
          -- CSVエスケープ処理（TEXT型にキャストしてから処理）
          CASE WHEN uid::TEXT LIKE '%%,%%' OR uid::TEXT LIKE '%%"%%' OR uid::TEXT LIKE '%%' || E'\r' || '%%' OR uid::TEXT LIKE '%%' || E'\n' || '%%' 
               THEN '"' || replace(uid::TEXT, '"', '""') || '"' 
               ELSE uid::TEXT END,
          CASE WHEN COALESCE(email, '') LIKE '%%,%%' OR COALESCE(email, '') LIKE '%%"%%' OR COALESCE(email, '') LIKE '%%' || E'\r' || '%%' OR COALESCE(email, '') LIKE '%%' || E'\n' || '%%' 
               THEN '"' || replace(COALESCE(email, ''), '"', '""') || '"' 
               ELSE COALESCE(email, '') END,
          CASE WHEN COALESCE(first_name, '') LIKE '%%,%%' OR COALESCE(first_name, '') LIKE '%%"%%' OR COALESCE(first_name, '') LIKE '%%' || E'\r' || '%%' OR COALESCE(first_name, '') LIKE '%%' || E'\n' || '%%' 
               THEN '"' || replace(COALESCE(first_name, ''), '"', '""') || '"' 
               ELSE COALESCE(first_name, '') END,
          CASE WHEN COALESCE(last_name, '') LIKE '%%,%%' OR COALESCE(last_name, '') LIKE '%%"%%' OR COALESCE(last_name, '') LIKE '%%' || E'\r' || '%%' OR COALESCE(last_name, '') LIKE '%%' || E'\n' || '%%' 
               THEN '"' || replace(COALESCE(last_name, ''), '"', '""') || '"' 
               ELSE COALESCE(last_name, '') END,
          CASE WHEN COALESCE(phone, '') LIKE '%%,%%' OR COALESCE(phone, '') LIKE '%%"%%' OR COALESCE(phone, '') LIKE '%%' || E'\r' || '%%' OR COALESCE(phone, '') LIKE '%%' || E'\n' || '%%' 
               THEN '"' || replace(COALESCE(phone, ''), '"', '""') || '"' 
               ELSE COALESCE(phone, '') END,
          CASE WHEN COALESCE(line_id, '') LIKE '%%,%%' OR COALESCE(line_id, '') LIKE '%%"%%' OR COALESCE(line_id, '') LIKE '%%' || E'\r' || '%%' OR COALESCE(line_id, '') LIKE '%%' || E'\n' || '%%' 
               THEN '"' || replace(COALESCE(line_id, ''), '"', '""') || '"' 
               ELSE COALESCE(line_id, '') END,
          CASE WHEN COALESCE(line_user_name, '') LIKE '%%,%%' OR COALESCE(line_user_name, '') LIKE '%%"%%' OR COALESCE(line_user_name, '') LIKE '%%' || E'\r' || '%%' OR COALESCE(line_user_name, '') LIKE '%%' || E'\n' || '%%' 
               THEN '"' || replace(COALESCE(line_user_name, ''), '"', '""') || '"' 
               ELSE COALESCE(line_user_name, '') END,
          CASE WHEN COALESCE(customer_type, '') LIKE '%%,%%' OR COALESCE(customer_type, '') LIKE '%%"%%' OR COALESCE(customer_type, '') LIKE '%%' || E'\r' || '%%' OR COALESCE(customer_type, '') LIKE '%%' || E'\n' || '%%' 
               THEN '"' || replace(COALESCE(customer_type, ''), '"', '""') || '"' 
               ELSE COALESCE(customer_type, '') END,
          COALESCE(total_reservation_count, 0)::TEXT,
          CASE 
            WHEN last_reservation_date_unix IS NOT NULL 
            THEN to_timestamp(last_reservation_date_unix)::DATE::TEXT
            ELSE ''
          END,
          created_at::DATE::TEXT
        ), E'\n'
      ), ''
    )
    FROM (
      SELECT 
        uid, email, first_name, last_name, phone,
        line_id, line_user_name, customer_type,
        total_reservation_count, last_reservation_date_unix,
        created_at
      FROM customer
      WHERE %s
      ORDER BY created_at DESC
      LIMIT %s
      OFFSET %s
    ) sub
    $COPY$,
    filter_condition,
    p_batch_size,
    p_offset
  ) INTO csv_rows;
  
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

-- インデックス（既存のものがあれば再作成しない）
CREATE INDEX IF NOT EXISTS idx_customer_tenant_org_active 
ON customer (tenant_id, org_id, created_at DESC) 
WHERE is_archive = false;

-- パフォーマンス統計更新
ANALYZE customer;
ANALYZE customer_detail;
ANALYZE customer_points;

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