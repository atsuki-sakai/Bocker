-- バグ修正: アナリティクスフィルタリングで1ヶ月未満の期間でデータが取得できない問題
-- 安全な関数再定義版（既存関数をDROPしてから再作成）

-- 1. 既存関数を安全にDROP
DROP FUNCTION IF EXISTS get_aggregated_staff_sales(TEXT, TEXT, TEXT, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS get_aggregated_menu_sales(TEXT, TEXT, TEXT, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS debug_aggregation_filter(TEXT, TEXT, TEXT, TEXT);

-- 2. スタッフ別売上集計RPC関数の修正版作成
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
    last_booking_date DATE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- デバッグログ出力
    RAISE NOTICE 'get_aggregated_staff_sales called with: tenant_id=%, org_id=%, date_from=%, date_to=%', 
        p_tenant_id, p_org_id, p_date_from, p_date_to;
    RAISE NOTICE 'Date truncation: from=%, to=%', 
        DATE_TRUNC('month', p_date_from::DATE), DATE_TRUNC('month', p_date_to::DATE);

    RETURN QUERY
    SELECT 
        sss.staff_id,
        MAX(sss.staff_name) as staff_name,
        SUM(sss.total_amount) as total_amount,
        SUM(sss.booking_count) as booking_count,
        MAX(sss.last_booking_date) as last_booking_date,
        MAX(sss.created_at) as created_at,
        MAX(sss.updated_at) as updated_at
    FROM staff_sales_summary sss
    WHERE sss.tenant_id = p_tenant_id
        AND sss.org_id = p_org_id
        -- 🔧 修正: 月範囲での比較に変更
        AND sss.summary_month >= DATE_TRUNC('month', p_date_from::DATE)
        AND sss.summary_month <= DATE_TRUNC('month', p_date_to::DATE)
        AND (p_staff_ids IS NULL OR sss.staff_id = ANY(p_staff_ids))
    GROUP BY sss.staff_id
    ORDER BY total_amount DESC;
END;
$$;

-- 3. メニュー別売上集計RPC関数の修正版作成
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
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- デバッグログ出力
    RAISE NOTICE 'get_aggregated_menu_sales called with: tenant_id=%, org_id=%, date_from=%, date_to=%', 
        p_tenant_id, p_org_id, p_date_from, p_date_to;
    RAISE NOTICE 'Date truncation: from=%, to=%', 
        DATE_TRUNC('month', p_date_from::DATE), DATE_TRUNC('month', p_date_to::DATE);

    RETURN QUERY
    SELECT 
        mss.menu_id,
        MAX(mss.menu_name) as menu_name,
        SUM(mss.total_amount) as total_amount,
        SUM(mss.booking_count) as booking_count,
        MAX(mss.created_at) as created_at,
        MAX(mss.updated_at) as updated_at
    FROM menu_sales_summary mss
    WHERE mss.tenant_id = p_tenant_id
        AND mss.org_id = p_org_id
        -- 🔧 修正: 月範囲での比較に変更
        AND mss.summary_month >= DATE_TRUNC('month', p_date_from::DATE)
        AND mss.summary_month <= DATE_TRUNC('month', p_date_to::DATE)
        AND (p_menu_ids IS NULL OR mss.menu_id = ANY(p_menu_ids))
    GROUP BY mss.menu_id
    ORDER BY total_amount DESC;
END;
$$;

-- 4. デバッグ用関数: フィルタリング結果を確認
CREATE OR REPLACE FUNCTION debug_aggregation_filter(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT
)
RETURNS TABLE (
    table_name TEXT,
    summary_month_found DATE,
    date_from_input DATE,
    date_to_input DATE,
    date_trunc_from DATE,
    date_trunc_to DATE,
    record_count BIGINT,
    total_amount_sum NUMERIC,
    booking_count_sum BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- スタッフサマリーテーブルの確認
    RETURN QUERY
    SELECT 
        'staff_sales_summary'::TEXT,
        sss.summary_month,
        p_date_from::DATE,
        p_date_to::DATE,
        DATE_TRUNC('month', p_date_from::DATE)::DATE,
        DATE_TRUNC('month', p_date_to::DATE)::DATE,
        COUNT(*),
        SUM(sss.total_amount),
        SUM(sss.booking_count)
    FROM staff_sales_summary sss
    WHERE sss.tenant_id = p_tenant_id
        AND sss.org_id = p_org_id
    GROUP BY sss.summary_month
    ORDER BY sss.summary_month;

    -- メニューサマリーテーブルの確認
    RETURN QUERY
    SELECT 
        'menu_sales_summary'::TEXT,
        mss.summary_month,
        p_date_from::DATE,
        p_date_to::DATE,
        DATE_TRUNC('month', p_date_from::DATE)::DATE,
        DATE_TRUNC('month', p_date_to::DATE)::DATE,
        COUNT(*),
        SUM(mss.total_amount),
        SUM(mss.booking_count)
    FROM menu_sales_summary mss
    WHERE mss.tenant_id = p_tenant_id
        AND mss.org_id = p_org_id
    GROUP BY mss.summary_month
    ORDER BY mss.summary_month;

    -- 日別サマリーテーブルの確認
    RETURN QUERY
    SELECT 
        'daily_sales_summary'::TEXT,
        DATE_TRUNC('month', dss.business_date)::DATE as summary_month_found,
        p_date_from::DATE,
        p_date_to::DATE,
        DATE_TRUNC('month', p_date_from::DATE)::DATE,
        DATE_TRUNC('month', p_date_to::DATE)::DATE,
        COUNT(*),
        SUM(dss.total_amount),
        SUM(dss.booking_count)
    FROM daily_sales_summary dss
    WHERE dss.tenant_id = p_tenant_id
        AND dss.org_id = p_org_id
    GROUP BY DATE_TRUNC('month', dss.business_date)
    ORDER BY DATE_TRUNC('month', dss.business_date);
END;
$$;

-- 5. テスト用クエリ関数（実際のデータで動作確認）
CREATE OR REPLACE FUNCTION test_analytics_filtering(
    p_tenant_id TEXT,
    p_org_id TEXT
)
RETURNS TABLE (
    test_case TEXT,
    date_from TEXT,
    date_to TEXT,
    staff_records_found BIGINT,
    menu_records_found BIGINT,
    debug_info TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    today_str TEXT := CURRENT_DATE::TEXT;
    week_ago_str TEXT := (CURRENT_DATE - INTERVAL '7 days')::TEXT;
    month_ago_str TEXT := (CURRENT_DATE - INTERVAL '30 days')::TEXT;
    staff_count BIGINT;
    menu_count BIGINT;
BEGIN
    -- テストケース1: 過去7日間
    SELECT COUNT(*) INTO staff_count 
    FROM get_aggregated_staff_sales(p_tenant_id, p_org_id, week_ago_str, today_str, NULL);
    
    SELECT COUNT(*) INTO menu_count 
    FROM get_aggregated_menu_sales(p_tenant_id, p_org_id, week_ago_str, today_str, NULL);
    
    RETURN QUERY SELECT 
        '過去7日間'::TEXT, 
        week_ago_str, 
        today_str, 
        staff_count, 
        menu_count,
        ('DATE_TRUNC適用範囲: ' || DATE_TRUNC('month', week_ago_str::DATE) || ' to ' || DATE_TRUNC('month', today_str::DATE))::TEXT;

    -- テストケース2: 過去30日間
    SELECT COUNT(*) INTO staff_count 
    FROM get_aggregated_staff_sales(p_tenant_id, p_org_id, month_ago_str, today_str, NULL);
    
    SELECT COUNT(*) INTO menu_count 
    FROM get_aggregated_menu_sales(p_tenant_id, p_org_id, month_ago_str, today_str, NULL);
    
    RETURN QUERY SELECT 
        '過去30日間'::TEXT, 
        month_ago_str, 
        today_str, 
        staff_count, 
        menu_count,
        ('DATE_TRUNC適用範囲: ' || DATE_TRUNC('month', month_ago_str::DATE) || ' to ' || DATE_TRUNC('month', today_str::DATE))::TEXT;

    -- テストケース3: 今月のみ
    SELECT COUNT(*) INTO staff_count 
    FROM get_aggregated_staff_sales(p_tenant_id, p_org_id, DATE_TRUNC('month', CURRENT_DATE)::TEXT, today_str, NULL);
    
    SELECT COUNT(*) INTO menu_count 
    FROM get_aggregated_menu_sales(p_tenant_id, p_org_id, DATE_TRUNC('month', CURRENT_DATE)::TEXT, today_str, NULL);
    
    RETURN QUERY SELECT 
        '今月のみ'::TEXT, 
        DATE_TRUNC('month', CURRENT_DATE)::TEXT, 
        today_str, 
        staff_count, 
        menu_count,
        ('DATE_TRUNC適用範囲: ' || DATE_TRUNC('month', CURRENT_DATE) || ' to ' || DATE_TRUNC('month', today_str::DATE))::TEXT;
END;
$$;

-- 6. 権限設定
GRANT EXECUTE ON FUNCTION get_aggregated_staff_sales TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_aggregated_menu_sales TO PUBLIC;
GRANT EXECUTE ON FUNCTION debug_aggregation_filter TO PUBLIC;
GRANT EXECUTE ON FUNCTION test_analytics_filtering TO PUBLIC;

-- 7. 実行例とテスト手順
/*
-- テスト実行例:

-- 1. デバッグ情報確認（テナントIDとorg_IDを実際の値に置き換え）
SELECT * FROM debug_aggregation_filter('your_tenant_id', 'your_org_id', '2025-01-15', '2025-01-21');

-- 2. 修正後のスタッフ売上データ取得テスト
SELECT * FROM get_aggregated_staff_sales('your_tenant_id', 'your_org_id', '2025-01-15', '2025-01-21', NULL);

-- 3. 修正後のメニュー売上データ取得テスト
SELECT * FROM get_aggregated_menu_sales('your_tenant_id', 'your_org_id', '2025-01-15', '2025-01-21', NULL);

-- 4. 自動テスト実行
SELECT * FROM test_analytics_filtering('your_tenant_id', 'your_org_id');

-- 5. PostgreSQLログでNOTICEメッセージを確認
-- ログレベルを調整してデバッグ情報を表示
SET client_min_messages = NOTICE;
SELECT * FROM get_aggregated_staff_sales('your_tenant_id', 'your_org_id', '2025-01-15', '2025-01-21', NULL);
*/

COMMENT ON FUNCTION get_aggregated_staff_sales IS '修正済み（v2）: 1ヶ月未満の期間フィルタリングに対応。summary_monthをDATE_TRUNC使用で月範囲比較に変更。デバッグログ付き';
COMMENT ON FUNCTION get_aggregated_menu_sales IS '修正済み（v2）: 1ヶ月未満の期間フィルタリングに対応。summary_monthをDATE_TRUNC使用で月範囲比較に変更。デバッグログ付き';
COMMENT ON FUNCTION debug_aggregation_filter IS 'デバッグ用（v2）: 期間フィルタリングの動作確認とサマリーテーブルの内容表示。3テーブル対応版';
COMMENT ON FUNCTION test_analytics_filtering IS 'テスト用: 修正後の関数の動作を複数の期間パターンで自動確認';

-- 修正完了ログ
SELECT 'Analytics filtering bug fix completed. Functions rebuilt with DATE_TRUNC fix.' AS status;