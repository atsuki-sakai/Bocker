-- ============================================================================
-- スタッフ選択肢取得用RPC関数（パーティション対応・重複排除）
-- 3000店舗規模のSaaSに適したパフォーマンス最適化
-- ============================================================================

-- スタッフ選択肢取得RPC関数
DROP FUNCTION IF EXISTS get_distinct_staff_options(TEXT, TEXT);
CREATE OR REPLACE FUNCTION get_distinct_staff_options(
    p_tenant_id TEXT,
    p_org_id TEXT
)
RETURNS TABLE (
    staff_id TEXT,
    staff_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        sss.staff_id,
        -- 最新のstaff_nameを取得（複数パーティションで名前が変更された場合に対応）
        (SELECT ss.staff_name 
         FROM staff_sales_summary ss 
         WHERE ss.staff_id = sss.staff_id 
           AND ss.tenant_id = p_tenant_id 
           AND ss.org_id = p_org_id
         ORDER BY ss.summary_month DESC 
         LIMIT 1
        ) as staff_name
    FROM staff_sales_summary sss
    WHERE sss.tenant_id = p_tenant_id
        AND sss.org_id = p_org_id
        AND sss.booking_count > 0  -- 実績のあるスタッフのみ表示
    ORDER BY staff_name ASC;
END;
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION get_distinct_staff_options TO anon, authenticated;

-- 作成確認
SELECT 
    proname as function_name,
    pronargs as arg_count,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname = 'get_distinct_staff_options'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');