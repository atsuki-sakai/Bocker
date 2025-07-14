-- 修正: get_aggregated_daily_sales 関数の日付キャストバグを修正
-- ISO 8601 形式 (YYYY-MM-DDTHH:MI:SSZ) を含む入力に対応し、
-- 1ヶ月未満の期間指定でも結果を取得できるようにする

CREATE OR REPLACE FUNCTION get_aggregated_daily_sales(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT
)
RETURNS TABLE (
    business_date DATE,
    total_amount NUMERIC,
    booking_count BIGINT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
DECLARE
    -- ISO 8601 や "YYYY-MM-DD" 等の文字列をタイムスタンプとして解釈し DATE に変換
    v_date_from DATE := (p_date_from)::timestamptz::date;
    v_date_to   DATE := (p_date_to)::timestamptz::date;
BEGIN
    RETURN QUERY
    SELECT 
        dss.business_date,
        dss.total_amount,
        dss.booking_count::BIGINT,
        dss.created_at,
        dss.updated_at
    FROM daily_sales_summary dss
    WHERE dss.tenant_id = p_tenant_id
      AND dss.org_id   = p_org_id
      AND dss.business_date >= v_date_from
      AND dss.business_date <= v_date_to
    ORDER BY dss.business_date ASC;
END;
$$;

COMMENT ON FUNCTION get_aggregated_daily_sales IS 'v3: ISO8601 を含む TEXT 入力に対応。p_date_from / p_date_to を timestamptz -> date キャストで解析し、1 ヶ月未満の期間でもデータ取得可能。'; 