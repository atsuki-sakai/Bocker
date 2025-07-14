-- スタッフ別売上分析の日次期間フィルタ対応
-- 月次集計ではなく、個別予約データから日次レベルで集計するRPC関数

-- 日次レベル対応のスタッフ別売上集計関数
CREATE OR REPLACE FUNCTION get_daily_staff_sales(
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
        r.staff_id,
        COALESCE(MAX(r.staff_name), 'Unknown')        AS staff_name,
        SUM(r.total_amount)                           AS total_amount,
        COUNT(*)::BIGINT                              AS booking_count,
        MAX(r.business_date)                          AS last_booking_date,
        MIN(r.created_at)                             AS created_at,
        MAX(r.updated_at)                             AS updated_at
    FROM reservation r
    WHERE r.tenant_id = p_tenant_id
      AND r.org_id = p_org_id
      AND r.business_date >= p_date_from::DATE
      AND r.business_date <= p_date_to::DATE
      AND r.status = 'completed'
      AND r.total_amount > 0
      AND (p_staff_ids IS NULL OR r.staff_id = ANY(p_staff_ids))
    GROUP BY r.staff_id
    ORDER BY total_amount DESC;
END;
$$;

COMMENT ON FUNCTION get_daily_staff_sales IS '日次レベルでの正確な期間絞り込み対応スタッフ別売上集計関数。reservationテーブルから直接集計。';