-- メニュー別売上集計RPC関数の修正版
-- 期間フィルタを適切に適用

DROP FUNCTION IF EXISTS get_aggregated_menu_sales(TEXT, TEXT, TEXT, TEXT, TEXT[]);
CREATE OR REPLACE FUNCTION get_aggregated_menu_sales(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT,
    p_menu_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    menu_id TEXT,
    menu_name TEXT,
    total_amount NUMERIC,
    booking_count INTEGER,
    created_at TEXT,
    updated_at TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mss.menu_id,
        MAX(mss.menu_name) as menu_name,
        SUM(COALESCE(mss.total_amount, 0)) as total_amount,
        SUM(COALESCE(mss.booking_count, 0)) as booking_count,
        COALESCE(MAX(mss.created_at)::TEXT, NOW()::TEXT) as created_at,
        COALESCE(MAX(mss.updated_at)::TEXT, NOW()::TEXT) as updated_at
    FROM menu_sales_summary mss
    WHERE mss.tenant_id = p_tenant_id
        AND mss.org_id = p_org_id
        -- 期間フィルタを追加（summary_monthで絞り込み）
        AND mss.summary_month >= p_date_from::DATE
        AND mss.summary_month <= p_date_to::DATE
        AND (p_menu_ids IS NULL OR mss.menu_id = ANY(p_menu_ids))
    GROUP BY mss.menu_id
    ORDER BY total_amount DESC;
END;
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION get_aggregated_menu_sales TO anon, authenticated;

-- 作成確認
SELECT 
    proname as function_name,
    pronargs as arg_count,
    pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname = 'get_aggregated_menu_sales'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');