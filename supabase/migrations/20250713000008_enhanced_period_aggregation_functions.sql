-- 強化された期間集計RPC関数
-- PeriodAggregationOptionsに対応した柔軟な集計機能

-- 週次スタッフ売上集計
CREATE OR REPLACE FUNCTION get_weekly_staff_sales(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT,
    p_staff_ids TEXT[] DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    staff_id TEXT,
    staff_name TEXT,
    week_start DATE,
    week_end DATE,
    total_amount NUMERIC,
    booking_count INTEGER,
    average_amount NUMERIC,
    week_rank INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH weekly_data AS (
        SELECT 
            dss.tenant_id,
            dss.org_id,
            r.staff_id,
            r.staff_name,
            DATE_TRUNC('week', dss.business_date)::DATE as week_start,
            (DATE_TRUNC('week', dss.business_date) + INTERVAL '6 days')::DATE as week_end,
            SUM(dss.total_amount) as week_total_amount,
            SUM(dss.booking_count) as week_booking_count
        FROM daily_sales_summary dss
        JOIN reservation r ON dss.tenant_id = r.tenant_id 
            AND dss.org_id = r.org_id 
            AND dss.business_date = r.business_date::DATE
        WHERE dss.tenant_id = p_tenant_id
            AND dss.org_id = p_org_id
            AND dss.business_date >= p_date_from::DATE
            AND dss.business_date <= p_date_to::DATE
            AND (p_staff_ids IS NULL OR r.staff_id = ANY(p_staff_ids))
        GROUP BY dss.tenant_id, dss.org_id, r.staff_id, r.staff_name, week_start, week_end
    ),
    ranked_weekly AS (
        SELECT 
            wd.*,
            CASE 
                WHEN wd.week_booking_count > 0 
                THEN ROUND(wd.week_total_amount / wd.week_booking_count, 0)
                ELSE 0 
            END as week_average_amount,
            ROW_NUMBER() OVER (ORDER BY wd.week_total_amount DESC) as week_rank
        FROM weekly_data wd
    )
    SELECT 
        rw.staff_id,
        rw.staff_name,
        rw.week_start,
        rw.week_end,
        rw.week_total_amount,
        rw.week_booking_count,
        rw.week_average_amount,
        rw.week_rank::INTEGER
    FROM ranked_weekly rw
    WHERE rw.week_rank <= p_limit
    ORDER BY rw.week_rank;
END;
$$;

-- 月次メニュー売上集計
CREATE OR REPLACE FUNCTION get_monthly_menu_sales(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT,
    p_menu_ids TEXT[] DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    menu_id TEXT,
    menu_name TEXT,
    month_period TEXT,
    total_amount NUMERIC,
    booking_count INTEGER,
    average_amount NUMERIC,
    month_rank INTEGER,
    growth_percentage NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH monthly_data AS (
        SELECT 
            mss.menu_id,
            MAX(mss.menu_name) as menu_name,
            TO_CHAR(mss.summary_month, 'YYYY-MM') as month_period,
            SUM(mss.total_amount) as month_total_amount,
            SUM(mss.booking_count) as month_booking_count
        FROM menu_sales_summary mss
        WHERE mss.tenant_id = p_tenant_id
            AND mss.org_id = p_org_id
            AND mss.summary_month >= DATE_TRUNC('month', p_date_from::DATE)
            AND mss.summary_month <= DATE_TRUNC('month', p_date_to::DATE)
            AND (p_menu_ids IS NULL OR mss.menu_id = ANY(p_menu_ids))
        GROUP BY mss.menu_id, month_period
    ),
    ranked_monthly AS (
        SELECT 
            md.*,
            CASE 
                WHEN md.month_booking_count > 0 
                THEN ROUND(md.month_total_amount / md.month_booking_count, 0)
                ELSE 0 
            END as month_average_amount,
            ROW_NUMBER() OVER (PARTITION BY md.month_period ORDER BY md.month_total_amount DESC) as month_rank,
            LAG(md.month_total_amount) OVER (PARTITION BY md.menu_id ORDER BY md.month_period) as prev_month_amount
        FROM monthly_data md
    )
    SELECT 
        rm.menu_id,
        rm.menu_name,
        rm.month_period,
        rm.month_total_amount,
        rm.month_booking_count,
        rm.month_average_amount,
        rm.month_rank::INTEGER,
        CASE 
            WHEN rm.prev_month_amount > 0 
            THEN ROUND(((rm.month_total_amount - rm.prev_month_amount) / rm.prev_month_amount) * 100, 2)
            ELSE CASE WHEN rm.month_total_amount > 0 THEN 100.0 ELSE 0.0 END
        END as growth_percentage
    FROM ranked_monthly rm
    WHERE rm.month_rank <= p_limit
    ORDER BY rm.month_period, rm.month_rank;
END;
$$;

-- 期間集計データの取得（groupBy対応）
CREATE OR REPLACE FUNCTION get_period_aggregated_data(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT,
    p_group_by TEXT DEFAULT 'day', -- 'day', 'week', 'month', 'staff', 'menu'
    p_period TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
    p_order_by TEXT DEFAULT 'amount', -- 'amount', 'count', 'date'
    p_order_direction TEXT DEFAULT 'desc', -- 'asc', 'desc'
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    period_key TEXT,
    period_name TEXT,
    total_amount NUMERIC,
    booking_count INTEGER,
    average_amount NUMERIC,
    unique_items INTEGER,
    rank_position INTEGER
) 
LANGUAGE plpgsql
AS $$
DECLARE
    sql_query TEXT;
BEGIN
    -- groupByとperiodに応じてクエリを動的に構築
    CASE 
        WHEN p_group_by = 'day' AND p_period = 'daily' THEN
            sql_query := FORMAT('
                WITH daily_aggregated AS (
                    SELECT 
                        business_date::TEXT as period_key,
                        TO_CHAR(business_date, ''YYYY-MM-DD'') as period_name,
                        SUM(total_amount) as total_amount,
                        SUM(booking_count) as booking_count,
                        1 as unique_items
                    FROM daily_sales_summary
                    WHERE tenant_id = %L AND org_id = %L
                        AND business_date >= %L::DATE 
                        AND business_date <= %L::DATE
                    GROUP BY business_date
                ),
                ranked_data AS (
                    SELECT *,
                        CASE WHEN booking_count > 0 THEN ROUND(total_amount / booking_count, 0) ELSE 0 END as average_amount,
                        ROW_NUMBER() OVER (ORDER BY %s %s) as rank_position
                    FROM daily_aggregated
                )
                SELECT period_key, period_name, total_amount, booking_count, average_amount, unique_items, rank_position::INTEGER
                FROM ranked_data 
                WHERE rank_position <= %s
                ORDER BY rank_position',
                p_tenant_id, p_org_id, p_date_from, p_date_to,
                CASE WHEN p_order_by = 'amount' THEN 'total_amount' 
                     WHEN p_order_by = 'count' THEN 'booking_count' 
                     ELSE 'business_date' END,
                CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END,
                p_limit
            );

        WHEN p_group_by = 'staff' THEN
            sql_query := FORMAT('
                WITH staff_aggregated AS (
                    SELECT 
                        staff_id as period_key,
                        MAX(staff_name) as period_name,
                        SUM(total_amount) as total_amount,
                        SUM(booking_count) as booking_count,
                        COUNT(DISTINCT summary_month) as unique_items
                    FROM staff_sales_summary
                    WHERE tenant_id = %L AND org_id = %L
                        AND summary_month >= DATE_TRUNC(''month'', %L::DATE)
                        AND summary_month <= DATE_TRUNC(''month'', %L::DATE)
                    GROUP BY staff_id
                ),
                ranked_data AS (
                    SELECT *,
                        CASE WHEN booking_count > 0 THEN ROUND(total_amount / booking_count, 0) ELSE 0 END as average_amount,
                        ROW_NUMBER() OVER (ORDER BY %s %s) as rank_position
                    FROM staff_aggregated
                )
                SELECT period_key, period_name, total_amount, booking_count, average_amount, unique_items, rank_position::INTEGER
                FROM ranked_data 
                WHERE rank_position <= %s
                ORDER BY rank_position',
                p_tenant_id, p_org_id, p_date_from, p_date_to,
                CASE WHEN p_order_by = 'amount' THEN 'total_amount' 
                     WHEN p_order_by = 'count' THEN 'booking_count' 
                     ELSE 'period_name' END,
                CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END,
                p_limit
            );

        WHEN p_group_by = 'menu' THEN
            sql_query := FORMAT('
                WITH menu_aggregated AS (
                    SELECT 
                        menu_id as period_key,
                        MAX(menu_name) as period_name,
                        SUM(total_amount) as total_amount,
                        SUM(booking_count) as booking_count,
                        COUNT(DISTINCT summary_month) as unique_items
                    FROM menu_sales_summary
                    WHERE tenant_id = %L AND org_id = %L
                        AND summary_month >= DATE_TRUNC(''month'', %L::DATE)
                        AND summary_month <= DATE_TRUNC(''month'', %L::DATE)
                    GROUP BY menu_id
                ),
                ranked_data AS (
                    SELECT *,
                        CASE WHEN booking_count > 0 THEN ROUND(total_amount / booking_count, 0) ELSE 0 END as average_amount,
                        ROW_NUMBER() OVER (ORDER BY %s %s) as rank_position
                    FROM menu_aggregated
                )
                SELECT period_key, period_name, total_amount, booking_count, average_amount, unique_items, rank_position::INTEGER
                FROM ranked_data 
                WHERE rank_position <= %s
                ORDER BY rank_position',
                p_tenant_id, p_org_id, p_date_from, p_date_to,
                CASE WHEN p_order_by = 'amount' THEN 'total_amount' 
                     WHEN p_order_by = 'count' THEN 'booking_count' 
                     ELSE 'period_name' END,
                CASE WHEN p_order_direction = 'asc' THEN 'ASC' ELSE 'DESC' END,
                p_limit
            );

        ELSE
            -- デフォルトは日次集計
            sql_query := FORMAT('
                SELECT 
                    ''default''::TEXT as period_key,
                    ''No data''::TEXT as period_name,
                    0::NUMERIC as total_amount,
                    0::INTEGER as booking_count,
                    0::NUMERIC as average_amount,
                    0::INTEGER as unique_items,
                    1::INTEGER as rank_position
                LIMIT 1'
            );
    END CASE;

    RETURN QUERY EXECUTE sql_query;
END;
$$;

-- マイグレーション完了ログ
INSERT INTO migration_log (version, description, executed_at) 
VALUES ('20250713000008', 'Enhanced period aggregation functions with PeriodAggregationOptions support', NOW())
ON CONFLICT (version) DO NOTHING;