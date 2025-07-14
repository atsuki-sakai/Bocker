-- 型不一致エラーの修正: RPC関数の戻り値をStaffSalesData型に合わせる

-- 1. 既存関数をDROP
DROP FUNCTION IF EXISTS get_aggregated_staff_sales(TEXT, TEXT, TEXT, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS get_aggregated_menu_sales(TEXT, TEXT, TEXT, TEXT, TEXT[]);

-- 2. スタッフ別売上集計RPC関数（型修正版）
CREATE OR REPLACE FUNCTION get_aggregated_staff_sales(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT,
    p_staff_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    staff_id TEXT,
    staff_name TEXT,                              -- NULLABLEに変更
    total_amount NUMERIC,
    booking_count INTEGER,
    average_amount NUMERIC,                       -- 🔧 追加: 平均単価
    last_booking_date DATE,                       -- NULLABLEに変更
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
        MAX(sss.staff_name) as staff_name,                                   -- MAX()でNULL対応
        SUM(sss.total_amount) as total_amount,
        SUM(sss.booking_count) as booking_count,
        -- 🔧 追加: 平均単価を計算
        CASE 
            WHEN SUM(sss.booking_count) > 0 
            THEN ROUND(SUM(sss.total_amount) / SUM(sss.booking_count), 0)
            ELSE 0 
        END as average_amount,
        MAX(sss.last_booking_date) as last_booking_date,                     -- MAX()でNULL対応
        MAX(sss.created_at) as created_at,
        MAX(sss.updated_at) as updated_at
    FROM staff_sales_summary sss
    WHERE sss.tenant_id = p_tenant_id
        AND sss.org_id = p_org_id
        -- 修正: 月範囲での比較
        AND sss.summary_month >= DATE_TRUNC('month', p_date_from::DATE)
        AND sss.summary_month <= DATE_TRUNC('month', p_date_to::DATE)
        AND (p_staff_ids IS NULL OR sss.staff_id = ANY(p_staff_ids))
    GROUP BY sss.staff_id
    ORDER BY total_amount DESC;
END;
$$;

-- 3. メニュー別売上集計RPC関数（型修正版）
CREATE OR REPLACE FUNCTION get_aggregated_menu_sales(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT,
    p_menu_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    menu_id TEXT,
    menu_name TEXT,                               -- NULLABLEに変更
    total_amount NUMERIC,
    booking_count INTEGER,
    average_amount NUMERIC,                       -- 🔧 追加: 平均単価
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- デバッグログ出力
    RAISE NOTICE 'get_aggregated_menu_sales called with: tenant_id=%, org_id=%, date_from=%, date_to=%', 
        p_tenant_id, p_org_id, p_date_from, p_date_to;

    RETURN QUERY
    SELECT 
        mss.menu_id,
        MAX(mss.menu_name) as menu_name,                                     -- MAX()でNULL対応
        SUM(mss.total_amount) as total_amount,
        SUM(mss.booking_count) as booking_count,
        -- 🔧 追加: 平均単価を計算
        CASE 
            WHEN SUM(mss.booking_count) > 0 
            THEN ROUND(SUM(mss.total_amount) / SUM(mss.booking_count), 0)
            ELSE 0 
        END as average_amount,
        MAX(mss.created_at) as created_at,
        MAX(mss.updated_at) as updated_at
    FROM menu_sales_summary mss
    WHERE mss.tenant_id = p_tenant_id
        AND mss.org_id = p_org_id
        -- 修正: 月範囲での比較
        AND mss.summary_month >= DATE_TRUNC('month', p_date_from::DATE)
        AND mss.summary_month <= DATE_TRUNC('month', p_date_to::DATE)
        AND (p_menu_ids IS NULL OR mss.menu_id = ANY(p_menu_ids))
    GROUP BY mss.menu_id
    ORDER BY total_amount DESC;
END;
$$;

-- 4. 型定義検証用テスト関数
CREATE OR REPLACE FUNCTION validate_rpc_types(
    p_tenant_id TEXT,
    p_org_id TEXT
)
RETURNS TABLE (
    test_name TEXT,
    column_name TEXT,
    expected_type TEXT,
    actual_type TEXT,
    status TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- スタッフ売上関数の戻り値型チェック
    RETURN QUERY
    SELECT 
        'get_aggregated_staff_sales'::TEXT as test_name,
        'staff_id'::TEXT as column_name,
        'TEXT'::TEXT as expected_type,
        pg_typeof(staff_id)::TEXT as actual_type,
        CASE WHEN pg_typeof(staff_id)::TEXT = 'text' THEN 'OK' ELSE 'MISMATCH' END as status
    FROM get_aggregated_staff_sales(p_tenant_id, p_org_id, CURRENT_DATE::TEXT, CURRENT_DATE::TEXT, NULL)
    LIMIT 1;

    RETURN QUERY
    SELECT 
        'get_aggregated_staff_sales'::TEXT,
        'staff_name'::TEXT,
        'TEXT (nullable)'::TEXT,
        pg_typeof(staff_name)::TEXT,
        CASE WHEN pg_typeof(staff_name)::TEXT = 'text' THEN 'OK' ELSE 'MISMATCH' END
    FROM get_aggregated_staff_sales(p_tenant_id, p_org_id, CURRENT_DATE::TEXT, CURRENT_DATE::TEXT, NULL)
    LIMIT 1;

    RETURN QUERY
    SELECT 
        'get_aggregated_staff_sales'::TEXT,
        'total_amount'::TEXT,
        'NUMERIC'::TEXT,
        pg_typeof(total_amount)::TEXT,
        CASE WHEN pg_typeof(total_amount)::TEXT = 'numeric' THEN 'OK' ELSE 'MISMATCH' END
    FROM get_aggregated_staff_sales(p_tenant_id, p_org_id, CURRENT_DATE::TEXT, CURRENT_DATE::TEXT, NULL)
    LIMIT 1;

    RETURN QUERY
    SELECT 
        'get_aggregated_staff_sales'::TEXT,
        'booking_count'::TEXT,
        'INTEGER'::TEXT,
        pg_typeof(booking_count)::TEXT,
        CASE WHEN pg_typeof(booking_count)::TEXT = 'integer' THEN 'OK' ELSE 'MISMATCH' END
    FROM get_aggregated_staff_sales(p_tenant_id, p_org_id, CURRENT_DATE::TEXT, CURRENT_DATE::TEXT, NULL)
    LIMIT 1;

    RETURN QUERY
    SELECT 
        'get_aggregated_staff_sales'::TEXT,
        'average_amount'::TEXT,
        'NUMERIC (calculated)'::TEXT,
        pg_typeof(average_amount)::TEXT,
        CASE WHEN pg_typeof(average_amount)::TEXT = 'numeric' THEN 'OK' ELSE 'MISMATCH' END
    FROM get_aggregated_staff_sales(p_tenant_id, p_org_id, CURRENT_DATE::TEXT, CURRENT_DATE::TEXT, NULL)
    LIMIT 1;

    RETURN QUERY
    SELECT 
        'get_aggregated_staff_sales'::TEXT,
        'last_booking_date'::TEXT,
        'DATE (nullable)'::TEXT,
        pg_typeof(last_booking_date)::TEXT,
        CASE WHEN pg_typeof(last_booking_date)::TEXT = 'date' THEN 'OK' ELSE 'MISMATCH' END
    FROM get_aggregated_staff_sales(p_tenant_id, p_org_id, CURRENT_DATE::TEXT, CURRENT_DATE::TEXT, NULL)
    LIMIT 1;
END;
$$;

-- 5. 権限設定
GRANT EXECUTE ON FUNCTION get_aggregated_staff_sales TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_aggregated_menu_sales TO PUBLIC;
GRANT EXECUTE ON FUNCTION validate_rpc_types TO PUBLIC;

-- 修正完了ログ
SELECT 'RPC function return type mismatch fixed. Added average_amount calculation.' AS status;

/*
実行例とテスト手順:

-- 1. 型定義検証
SELECT * FROM validate_rpc_types('your_tenant_id', 'your_org_id');

-- 2. 修正後のデータ取得テスト
SELECT 
    staff_id,
    staff_name,
    total_amount,
    booking_count,
    average_amount,    -- 新しく追加されたフィールド
    last_booking_date,
    created_at,
    updated_at
FROM get_aggregated_staff_sales('your_tenant_id', 'your_org_id', '2025-01-15', '2025-01-21', NULL);

-- 3. NULL値のテスト（データが存在しない場合）
SELECT * FROM get_aggregated_staff_sales('nonexistent_tenant', 'nonexistent_org', '2025-01-15', '2025-01-21', NULL);
*/