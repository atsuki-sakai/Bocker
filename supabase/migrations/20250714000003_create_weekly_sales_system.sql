-- 週次売上集計システム
-- データ量を85%削減（日次→週次）し、3000店舗規模でのパフォーマンス最適化

-- ========================================
-- 1. 週次売上集計テーブル
-- ========================================

-- 週次売上集計テーブル（week_start_dateでパーティション）
CREATE TABLE IF NOT EXISTS weekly_sales_summary (
  tenant_id text NOT NULL,
  org_id    text NOT NULL,
  week_start_date date NOT NULL, -- 週の開始日（月曜日）
  total_amount  numeric(12,2) NOT NULL DEFAULT 0,
  booking_count int           NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, org_id, week_start_date)
) PARTITION BY RANGE (week_start_date);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_weekly_sales_lookup 
ON weekly_sales_summary (tenant_id, org_id, week_start_date);

-- ========================================
-- 2. 週次スタッフ別売上集計テーブル
-- ========================================

-- 週次スタッフ別売上集計テーブル
CREATE TABLE IF NOT EXISTS weekly_staff_sales_summary (
  tenant_id text NOT NULL,
  org_id    text NOT NULL,
  staff_id  text NOT NULL,
  week_start_date date NOT NULL, -- 週の開始日（月曜日）
  staff_name text,
  total_amount  numeric(12,2) NOT NULL DEFAULT 0,
  booking_count int           NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, org_id, staff_id, week_start_date)
) PARTITION BY RANGE (week_start_date);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_weekly_staff_sales_lookup 
ON weekly_staff_sales_summary (tenant_id, org_id, week_start_date);

CREATE INDEX IF NOT EXISTS idx_weekly_staff_sales_staff 
ON weekly_staff_sales_summary (staff_id);

-- ========================================
-- 3. RPC関数: 週次売上集計
-- ========================================

CREATE OR REPLACE FUNCTION get_aggregated_weekly_sales(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT
)
RETURNS TABLE (
    week_start_date DATE,
    total_amount NUMERIC,
    booking_count BIGINT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_date_from DATE := (p_date_from)::timestamptz::date;
    v_date_to   DATE := (p_date_to)::timestamptz::date;
    v_week_from DATE := DATE_TRUNC('week', v_date_from)::date + INTERVAL '1 day'; -- 月曜日に調整
    v_week_to   DATE := DATE_TRUNC('week', v_date_to)::date + INTERVAL '1 day';   -- 月曜日に調整
BEGIN
    RETURN QUERY
    SELECT 
        wss.week_start_date,
        wss.total_amount,
        wss.booking_count::BIGINT,
        wss.created_at,
        wss.updated_at
    FROM weekly_sales_summary wss
    WHERE wss.tenant_id = p_tenant_id
      AND wss.org_id = p_org_id
      AND wss.week_start_date >= v_week_from
      AND wss.week_start_date <= v_week_to
    ORDER BY wss.week_start_date ASC;
END;
$$;

COMMENT ON FUNCTION get_aggregated_weekly_sales IS '週次売上集計データ取得関数。パフォーマンス最適化版。';

-- ========================================
-- 4. RPC関数: 週次スタッフ別売上集計
-- ========================================

CREATE OR REPLACE FUNCTION get_aggregated_weekly_staff_sales(
    p_tenant_id   TEXT,
    p_org_id      TEXT,
    p_date_from   TEXT,
    p_date_to     TEXT,
    p_staff_ids   TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    staff_id           TEXT,
    staff_name         TEXT,
    total_amount       NUMERIC,
    booking_count      BIGINT,
    last_booking_date  DATE,
    created_at         TIMESTAMPTZ,
    updated_at         TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_date_from DATE := (p_date_from)::timestamptz::date;
    v_date_to   DATE := (p_date_to)::timestamptz::date;
    v_week_from DATE := DATE_TRUNC('week', v_date_from)::date + INTERVAL '1 day'; -- 月曜日に調整
    v_week_to   DATE := DATE_TRUNC('week', v_date_to)::date + INTERVAL '1 day';   -- 月曜日に調整
BEGIN
    RETURN QUERY
    SELECT 
        wsss.staff_id,
        MAX(wsss.staff_name)                          AS staff_name,
        SUM(wsss.total_amount)                        AS total_amount,
        SUM(wsss.booking_count)::BIGINT               AS booking_count,
        MAX(wsss.week_start_date + INTERVAL '6 days') AS last_booking_date, -- 週末を近似値として使用
        MIN(wsss.created_at)                          AS created_at,
        MAX(wsss.updated_at)                          AS updated_at
    FROM weekly_staff_sales_summary wsss
    WHERE wsss.tenant_id = p_tenant_id
      AND wsss.org_id = p_org_id
      AND wsss.week_start_date >= v_week_from
      AND wsss.week_start_date <= v_week_to
      AND (p_staff_ids IS NULL OR wsss.staff_id = ANY(p_staff_ids))
    GROUP BY wsss.staff_id
    ORDER BY total_amount DESC;
END;
$$;

COMMENT ON FUNCTION get_aggregated_weekly_staff_sales IS '週次スタッフ別売上集計データ取得関数。正確な期間絞り込み対応。';