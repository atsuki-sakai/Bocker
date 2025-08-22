-- テスト用: トラッキング統合機能のテストデータ作成と実行確認
-- 実行環境: Supabaseダッシュボード > SQL Editor

-- ===============================
-- 1. 前提条件確認
-- ===============================

-- pg_cron拡張の確認
SELECT 
    extname as extension_name,
    extversion as version
FROM pg_extension 
WHERE extname = 'pg_cron';

-- 既存のtracking_eventテーブル構造確認
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tracking_event'
ORDER BY ordinal_position;

-- 既存のtracking_summariesテーブル構造確認
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tracking_summaries'
ORDER BY ordinal_position;

-- ===============================
-- 2. 現在のcronジョブ状況確認
-- ===============================

-- 既存のcronジョブ確認
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active
FROM cron.job 
WHERE jobname LIKE '%tracking%'
ORDER BY jobname;

-- ===============================
-- 3. テストデータの作成
-- ===============================

-- テスト用のtracking_eventデータを挿入
-- 注意: 実際のテナント情報に置き換えてください
DO $$
DECLARE
    base_timestamp BIGINT;
    yesterday_start BIGINT;
    yesterday_end BIGINT;
    old_data_timestamp BIGINT;
    i INTEGER;
BEGIN
    -- 昨日の日付範囲を計算
    yesterday_start := EXTRACT(EPOCH FROM (CURRENT_DATE - INTERVAL '1 day')::timestamp);
    yesterday_end := EXTRACT(EPOCH FROM (CURRENT_DATE)::timestamp) - 1;
    
    -- 古いデータ用（95日前）
    old_data_timestamp := EXTRACT(EPOCH FROM (CURRENT_DATE - INTERVAL '95 days')::timestamp);
    
    RAISE NOTICE 'Inserting test data for yesterday: % to %', yesterday_start, yesterday_end;
    RAISE NOTICE 'Inserting old test data around: %', old_data_timestamp;
    
    -- 昨日のテストデータ（100件）
    FOR i IN 1..100 LOOP
        INSERT INTO tracking_event (
            tenant_id, org_id, session_id, event_timestamp_unix,
            event_type, event_source, page_url, utm_source, utm_medium, utm_campaign
        ) VALUES (
            'test_tenant_integration',
            'test_org_integration', 
            'session_' || (i % 20),  -- 20のユニークセッション
            yesterday_start + (i * 60),  -- 1分間隔
            CASE WHEN i % 10 = 0 THEN 'conversion' ELSE 'page_view' END,
            'web',
            '/page_' || (i % 5),
            CASE WHEN i % 4 = 0 THEN 'google' 
                 WHEN i % 4 = 1 THEN 'facebook'
                 WHEN i % 4 = 2 THEN 'instagram'
                 ELSE NULL END,  -- direct traffic
            CASE WHEN i % 3 = 0 THEN 'cpc'
                 WHEN i % 3 = 1 THEN 'social'
                 ELSE NULL END,
            CASE WHEN i % 5 = 0 THEN 'summer2024'
                 WHEN i % 5 = 1 THEN 'new_user'
                 ELSE NULL END
        );
    END LOOP;
    
    -- 古いデータ（クリーンアップ対象、20件）
    FOR i IN 1..20 LOOP
        INSERT INTO tracking_event (
            tenant_id, org_id, session_id, event_timestamp_unix,
            event_type, event_source, page_url, utm_source
        ) VALUES (
            'test_tenant_integration',
            'test_org_integration',
            'old_session_' || i,
            old_data_timestamp + (i * 3600),  -- 1時間間隔
            'page_view',
            'web',
            '/old_page_' || i,
            'old_source'
        );
    END LOOP;
    
    RAISE NOTICE 'Test data insertion completed';
END $$;

-- ===============================
-- 4. テストデータ確認
-- ===============================

-- 挿入されたテストデータの確認
SELECT 
    'Yesterday Events' as data_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(*) FILTER (WHERE event_type = 'conversion') as conversions,
    MIN(event_timestamp_unix) as min_timestamp,
    MAX(event_timestamp_unix) as max_timestamp
FROM tracking_event 
WHERE tenant_id = 'test_tenant_integration'
  AND event_timestamp_unix >= EXTRACT(EPOCH FROM (CURRENT_DATE - INTERVAL '1 day')::timestamp)
  AND event_timestamp_unix < EXTRACT(EPOCH FROM CURRENT_DATE::timestamp)

UNION ALL

SELECT 
    'Old Events (95+ days)' as data_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(*) FILTER (WHERE event_type = 'conversion') as conversions,
    MIN(event_timestamp_unix) as min_timestamp,
    MAX(event_timestamp_unix) as max_timestamp
FROM tracking_event 
WHERE tenant_id = 'test_tenant_integration'
  AND event_timestamp_unix < EXTRACT(EPOCH FROM (CURRENT_DATE - INTERVAL '90 days')::timestamp);

-- ===============================
-- 5. 統合関数の手動実行テスト
-- ===============================

-- 手動実行テスト（90日保持設定）
SELECT run_tracking_aggregation_with_cleanup_manual(
    CURRENT_DATE - INTERVAL '1 day',  -- 昨日のデータを集計
    90  -- 90日保持（95日前のデータは削除される）
);

-- ===============================
-- 6. 実行結果の確認
-- ===============================

-- 集計データの確認
SELECT 
    dimension_type,
    dimension_value,
    total_count,
    unique_user_count,
    conversion_count,
    created_at
FROM tracking_summaries 
WHERE summary_date = CURRENT_DATE - INTERVAL '1 day'
  AND tenant_id = 'test_tenant_integration'
ORDER BY dimension_type, total_count DESC;

-- 古いデータがクリーンアップされたか確認
SELECT 
    'After Cleanup' as status,
    COUNT(*) as remaining_old_events
FROM tracking_event 
WHERE tenant_id = 'test_tenant_integration'
  AND event_timestamp_unix < EXTRACT(EPOCH FROM (CURRENT_DATE - INTERVAL '90 days')::timestamp)
  AND is_archive = false;

-- 統合監視ビューの確認
SELECT * FROM tracking_integrated_status 
WHERE summary_date = CURRENT_DATE - INTERVAL '1 day'
LIMIT 5;

-- ===============================
-- 7. テストデータのクリーンアップ
-- ===============================

-- テスト完了後、テストデータを削除
-- 注意: 本番環境では実行しないでください
/*
DELETE FROM tracking_event WHERE tenant_id = 'test_tenant_integration';
DELETE FROM tracking_summaries WHERE tenant_id = 'test_tenant_integration';
*/

-- ===============================
-- 8. 新しいcronジョブの確認
-- ===============================

-- 更新されたcronジョブの確認
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active,
    database
FROM cron.job 
WHERE jobname LIKE '%tracking%'
ORDER BY jobname;

-- 最近のcronジョブ実行履歴確認
SELECT 
    j.jobname,
    jrd.status,
    jrd.return_message,
    jrd.start_time,
    jrd.end_time
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname LIKE '%tracking%'
ORDER BY jrd.start_time DESC 
LIMIT 10;