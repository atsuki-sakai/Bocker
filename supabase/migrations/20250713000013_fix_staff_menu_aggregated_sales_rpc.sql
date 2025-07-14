-- 修正マイグレーション: スタッフ／メニュー集計RPC関数の月範囲バグ対応 & 型強化
-- YYYY-MM-DD で 1 ヶ月未満を指定した際にデータが取得できない問題を解消
-- 2025-07-XX   o3 patch

-- 既存関数を安全に削除
DROP FUNCTION IF EXISTS get_aggregated_staff_sales(TEXT, TEXT, TEXT, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS get_aggregated_menu_sales(TEXT, TEXT, TEXT, TEXT, TEXT[]);

-- 1. スタッフ別売上集計関数（修正版）
CREATE OR REPLACE FUNCTION get_aggregated_staff_sales(
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
BEGIN
    RETURN QUERY
    SELECT 
        sss.staff_id,
        MAX(sss.staff_name)                       AS staff_name,
        SUM(sss.total_amount)                     AS total_amount,
        SUM(sss.booking_count)::BIGINT            AS booking_count,
        MAX(sss.last_booking_date)                AS last_booking_date,
        MAX(sss.created_at)                       AS created_at,
        MAX(sss.updated_at)                       AS updated_at
    FROM staff_sales_summary sss
    WHERE sss.tenant_id = p_tenant_id
      AND sss.org_id    = p_org_id
      -- ✅ 月初へ切り捨てて比較
      AND sss.summary_month >= DATE_TRUNC('month', p_date_from::timestamptz)
      AND sss.summary_month <= DATE_TRUNC('month', p_date_to::timestamptz)
      AND (p_staff_ids IS NULL OR sss.staff_id = ANY(p_staff_ids))
    GROUP BY sss.staff_id
    ORDER BY total_amount DESC;
END;
$$;

COMMENT ON FUNCTION get_aggregated_staff_sales IS 'v3: 1ヶ月未満期間に対応。summary_month を DATE_TRUNC で比較し BIGINT 型へキャスト。';

-- 2. メニュー別売上集計関数（修正版）
CREATE OR REPLACE FUNCTION get_aggregated_menu_sales(
    p_tenant_id   TEXT,
    p_org_id      TEXT,
    p_date_from   TEXT,
    p_date_to     TEXT,
    p_menu_ids    TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    menu_id        TEXT,
    menu_name      TEXT,
    total_amount   NUMERIC,
    booking_count  BIGINT,
    created_at     TIMESTAMPTZ,
    updated_at     TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mss.menu_id,
        MAX(mss.menu_name)                    AS menu_name,
        SUM(mss.total_amount)                 AS total_amount,
        SUM(mss.booking_count)::BIGINT        AS booking_count,
        MAX(mss.created_at)                   AS created_at,
        MAX(mss.updated_at)                   AS updated_at
    FROM menu_sales_summary mss
    WHERE mss.tenant_id = p_tenant_id
      AND mss.org_id    = p_org_id
      -- ✅ 月初へ切り捨てて比較
      AND mss.summary_month >= DATE_TRUNC('month', p_date_from::timestamptz)
      AND mss.summary_month <= DATE_TRUNC('month', p_date_to::timestamptz)
      AND (p_menu_ids IS NULL OR mss.menu_id = ANY(p_menu_ids))
    GROUP BY mss.menu_id
    ORDER BY total_amount DESC;
END;
$$;

COMMENT ON FUNCTION get_aggregated_menu_sales IS 'v3: 1ヶ月未満期間に対応。summary_month を DATE_TRUNC で比較し BIGINT 型へキャスト。'; 