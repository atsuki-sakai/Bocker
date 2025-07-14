-- パーティション対応RPC関数の実装
-- increment_sales_with_guard_v2とヘルパー関数

-- 1. パーティション対応の日別集計更新関数
CREATE OR REPLACE FUNCTION increment_daily_sales_partitioned(
  p_tenant_id TEXT,
  p_org_id TEXT, 
  p_business_date TEXT,
  p_amount NUMERIC
) RETURNS VOID 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  partition_name TEXT := 'daily_sales_summary_' || TO_CHAR(p_business_date::date, 'YYYYMM');
  start_date date := date_trunc('month', p_business_date::date);
  end_date date := start_date + interval '1 month';
BEGIN
  -- パーティション存在確認・作成
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = partition_name AND relkind = 'r'
  ) THEN
    BEGIN
      EXECUTE format('
        CREATE TABLE %I PARTITION OF daily_sales_summary
        FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date);
        
      EXECUTE format('
        CREATE INDEX %I ON %I (tenant_id, org_id)',
        partition_name || '_tenant_org_idx', partition_name);
        
      EXECUTE format('
        CREATE INDEX %I ON %I (business_date)',
        partition_name || '_date_idx', partition_name);
        
      RAISE NOTICE 'Auto-created partition: %', partition_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create partition %: %', partition_name, SQLERRM;
    END;
  END IF;
  
  -- データ挿入/更新
  INSERT INTO daily_sales_summary (tenant_id, org_id, business_date, total_amount, booking_count)
  VALUES (p_tenant_id, p_org_id, p_business_date::date, p_amount, 1)
  ON CONFLICT (tenant_id, org_id, business_date)
  DO UPDATE SET
    total_amount = daily_sales_summary.total_amount + p_amount,
    booking_count = daily_sales_summary.booking_count + 1,
    updated_at = NOW();
END;
$$;

-- 2. パーティション対応のスタッフ別集計更新関数
CREATE OR REPLACE FUNCTION increment_staff_sales_partitioned(
  p_tenant_id TEXT,
  p_org_id TEXT,
  p_staff_id TEXT,
  p_staff_name TEXT,
  p_amount NUMERIC,
  p_date TEXT
) RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  target_date date := p_date::date;
  partition_name TEXT := 'staff_sales_summary_' || TO_CHAR(target_date, 'YYYYMM');
  start_date date := date_trunc('month', target_date);
  end_date date := start_date + interval '1 month';
BEGIN
  -- パーティション存在確認・作成
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = partition_name AND relkind = 'r'
  ) THEN
    BEGIN
      EXECUTE format('
        CREATE TABLE %I PARTITION OF staff_sales_summary
        FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date);
        
      EXECUTE format('
        CREATE INDEX %I ON %I (tenant_id, org_id)',
        partition_name || '_tenant_org_idx', partition_name);
        
      EXECUTE format('
        CREATE INDEX %I ON %I (last_booking_date)',
        partition_name || '_date_idx', partition_name);
        
      RAISE NOTICE 'Auto-created staff partition: %', partition_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create staff partition %: %', partition_name, SQLERRM;
    END;
  END IF;
  
  -- データ挿入/更新
  INSERT INTO staff_sales_summary (tenant_id, org_id, staff_id, staff_name, total_amount, booking_count, last_booking_date)
  VALUES (p_tenant_id, p_org_id, p_staff_id, p_staff_name, p_amount, 1, target_date)
  ON CONFLICT (tenant_id, org_id, staff_id)
  DO UPDATE SET
    total_amount = staff_sales_summary.total_amount + p_amount,
    booking_count = staff_sales_summary.booking_count + 1,
    last_booking_date = GREATEST(staff_sales_summary.last_booking_date, target_date),
    staff_name = COALESCE(p_staff_name, staff_sales_summary.staff_name),
    updated_at = NOW();
END;
$$;

-- 3. パーティション対応のメニュー別集計更新関数
CREATE OR REPLACE FUNCTION increment_menu_sales_partitioned(
  p_tenant_id TEXT,
  p_org_id TEXT,
  p_menu_id TEXT,
  p_menu_name TEXT,
  p_amount NUMERIC,
  p_count INTEGER
) RETURNS VOID
SECURITY DEFINER
SET search_path = public  
LANGUAGE plpgsql AS $$
DECLARE
  current_date_only date := CURRENT_DATE;
  partition_name TEXT := 'menu_sales_summary_' || TO_CHAR(current_date_only, 'YYYYMM');
  start_date date := date_trunc('month', current_date_only);
  end_date date := start_date + interval '1 month';
BEGIN
  -- パーティション存在確認・作成
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = partition_name AND relkind = 'r'
  ) THEN
    BEGIN
      EXECUTE format('
        CREATE TABLE %I PARTITION OF menu_sales_summary
        FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date);
        
      EXECUTE format('
        CREATE INDEX %I ON %I (tenant_id, org_id)',
        partition_name || '_tenant_org_idx', partition_name);
        
      EXECUTE format('
        CREATE INDEX %I ON %I (created_at)',
        partition_name || '_date_idx', partition_name);
        
      RAISE NOTICE 'Auto-created menu partition: %', partition_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create menu partition %: %', partition_name, SQLERRM;
    END;
  END IF;
  
  -- データ挿入/更新
  INSERT INTO menu_sales_summary (tenant_id, org_id, menu_id, menu_name, total_amount, booking_count)
  VALUES (p_tenant_id, p_org_id, p_menu_id, p_menu_name, p_amount, p_count)
  ON CONFLICT (tenant_id, org_id, menu_id)
  DO UPDATE SET
    total_amount = menu_sales_summary.total_amount + p_amount,
    booking_count = menu_sales_summary.booking_count + p_count,
    menu_name = COALESCE(p_menu_name, menu_sales_summary.menu_name),
    updated_at = NOW();
END;
$$;

-- 4. 統合売上集計更新関数（パーティション対応版・重複防止強化）
CREATE OR REPLACE FUNCTION increment_sales_with_guard_v2(
  p_reservation_id TEXT,
  p_tenant_id TEXT,
  p_org_id TEXT, 
  p_business_date TEXT,
  p_amount NUMERIC,
  p_staff_id TEXT,
  p_staff_name TEXT,
  p_menus JSONB DEFAULT NULL
) RETURNS JSONB 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  result JSONB := '{"status": "success", "operations": [], "performance": {}}';
  op_log JSONB[];
  start_time timestamptz := clock_timestamp();
  operation_count integer := 0;
BEGIN
  -- 重複チェック（強化版）
  IF EXISTS (SELECT 1 FROM sales_aggregation_log WHERE reservation_id = p_reservation_id) THEN
    RETURN jsonb_build_object(
      'status', 'duplicate',
      'message', 'Reservation already processed',
      'reservation_id', p_reservation_id,
      'processed_at', (SELECT processed_at FROM sales_aggregation_log WHERE reservation_id = p_reservation_id LIMIT 1)
    );
  END IF;
  
  -- ログ記録（トランザクション開始マーカー）
  INSERT INTO sales_aggregation_log (reservation_id, tenant_id, org_id, total_amount, status)
  VALUES (p_reservation_id, p_tenant_id, p_org_id, p_amount, 'processing');
  
  BEGIN
    -- 1. 日別集計更新（パーティション対応）
    PERFORM increment_daily_sales_partitioned(
      p_tenant_id, p_org_id, p_business_date, p_amount
    );
    
    op_log := array_append(op_log, jsonb_build_object(
      'table', 'daily_sales_summary',
      'partition', 'daily_sales_summary_' || TO_CHAR(p_business_date::date, 'YYYYMM'),
      'amount', p_amount
    ));
    operation_count := operation_count + 1;
    
    -- 2. スタッフ別集計更新（パーティション対応）
    IF p_staff_id IS NOT NULL AND p_staff_id != '' THEN
      PERFORM increment_staff_sales_partitioned(
        p_tenant_id, p_org_id, p_staff_id, p_staff_name, p_amount, p_business_date
      );
      
      op_log := array_append(op_log, jsonb_build_object(
        'table', 'staff_sales_summary',
        'partition', 'staff_sales_summary_' || TO_CHAR(p_business_date::date, 'YYYYMM'),
        'staff_id', p_staff_id,
        'amount', p_amount
      ));
      operation_count := operation_count + 1;
    END IF;
    
    -- 3. メニュー別集計更新（パーティション対応）
    IF p_menus IS NOT NULL AND jsonb_array_length(p_menus) > 0 THEN
      WITH menu_items AS (
        SELECT 
          m.id,
          m.name,
          (m.price::numeric) * (m.quantity::int) as amount,
          m.quantity::int as count
        FROM jsonb_to_recordset(p_menus) AS m(id text, name text, price text, quantity text)
        WHERE m.id IS NOT NULL AND m.id != ''
      )
      INSERT INTO menu_sales_summary (tenant_id, org_id, menu_id, menu_name, total_amount, booking_count)
      SELECT p_tenant_id, p_org_id, id, name, amount, count FROM menu_items
      ON CONFLICT (tenant_id, org_id, menu_id)
      DO UPDATE SET
        total_amount = menu_sales_summary.total_amount + EXCLUDED.total_amount,
        booking_count = menu_sales_summary.booking_count + EXCLUDED.booking_count,
        menu_name = COALESCE(EXCLUDED.menu_name, menu_sales_summary.menu_name),
        updated_at = NOW();
        
      op_log := array_append(op_log, jsonb_build_object(
        'table', 'menu_sales_summary',
        'partition', 'menu_sales_summary_' || TO_CHAR(CURRENT_DATE, 'YYYYMM'),
        'menu_count', jsonb_array_length(p_menus)
      ));
      operation_count := operation_count + 1;
    END IF;
    
    -- 処理完了のマーク
    UPDATE sales_aggregation_log 
    SET status = 'completed', processed_at = NOW() 
    WHERE reservation_id = p_reservation_id;
    
    -- パフォーマンス情報
    result := jsonb_set(result, '{operations}', to_jsonb(op_log));
    result := jsonb_set(result, '{performance}', jsonb_build_object(
      'duration_ms', EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000,
      'operation_count', operation_count,
      'reservation_id', p_reservation_id
    ));
    
    RETURN result;
    
  EXCEPTION WHEN OTHERS THEN
    -- エラー時はログをエラー状態に更新（削除はしない）
    UPDATE sales_aggregation_log 
    SET status = 'error', processed_at = NOW() 
    WHERE reservation_id = p_reservation_id;
    
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM,
      'sqlstate', SQLSTATE,
      'reservation_id', p_reservation_id,
      'operations_completed', op_log,
      'performance', jsonb_build_object(
        'duration_ms', EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000,
        'operation_count', operation_count
      )
    );
  END;
END;
$$;

-- 5. パーティション情報取得関数（運用監視用）
CREATE OR REPLACE FUNCTION get_partition_info()
RETURNS TABLE(
  table_name text,
  partition_name text,
  partition_size text,
  row_count bigint,
  partition_bounds text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    parent.relname as table_name,
    child.relname as partition_name,
    pg_size_pretty(pg_total_relation_size(child.oid)) as partition_size,
    child.reltuples::bigint as row_count,
    pg_get_expr(child.relpartbound, child.oid) as partition_bounds
  FROM pg_inherits
  JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
  JOIN pg_class child ON pg_inherits.inhrelid = child.oid
  WHERE parent.relname IN ('daily_sales_summary', 'staff_sales_summary', 'menu_sales_summary')
  ORDER BY parent.relname, child.relname;
END;
$$ LANGUAGE plpgsql;

-- 6. パーティション統計情報関数
CREATE OR REPLACE FUNCTION get_partition_statistics()
RETURNS TABLE(
  summary_type text,
  total_partitions bigint,
  total_size text,
  total_rows bigint,
  oldest_partition text,
  newest_partition text
) AS $$
BEGIN
  RETURN QUERY
  WITH partition_stats AS (
    SELECT 
      parent.relname as table_name,
      COUNT(*) as partition_count,
      SUM(pg_total_relation_size(child.oid)) as total_size_bytes,
      SUM(child.reltuples) as total_rows,
      MIN(child.relname) as oldest_partition,
      MAX(child.relname) as newest_partition
    FROM pg_inherits
    JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
    JOIN pg_class child ON pg_inherits.inhrelid = child.oid
    WHERE parent.relname IN ('daily_sales_summary', 'staff_sales_summary', 'menu_sales_summary')
    GROUP BY parent.relname
  )
  SELECT 
    table_name as summary_type,
    partition_count as total_partitions,
    pg_size_pretty(total_size_bytes) as total_size,
    total_rows::bigint as total_rows,
    oldest_partition,
    newest_partition
  FROM partition_stats
  ORDER BY table_name;
END;
$$ LANGUAGE plpgsql;

-- 7. 2年経過パーティション自動削除関数（強化版）
CREATE OR REPLACE FUNCTION cleanup_old_partitions_v2()
RETURNS TABLE(
  action text,
  partition_name text,
  partition_date text,
  status text
) AS $$
DECLARE
  cutoff_date date := date_trunc('month', CURRENT_DATE - interval '2 years');
  part_record record;
  table_patterns text[] := ARRAY['daily_sales_summary_%', 'staff_sales_summary_%', 'menu_sales_summary_%'];
  pattern text;
BEGIN
  FOREACH pattern IN ARRAY table_patterns
  LOOP
    FOR part_record IN 
      SELECT 
        tablename,
        to_date(right(tablename, 6), 'YYYYMM') as partition_date
      FROM pg_tables 
      WHERE tablename LIKE pattern
        AND to_date(right(tablename, 6), 'YYYYMM') < cutoff_date
      ORDER BY tablename
    LOOP
      BEGIN
        EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', part_record.tablename);
        
        RETURN QUERY SELECT 
          'DROP'::text,
          part_record.tablename,
          part_record.partition_date::text,
          'SUCCESS'::text;
          
      EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
          'DROP'::text,
          part_record.tablename,
          part_record.partition_date::text,
          ('ERROR: ' || SQLERRM)::text;
      END;
    END LOOP;
  END LOOP;
  
  RETURN;
END $$ LANGUAGE plpgsql;

-- 8. 権限設定
GRANT EXECUTE ON FUNCTION increment_daily_sales_partitioned TO service_role;
GRANT EXECUTE ON FUNCTION increment_staff_sales_partitioned TO service_role;
GRANT EXECUTE ON FUNCTION increment_menu_sales_partitioned TO service_role;
GRANT EXECUTE ON FUNCTION increment_sales_with_guard_v2 TO service_role;
GRANT EXECUTE ON FUNCTION get_partition_info TO service_role;
GRANT EXECUTE ON FUNCTION get_partition_statistics TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_partitions_v2 TO service_role;

-- 一般ユーザーには実行権限なし
REVOKE EXECUTE ON FUNCTION increment_daily_sales_partitioned FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION increment_staff_sales_partitioned FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION increment_menu_sales_partitioned FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION increment_sales_with_guard_v2 FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_partition_info FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_partition_statistics FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cleanup_old_partitions_v2 FROM PUBLIC;

-- コメント追加
COMMENT ON FUNCTION increment_sales_with_guard_v2 IS 'パーティション対応の売上集計更新関数（重複防止・エラーハンドリング強化）';
COMMENT ON FUNCTION get_partition_info IS 'パーティション情報取得関数（運用監視用）';
COMMENT ON FUNCTION cleanup_old_partitions_v2 IS '2年経過パーティション自動削除関数';