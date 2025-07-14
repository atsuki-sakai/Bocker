-- ============================================================================
-- メニュー選択肢取得用RPC関数（パーティション対応・重複排除）
-- スタッフ選択肢と同様の重複問題対策
-- ============================================================================

-- メニュー選択肢取得RPC関数
DROP FUNCTION IF EXISTS get_distinct_menu_options(TEXT, TEXT);
CREATE OR REPLACE FUNCTION get_distinct_menu_options(
    p_tenant_id TEXT,
    p_org_id TEXT
)
RETURNS TABLE (
    menu_id TEXT,
    menu_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        mss.menu_id,
        -- 最新のmenu_nameを取得（複数パーティションで名前が変更された場合に対応）
        (SELECT ms.menu_name 
         FROM menu_sales_summary ms 
         WHERE ms.menu_id = mss.menu_id 
           AND ms.tenant_id = p_tenant_id 
           AND ms.org_id = p_org_id
         ORDER BY ms.summary_month DESC 
         LIMIT 1
        ) as menu_name
    FROM menu_sales_summary mss
    WHERE mss.tenant_id = p_tenant_id
        AND mss.org_id = p_org_id
        AND mss.booking_count > 0  -- 実績のあるメニューのみ表示
    ORDER BY menu_name ASC;
END;
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION get_distinct_menu_options TO anon, authenticated;

-- 作成確認用クエリ
SELECT 
    proname as function_name,
    pronargs as arg_count,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname = 'get_distinct_menu_options'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- テスト実行用クエリ（適切なtenant_idとorg_idに置き換えて実行）
-- SELECT * FROM get_distinct_menu_options('your_tenant_id', 'your_org_id');