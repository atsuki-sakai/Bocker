-- 大規模SaaS向け最適化スタッフ売上集計RPC関数

-- パーティション管理用の関数
CREATE OR REPLACE FUNCTION manage_staff_sales_partitions(
    p_date_from DATE,
    p_date_to DATE
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
BEGIN
    -- 必要なパーティションを事前に作成
    partition_date := DATE_TRUNC('month', p_date_from);
    WHILE partition_date <= p_date_to LOOP
        partition_name := 'staff_sales_' || TO_CHAR(partition_date, 'YYYYMM');
        
        -- パーティションが存在しない場合のみ作成
        IF NOT EXISTS (
            SELECT 1
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = partition_name
            AND n.nspname = 'public'
        ) THEN
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS %I PARTITION OF staff_sales_summary
                FOR VALUES FROM (%L) TO (%L)',
                partition_name,
                partition_date,
                partition_date + INTERVAL '1 month'
            );
            
            -- パーティション固有のインデックス作成
            EXECUTE format(
                'CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id, org_id, business_date)',
                partition_name || '_lookup_idx',
                partition_name
            );
            
            -- 統計情報の収集
            EXECUTE format(
                'ANALYZE %I',
                partition_name
            );
        END IF;
        
        partition_date := partition_date + INTERVAL '1 month';
    END LOOP;
END;
$$;

-- キャッシュ管理用の関数
CREATE OR REPLACE FUNCTION get_staff_sales_cache_key(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from DATE,
    p_date_to DATE,
    p_staff_ids TEXT[] DEFAULT NULL
) RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT encode(
        digest(
            p_tenant_id || '|' ||
            p_org_id || '|' ||
            p_date_from::TEXT || '|' ||
            p_date_to::TEXT || '|' ||
            COALESCE(array_to_string(p_staff_ids, ','), ''),
            'sha256'
        ),
        'hex'
    );
$$;

-- メインのスタッフ売上集計RPC関数
CREATE OR REPLACE FUNCTION get_staff_sales_optimized(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_date_from TEXT,
    p_date_to TEXT,
    p_staff_ids TEXT[] DEFAULT NULL,
    p_use_cache BOOLEAN DEFAULT true
)
RETURNS TABLE (
    staff_id TEXT,
    staff_name TEXT,
    total_amount NUMERIC,
    booking_count BIGINT,
    average_amount NUMERIC,
    last_booking_date DATE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    performance_score NUMERIC,
    data_completeness NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_date_from DATE := p_date_from::DATE;
    v_date_to DATE := p_date_to::DATE;
    v_cache_key TEXT;
    v_cached_result JSONB;
    v_period_days INTEGER;
    v_is_short_period BOOLEAN;
BEGIN
    -- 基本的なバリデーション
    IF v_date_from > v_date_to THEN
        RAISE EXCEPTION 'Invalid date range: start date must be before end date';
    END IF;

    -- 期間の長さを計算
    v_period_days := v_date_to - v_date_from + 1;
    v_is_short_period := v_period_days <= 30;

    -- パーティション管理
    PERFORM manage_staff_sales_partitions(v_date_from, v_date_to);

    -- キャッシュキーの生成
    IF p_use_cache THEN
        v_cache_key := get_staff_sales_cache_key(
            p_tenant_id, p_org_id, v_date_from, v_date_to, p_staff_ids
        );
        
        -- キャッシュチェック
        v_cached_result := (
            SELECT value::jsonb
            FROM cache_store
            WHERE key = v_cache_key
            AND created_at >= NOW() - INTERVAL '1 hour'
            LIMIT 1
        );
        
        IF v_cached_result IS NOT NULL THEN
            RETURN QUERY
            SELECT
                (value->>'staff_id')::TEXT,
                (value->>'staff_name')::TEXT,
                (value->>'total_amount')::NUMERIC,
                (value->>'booking_count')::BIGINT,
                (value->>'average_amount')::NUMERIC,
                (value->>'last_booking_date')::DATE,
                (value->>'created_at')::TIMESTAMP WITH TIME ZONE,
                (value->>'updated_at')::TIMESTAMP WITH TIME ZONE,
                (value->>'performance_score')::NUMERIC,
                (value->>'data_completeness')::NUMERIC
            FROM jsonb_array_elements(v_cached_result);
            RETURN;
        END IF;
    END IF;

    -- メインクエリ
    RETURN QUERY
    WITH staff_sales AS (
        SELECT
            s.staff_id,
            MAX(s.staff_name) as staff_name,
            SUM(s.total_amount) as total_amount,
            SUM(s.booking_count) as booking_count,
            MAX(s.last_booking_date) as last_booking_date,
            MAX(s.created_at) as created_at,
            MAX(s.updated_at) as updated_at
        FROM staff_sales_summary s
        WHERE s.tenant_id = p_tenant_id
        AND s.org_id = p_org_id
        AND s.business_date >= v_date_from
        AND s.business_date <= v_date_to
        AND (p_staff_ids IS NULL OR s.staff_id = ANY(p_staff_ids))
        GROUP BY s.staff_id
    ),
    staff_metrics AS (
        SELECT
            ss.*,
            CASE WHEN ss.booking_count > 0
                THEN ROUND(ss.total_amount / ss.booking_count, 2)
                ELSE 0
            END as average_amount,
            -- パフォーマンススコアの計算（0-100）
            CASE WHEN MAX(ss.total_amount) OVER () > 0
                THEN ROUND((ss.total_amount / MAX(ss.total_amount) OVER ()) * 100, 2)
                ELSE 0
            END as performance_score,
            -- データ完全性スコアの計算（0-100）
            ROUND(
                (COUNT(*) OVER (PARTITION BY ss.staff_id)::NUMERIC / v_period_days::NUMERIC) * 100,
                2
            ) as data_completeness
        FROM staff_sales ss
    )
    SELECT
        sm.staff_id,
        sm.staff_name,
        sm.total_amount,
        sm.booking_count,
        sm.average_amount,
        sm.last_booking_date,
        sm.created_at,
        sm.updated_at,
        sm.performance_score,
        sm.data_completeness
    FROM staff_metrics sm
    ORDER BY sm.total_amount DESC;

    -- 結果をキャッシュに保存
    IF p_use_cache THEN
        INSERT INTO cache_store (key, value, created_at)
        SELECT
            v_cache_key,
            (
                SELECT jsonb_agg(row_to_json(r))
                FROM (
                    SELECT *
                    FROM staff_metrics
                ) r
            ),
            NOW()
        ON CONFLICT (key)
        DO UPDATE SET
            value = EXCLUDED.value,
            created_at = EXCLUDED.created_at;
    END IF;
END;
$$;

-- キャッシュクリア関数
CREATE OR REPLACE FUNCTION clear_staff_sales_cache(
    p_tenant_id TEXT,
    p_org_id TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM cache_store
    WHERE key LIKE encode(digest(p_tenant_id || '|' || p_org_id || '|%', 'sha256'), 'hex');
END;
$$;

-- パフォーマンスモニタリング用の関数
CREATE OR REPLACE FUNCTION log_staff_sales_metrics(
    p_tenant_id TEXT,
    p_org_id TEXT,
    p_query_duration INTERVAL,
    p_result_count INTEGER,
    p_cache_hit BOOLEAN,
    p_error TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO analytics_performance_logs (
        tenant_id,
        org_id,
        operation,
        duration_ms,
        result_count,
        cache_hit,
        error_message,
        created_at
    ) VALUES (
        p_tenant_id,
        p_org_id,
        'staff_sales_query',
        EXTRACT(EPOCH FROM p_query_duration) * 1000,
        p_result_count,
        p_cache_hit,
        p_error,
        NOW()
    );
END;
$$;

-- 必要なインデックスの作成
CREATE INDEX IF NOT EXISTS idx_staff_sales_summary_lookup 
ON staff_sales_summary (tenant_id, org_id, business_date);

CREATE INDEX IF NOT EXISTS idx_staff_sales_summary_staff 
ON staff_sales_summary (staff_id);

CREATE INDEX IF NOT EXISTS idx_cache_store_lookup 
ON cache_store (key, created_at);

-- パーティションの自動管理用トリガー
CREATE OR REPLACE FUNCTION trigger_manage_staff_sales_partitions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM manage_staff_sales_partitions(
        DATE_TRUNC('month', NEW.business_date),
        DATE_TRUNC('month', NEW.business_date) + INTERVAL '1 month' - INTERVAL '1 day'
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER staff_sales_partition_manager
    BEFORE INSERT ON staff_sales_summary
    FOR EACH ROW
    EXECUTE FUNCTION trigger_manage_staff_sales_partitions();

-- 統計情報の自動更新スケジュール
CREATE OR REPLACE FUNCTION schedule_staff_sales_maintenance()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- アクティブなパーティションの統計情報を更新
    ANALYZE staff_sales_summary;
    
    -- 古いキャッシュを削除
    DELETE FROM cache_store
    WHERE created_at < NOW() - INTERVAL '24 hours';
    
    -- 古いログを削除
    DELETE FROM analytics_performance_logs
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$; 