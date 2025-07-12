-- 売上集計テーブル作成マイグレーション
-- リアルタイム売上集計システム用

-- 1. 日別売上集計テーブル
CREATE TABLE daily_sales_summary (
  tenant_id text NOT NULL,
  org_id    text NOT NULL,
  business_date date NOT NULL,
  total_amount  numeric(12,2) NOT NULL DEFAULT 0,
  booking_count int           NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, org_id, business_date)
);

-- 2. スタッフ別売上集計テーブル
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
);

-- 3. メニュー別売上集計テーブル
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
);

-- 4. 集計処理ログテーブル（重複防止用）
CREATE TABLE sales_aggregation_log (
  reservation_id text PRIMARY KEY,
  tenant_id text NOT NULL,
  org_id text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  total_amount numeric(12,2),
  status text NOT NULL DEFAULT 'completed'
);

-- 基本インデックス
CREATE INDEX idx_daily_sales_date ON daily_sales_summary (business_date);
CREATE INDEX idx_daily_sales_tenant_org ON daily_sales_summary (tenant_id, org_id);

CREATE INDEX idx_staff_sales_amount ON staff_sales_summary (total_amount DESC);
CREATE INDEX idx_staff_sales_tenant_org ON staff_sales_summary (tenant_id, org_id);

CREATE INDEX idx_menu_sales_count ON menu_sales_summary (booking_count DESC);
CREATE INDEX idx_menu_sales_tenant_org ON menu_sales_summary (tenant_id, org_id);

CREATE INDEX idx_aggregation_log_processed_at ON sales_aggregation_log (processed_at);
CREATE INDEX idx_aggregation_log_tenant_org ON sales_aggregation_log (tenant_id, org_id);

-- コメント追加
COMMENT ON TABLE daily_sales_summary IS 'リアルタイム日別売上集計テーブル';
COMMENT ON TABLE staff_sales_summary IS 'リアルタイムスタッフ別売上集計テーブル';
COMMENT ON TABLE menu_sales_summary IS 'リアルタイムメニュー別売上集計テーブル';
COMMENT ON TABLE sales_aggregation_log IS '売上集計処理ログ（重複防止用）';