-- Migration: トラッキング機能の日次クリーンアップ統合版
-- 目的: 集計処理完了後に古いデータ（90日以上前）を自動削除
-- 作成日: 2025-08-21
-- 修正点: 週次クリーンアップを廃止し、日次集計後に自動クリーンアップを実行

-- ===============================
-- 1. pg_cron拡張の有効化確認
-- ===============================

-- pg_cron拡張を有効化（既に有効化されている場合はスキップ）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ===============================
-- 2. 既存の週次クリーンアップジョブを削除
-- ===============================

-- 既存の週次クリーンアップジョブがあれば削除（エラーを無視）
DO $$
BEGIN
    PERFORM cron.unschedule('weekly-tracking-cleanup');
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'weekly-tracking-cleanup job not found or already deleted';
END $$;

-- ===============================
-- 3. 日次集計+クリーンアップ統合関数の作成
-- ===============================

-- 統合版: 日次トラッキングデータ集計 + 古いデータクリーンアップ
CREATE OR REPLACE FUNCTION aggregate_daily_tracking_data_with_cleanup(
    target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day',
    cleanup_retention_days INTEGER DEFAULT 90
)
RETURNS TABLE (
    processed_events INTEGER,
    created_summaries INTEGER,
    cleaned_events INTEGER,
    execution_time_ms INTEGER
) AS $$
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
    -- ログ出力
    RAISE NOTICE '[aggregate_daily_tracking_data_with_cleanup] Starting aggregation for date: % with cleanup days: %', target_date, cleanup_retention_days;
    
    -- Unix timestampの範囲計算
    target_date_start := EXTRACT(EPOCH FROM target_date::timestamp);
    target_date_end := EXTRACT(EPOCH FROM (target_date + INTERVAL '1 day')::timestamp) - 1;
    
    -- クリーンアップ対象の閾値計算（retention_days日以前）
    cleanup_date_threshold := EXTRACT(EPOCH FROM (CURRENT_DATE - INTERVAL '1 day' * cleanup_retention_days)::timestamp);
    
    RAISE NOTICE '[aggregate_daily_tracking_data_with_cleanup] Unix timestamp range: % to %', target_date_start, target_date_end;
    RAISE NOTICE '[aggregate_daily_tracking_data_with_cleanup] Cleanup threshold: % (older than % days)', cleanup_date_threshold, cleanup_retention_days;
    
    -- 対象イベント数をカウント
    SELECT COUNT(*) INTO events_count
    FROM tracking_event 
    WHERE event_timestamp_unix >= target_date_start 
      AND event_timestamp_unix <= target_date_end
      AND is_archive = false;
    
    RAISE NOTICE '[aggregate_daily_tracking_data_with_cleanup] Found % events to process', events_count;
    
    IF events_count = 0 THEN
        RAISE NOTICE '[aggregate_daily_tracking_data_with_cleanup] No events found for the period. Skipping aggregation but continuing with cleanup.';
    ELSE
        -- 既存の集計データを削除（再実行対応）
        DELETE FROM tracking_summaries WHERE summary_date = target_date;
        RAISE NOTICE '[aggregate_daily_tracking_data_with_cleanup] Deleted existing summaries for %', target_date;
        
        -- 🎯 UTM Source別集計
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
          AND tenant_id IS NOT NULL AND org_id IS NOT NULL
        GROUP BY tenant_id, org_id, COALESCE(utm_source, '(direct)')
        HAVING COUNT(*) > 0;

        -- 🎯 UTM Medium別集計
        INSERT INTO tracking_summaries (
            tenant_id, org_id, summary_date, dimension_type, dimension_value,
            total_count, unique_user_count, conversion_count
        )
        SELECT 
            tenant_id, org_id, target_date,
            'utm_medium' as dimension_type,
            COALESCE(utm_medium, '(none)') as dimension_value,
            COUNT(*) as total_count,
            COUNT(DISTINCT session_id) as unique_user_count,
            COUNT(*) FILTER (WHERE event_type = 'conversion') as conversion_count
        FROM tracking_event 
        WHERE event_timestamp_unix >= target_date_start 
          AND event_timestamp_unix <= target_date_end
          AND is_archive = false
          AND tenant_id IS NOT NULL AND org_id IS NOT NULL
        GROUP BY tenant_id, org_id, COALESCE(utm_medium, '(none)')
        HAVING COUNT(*) > 0;

        -- 🎯 UTM Campaign別集計  
        INSERT INTO tracking_summaries (
            tenant_id, org_id, summary_date, dimension_type, dimension_value,
            total_count, unique_user_count, conversion_count
        )
        SELECT 
            tenant_id, org_id, target_date,
            'utm_campaign' as dimension_type,
            COALESCE(utm_campaign, '(not set)') as dimension_value,
            COUNT(*) as total_count,
            COUNT(DISTINCT session_id) as unique_user_count,
            COUNT(*) FILTER (WHERE event_type = 'conversion') as conversion_count
        FROM tracking_event 
        WHERE event_timestamp_unix >= target_date_start 
          AND event_timestamp_unix <= target_date_end
          AND is_archive = false
          AND tenant_id IS NOT NULL AND org_id IS NOT NULL
        GROUP BY tenant_id, org_id, COALESCE(utm_campaign, '(not set)')
        HAVING COUNT(*) > 0;

        -- 🎯 Page URL別集計
        INSERT INTO tracking_summaries (
            tenant_id, org_id, summary_date, dimension_type, dimension_value,
            total_count, unique_user_count, conversion_count
        )
        SELECT 
            tenant_id, org_id, target_date,
            'page_url' as dimension_type,
            page_url as dimension_value,
            COUNT(*) as total_count,
            COUNT(DISTINCT session_id) as unique_user_count,
            COUNT(*) FILTER (WHERE event_type = 'conversion') as conversion_count
        FROM tracking_event 
        WHERE event_timestamp_unix >= target_date_start 
          AND event_timestamp_unix <= target_date_end
          AND is_archive = false
          AND tenant_id IS NOT NULL AND org_id IS NOT NULL
          AND page_url IS NOT NULL
        GROUP BY tenant_id, org_id, page_url
        HAVING COUNT(*) > 0;

        -- 作成された集計レコード数をカウント
        SELECT COUNT(*) INTO summaries_count
        FROM tracking_summaries 
        WHERE summary_date = target_date;
        
        RAISE NOTICE '[aggregate_daily_tracking_data_with_cleanup] Created % summary records', summaries_count;
    END IF;
    
    -- 🧹 古いデータのクリーンアップ（集計処理完了後）
    RAISE NOTICE '[aggregate_daily_tracking_data_with_cleanup] Starting cleanup of events older than % days', cleanup_retention_days;
    
    WITH deleted_events AS (
        DELETE FROM tracking_event 
        WHERE event_timestamp_unix < cleanup_date_threshold
          AND is_archive = false
        RETURNING id
    )
    SELECT COUNT(*) INTO cleaned_count FROM deleted_events;
    
    RAISE NOTICE '[aggregate_daily_tracking_data_with_cleanup] Cleaned up % old events', cleaned_count;
    
    -- 実行時間の計算
    end_time := clock_timestamp();
    
    RAISE NOTICE '[aggregate_daily_tracking_data_with_cleanup] Completed in % ms', EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    -- 結果を返す
    RETURN QUERY SELECT 
        events_count,
        summaries_count,
        cleaned_count,
        EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- 4. 手動実行用のラッパー関数（統合版）
-- ===============================

CREATE OR REPLACE FUNCTION run_tracking_aggregation_with_cleanup_manual(
    target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day',
    cleanup_retention_days INTEGER DEFAULT 90
)
RETURNS TEXT AS $$
DECLARE
    result_record RECORD;
BEGIN
    -- 統合版集計関数を実行
    SELECT * INTO result_record 
    FROM aggregate_daily_tracking_data_with_cleanup(target_date, cleanup_retention_days);
    
    RETURN format(
        'Manual tracking aggregation with cleanup completed for %s: %s events processed, %s summaries created, %s old events cleaned in %s ms',
        target_date,
        result_record.processed_events,
        result_record.created_summaries,
        result_record.cleaned_events,
        result_record.execution_time_ms
    );
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- 5. バックフィル関数（統合版対応）
-- ===============================

CREATE OR REPLACE FUNCTION backfill_tracking_summaries_with_cleanup(
    start_date DATE,
    end_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day',
    cleanup_retention_days INTEGER DEFAULT 90
)
RETURNS TABLE (
    processing_date DATE,
    processed_events INTEGER,
    created_summaries INTEGER,
    cleaned_events INTEGER,
    execution_time_ms INTEGER
) AS $$
DECLARE
    current_date_iter DATE;
    result_record RECORD;
BEGIN
    RAISE NOTICE '[backfill_tracking_summaries_with_cleanup] Starting backfill from % to %', start_date, end_date;
    
    current_date_iter := start_date;
    
    WHILE current_date_iter <= end_date LOOP
        RAISE NOTICE '[backfill_tracking_summaries_with_cleanup] Processing date: %', current_date_iter;
        
        -- 各日付に対して統合版集計関数を実行
        SELECT * INTO result_record 
        FROM aggregate_daily_tracking_data_with_cleanup(current_date_iter, cleanup_retention_days);
        
        RETURN QUERY SELECT 
            current_date_iter,
            result_record.processed_events,
            result_record.created_summaries,
            result_record.cleaned_events,
            result_record.execution_time_ms;
        
        current_date_iter := current_date_iter + INTERVAL '1 day';
    END LOOP;
    
    RAISE NOTICE '[backfill_tracking_summaries_with_cleanup] Backfill completed';
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- 6. 緊急時用の個別クリーンアップ関数（既存維持）
-- ===============================

-- 既存のcleanup_old_tracking_events関数はそのまま維持（緊急時用）
-- 通常は統合版関数で処理されるため、手動実行時のみ使用

-- ===============================
-- 7. pg_cronジョブの設定（統合版）
-- ===============================

-- 既存の日次集計ジョブを削除（エラーを無視）
DO $$
BEGIN
    PERFORM cron.unschedule('daily-tracking-aggregation');
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'daily-tracking-aggregation job not found or already deleted';
END $$;

-- 新しい統合版日次処理ジョブを設定
SELECT cron.schedule(
    'daily-tracking-aggregation-with-cleanup',
    '15 17 * * *',  -- 毎日17:15 UTC (JST 02:15) 実行
    'SELECT aggregate_daily_tracking_data_with_cleanup();'
);

-- ===============================
-- 8. 監視・管理ビューの作成
-- ===============================

-- 統合処理の状況を監視するビュー
CREATE OR REPLACE VIEW tracking_integrated_status AS
SELECT 
    summary_date,
    COUNT(*) as summary_count,
    COUNT(DISTINCT tenant_id) as tenant_count,
    SUM(total_count) as total_events,
    SUM(conversion_count) as total_conversions,
    (SUM(conversion_count)::float / NULLIF(SUM(total_count), 0) * 100) as conversion_rate,
    MAX(created_at) as last_aggregated_at,
    -- 古いデータの存在チェック
    (
        SELECT COUNT(*) 
        FROM tracking_event 
        WHERE event_timestamp_unix < EXTRACT(EPOCH FROM (CURRENT_DATE - INTERVAL '90 days')::timestamp)
          AND is_archive = false
    ) as old_events_remaining
FROM tracking_summaries
GROUP BY summary_date
ORDER BY summary_date DESC;

-- ===============================
-- 9. 権限設定
-- ===============================

-- 必要な実行権限を付与
GRANT EXECUTE ON FUNCTION aggregate_daily_tracking_data_with_cleanup TO service_role;
GRANT EXECUTE ON FUNCTION run_tracking_aggregation_with_cleanup_manual TO service_role;
GRANT EXECUTE ON FUNCTION backfill_tracking_summaries_with_cleanup TO service_role;

-- cronジョブ実行のための権限
GRANT USAGE ON SCHEMA cron TO service_role;

-- ===============================
-- 完了ログ
-- ===============================

DO $$
BEGIN
    RAISE NOTICE '✅ Tracking integration migration completed successfully';
    RAISE NOTICE '🔄 Daily aggregation with cleanup scheduled at 17:15 UTC';
    RAISE NOTICE '🧹 Old data (90+ days) will be automatically cleaned after each aggregation';
    RAISE NOTICE '📊 Use tracking_integrated_status view for monitoring';
    RAISE NOTICE '🔧 Manual execution: SELECT run_tracking_aggregation_with_cleanup_manual();';
END $$;