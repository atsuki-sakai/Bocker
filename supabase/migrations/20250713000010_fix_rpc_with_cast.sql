-- 型変換を使用してRPC関数の戻り値型不一致を修正
-- SUM関数の結果をINTEGERにキャストして既存の型定義と一致させる

-- 既存関数を削除（安全に再作成するため）
DROP FUNCTION IF EXISTS get_aggregated_staff_sales(TEXT, TEXT, TEXT, TEXT, TEXT[]);

-- スタッフ別売上集計RPC関数（型キャスト版）
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
    booking_count INTEGER,  -- INTEGERのまま維持
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
        SUM(sss.booking_count)::INTEGER as booking_count,  -- BIGINTをINTEGERにキャスト
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