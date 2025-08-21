-- 本番環境での get_aggregated_menu_sales 関数重複の解消
-- 開発環境との一貫性を保つため、古い署名の関数を削除

-- 重複している全ての関数バージョンを削除
DROP FUNCTION IF EXISTS get_aggregated_menu_sales(TEXT, TEXT, TEXT, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS get_aggregated_menu_sales(TEXT, TEXT, DATE, DATE, TEXT[], INTEGER);

-- 最新版を再作成（20250713000013からのコピー）
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

COMMENT ON FUNCTION get_aggregated_menu_sales IS 'v3: 1ヶ月未満期間に対応。summary_month を DATE_TRUNC で比較し BIGINT 型へキャスト。開発・本番統一版。';