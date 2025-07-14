-- ===============================================
-- 大規模SaaS向け メニュー価格帯分析RPC関数
-- ===============================================
-- 機能: メニューの価格帯別パフォーマンス分析
-- 対象: 3,000店舗規模でのビジネスインサイト生成
-- パーティション対応: 効率的な価格帯セグメンテーション

CREATE OR REPLACE FUNCTION get_menu_price_tier_analysis(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT,
    p_menu_ids TEXT[] DEFAULT NULL::TEXT[]
)
RETURNS TABLE(
    price_tier_data JSONB,
    insights JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    date_from_ts TIMESTAMPTZ := p_date_from::TIMESTAMPTZ;
    date_to_ts TIMESTAMPTZ := p_date_to::TIMESTAMPTZ;
    month_from DATE := DATE_TRUNC('month', date_from_ts);
    month_to DATE := DATE_TRUNC('month', date_to_ts);
    total_revenue NUMERIC := 0;
    total_bookings BIGINT := 0;
    avg_menu_price NUMERIC := 0;
    low_tier_revenue NUMERIC := 0;
    mid_tier_revenue NUMERIC := 0;
    high_tier_revenue NUMERIC := 0;
    low_tier_bookings BIGINT := 0;
    mid_tier_bookings BIGINT := 0;
    high_tier_bookings BIGINT := 0;
    low_tier_count INTEGER := 0;
    mid_tier_count INTEGER := 0;
    high_tier_count INTEGER := 0;
    most_profitable_tier TEXT := '';
    most_popular_tier TEXT := '';
BEGIN
    -- メニュー別の集計データを一時テーブルとして作成
    WITH menu_aggregates AS (
        SELECT 
            mss.menu_id,
            MAX(mss.menu_name) as menu_name,
            SUM(mss.total_amount) as total_amount,
            SUM(mss.booking_count) as booking_count,
            CASE 
                WHEN SUM(mss.booking_count) > 0 
                THEN SUM(mss.total_amount) / SUM(mss.booking_count)
                ELSE 0 
            END as average_amount
        FROM menu_sales_summary mss
        WHERE mss.tenant_id = p_tenant_id
            AND mss.org_id = p_org_id
            AND mss.summary_month >= month_from
            AND mss.summary_month <= month_to
            AND (p_menu_ids IS NULL OR mss.menu_id = ANY(p_menu_ids))
        GROUP BY mss.menu_id
        HAVING SUM(mss.total_amount) > 0  -- 売上のあるメニューのみ
    ),
    price_tier_classification AS (
        SELECT 
            *,
            CASE 
                WHEN average_amount < 5000 THEN 'low'
                WHEN average_amount < 10000 THEN 'mid'
                ELSE 'high'
            END as price_tier,
            CASE 
                WHEN average_amount < 5000 THEN '低価格帯 (¥0 - ¥5,000)'
                WHEN average_amount < 10000 THEN '中価格帯 (¥5,000 - ¥10,000)'
                ELSE '高価格帯 (¥10,000以上)'
            END as price_tier_label
        FROM menu_aggregates
    )
    SELECT 
        -- 全体統計
        SUM(total_amount),
        SUM(booking_count),
        AVG(average_amount),
        -- 低価格帯
        SUM(CASE WHEN price_tier = 'low' THEN total_amount ELSE 0 END),
        SUM(CASE WHEN price_tier = 'low' THEN booking_count ELSE 0 END),
        COUNT(CASE WHEN price_tier = 'low' THEN 1 END),
        -- 中価格帯
        SUM(CASE WHEN price_tier = 'mid' THEN total_amount ELSE 0 END),
        SUM(CASE WHEN price_tier = 'mid' THEN booking_count ELSE 0 END),
        COUNT(CASE WHEN price_tier = 'mid' THEN 1 END),
        -- 高価格帯
        SUM(CASE WHEN price_tier = 'high' THEN total_amount ELSE 0 END),
        SUM(CASE WHEN price_tier = 'high' THEN booking_count ELSE 0 END),
        COUNT(CASE WHEN price_tier = 'high' THEN 1 END)
    INTO 
        total_revenue, total_bookings, avg_menu_price,
        low_tier_revenue, low_tier_bookings, low_tier_count,
        mid_tier_revenue, mid_tier_bookings, mid_tier_count,
        high_tier_revenue, high_tier_bookings, high_tier_count
    FROM price_tier_classification;

    -- 最も収益性の高い価格帯を特定
    IF high_tier_revenue >= mid_tier_revenue AND high_tier_revenue >= low_tier_revenue THEN
        most_profitable_tier := '高価格帯';
    ELSIF mid_tier_revenue >= low_tier_revenue THEN
        most_profitable_tier := '中価格帯';
    ELSE
        most_profitable_tier := '低価格帯';
    END IF;

    -- 最も人気の価格帯を特定
    IF high_tier_bookings >= mid_tier_bookings AND high_tier_bookings >= low_tier_bookings THEN
        most_popular_tier := '高価格帯';
    ELSIF mid_tier_bookings >= low_tier_bookings THEN
        most_popular_tier := '中価格帯';
    ELSE
        most_popular_tier := '低価格帯';
    END IF;

    RETURN QUERY
    SELECT 
        -- 価格帯別データ
        jsonb_build_array(
            jsonb_build_object(
                'tier', '低価格帯',
                'priceRange', '¥0 - ¥5,000',
                'menuCount', low_tier_count,
                'totalAmount', COALESCE(low_tier_revenue, 0),
                'averageAmount', CASE WHEN low_tier_count > 0 THEN ROUND(low_tier_revenue / low_tier_count, 0) ELSE 0 END,
                'bookingCount', COALESCE(low_tier_bookings, 0)
            ),
            jsonb_build_object(
                'tier', '中価格帯',
                'priceRange', '¥5,000 - ¥10,000',
                'menuCount', mid_tier_count,
                'totalAmount', COALESCE(mid_tier_revenue, 0),
                'averageAmount', CASE WHEN mid_tier_count > 0 THEN ROUND(mid_tier_revenue / mid_tier_count, 0) ELSE 0 END,
                'bookingCount', COALESCE(mid_tier_bookings, 0)
            ),
            jsonb_build_object(
                'tier', '高価格帯',
                'priceRange', '¥10,000以上',
                'menuCount', high_tier_count,
                'totalAmount', COALESCE(high_tier_revenue, 0),
                'averageAmount', CASE WHEN high_tier_count > 0 THEN ROUND(high_tier_revenue / high_tier_count, 0) ELSE 0 END,
                'bookingCount', COALESCE(high_tier_bookings, 0)
            )
        ) as price_tier_data,
        -- インサイトデータ
        jsonb_build_object(
            'mostProfitableTier', most_profitable_tier,
            'mostPopularTier', most_popular_tier,
            'averageMenuPrice', ROUND(COALESCE(avg_menu_price, 0), 0),
            'totalMenusAnalyzed', (low_tier_count + mid_tier_count + high_tier_count),
            'totalRevenue', COALESCE(total_revenue, 0),
            'totalBookings', COALESCE(total_bookings, 0),
            'revenueDistribution', jsonb_build_object(
                'lowTier', CASE WHEN total_revenue > 0 THEN ROUND((low_tier_revenue / total_revenue) * 100, 1) ELSE 0 END,
                'midTier', CASE WHEN total_revenue > 0 THEN ROUND((mid_tier_revenue / total_revenue) * 100, 1) ELSE 0 END,
                'highTier', CASE WHEN total_revenue > 0 THEN ROUND((high_tier_revenue / total_revenue) * 100, 1) ELSE 0 END
            ),
            'bookingDistribution', jsonb_build_object(
                'lowTier', CASE WHEN total_bookings > 0 THEN ROUND((low_tier_bookings::NUMERIC / total_bookings) * 100, 1) ELSE 0 END,
                'midTier', CASE WHEN total_bookings > 0 THEN ROUND((mid_tier_bookings::NUMERIC / total_bookings) * 100, 1) ELSE 0 END,
                'highTier', CASE WHEN total_bookings > 0 THEN ROUND((high_tier_bookings::NUMERIC / total_bookings) * 100, 1) ELSE 0 END
            ),
            'businessRecommendations', jsonb_build_array(
                CASE 
                    WHEN most_profitable_tier != most_popular_tier 
                    THEN '人気価格帯のメニューを収益性の高い価格帯にアップグレードすることを検討してください'
                    ELSE '売上No.1と人気No.1の価格帯が一致しており、バランスの良い価格設定です'
                END,
                CASE 
                    WHEN avg_menu_price < 5000 
                    THEN '平均メニュー価格が低めです。高付加価値メニューの開発を検討してください'
                    WHEN avg_menu_price > 15000 
                    THEN '平均メニュー価格が高めです。エントリーレベルのメニュー追加を検討してください'
                    ELSE '適切な価格レンジでメニューが設定されています'
                END
            )
        ) as insights;
END;
$$;

-- ===============================================
-- 詳細な価格帯分析（メニューレベル）
-- ===============================================
CREATE OR REPLACE FUNCTION get_detailed_menu_price_analysis(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT,
    p_price_tier TEXT DEFAULT NULL,  -- 'low', 'mid', 'high' または NULL（全て）
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
    menu_id TEXT,
    menu_name TEXT,
    price_tier TEXT,
    price_tier_label TEXT,
    average_price NUMERIC,
    total_amount NUMERIC,
    booking_count BIGINT,
    price_efficiency_score NUMERIC  -- 価格効率スコア
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    date_from_ts TIMESTAMPTZ := p_date_from::TIMESTAMPTZ;
    date_to_ts TIMESTAMPTZ := p_date_to::TIMESTAMPTZ;
    month_from DATE := DATE_TRUNC('month', date_from_ts);
    month_to DATE := DATE_TRUNC('month', date_to_ts);
BEGIN
    RETURN QUERY
    WITH menu_price_analysis AS (
        SELECT 
            mss.menu_id,
            MAX(mss.menu_name) as menu_name,
            SUM(mss.total_amount) as total_amount,
            SUM(mss.booking_count) as booking_count,
            CASE 
                WHEN SUM(mss.booking_count) > 0 
                THEN SUM(mss.total_amount) / SUM(mss.booking_count)
                ELSE 0 
            END as average_price,
            CASE 
                WHEN SUM(mss.total_amount) / NULLIF(SUM(mss.booking_count), 0) < 5000 THEN 'low'
                WHEN SUM(mss.total_amount) / NULLIF(SUM(mss.booking_count), 0) < 10000 THEN 'mid'
                ELSE 'high'
            END as tier,
            CASE 
                WHEN SUM(mss.total_amount) / NULLIF(SUM(mss.booking_count), 0) < 5000 THEN '低価格帯 (¥0 - ¥5,000)'
                WHEN SUM(mss.total_amount) / NULLIF(SUM(mss.booking_count), 0) < 10000 THEN '中価格帯 (¥5,000 - ¥10,000)'
                ELSE '高価格帯 (¥10,000以上)'
            END as tier_label
        FROM menu_sales_summary mss
        WHERE mss.tenant_id = p_tenant_id
            AND mss.org_id = p_org_id
            AND mss.summary_month >= month_from
            AND mss.summary_month <= month_to
        GROUP BY mss.menu_id
        HAVING SUM(mss.total_amount) > 0
    ),
    scored_analysis AS (
        SELECT 
            *,
            -- 価格効率スコア: (売上 / 平均価格) * 予約数の重み
            ROUND(
                (total_amount / NULLIF(average_price, 0)) * 
                LOG(1 + booking_count) * 10, 2
            ) as efficiency_score
        FROM menu_price_analysis
        WHERE (p_price_tier IS NULL OR tier = p_price_tier)
    )
    SELECT 
        sa.menu_id,
        sa.menu_name,
        sa.tier,
        sa.tier_label,
        ROUND(sa.average_price, 0),
        sa.total_amount,
        sa.booking_count,
        sa.efficiency_score
    FROM scored_analysis sa
    ORDER BY sa.efficiency_score DESC, sa.total_amount DESC
    LIMIT p_limit;
END;
$$;

-- 権限付与
GRANT EXECUTE ON FUNCTION get_menu_price_tier_analysis TO service_role;
GRANT EXECUTE ON FUNCTION get_menu_price_tier_analysis TO public;
GRANT EXECUTE ON FUNCTION get_detailed_menu_price_analysis TO service_role;
GRANT EXECUTE ON FUNCTION get_detailed_menu_price_analysis TO public;

-- 実行ログ
DO $$
BEGIN
    RAISE NOTICE '[Enterprise] Menu price tier analysis RPC functions created successfully';
    RAISE NOTICE '[Enterprise] Functions: get_menu_price_tier_analysis, get_detailed_menu_price_analysis';
    RAISE NOTICE '[Enterprise] Features: Price tier segmentation, business recommendations, efficiency scoring';
END $$;