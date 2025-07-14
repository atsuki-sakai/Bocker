-- 統合売上集計システム（パーティション対応）
-- 既存の20250712000000と20250712000002を統合・置換

-- ========================================
-- 1. 既存テーブル・関数のクリーンアップ
-- ========================================

-- 既存RPC関数削除
DROP FUNCTION IF EXISTS increment_daily_sales CASCADE;
DROP FUNCTION IF EXISTS increment_staff_sales CASCADE;
DROP FUNCTION IF EXISTS increment_menu_sales CASCADE;
DROP FUNCTION IF EXISTS increment_sales_with_guard CASCADE;

-- 既存テーブル削除（存在する場合）
DROP TABLE IF EXISTS daily_sales_summary CASCADE;
DROP TABLE IF EXISTS staff_sales_summary CASCADE;
DROP TABLE IF EXISTS menu_sales_summary CASCADE;
DROP TABLE IF EXISTS sales_aggregation_log CASCADE;

-- ========================================
-- 2. パーティション対応テーブル作成
-- ========================================

-- 1. 日別売上集計テーブル（パーティション版）
CREATE TABLE daily_sales_summary (
  tenant_id text NOT NULL,
  org_id    text NOT NULL,
  business_date date NOT NULL,
  total_amount  numeric(12,2) NOT NULL DEFAULT 0,
  booking_count int           NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, org_id, business_date)
) PARTITION BY RANGE (business_date);

-- 2. スタッフ別売上集計テーブル（パーティション版）
CREATE TABLE staff_sales_summary (
  tenant_id text NOT NULL,
  org_id    text NOT NULL,
  staff_id  text NOT NULL,
  staff_name text,
  total_amount  numeric(12,2) NOT NULL DEFAULT 0,
  booking_count int           NOT NULL DEFAULT 0,
  last_booking_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, org_id, staff_id, created_at)
) PARTITION BY RANGE (created_at);

-- 3. メニュー別売上集計テーブル（パーティション版）
CREATE TABLE menu_sales_summary (
  tenant_id text NOT NULL,
  org_id    text NOT NULL,
  menu_id   text NOT NULL,
  menu_name text,
  total_amount  numeric(12,2) NOT NULL DEFAULT 0,
  booking_count int           NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, org_id, menu_id, created_at)
) PARTITION BY RANGE (created_at);

-- 4. 集計処理ログテーブル（重複防止用）
CREATE TABLE sales_aggregation_log (
  reservation_id text PRIMARY KEY,
  tenant_id text NOT NULL,
  org_id text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  total_amount numeric(12,2),
  status text NOT NULL DEFAULT 'completed'
);

-- ========================================
-- 3. パーティション自動作成関数
-- ========================================

-- daily_sales_summary用
CREATE OR REPLACE FUNCTION ensure_daily_sales_partition()
RETURNS TRIGGER AS $$
DECLARE
  start_date date := date_trunc('month', NEW.business_date);
  end_date date := start_date + interval '1 month';
  part_name text := 'daily_sales_summary_' || to_char(start_date, 'YYYYMM');
BEGIN
  BEGIN
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I PARTITION OF daily_sales_summary
      FOR VALUES FROM (%L) TO (%L)',
      part_name, start_date, end_date);
      
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id, org_id)',
      part_name || '_tenant_org_idx', part_name);
      
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS %I ON %I (business_date)',
      part_name || '_date_idx', part_name);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'パーティション作成失敗: %, エラー: %', part_name, SQLERRM;
  END;
    
  RETURN NEW;
END $$
LANGUAGE plpgsql;

-- staff_sales_summary用
CREATE OR REPLACE FUNCTION ensure_staff_sales_partition()
RETURNS TRIGGER AS $$
DECLARE
  target_date timestamptz := NEW.created_at;
  start_date timestamptz := date_trunc('month', target_date);
  end_date timestamptz := start_date + interval '1 month';
  part_name text := 'staff_sales_summary_' || to_char(start_date, 'YYYYMM');
BEGIN
  BEGIN
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I PARTITION OF staff_sales_summary
      FOR VALUES FROM (%L) TO (%L)',
      part_name, start_date, end_date);
      
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id, org_id)',
      part_name || '_tenant_org_idx', part_name);
      
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS %I ON %I (last_booking_date)',
      part_name || '_date_idx', part_name);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'スタッフ売上パーティション作成失敗: %, エラー: %', part_name, SQLERRM;
  END;
    
  RETURN NEW;
END $$
LANGUAGE plpgsql;

-- menu_sales_summary用
CREATE OR REPLACE FUNCTION ensure_menu_sales_partition()
RETURNS TRIGGER AS $$
DECLARE
  target_date timestamptz := NEW.created_at;
  start_date timestamptz := date_trunc('month', target_date);
  end_date timestamptz := start_date + interval '1 month';
  part_name text := 'menu_sales_summary_' || to_char(start_date, 'YYYYMM');
BEGIN
  BEGIN
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I PARTITION OF menu_sales_summary
      FOR VALUES FROM (%L) TO (%L)',
      part_name, start_date, end_date);
      
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id, org_id)',
      part_name || '_tenant_org_idx', part_name);
      
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS %I ON %I (created_at)',
      part_name || '_date_idx', part_name);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'メニュー売上パーティション作成失敗: %, エラー: %', part_name, SQLERRM;
  END;
    
  RETURN NEW;
END $$
LANGUAGE plpgsql;

-- ========================================
-- 4. トリガー設定
-- ========================================

CREATE TRIGGER trg_ensure_daily_sales_partition
  BEFORE INSERT ON daily_sales_summary
  FOR EACH ROW EXECUTE FUNCTION ensure_daily_sales_partition();

CREATE TRIGGER trg_ensure_staff_sales_partition
  BEFORE INSERT ON staff_sales_summary
  FOR EACH ROW EXECUTE FUNCTION ensure_staff_sales_partition();

CREATE TRIGGER trg_ensure_menu_sales_partition
  BEFORE INSERT ON menu_sales_summary
  FOR EACH ROW EXECUTE FUNCTION ensure_menu_sales_partition();

-- ========================================
-- 5. 初期パーティション作成（過去6ヶ月～未来6ヶ月）
-- ========================================

DO $$
DECLARE
  target_month_date date;
  target_month_ts timestamptz;
  part_name text;
  start_date_date date;
  end_date_date date;
  start_date_ts timestamptz;
  end_date_ts timestamptz;
BEGIN
  -- daily_sales_summaryの初期パーティション
  FOR i IN -6..6 LOOP
    target_month_date := date_trunc('month', CURRENT_DATE) + (i || ' months')::interval;
    part_name := 'daily_sales_summary_' || to_char(target_month_date, 'YYYYMM');
    start_date_date := target_month_date;
    end_date_date := start_date_date + interval '1 month';
    
    BEGIN
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I PARTITION OF daily_sales_summary
        FOR VALUES FROM (%L) TO (%L)',
        part_name, start_date_date, end_date_date);
        
      EXECUTE format('
        CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id, org_id)',
        part_name || '_tenant_org_idx', part_name);
        
      EXECUTE format('
        CREATE INDEX IF NOT EXISTS %I ON %I (business_date)',
        part_name || '_date_idx', part_name);
        
      RAISE NOTICE 'Created daily_sales partition: %', part_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create daily_sales partition %: %', part_name, SQLERRM;
    END;
  END LOOP;

  -- staff_sales_summaryの初期パーティション
  FOR i IN -6..6 LOOP
    target_month_ts := date_trunc('month', CURRENT_TIMESTAMP) + (i || ' months')::interval;
    part_name := 'staff_sales_summary_' || to_char(target_month_ts, 'YYYYMM');
    start_date_ts := target_month_ts;
    end_date_ts := start_date_ts + interval '1 month';
    
    BEGIN
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I PARTITION OF staff_sales_summary
        FOR VALUES FROM (%L) TO (%L)',
        part_name, start_date_ts, end_date_ts);
        
      EXECUTE format('
        CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id, org_id)',
        part_name || '_tenant_org_idx', part_name);
        
      EXECUTE format('
        CREATE INDEX IF NOT EXISTS %I ON %I (last_booking_date)',
        part_name || '_date_idx', part_name);
        
      RAISE NOTICE 'Created staff_sales partition: %', part_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create staff_sales partition %: %', part_name, SQLERRM;
    END;
  END LOOP;

  -- menu_sales_summaryの初期パーティション
  FOR i IN -6..6 LOOP
    target_month_ts := date_trunc('month', CURRENT_TIMESTAMP) + (i || ' months')::interval;
    part_name := 'menu_sales_summary_' || to_char(target_month_ts, 'YYYYMM');
    start_date_ts := target_month_ts;
    end_date_ts := start_date_ts + interval '1 month';
    
    BEGIN
      EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I PARTITION OF menu_sales_summary
        FOR VALUES FROM (%L) TO (%L)',
        part_name, start_date_ts, end_date_ts);
        
      EXECUTE format('
        CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id, org_id)',
        part_name || '_tenant_org_idx', part_name);
        
      EXECUTE format('
        CREATE INDEX IF NOT EXISTS %I ON %I (created_at)',
        part_name || '_date_idx', part_name);
        
      RAISE NOTICE 'Created menu_sales partition: %', part_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create menu_sales partition %: %', part_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- ========================================
-- 6. パーティション対応RPC関数
-- ========================================

-- 統合売上集計更新関数（パーティション対応版）
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
  result JSONB := '{"status": "success", "operations": [], "partitions_created": []}';
  op_log JSONB[] := '{}';
  partition_log JSONB[] := '{}';
  daily_part_name text;
  staff_part_name text;
  menu_part_name text;
  current_month text;
BEGIN
  -- 重複チェック
  IF EXISTS (SELECT 1 FROM sales_aggregation_log WHERE reservation_id = p_reservation_id) THEN
    RETURN '{"status": "duplicate", "message": "Already processed"}';
  END IF;
  
  -- 現在月のパーティション名生成
  current_month := to_char(date_trunc('month', CURRENT_TIMESTAMP), 'YYYYMM');
  
  -- ログ記録
  INSERT INTO sales_aggregation_log (reservation_id, tenant_id, org_id, total_amount)
  VALUES (p_reservation_id, p_tenant_id, p_org_id, p_amount);
  
  -- 1. 日別集計更新（パーティション対応）
  BEGIN
    daily_part_name := 'daily_sales_summary_' || to_char(p_business_date::date, 'YYYYMM');
    
    INSERT INTO daily_sales_summary (tenant_id, org_id, business_date, total_amount, booking_count)
    VALUES (p_tenant_id, p_org_id, p_business_date::date, p_amount, 1)
    ON CONFLICT (tenant_id, org_id, business_date)
    DO UPDATE SET
      total_amount = daily_sales_summary.total_amount + p_amount,
      booking_count = daily_sales_summary.booking_count + 1,
      updated_at = NOW();
      
    op_log := array_append(op_log, '{"table": "daily_sales_summary", "amount": ' || p_amount || ', "partition": "' || daily_part_name || '"}');
    partition_log := array_append(partition_log, '"' || daily_part_name || '"');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Daily sales update failed: %', SQLERRM;
  END;
  
  -- 2. スタッフ別集計更新（パーティション対応）
  IF p_staff_id IS NOT NULL THEN
    BEGIN
      staff_part_name := 'staff_sales_summary_' || current_month;
      
      INSERT INTO staff_sales_summary (tenant_id, org_id, staff_id, staff_name, total_amount, booking_count, last_booking_date)
      VALUES (p_tenant_id, p_org_id, p_staff_id, p_staff_name, p_amount, 1, p_business_date::date)
      ON CONFLICT (tenant_id, org_id, staff_id, created_at)
      DO UPDATE SET
        total_amount = staff_sales_summary.total_amount + p_amount,
        booking_count = staff_sales_summary.booking_count + 1,
        last_booking_date = GREATEST(staff_sales_summary.last_booking_date, p_business_date::date),
        staff_name = COALESCE(p_staff_name, staff_sales_summary.staff_name),
        updated_at = NOW();
        
      op_log := array_append(op_log, '{"table": "staff_sales_summary", "staff_id": "' || p_staff_id || '", "partition": "' || staff_part_name || '"}');
      partition_log := array_append(partition_log, '"' || staff_part_name || '"');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Staff sales update failed: %', SQLERRM;
    END;
  END IF;
  
  -- 3. メニュー別集計更新（パーティション対応）
  IF p_menus IS NOT NULL THEN
    BEGIN
      menu_part_name := 'menu_sales_summary_' || current_month;
      
      WITH menu_items AS (
        SELECT 
          m.id,
          m.name,
          (m.price::numeric) * (m.quantity::int) as amount,
          m.quantity::int as count
        FROM jsonb_to_recordset(p_menus) AS m(id text, name text, price text, quantity text)
      )
      INSERT INTO menu_sales_summary (tenant_id, org_id, menu_id, menu_name, total_amount, booking_count)
      SELECT p_tenant_id, p_org_id, id, name, amount, count FROM menu_items
      ON CONFLICT (tenant_id, org_id, menu_id, created_at)
      DO UPDATE SET
        total_amount = menu_sales_summary.total_amount + EXCLUDED.total_amount,
        booking_count = menu_sales_summary.booking_count + EXCLUDED.booking_count,
        updated_at = NOW();
        
      op_log := array_append(op_log, '{"table": "menu_sales_summary", "menu_count": ' || jsonb_array_length(p_menus) || ', "partition": "' || menu_part_name || '"}');
      partition_log := array_append(partition_log, '"' || menu_part_name || '"');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Menu sales update failed: %', SQLERRM;
    END;
  END IF;
  
  result := jsonb_set(result, '{operations}', to_jsonb(op_log));
  result := jsonb_set(result, '{partitions_created}', to_jsonb(partition_log));
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- エラー時はログ削除してロールバック
  DELETE FROM sales_aggregation_log WHERE reservation_id = p_reservation_id;
  RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$;

-- ========================================
-- 7. パーティション管理関数
-- ========================================

-- 古いパーティション削除関数（2年経過時）
CREATE OR REPLACE FUNCTION cleanup_old_partitions()
RETURNS void AS $$
DECLARE
  cutoff_date date := date_trunc('month', CURRENT_DATE - interval '2 years');
  part_name text;
  table_patterns text[] := ARRAY['daily_sales_summary_%', 'staff_sales_summary_%', 'menu_sales_summary_%'];
  pattern text;
BEGIN
  FOREACH pattern IN ARRAY table_patterns
  LOOP
    FOR part_name IN 
      SELECT tablename FROM pg_tables 
      WHERE tablename LIKE pattern
        AND to_date(right(tablename, 6), 'YYYYMM') < cutoff_date
    LOOP
      BEGIN
        EXECUTE format('DROP TABLE IF EXISTS %I', part_name);
        RAISE NOTICE '古いパーティション削除: %', part_name;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'パーティション削除失敗: %, エラー: %', part_name, SQLERRM;
      END;
    END LOOP;
  END LOOP;
END $$ LANGUAGE plpgsql;

-- パーティション統計更新関数
CREATE OR REPLACE FUNCTION refresh_partition_stats()
RETURNS void AS $$
DECLARE
  partition_name text;
BEGIN
  FOR partition_name IN
    SELECT schemaname||'.'||tablename as full_name
    FROM pg_tables 
    WHERE tablename ~ '^(daily_sales_summary_|staff_sales_summary_|menu_sales_summary_)\d{6}$'
  LOOP
    EXECUTE format('ANALYZE %s', partition_name);
  END LOOP;
  
  ANALYZE daily_sales_summary;
  ANALYZE staff_sales_summary;
  ANALYZE menu_sales_summary;
  
  RAISE NOTICE 'パーティション統計更新完了: %', now();
END $$ LANGUAGE plpgsql;

-- ========================================
-- 8. インデックス設定
-- ========================================

-- ログテーブルのインデックス
CREATE INDEX idx_aggregation_log_processed_at ON sales_aggregation_log (processed_at);
CREATE INDEX idx_aggregation_log_tenant_org ON sales_aggregation_log (tenant_id, org_id);

-- ========================================
-- 9. 権限設定
-- ========================================

-- Service Role Keyに実行権限付与
GRANT EXECUTE ON FUNCTION increment_sales_with_guard_v2 TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_partitions TO service_role;
GRANT EXECUTE ON FUNCTION refresh_partition_stats TO service_role;

-- 一般ユーザーには実行権限なし（Service Roleのみ）
REVOKE EXECUTE ON FUNCTION increment_sales_with_guard_v2 FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cleanup_old_partitions FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION refresh_partition_stats FROM PUBLIC;

-- ========================================
-- 10. コメント追加
-- ========================================

COMMENT ON TABLE daily_sales_summary IS 'リアルタイム日別売上集計テーブル（月次パーティション）';
COMMENT ON TABLE staff_sales_summary IS 'リアルタイムスタッフ別売上集計テーブル（月次パーティション）';
COMMENT ON TABLE menu_sales_summary IS 'リアルタイムメニュー別売上集計テーブル（月次パーティション）';
COMMENT ON TABLE sales_aggregation_log IS '売上集計処理ログ（重複防止用）';

COMMENT ON FUNCTION increment_sales_with_guard_v2 IS 'パーティション対応統合売上集計更新関数（重複防止付き）';
COMMENT ON FUNCTION cleanup_old_partitions IS '2年経過パーティション削除関数';
COMMENT ON FUNCTION refresh_partition_stats IS 'パーティション統計更新関数';