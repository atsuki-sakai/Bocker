-- ============================================================================
-- 型安全なAnalyticsRepository用RPC関数群
-- Supabaseダッシュボードで手動実行してください
-- ============================================================================

-- 1. 日別売上集計RPC関数
DROP FUNCTION IF EXISTS get_aggregated_daily_sales(TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION get_aggregated_daily_sales(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT
)
RETURNS TABLE (
    business_date TEXT,
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
        dss.business_date::TEXT,
        COALESCE(dss.total_amount, 0) as total_amount,
        COALESCE(dss.booking_count, 0) as booking_count,
        COALESCE(dss.created_at::TEXT, NOW()::TEXT) as created_at,
        COALESCE(dss.updated_at::TEXT, NOW()::TEXT) as updated_at
    FROM daily_sales_summary dss
    WHERE dss.tenant_id = p_tenant_id
        AND dss.org_id = p_org_id
        AND dss.business_date >= p_date_from::DATE
        AND dss.business_date <= p_date_to::DATE
    ORDER BY dss.business_date ASC;
END;
$$;

-- 2. スタッフ別売上集計RPC関数
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
        MAX(sss.last_booking_date)::TEXT as last_booking_date,
        MAX(COALESCE(sss.created_at::TEXT, NOW()::TEXT)) as created_at,
        MAX(COALESCE(sss.updated_at::TEXT, NOW()::TEXT)) as updated_at
    FROM staff_sales_summary sss
    WHERE sss.tenant_id = p_tenant_id
        AND sss.org_id = p_org_id
        AND (p_staff_ids IS NULL OR sss.staff_id = ANY(p_staff_ids))
    GROUP BY sss.staff_id
    ORDER BY total_amount DESC;
END;
$$;

-- 3. メニュー別売上集計RPC関数
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
        MAX(COALESCE(mss.created_at::TEXT, NOW()::TEXT)) as created_at,
        MAX(COALESCE(mss.updated_at::TEXT, NOW()::TEXT)) as updated_at
    FROM menu_sales_summary mss
    WHERE mss.tenant_id = p_tenant_id
        AND mss.org_id = p_org_id
        AND (p_menu_ids IS NULL OR mss.menu_id = ANY(p_menu_ids))
    GROUP BY mss.menu_id
    ORDER BY total_amount DESC;
END;
$$;

-- 4. 期間比較データ取得RPC関数
DROP FUNCTION IF EXISTS get_period_comparison_data(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION get_period_comparison_data(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_current_date_from TEXT,
    p_current_date_to TEXT,
    p_previous_date_from TEXT,
    p_previous_date_to TEXT
)
RETURNS TABLE (
    current_total_amount NUMERIC,
    current_booking_count INTEGER,
    current_average_amount NUMERIC,
    previous_total_amount NUMERIC,
    previous_booking_count INTEGER,
    previous_average_amount NUMERIC,
    amount_growth_percentage NUMERIC,
    booking_growth_percentage NUMERIC,
    average_growth_percentage NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_total NUMERIC := 0;
    current_bookings INTEGER := 0;
    current_avg NUMERIC := 0;
    previous_total NUMERIC := 0;
    previous_bookings INTEGER := 0;
    previous_avg NUMERIC := 0;
BEGIN
    -- 現在期間のデータ
    SELECT 
        COALESCE(SUM(dss.total_amount), 0),
        COALESCE(SUM(dss.booking_count), 0)
    INTO current_total, current_bookings
    FROM daily_sales_summary dss
    WHERE dss.tenant_id = p_tenant_id
        AND dss.org_id = p_org_id
        AND dss.business_date >= p_current_date_from::DATE
        AND dss.business_date <= p_current_date_to::DATE;

    -- 前期間のデータ
    SELECT 
        COALESCE(SUM(dss.total_amount), 0),
        COALESCE(SUM(dss.booking_count), 0)
    INTO previous_total, previous_bookings
    FROM daily_sales_summary dss
    WHERE dss.tenant_id = p_tenant_id
        AND dss.org_id = p_org_id
        AND dss.business_date >= p_previous_date_from::DATE
        AND dss.business_date <= p_previous_date_to::DATE;

    -- 平均額計算
    current_avg := CASE WHEN current_bookings > 0 THEN ROUND(current_total / current_bookings, 0) ELSE 0 END;
    previous_avg := CASE WHEN previous_bookings > 0 THEN ROUND(previous_total / previous_bookings, 0) ELSE 0 END;

    RETURN QUERY
    SELECT 
        current_total,
        current_bookings,
        current_avg,
        previous_total,
        previous_bookings,
        previous_avg,
        CASE 
            WHEN previous_total > 0 
            THEN ROUND(((current_total - previous_total) / previous_total) * 100, 2)
            ELSE CASE WHEN current_total > 0 THEN 100.0 ELSE 0.0 END
        END as amount_growth_percentage,
        CASE 
            WHEN previous_bookings > 0 
            THEN ROUND(((current_bookings - previous_bookings)::NUMERIC / previous_bookings) * 100, 2)
            ELSE CASE WHEN current_bookings > 0 THEN 100.0 ELSE 0.0 END
        END as booking_growth_percentage,
        CASE 
            WHEN previous_avg > 0 
            THEN ROUND(((current_avg - previous_avg) / previous_avg) * 100, 2)
            ELSE CASE WHEN current_avg > 0 THEN 100.0 ELSE 0.0 END
        END as average_growth_percentage;
END;
$$;

-- 5. 期間別売上サマリーRPC関数
DROP FUNCTION IF EXISTS get_period_sales_summary(TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION get_period_sales_summary(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT
)
RETURNS TABLE (
    total_amount NUMERIC,
    booking_count INTEGER,
    unique_staff_count INTEGER,
    unique_menu_count INTEGER,
    avg_amount_per_booking NUMERIC,
    period_days INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(dss.total_amount), 0) as total_amount,
        COALESCE(SUM(dss.booking_count), 0) as booking_count,
        (
            SELECT COUNT(DISTINCT sss.staff_id)
            FROM staff_sales_summary sss
            WHERE sss.tenant_id = p_tenant_id
                AND sss.org_id = p_org_id
                AND sss.booking_count > 0
        )::INTEGER as unique_staff_count,
        (
            SELECT COUNT(DISTINCT mss.menu_id)
            FROM menu_sales_summary mss
            WHERE mss.tenant_id = p_tenant_id
                AND mss.org_id = p_org_id
                AND mss.booking_count > 0
        )::INTEGER as unique_menu_count,
        CASE 
            WHEN SUM(dss.booking_count) > 0 
            THEN ROUND(SUM(dss.total_amount) / SUM(dss.booking_count), 0)
            ELSE 0 
        END as avg_amount_per_booking,
        (p_date_to::DATE - p_date_from::DATE + 1)::INTEGER as period_days
    FROM daily_sales_summary dss
    WHERE dss.tenant_id = p_tenant_id
        AND dss.org_id = p_org_id
        AND dss.business_date >= p_date_from::DATE
        AND dss.business_date <= p_date_to::DATE;
END;
$$;

-- 6. スタッフパフォーマンス分析RPC関数
DROP FUNCTION IF EXISTS get_staff_performance_analysis(TEXT, TEXT, TEXT, TEXT, TEXT[], INTEGER);
CREATE OR REPLACE FUNCTION get_staff_performance_analysis(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT,
    p_staff_ids TEXT[] DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    staff_id TEXT,
    staff_name TEXT,
    total_amount NUMERIC,
    booking_count INTEGER,
    average_amount NUMERIC,
    performance_rank INTEGER,
    amount_percentage NUMERIC,
    last_booking_date TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_sales NUMERIC;
BEGIN
    -- 全体売上を計算
    SELECT COALESCE(SUM(sss.total_amount), 0) 
    INTO total_sales
    FROM staff_sales_summary sss
    WHERE sss.tenant_id = p_tenant_id
        AND sss.org_id = p_org_id
        AND (p_staff_ids IS NULL OR sss.staff_id = ANY(p_staff_ids));

    RETURN QUERY
    WITH ranked_staff AS (
        SELECT 
            sss.staff_id,
            MAX(sss.staff_name) as staff_name,
            SUM(sss.total_amount) as staff_total_amount,
            SUM(sss.booking_count) as staff_booking_count,
            CASE 
                WHEN SUM(sss.booking_count) > 0 
                THEN ROUND(SUM(sss.total_amount) / SUM(sss.booking_count), 0)
                ELSE 0 
            END as staff_average_amount,
            ROW_NUMBER() OVER (ORDER BY SUM(sss.total_amount) DESC) as rank,
            MAX(sss.last_booking_date)::TEXT as staff_last_booking_date
        FROM staff_sales_summary sss
        WHERE sss.tenant_id = p_tenant_id
            AND sss.org_id = p_org_id
            AND (p_staff_ids IS NULL OR sss.staff_id = ANY(p_staff_ids))
        GROUP BY sss.staff_id
    )
    SELECT 
        rs.staff_id,
        rs.staff_name,
        rs.staff_total_amount,
        rs.staff_booking_count,
        rs.staff_average_amount,
        rs.rank::INTEGER,
        CASE 
            WHEN total_sales > 0 
            THEN ROUND((rs.staff_total_amount / total_sales) * 100, 2)
            ELSE 0 
        END as amount_percentage,
        rs.staff_last_booking_date
    FROM ranked_staff rs
    WHERE rs.rank <= p_limit
    ORDER BY rs.rank;
END;
$$;

-- ============================================================================
-- 実行完了
-- ============================================================================

-- 関数の権限設定
GRANT EXECUTE ON FUNCTION get_aggregated_daily_sales TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_aggregated_staff_sales TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_aggregated_menu_sales TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_period_comparison_data TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_period_sales_summary TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_staff_performance_analysis TO anon, authenticated;

-- 作成確認
SELECT 
    proname as function_name,
    pronargs as arg_count,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname LIKE 'get_%' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;