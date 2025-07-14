-- バグ修正: アナリティクスフィルタリングで1ヶ月未満の期間でデータが取得できない問題
-- 問題: summary_monthフィールドを具体的な日付範囲で比較しているため不一致が発生
-- 修正: DATE_TRUNC('month', date)を使用して月範囲でのフィルタリングに変更

-- 1. スタッフ別売上集計RPC関数の修正
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

-- 2. メニュー別売上集計RPC関数の修正
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

-- デバッグ用: フィルタリング結果を確認する関数
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
    record_count BIGINT
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
        COUNT(*)
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
        COUNT(*)
    FROM menu_sales_summary mss
    WHERE mss.tenant_id = p_tenant_id
        AND mss.org_id = p_org_id
    GROUP BY mss.summary_month
    ORDER BY mss.summary_month;
END;
$$;

-- 修正確認用: テスト実行
-- SELECT * FROM debug_aggregation_filter('your_tenant_id', 'your_org_id', '2025-01-15', '2025-01-21');
-- SELECT * FROM get_aggregated_staff_sales('your_tenant_id', 'your_org_id', '2025-01-15', '2025-01-21', NULL);

COMMENT ON FUNCTION get_aggregated_staff_sales IS '修正済み: 1ヶ月未満の期間フィルタリングに対応。summary_monthをDATE_TRUNC使用で月範囲比較に変更';
COMMENT ON FUNCTION get_aggregated_menu_sales IS '修正済み: 1ヶ月未満の期間フィルタリングに対応。summary_monthをDATE_TRUNC使用で月範囲比較に変更';
COMMENT ON FUNCTION debug_aggregation_filter IS 'デバッグ用: 期間フィルタリングの動作確認とサマリーテーブルの内容表示';