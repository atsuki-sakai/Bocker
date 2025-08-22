-- Migration: Convex Tracking機能のSupabase完全移行
-- 目的: Convexで実行していた日次集計処理をSupabaseのpg_cronで実装
-- 作成日: 2025-08-16

-- ===============================
-- 1. pg_cron拡張の有効化
-- ===============================

-- pg_cron拡張を有効化（Supabaseで事前に有効化されている場合はスキップ）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ===============================
-- 2. トラッキング集計関数の作成
-- ===============================

-- 日次トラッキングデータ集計関数
CREATE OR REPLACE FUNCTION aggregate_daily_tracking_data(target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS TABLE (
    processed_events INTEGER,
    created_summaries INTEGER,
    execution_time_ms INTEGER
) AS $$
DECLARE
    start_time TIMESTAMP := clock_timestamp();
    end_time TIMESTAMP;
    events_count INTEGER := 0;
    summaries_count INTEGER := 0;
    target_date_start BIGINT;
    target_date_end BIGINT;
BEGIN
    -- ログ出力
    RAISE NOTICE '[aggregate_daily_tracking_data] Starting aggregation for date: %', target_date;
    
    -- Unix timestampの範囲計算
    target_date_start := EXTRACT(EPOCH FROM target_date::timestamp);
    target_date_end := EXTRACT(EPOCH FROM (target_date + INTERVAL '1 day')::timestamp) - 1;
    
    RAISE NOTICE '[aggregate_daily_tracking_data] Unix timestamp range: % to %', target_date_start, target_date_end;
    
    -- 対象イベント数をカウント
    SELECT COUNT(*) INTO events_count
    FROM tracking_event 
    WHERE event_timestamp_unix >= target_date_start 
      AND event_timestamp_unix <= target_date_end
      AND is_archive = false;
    
    RAISE NOTICE '[aggregate_daily_tracking_data] Found % events to process', events_count;
    
    IF events_count = 0 THEN
        RAISE NOTICE '[aggregate_daily_tracking_data] No events found for the period. Exiting.';
        RETURN QUERY SELECT 0, 0, 0;
        RETURN;
    END IF;
    
    -- 既存の集計データを削除（再実行対応）
    DELETE FROM tracking_summaries 
    WHERE summary_date = target_date;
    
    -- UTM Source集計
    INSERT INTO tracking_summaries (
        tenant_id, org_id, summary_date, dimension_type, dimension_value,
        total_count, unique_user_count, conversion_count
    )
    SELECT 
        tenant_id,
        org_id,
        target_date,
        'utm_source' as dimension_type,
        COALESCE(utm_source, '(direct)') as dimension_value,
        COUNT(*) as total_count,
        COUNT(DISTINCT session_id) as unique_user_count,
        COUNT(*) FILTER (WHERE event_type = 'conversion') as conversion_count
    FROM tracking_event 
    WHERE event_timestamp_unix >= target_date_start 
      AND event_timestamp_unix <= target_date_end
      AND is_archive = false
      AND tenant_id IS NOT NULL 
      AND org_id IS NOT NULL
    GROUP BY tenant_id, org_id, COALESCE(utm_source, '(direct)');
    
    GET DIAGNOSTICS summaries_count = ROW_COUNT;
    RAISE NOTICE '[aggregate_daily_tracking_data] Created % utm_source summaries', summaries_count;
    
    -- UTM Medium集計
    INSERT INTO tracking_summaries (
        tenant_id, org_id, summary_date, dimension_type, dimension_value,
        total_count, unique_user_count, conversion_count
    )
    SELECT 
        tenant_id,
        org_id,
        target_date,
        'utm_medium' as dimension_type,
        COALESCE(utm_medium, '(none)') as dimension_value,
        COUNT(*) as total_count,
        COUNT(DISTINCT session_id) as unique_user_count,
        COUNT(*) FILTER (WHERE event_type = 'conversion') as conversion_count
    FROM tracking_event 
    WHERE event_timestamp_unix >= target_date_start 
      AND event_timestamp_unix <= target_date_end
      AND is_archive = false
      AND tenant_id IS NOT NULL 
      AND org_id IS NOT NULL
    GROUP BY tenant_id, org_id, COALESCE(utm_medium, '(none)');
    
    -- UTM Campaign集計
    INSERT INTO tracking_summaries (
        tenant_id, org_id, summary_date, dimension_type, dimension_value,
        total_count, unique_user_count, conversion_count
    )
    SELECT 
        tenant_id,
        org_id,
        target_date,
        'utm_campaign' as dimension_type,
        COALESCE(utm_campaign, '(not set)') as dimension_value,
        COUNT(*) as total_count,
        COUNT(DISTINCT session_id) as unique_user_count,
        COUNT(*) FILTER (WHERE event_type = 'conversion') as conversion_count
    FROM tracking_event 
    WHERE event_timestamp_unix >= target_date_start 
      AND event_timestamp_unix <= target_date_end
      AND is_archive = false
      AND tenant_id IS NOT NULL 
      AND org_id IS NOT NULL
    GROUP BY tenant_id, org_id, COALESCE(utm_campaign, '(not set)');
    
    -- Page URL集計
    INSERT INTO tracking_summaries (
        tenant_id, org_id, summary_date, dimension_type, dimension_value,
        total_count, unique_user_count, conversion_count
    )
    SELECT 
        tenant_id,
        org_id,
        target_date,
        'page_url' as dimension_type,
        page_url as dimension_value,
        COUNT(*) as total_count,
        COUNT(DISTINCT session_id) as unique_user_count,
        COUNT(*) FILTER (WHERE event_type = 'conversion') as conversion_count
    FROM tracking_event 
    WHERE event_timestamp_unix >= target_date_start 
      AND event_timestamp_unix <= target_date_end
      AND is_archive = false
      AND tenant_id IS NOT NULL 
      AND org_id IS NOT NULL
      AND page_url IS NOT NULL
    GROUP BY tenant_id, org_id, page_url;
    
    -- 総集計数を取得
    SELECT COUNT(*) INTO summaries_count
    FROM tracking_summaries 
    WHERE summary_date = target_date;
    
    end_time := clock_timestamp();
    
    RAISE NOTICE '[aggregate_daily_tracking_data] Successfully created % summaries in % ms', 
        summaries_count, EXTRACT(MILLISECONDS FROM end_time - start_time);
    
    -- 結果を返す
    RETURN QUERY SELECT 
        events_count,
        summaries_count,
        EXTRACT(MILLISECONDS FROM end_time - start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- 関数にコメントを追加
COMMENT ON FUNCTION aggregate_daily_tracking_data IS '日次トラッキングデータの集計処理。Convexからの移行により、pg_cronで定期実行される。';

-- ===============================
-- 3. データクリーンアップ関数の作成
-- ===============================

-- 古いトラッキングイベントの自動削除関数
CREATE OR REPLACE FUNCTION cleanup_old_tracking_events(retention_days INTEGER DEFAULT 730)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    cutoff_timestamp BIGINT;
BEGIN
    -- 保持期間より古いデータの削除（デフォルト: 2年）
    cutoff_timestamp := EXTRACT(EPOCH FROM (CURRENT_DATE - (retention_days || ' days')::INTERVAL));
    
    DELETE FROM tracking_event 
    WHERE event_timestamp_unix < cutoff_timestamp;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE '[cleanup_old_tracking_events] Deleted % old tracking events (older than % days)', 
        deleted_count, retention_days;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- 4. Cronジョブの設定
-- ===============================

-- 既存のcronジョブを削除（重複防止）
SELECT cron.unschedule('daily-tracking-aggregation');
SELECT cron.unschedule('weekly-tracking-cleanup');

-- 日次集計処理（日本時間午前2時15分 = UTC 17:15）
SELECT cron.schedule(
    'daily-tracking-aggregation',
    '15 17 * * *',
    'SELECT aggregate_daily_tracking_data();'
);

-- 週次データクリーンアップ（日本時間日曜午前3時 = UTC 18:00）
SELECT cron.schedule(
    'weekly-tracking-cleanup',
    '0 18 * * 0',
    'SELECT cleanup_old_tracking_events();'
);

-- ===============================
-- 5. 手動実行用のWrapper関数
-- ===============================

-- 手動実行用の集計関数（デバッグ・テスト用）
CREATE OR REPLACE FUNCTION run_tracking_aggregation_manual(
    target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day'
)
RETURNS TEXT AS $$
DECLARE
    result RECORD;
    output TEXT;
BEGIN
    SELECT * INTO result FROM aggregate_daily_tracking_data(target_date);
    
    output := format(
        'Manual tracking aggregation completed for %s: %s events processed, %s summaries created in %s ms',
        target_date,
        result.processed_events,
        result.created_summaries,
        result.execution_time_ms
    );
    
    RAISE NOTICE '%', output;
    RETURN output;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- 6. 監視・メトリクス用ビューの作成
-- ===============================

-- 日次集計状況の監視ビュー
CREATE OR REPLACE VIEW tracking_aggregation_status AS
SELECT 
    summary_date,
    COUNT(*) as summary_count,
    COUNT(DISTINCT tenant_id) as tenant_count,
    COUNT(DISTINCT org_id) as org_count,
    SUM(total_count) as total_events,
    SUM(unique_user_count) as total_unique_users,
    SUM(conversion_count) as total_conversions,
    MAX(created_at) as last_aggregated_at
FROM tracking_summaries
GROUP BY summary_date
ORDER BY summary_date DESC;

COMMENT ON VIEW tracking_aggregation_status IS 'トラッキング集計の実行状況を監視するためのビュー';

-- ===============================
-- 7. 権限設定
-- ===============================

-- サービスロールに関数実行権限を付与
GRANT EXECUTE ON FUNCTION aggregate_daily_tracking_data TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_tracking_events TO service_role;
GRANT EXECUTE ON FUNCTION run_tracking_aggregation_manual TO service_role;

-- 認証されたユーザーに監視ビューの参照権限を付与
GRANT SELECT ON tracking_aggregation_status TO authenticated;

-- ===============================
-- 8. 初回実行テスト
-- ===============================

-- 昨日のデータで集計をテスト実行
DO $$
DECLARE
    test_result RECORD;
BEGIN
    RAISE NOTICE 'Testing tracking aggregation function...';
    
    SELECT * INTO test_result FROM aggregate_daily_tracking_data();
    
    RAISE NOTICE 'Test completed: % events processed, % summaries created', 
        test_result.processed_events, test_result.created_summaries;
END $$;

-- ===============================
-- 9. バックフィル用関数（過去データの一括処理）
-- ===============================

CREATE OR REPLACE FUNCTION backfill_tracking_summaries(
    start_date DATE,
    end_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day'
)
RETURNS TABLE (
    processed_date DATE,
    events_processed INTEGER,
    summaries_created INTEGER
) AS $$
DECLARE
    current_date DATE := start_date;
    result RECORD;
BEGIN
    WHILE current_date <= end_date LOOP
        SELECT * INTO result FROM aggregate_daily_tracking_data(current_date);
        
        RETURN QUERY SELECT 
            current_date,
            result.processed_events,
            result.created_summaries;
        
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION backfill_tracking_summaries IS '過去の期間のトラッキングデータを一括で集計するバックフィル関数';

-- ===============================
-- 10. 検証・確認
-- ===============================

-- Cronジョブが正常に設定されているか確認
DO $$
DECLARE
    job_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO job_count 
    FROM cron.job 
    WHERE jobname IN ('daily-tracking-aggregation', 'weekly-tracking-cleanup');
    
    IF job_count = 2 THEN
        RAISE NOTICE 'SUCCESS: Both tracking cron jobs are properly configured';
    ELSE
        RAISE WARNING 'WARNING: Expected 2 cron jobs, found %', job_count;
    END IF;
END $$;

-- 関数が正常に作成されているか確認
DO $$
DECLARE
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO function_count 
    FROM pg_proc 
    WHERE proname IN ('aggregate_daily_tracking_data', 'cleanup_old_tracking_events', 'run_tracking_aggregation_manual', 'backfill_tracking_summaries');
    
    IF function_count = 4 THEN
        RAISE NOTICE 'SUCCESS: All tracking functions are properly created';
    ELSE
        RAISE WARNING 'WARNING: Expected 4 functions, found %', function_count;
    END IF;
END $$;

RAISE NOTICE 'Migration completed: Convex tracking functionality has been migrated to Supabase pg_cron';