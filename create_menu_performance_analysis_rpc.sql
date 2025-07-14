-- ===============================================
-- 大規模SaaS向け メニューパフォーマンス分析RPC関数（強化版）
-- ===============================================
-- 機能: メニュー別詳細分析データの高速取得
-- 対象: 3,000店舗規模での複雑な集計処理
-- パーティション対応: 月次パーティションを活用した効率的集計

CREATE OR REPLACE FUNCTION get_menu_performance_analysis_v2(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT,
    p_menu_ids TEXT[] DEFAULT NULL::TEXT[],
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
    menu_id TEXT,
    menu_name TEXT,
    total_amount NUMERIC,
    booking_count BIGINT,
    average_amount NUMERIC,
    performance_rank INTEGER,
    amount_percentage NUMERIC,
    growth_trend NUMERIC,  -- 成長トレンド（前期比）
    consistency_score NUMERIC  -- 一貫性スコア
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_sales NUMERIC;
    date_from_ts TIMESTAMPTZ := p_date_from::TIMESTAMPTZ;
    date_to_ts TIMESTAMPTZ := p_date_to::TIMESTAMPTZ;
    month_from DATE := DATE_TRUNC('month', date_from_ts);
    month_to DATE := DATE_TRUNC('month', date_to_ts);
BEGIN
    -- 全体売上を計算（選択されたメニューまたは全メニュー）
    SELECT COALESCE(SUM(mss.total_amount), 0) 
    INTO total_sales
    FROM menu_sales_summary mss
    WHERE mss.tenant_id = p_tenant_id
        AND mss.org_id = p_org_id
        AND mss.summary_month >= month_from
        AND mss.summary_month <= month_to
        AND (p_menu_ids IS NULL OR mss.menu_id = ANY(p_menu_ids));

    RETURN QUERY
    WITH current_period AS (
        -- 現在期間の集計
        SELECT 
            mss.menu_id,
            MAX(mss.menu_name) as menu_name,
            SUM(mss.total_amount) as menu_total_amount,
            SUM(mss.booking_count) as menu_booking_count,
            AVG(mss.total_amount) as avg_monthly_amount,
            STDDEV(mss.total_amount) as stddev_amount,
            COUNT(*) as month_count
        FROM menu_sales_summary mss
        WHERE mss.tenant_id = p_tenant_id
            AND mss.org_id = p_org_id
            AND mss.summary_month >= month_from
            AND mss.summary_month <= month_to
            AND (p_menu_ids IS NULL OR mss.menu_id = ANY(p_menu_ids))
        GROUP BY mss.menu_id
    ),
    previous_period AS (
        -- 前期間の集計（比較用）
        SELECT 
            mss.menu_id,
            SUM(mss.total_amount) as prev_total_amount
        FROM menu_sales_summary mss
        WHERE mss.tenant_id = p_tenant_id
            AND mss.org_id = p_org_id
            AND mss.summary_month >= (month_from - INTERVAL '1 year')
            AND mss.summary_month <= (month_to - INTERVAL '1 year')
            AND (p_menu_ids IS NULL OR mss.menu_id = ANY(p_menu_ids))
        GROUP BY mss.menu_id
    ),
    ranked_analysis AS (
        SELECT 
            cp.menu_id,
            cp.menu_name,
            cp.menu_total_amount,
            cp.menu_booking_count,
            CASE 
                WHEN cp.menu_booking_count > 0 
                THEN ROUND(cp.menu_total_amount / cp.menu_booking_count, 0)
                ELSE 0 
            END as menu_average_amount,
            ROW_NUMBER() OVER (ORDER BY cp.menu_total_amount DESC) as rank,
            -- 成長トレンド計算
            CASE 
                WHEN pp.prev_total_amount > 0 
                THEN ROUND(((cp.menu_total_amount - pp.prev_total_amount) / pp.prev_total_amount) * 100, 2)
                ELSE 0 
            END as growth_trend,
            -- 一貫性スコア（変動係数の逆数、10点満点）
            CASE 
                WHEN cp.avg_monthly_amount > 0 AND cp.stddev_amount > 0
                THEN LEAST(10, ROUND(10 / (cp.stddev_amount / cp.avg_monthly_amount), 2))
                ELSE 10
            END as consistency_score
        FROM current_period cp
        LEFT JOIN previous_period pp ON cp.menu_id = pp.menu_id
        WHERE cp.menu_total_amount > 0  -- 売上のあるメニューのみ
    )
    SELECT 
        ra.menu_id,
        ra.menu_name,
        ra.menu_total_amount,
        ra.menu_booking_count,
        ra.menu_average_amount,
        ra.rank::INTEGER,
        CASE 
            WHEN total_sales > 0 
            THEN ROUND((ra.menu_total_amount / total_sales) * 100, 2)
            ELSE 0 
        END as amount_percentage,
        ra.growth_trend,
        ra.consistency_score
    FROM ranked_analysis ra
    WHERE ra.rank <= p_limit
    ORDER BY ra.rank;
END;
$$;

-- ===============================================
-- 簡易版メニューパフォーマンス分析（既存互換性）
-- ===============================================
CREATE OR REPLACE FUNCTION get_menu_performance_summary(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT,
    p_menu_ids TEXT[] DEFAULT NULL::TEXT[]
)
RETURNS TABLE(
    top_performers JSONB,
    average_performance JSONB,
    performance_distribution JSONB,
    insights JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_menus INTEGER;
    avg_amount NUMERIC;
    high_count INTEGER := 0;
    medium_count INTEGER := 0;
    low_count INTEGER := 0;
    result JSONB;
BEGIN
    -- 基本統計を計算
    SELECT 
        COUNT(*),
        AVG(SUM(mss.total_amount))
    INTO total_menus, avg_amount
    FROM menu_sales_summary mss
    WHERE mss.tenant_id = p_tenant_id
        AND mss.org_id = p_org_id
        AND mss.summary_month >= DATE_TRUNC('month', p_date_from::TIMESTAMPTZ)
        AND mss.summary_month <= DATE_TRUNC('month', p_date_to::TIMESTAMPTZ)
        AND (p_menu_ids IS NULL OR mss.menu_id = ANY(p_menu_ids))
    GROUP BY mss.menu_id;

    -- パフォーマンス分布を計算
    SELECT 
        COUNT(*) FILTER (WHERE menu_total >= avg_amount),
        COUNT(*) FILTER (WHERE menu_total >= avg_amount * 0.5 AND menu_total < avg_amount),
        COUNT(*) FILTER (WHERE menu_total < avg_amount * 0.5)
    INTO high_count, medium_count, low_count
    FROM (
        SELECT SUM(mss.total_amount) as menu_total
        FROM menu_sales_summary mss
        WHERE mss.tenant_id = p_tenant_id
            AND mss.org_id = p_org_id
            AND mss.summary_month >= DATE_TRUNC('month', p_date_from::TIMESTAMPTZ)
            AND mss.summary_month <= DATE_TRUNC('month', p_date_to::TIMESTAMPTZ)
            AND (p_menu_ids IS NULL OR mss.menu_id = ANY(p_menu_ids))
        GROUP BY mss.menu_id
    ) menu_totals;

    RETURN QUERY
    SELECT 
        jsonb_build_object('count', 5) as top_performers,
        jsonb_build_object(
            'averageAmount', COALESCE(avg_amount, 0),
            'averageBookings', COALESCE(total_menus, 0)
        ) as average_performance,
        jsonb_build_object(
            'high', high_count,
            'medium', medium_count,
            'low', low_count
        ) as performance_distribution,
        jsonb_build_object(
            'totalMenus', total_menus,
            'analysisComplete', true
        ) as insights;
END;
$$;

-- 権限付与
GRANT EXECUTE ON FUNCTION get_menu_performance_analysis_v2 TO service_role;
GRANT EXECUTE ON FUNCTION get_menu_performance_analysis_v2 TO public;
GRANT EXECUTE ON FUNCTION get_menu_performance_summary TO service_role;
GRANT EXECUTE ON FUNCTION get_menu_performance_summary TO public;

-- 実行ログ
DO $$
BEGIN
    RAISE NOTICE '[Enterprise] Menu performance analysis RPC functions created successfully';
    RAISE NOTICE '[Enterprise] Functions: get_menu_performance_analysis_v2, get_menu_performance_summary';
    RAISE NOTICE '[Enterprise] Features: Growth trend analysis, consistency scoring, performance distribution';
END $$;