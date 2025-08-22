-- デバッグ用: トラッキング移行の段階的実行と確認
-- 実行環境: Supabaseダッシュボード > SQL Editor
-- 使用方法: セクションごとに順番に実行してください

-- ===============================
-- 1. 前提条件の確認
-- ===============================

-- pg_cron拡張の確認
SELECT 'pg_cron Extension Check' as check_type, 
       CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
            THEN '✅ Available' 
            ELSE '❌ Not Available' 
       END as status;

-- 既存のtracking関連テーブルの確認
SELECT 'tracking_event table' as table_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracking_event')
            THEN '✅ Exists'
            ELSE '❌ Missing'
       END as status
UNION ALL
SELECT 'tracking_summaries table' as table_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracking_summaries')
            THEN '✅ Exists'
            ELSE '❌ Missing'
       END as status;

-- 既存のcronジョブ確認
SELECT 'Existing Cron Jobs' as info_type,
       COALESCE(string_agg(jobname, ', '), 'No tracking jobs found') as job_names
FROM cron.job 
WHERE jobname LIKE '%tracking%';

-- ===============================
-- 2. 段階1: pg_cron拡張の有効化（必要に応じて）
-- ===============================

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT 'pg_cron extension created' as result;

-- ===============================
-- 3. 段階2: 既存ジョブの安全な削除
-- ===============================

DO $$
BEGIN
    -- 週次クリーンアップジョブの削除
    BEGIN
        PERFORM cron.unschedule('weekly-tracking-cleanup');
        RAISE NOTICE 'weekly-tracking-cleanup job deleted successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'weekly-tracking-cleanup job not found (OK)';
    END;
    
    -- 日次集計ジョブの削除
    BEGIN
        PERFORM cron.unschedule('daily-tracking-aggregation');
        RAISE NOTICE 'daily-tracking-aggregation job deleted successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'daily-tracking-aggregation job not found (OK)';
    END;
    
    RAISE NOTICE 'Job cleanup completed';
END $$;

-- ===============================
-- 4. 段階3: 統合関数の作成
-- ===============================

-- メイン統合関数
CREATE OR REPLACE FUNCTION aggregate_daily_tracking_data_with_cleanup(
    target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day',
    cleanup_retention_days INTEGER DEFAULT 90
)
RETURNS TABLE (
    processed_events INTEGER,
    created_summaries INTEGER,
    cleaned_events INTEGER,
    execution_time_ms INTEGER
) 
LANGUAGE plpgsql
AS $$
DECLARE
    start_time TIMESTAMP := clock_timestamp();
    end_time TIMESTAMP;
    events_count INTEGER := 0;
    summaries_count INTEGER := 0;
    cleaned_count INTEGER := 0;
    target_date_start BIGINT;
    target_date_end BIGINT;
    cleanup_date_threshold BIGINT;
BEGIN
    RAISE NOTICE '[TRACKING] Starting aggregation for date: % with cleanup days: %', target_date, cleanup_retention_days;
    
    -- Unix timestampの範囲計算
    target_date_start := EXTRACT(EPOCH FROM target_date::timestamp);
    target_date_end := EXTRACT(EPOCH FROM (target_date + INTERVAL '1 day')::timestamp) - 1;
    cleanup_date_threshold := EXTRACT(EPOCH FROM (CURRENT_DATE - INTERVAL '1 day' * cleanup_retention_days)::timestamp);
    
    -- 対象イベント数をカウント
    SELECT COUNT(*) INTO events_count
    FROM tracking_event 
    WHERE event_timestamp_unix >= target_date_start 
      AND event_timestamp_unix <= target_date_end
      AND is_archive = false;
    
    RAISE NOTICE '[TRACKING] Found % events to process', events_count;
    
    IF events_count > 0 THEN
        -- 既存の集計データを削除
        DELETE FROM tracking_summaries WHERE summary_date = target_date;
        
        -- UTM Source別集計
        INSERT INTO tracking_summaries (
            tenant_id, org_id, summary_date, dimension_type, dimension_value,
            total_count, unique_user_count, conversion_count
        )
        SELECT 
            tenant_id, org_id, target_date, 'utm_source',
            COALESCE(utm_source, '(direct)'),
            COUNT(*), COUNT(DISTINCT session_id),
            COUNT(*) FILTER (WHERE event_type = 'conversion')
        FROM tracking_event 
        WHERE event_timestamp_unix >= target_date_start 
          AND event_timestamp_unix <= target_date_end
          AND is_archive = false AND tenant_id IS NOT NULL AND org_id IS NOT NULL
        GROUP BY tenant_id, org_id, COALESCE(utm_source, '(direct)')
        HAVING COUNT(*) > 0;

        -- UTM Medium別集計
        INSERT INTO tracking_summaries (
            tenant_id, org_id, summary_date, dimension_type, dimension_value,
            total_count, unique_user_count, conversion_count
        )
        SELECT 
            tenant_id, org_id, target_date, 'utm_medium',
            COALESCE(utm_medium, '(none)'),
            COUNT(*), COUNT(DISTINCT session_id),
            COUNT(*) FILTER (WHERE event_type = 'conversion')
        FROM tracking_event 
        WHERE event_timestamp_unix >= target_date_start 
          AND event_timestamp_unix <= target_date_end
          AND is_archive = false AND tenant_id IS NOT NULL AND org_id IS NOT NULL
        GROUP BY tenant_id, org_id, COALESCE(utm_medium, '(none)')
        HAVING COUNT(*) > 0;

        -- UTM Campaign別集計
        INSERT INTO tracking_summaries (
            tenant_id, org_id, summary_date, dimension_type, dimension_value,
            total_count, unique_user_count, conversion_count
        )
        SELECT 
            tenant_id, org_id, target_date, 'utm_campaign',
            COALESCE(utm_campaign, '(not set)'),
            COUNT(*), COUNT(DISTINCT session_id),
            COUNT(*) FILTER (WHERE event_type = 'conversion')
        FROM tracking_event 
        WHERE event_timestamp_unix >= target_date_start 
          AND event_timestamp_unix <= target_date_end
          AND is_archive = false AND tenant_id IS NOT NULL AND org_id IS NOT NULL
        GROUP BY tenant_id, org_id, COALESCE(utm_campaign, '(not set)')
        HAVING COUNT(*) > 0;

        -- Page URL別集計
        INSERT INTO tracking_summaries (
            tenant_id, org_id, summary_date, dimension_type, dimension_value,
            total_count, unique_user_count, conversion_count
        )
        SELECT 
            tenant_id, org_id, target_date, 'page_url', page_url,
            COUNT(*), COUNT(DISTINCT session_id),
            COUNT(*) FILTER (WHERE event_type = 'conversion')
        FROM tracking_event 
        WHERE event_timestamp_unix >= target_date_start 
          AND event_timestamp_unix <= target_date_end
          AND is_archive = false AND tenant_id IS NOT NULL AND org_id IS NOT NULL
          AND page_url IS NOT NULL
        GROUP BY tenant_id, org_id, page_url
        HAVING COUNT(*) > 0;

        -- 作成された集計レコード数をカウント
        SELECT COUNT(*) INTO summaries_count FROM tracking_summaries WHERE summary_date = target_date;
        RAISE NOTICE '[TRACKING] Created % summary records', summaries_count;
    END IF;
    
    -- 古いデータのクリーンアップ
    RAISE NOTICE '[TRACKING] Starting cleanup of events older than % days', cleanup_retention_days;
    WITH deleted_events AS (
        DELETE FROM tracking_event 
        WHERE event_timestamp_unix < cleanup_date_threshold AND is_archive = false
        RETURNING id
    )
    SELECT COUNT(*) INTO cleaned_count FROM deleted_events;
    RAISE NOTICE '[TRACKING] Cleaned up % old events', cleaned_count;
    
    end_time := clock_timestamp();
    RAISE NOTICE '[TRACKING] Completed in % ms', EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    RETURN QUERY SELECT events_count, summaries_count, cleaned_count, 
                        EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000;
END;
$$;

SELECT 'Main function created successfully' as result;

-- ===============================
-- 5. 段階4: 手動実行用ラッパー関数
-- ===============================

CREATE OR REPLACE FUNCTION run_tracking_aggregation_with_cleanup_manual(
    target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day',
    cleanup_retention_days INTEGER DEFAULT 90
)
RETURNS TEXT 
LANGUAGE plpgsql
AS $$
DECLARE
    result_record RECORD;
BEGIN
    SELECT * INTO result_record 
    FROM aggregate_daily_tracking_data_with_cleanup(target_date, cleanup_retention_days);
    
    RETURN format(
        'Manual tracking aggregation completed for %s: %s events processed, %s summaries created, %s old events cleaned in %s ms',
        target_date, result_record.processed_events, result_record.created_summaries, 
        result_record.cleaned_events, result_record.execution_time_ms
    );
END;
$$;

SELECT 'Manual execution function created successfully' as result;

-- ===============================
-- 6. 段階5: 監視ビューの作成
-- ===============================

CREATE OR REPLACE VIEW tracking_integrated_status AS
SELECT 
    summary_date,
    COUNT(*) as summary_count,
    COUNT(DISTINCT tenant_id) as tenant_count,
    SUM(total_count) as total_events,
    SUM(conversion_count) as total_conversions,
    (SUM(conversion_count)::float / NULLIF(SUM(total_count), 0) * 100) as conversion_rate,
    MAX(created_at) as last_aggregated_at,
    (SELECT COUNT(*) FROM tracking_event 
     WHERE event_timestamp_unix < EXTRACT(EPOCH FROM (CURRENT_DATE - INTERVAL '90 days')::timestamp)
       AND is_archive = false) as old_events_remaining
FROM tracking_summaries
GROUP BY summary_date
ORDER BY summary_date DESC;

SELECT 'Monitoring view created successfully' as result;

-- ===============================
-- 7. 段階6: cronジョブの設定
-- ===============================

-- cronジョブを設定し、結果を確認
WITH job_result AS (
    SELECT cron.schedule(
        'daily-tracking-aggregation-with-cleanup',
        '15 17 * * *',
        'SELECT aggregate_daily_tracking_data_with_cleanup();'
    ) as job_id
)
SELECT 
    'Cron job scheduled successfully' as result,
    'Job ID: ' || job_id as details
FROM job_result;

-- ===============================
-- 8. 段階7: 権限設定
-- ===============================

GRANT EXECUTE ON FUNCTION aggregate_daily_tracking_data_with_cleanup TO service_role;
GRANT EXECUTE ON FUNCTION run_tracking_aggregation_with_cleanup_manual TO service_role;
GRANT USAGE ON SCHEMA cron TO service_role;

SELECT 'Permissions granted successfully' as result;

-- ===============================
-- 9. 最終確認
-- ===============================

-- 作成された関数の確認
SELECT 'Created Functions' as info_type,
       string_agg(routine_name, ', ') as function_names
FROM information_schema.routines 
WHERE routine_name LIKE '%tracking%' AND routine_schema = 'public';

-- 設定されたcronジョブの確認
SELECT 'Scheduled Cron Jobs' as info_type,
       string_agg(jobname || ' (' || schedule || ')', ', ') as job_details
FROM cron.job 
WHERE jobname LIKE '%tracking%';

-- 完了メッセージ
SELECT '🎉 MIGRATION COMPLETED SUCCESSFULLY! 🎉' as final_status,
       'Use: SELECT run_tracking_aggregation_with_cleanup_manual(); for manual testing' as next_step;