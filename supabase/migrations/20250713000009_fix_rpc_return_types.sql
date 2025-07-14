-- RPC関数の戻り値型不一致を修正
-- SUM関数の結果はBIGINTなので、booking_countの型をBIGINTに変更

-- 既存関数を削除（戻り値型変更のため）
DROP FUNCTION IF EXISTS get_aggregated_staff_sales(TEXT, TEXT, TEXT, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS get_aggregated_menu_sales(TEXT, TEXT, TEXT, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS get_aggregated_daily_sales(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_period_sales_summary(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_menu_performance_analysis(TEXT, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_staff_performance_analysis(TEXT, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_period_comparison_data(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- スタッフ別売上集計RPC関数の型修正
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
    booking_count BIGINT,  -- INTEGER → BIGINT に変更
    last_booking_date DATE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sss.staff_id,
        MAX(sss.staff_name) as staff_name,
        SUM(sss.total_amount) as total_amount,
        SUM(sss.booking_count) as booking_count,  -- SUM結果はBIGINTになる
        MAX(sss.last_booking_date) as last_booking_date,
        MAX(sss.created_at) as created_at,
        MAX(sss.updated_at) as updated_at
    FROM staff_sales_summary sss
    WHERE sss.tenant_id = p_tenant_id
        AND sss.org_id = p_org_id
        AND sss.summary_month >= p_date_from::DATE
        AND sss.summary_month <= p_date_to::DATE
        AND (p_staff_ids IS NULL OR sss.staff_id = ANY(p_staff_ids))
    GROUP BY sss.staff_id
    ORDER BY total_amount DESC;
END;
$$;

-- メニュー別売上集計RPC関数の型修正
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
    booking_count BIGINT,  -- INTEGER → BIGINT に変更
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mss.menu_id,
        MAX(mss.menu_name) as menu_name,
        SUM(mss.total_amount) as total_amount,
        SUM(mss.booking_count) as booking_count,  -- SUM結果はBIGINTになる
        MAX(mss.created_at) as created_at,
        MAX(mss.updated_at) as updated_at
    FROM menu_sales_summary mss
    WHERE mss.tenant_id = p_tenant_id
        AND mss.org_id = p_org_id
        AND mss.summary_month >= p_date_from::DATE
        AND mss.summary_month <= p_date_to::DATE
        AND (p_menu_ids IS NULL OR mss.menu_id = ANY(p_menu_ids))
    GROUP BY mss.menu_id
    ORDER BY total_amount DESC;
END;
$$;

-- 日別売上集計RPC関数の型修正
CREATE OR REPLACE FUNCTION get_aggregated_daily_sales(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT
)
RETURNS TABLE (
    business_date DATE,
    total_amount NUMERIC,
    booking_count BIGINT,  -- INTEGER → BIGINT に変更
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dss.business_date,
        dss.total_amount,
        dss.booking_count::BIGINT,  -- BIGINTにキャスト
        dss.created_at,
        dss.updated_at
    FROM daily_sales_summary dss
    WHERE dss.tenant_id = p_tenant_id
        AND dss.org_id = p_org_id
        AND dss.business_date >= p_date_from::DATE
        AND dss.business_date <= p_date_to::DATE
    ORDER BY dss.business_date ASC;
END;
$$;

-- 期間別売上サマリーRPC関数の型修正
CREATE OR REPLACE FUNCTION get_period_sales_summary(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT
)
RETURNS TABLE (
    total_amount NUMERIC,
    booking_count BIGINT,  -- INTEGER → BIGINT に変更
    unique_staff_count INTEGER,
    unique_menu_count INTEGER,
    avg_amount_per_booking NUMERIC,
    period_days INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(dss.total_amount), 0) as total_amount,
        COALESCE(SUM(dss.booking_count), 0)::BIGINT as booking_count,  -- BIGINTにキャスト
        (
            SELECT COUNT(DISTINCT sss.staff_id)
            FROM staff_sales_summary sss
            WHERE sss.tenant_id = p_tenant_id
                AND sss.org_id = p_org_id
                AND sss.summary_month >= DATE_TRUNC('month', p_date_from::DATE)
                AND sss.summary_month <= DATE_TRUNC('month', p_date_to::DATE)
                AND sss.booking_count > 0
        )::INTEGER as unique_staff_count,
        (
            SELECT COUNT(DISTINCT mss.menu_id)
            FROM menu_sales_summary mss
            WHERE mss.tenant_id = p_tenant_id
                AND mss.org_id = p_org_id
                AND mss.summary_month >= DATE_TRUNC('month', p_date_from::DATE)
                AND mss.summary_month <= DATE_TRUNC('month', p_date_to::DATE)
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

-- メニュー別パフォーマンス分析RPC関数の型修正
CREATE OR REPLACE FUNCTION get_menu_performance_analysis(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    menu_id TEXT,
    menu_name TEXT,
    total_amount NUMERIC,
    booking_count BIGINT,  -- INTEGER → BIGINT に変更
    average_amount NUMERIC,
    performance_rank INTEGER,
    amount_percentage NUMERIC
) 
LANGUAGE plpgsql
AS $$
DECLARE
    total_sales NUMERIC;
BEGIN
    -- 全体売上を計算
    SELECT COALESCE(SUM(mss.total_amount), 0) 
    INTO total_sales
    FROM menu_sales_summary mss
    WHERE mss.tenant_id = p_tenant_id
        AND mss.org_id = p_org_id
        AND mss.summary_month >= DATE_TRUNC('month', p_date_from::DATE)
        AND mss.summary_month <= DATE_TRUNC('month', p_date_to::DATE);

    RETURN QUERY
    WITH ranked_menus AS (
        SELECT 
            mss.menu_id,
            MAX(mss.menu_name) as menu_name,
            SUM(mss.total_amount) as menu_total_amount,
            SUM(mss.booking_count) as menu_booking_count,  -- SUM結果はBIGINTになる
            CASE 
                WHEN SUM(mss.booking_count) > 0 
                THEN ROUND(SUM(mss.total_amount) / SUM(mss.booking_count), 0)
                ELSE 0 
            END as menu_average_amount,
            ROW_NUMBER() OVER (ORDER BY SUM(mss.total_amount) DESC) as rank
        FROM menu_sales_summary mss
        WHERE mss.tenant_id = p_tenant_id
            AND mss.org_id = p_org_id
            AND mss.summary_month >= DATE_TRUNC('month', p_date_from::DATE)
            AND mss.summary_month <= DATE_TRUNC('month', p_date_to::DATE)
        GROUP BY mss.menu_id
    )
    SELECT 
        rm.menu_id,
        rm.menu_name,
        rm.menu_total_amount,
        rm.menu_booking_count,
        rm.menu_average_amount,
        rm.rank::INTEGER,
        CASE 
            WHEN total_sales > 0 
            THEN ROUND((rm.menu_total_amount / total_sales) * 100, 2)
            ELSE 0 
        END as amount_percentage
    FROM ranked_menus rm
    WHERE rm.rank <= p_limit
    ORDER BY rm.rank;
END;
$$;

-- スタッフ別パフォーマンス分析RPC関数の型修正
CREATE OR REPLACE FUNCTION get_staff_performance_analysis(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    staff_id TEXT,
    staff_name TEXT,
    total_amount NUMERIC,
    booking_count BIGINT,  -- INTEGER → BIGINT に変更
    average_amount NUMERIC,
    performance_rank INTEGER,
    amount_percentage NUMERIC,
    last_booking_date DATE
) 
LANGUAGE plpgsql
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
        AND sss.summary_month >= DATE_TRUNC('month', p_date_from::DATE)
        AND sss.summary_month <= DATE_TRUNC('month', p_date_to::DATE);

    RETURN QUERY
    WITH ranked_staff AS (
        SELECT 
            sss.staff_id,
            MAX(sss.staff_name) as staff_name,
            SUM(sss.total_amount) as staff_total_amount,
            SUM(sss.booking_count) as staff_booking_count,  -- SUM結果はBIGINTになる
            CASE 
                WHEN SUM(sss.booking_count) > 0 
                THEN ROUND(SUM(sss.total_amount) / SUM(sss.booking_count), 0)
                ELSE 0 
            END as staff_average_amount,
            ROW_NUMBER() OVER (ORDER BY SUM(sss.total_amount) DESC) as rank,
            MAX(sss.last_booking_date) as staff_last_booking_date
        FROM staff_sales_summary sss
        WHERE sss.tenant_id = p_tenant_id
            AND sss.org_id = p_org_id
            AND sss.summary_month >= DATE_TRUNC('month', p_date_from::DATE)
            AND sss.summary_month <= DATE_TRUNC('month', p_date_to::DATE)
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

-- 期間比較データ取得RPC関数の型修正
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
    current_booking_count BIGINT,  -- INTEGER → BIGINT に変更
    current_average_amount NUMERIC,
    previous_total_amount NUMERIC,
    previous_booking_count BIGINT,  -- INTEGER → BIGINT に変更
    previous_average_amount NUMERIC,
    amount_growth_percentage NUMERIC,
    booking_growth_percentage NUMERIC,
    average_growth_percentage NUMERIC
) 
LANGUAGE plpgsql
AS $$
DECLARE
    current_total NUMERIC := 0;
    current_bookings BIGINT := 0;  -- BIGINT に変更
    current_avg NUMERIC := 0;
    previous_total NUMERIC := 0;
    previous_bookings BIGINT := 0;  -- BIGINT に変更
    previous_avg NUMERIC := 0;
BEGIN
    -- 現在期間のデータ
    SELECT 
        COALESCE(SUM(dss.total_amount), 0),
        COALESCE(SUM(dss.booking_count), 0)::BIGINT  -- BIGINTにキャスト
    INTO current_total, current_bookings
    FROM daily_sales_summary dss
    WHERE dss.tenant_id = p_tenant_id
        AND dss.org_id = p_org_id
        AND dss.business_date >= p_current_date_from::DATE
        AND dss.business_date <= p_current_date_to::DATE;

    -- 前期間のデータ
    SELECT 
        COALESCE(SUM(dss.total_amount), 0),
        COALESCE(SUM(dss.booking_count), 0)::BIGINT  -- BIGINTにキャスト
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

-- RPC関数の戻り値型修正完了