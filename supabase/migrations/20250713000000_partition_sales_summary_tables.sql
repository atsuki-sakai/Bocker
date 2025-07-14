-- 売上集計テーブルのパーティション化マイグレーション
-- 既存テーブルを月次パーティションテーブルに変換

-- 1. daily_sales_summaryのパーティション化
-- バックアップテーブル作成
CREATE TABLE daily_sales_summary_backup AS SELECT * FROM daily_sales_summary;

-- 元テーブルを削除
DROP TABLE daily_sales_summary CASCADE;

-- パーティション親テーブル作成
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

-- 2. staff_sales_summaryのパーティション化
-- バックアップテーブル作成
CREATE TABLE staff_sales_summary_backup AS SELECT * FROM staff_sales_summary;

-- 元テーブルを削除
DROP TABLE staff_sales_summary CASCADE;

-- パーティション親テーブル作成（created_atでパーティション）
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
  PRIMARY KEY (tenant_id, org_id, staff_id)
) PARTITION BY RANGE (created_at);

-- 3. menu_sales_summaryのパーティション化
-- バックアップテーブル作成
CREATE TABLE menu_sales_summary_backup AS SELECT * FROM menu_sales_summary;

-- 元テーブルを削除
DROP TABLE menu_sales_summary CASCADE;

-- パーティション親テーブル作成（created_atでパーティション）
CREATE TABLE menu_sales_summary (
  tenant_id text NOT NULL,
  org_id    text NOT NULL,
  menu_id   text NOT NULL,
  menu_name text,
  total_amount  numeric(12,2) NOT NULL DEFAULT 0,
  booking_count int           NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, org_id, menu_id)
) PARTITION BY RANGE (created_at);

-- 4. パーティション自動作成関数（daily_sales_summary用）
CREATE OR REPLACE FUNCTION ensure_daily_sales_partition()
RETURNS TRIGGER AS $$
DECLARE
  start_date date := date_trunc('month', NEW.business_date);
  end_date date := start_date + interval '1 month';
  part_name text := 'daily_sales_summary_' || to_char(start_date, 'YYYYMM');
BEGIN
  -- 子テーブルを動的生成（IF NOT EXISTSで重複回避）
  BEGIN
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I PARTITION OF daily_sales_summary
      FOR VALUES FROM (%L) TO (%L)',
      part_name, start_date, end_date);
      
    -- インデックス作成（存在しない場合のみ）
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id, org_id)',
      part_name || '_tenant_org_idx', part_name);
      
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS %I ON %I (business_date)',
      part_name || '_date_idx', part_name);
  EXCEPTION WHEN OTHERS THEN
    -- エラー時もINSERTを継続（ログ出力）
    RAISE WARNING 'パーティション作成失敗: %, エラー: %', part_name, SQLERRM;
  END;
    
  RETURN NEW;
END $$
LANGUAGE plpgsql;

-- 5. パーティション自動作成関数（staff_sales_summary用）
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

-- 6. パーティション自動作成関数（menu_sales_summary用）
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

-- 7. トリガー設定
CREATE TRIGGER trg_ensure_daily_sales_partition
  BEFORE INSERT ON daily_sales_summary
  FOR EACH ROW EXECUTE FUNCTION ensure_daily_sales_partition();

CREATE TRIGGER trg_ensure_staff_sales_partition
  BEFORE INSERT ON staff_sales_summary
  FOR EACH ROW EXECUTE FUNCTION ensure_staff_sales_partition();

CREATE TRIGGER trg_ensure_menu_sales_partition
  BEFORE INSERT ON menu_sales_summary
  FOR EACH ROW EXECUTE FUNCTION ensure_menu_sales_partition();

-- 8. 初期パーティション作成（過去6ヶ月～未来6ヶ月）
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
  -- daily_sales_summaryの初期パーティション（date型）
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

  -- staff_sales_summaryの初期パーティション（timestamptz型）
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

  -- menu_sales_summaryの初期パーティション（timestamptz型）
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

-- 9. 既存データの移行
-- daily_sales_summaryのデータ復元
INSERT INTO daily_sales_summary 
SELECT * FROM daily_sales_summary_backup
ON CONFLICT DO NOTHING;

-- staff_sales_summaryのデータ復元（last_booking_dateがNULLの場合はCURRENT_DATEを設定）
INSERT INTO staff_sales_summary 
SELECT 
  tenant_id,
  org_id,
  staff_id,
  staff_name,
  total_amount,
  booking_count,
  COALESCE(last_booking_date, CURRENT_DATE) as last_booking_date,
  created_at,
  updated_at
FROM staff_sales_summary_backup
ON CONFLICT DO NOTHING;

-- menu_sales_summaryのデータ復元
INSERT INTO menu_sales_summary 
SELECT * FROM menu_sales_summary_backup
ON CONFLICT DO NOTHING;

-- 10. パーティション管理ヘルパー関数
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
  -- 各パーティションの統計を更新
  FOR partition_name IN
    SELECT schemaname||'.'||tablename as full_name
    FROM pg_tables 
    WHERE tablename ~ '^(daily_sales_summary_|staff_sales_summary_|menu_sales_summary_)\d{6}$'
  LOOP
    EXECUTE format('ANALYZE %s', partition_name);
  END LOOP;
  
  -- 親テーブルの統計を更新
  ANALYZE daily_sales_summary;
  ANALYZE staff_sales_summary;
  ANALYZE menu_sales_summary;
  
  RAISE NOTICE 'パーティション統計更新完了: %', now();
END $$ LANGUAGE plpgsql;

-- 11. バックアップテーブル削除（コメントアウト - 手動確認後に実行）
-- DROP TABLE daily_sales_summary_backup;
-- DROP TABLE staff_sales_summary_backup;
-- DROP TABLE menu_sales_summary_backup;

-- コメント追加
COMMENT ON TABLE daily_sales_summary IS 'リアルタイム日別売上集計テーブル（月次パーティション）';
COMMENT ON TABLE staff_sales_summary IS 'リアルタイムスタッフ別売上集計テーブル（月次パーティション）';
COMMENT ON TABLE menu_sales_summary IS 'リアルタイムメニュー別売上集計テーブル（月次パーティション）';