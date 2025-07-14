-- スタッフ別売上集計RPC関数の修正版
-- 期間フィルタを適切に適用

DROP FUNCTION IF EXISTS get_aggregated_staff_sales(TEXT, TEXT, TEXT, TEXT, TEXT[]);
CREATE OR REPLACE FUNCTION get_aggregated_staff_sales(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT,
    p_staff_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    staff_id TEXT,
    staff_name TEXT,
    total_amount NUMERIC,
    booking_count INTEGER,
    last_booking_date TEXT,
    created_at TEXT,
    updated_at TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sss.staff_id,
        MAX(sss.staff_name) as staff_name,
        SUM(COALESCE(sss.total_amount, 0)) as total_amount,
        SUM(COALESCE(sss.booking_count, 0)) as booking_count,
        COALESCE(MAX(sss.last_booking_date)::TEXT, '') as last_booking_date,
        COALESCE(MAX(sss.created_at)::TEXT, NOW()::TEXT) as created_at,
        COALESCE(MAX(sss.updated_at)::TEXT, NOW()::TEXT) as updated_at
    FROM staff_sales_summary sss
    WHERE sss.tenant_id = p_tenant_id
        AND sss.org_id = p_org_id
        -- 期間フィルタを追加（summary_monthで絞り込み）
        AND sss.summary_month >= p_date_from::DATE
        AND sss.summary_month <= p_date_to::DATE
        AND (p_staff_ids IS NULL OR sss.staff_id = ANY(p_staff_ids))
    GROUP BY sss.staff_id
    ORDER BY total_amount DESC;
END;
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION get_aggregated_staff_sales TO anon, authenticated;

-- 作成確認
SELECT 
    proname as function_name,
    pronargs as arg_count,
    pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname = 'get_aggregated_staff_sales'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');