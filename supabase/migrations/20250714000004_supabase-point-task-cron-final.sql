-- ======================================
-- ポイントタスクCronJob完全セットアップSQL（最終修正版）
-- scheduled_for_unixがミリ秒単位の場合に対応
-- ======================================

-- 事前確認
DO $$
BEGIN
  RAISE NOTICE '=== ポイントタスクCronJobセットアップ開始 ===';
  RAISE NOTICE 'Current time (UTC): %', now();
  RAISE NOTICE 'Current time (JST): %', now() AT TIME ZONE 'Asia/Tokyo';
  RAISE NOTICE 'Current unix (seconds): %', extract(epoch from now())::BIGINT;
  RAISE NOTICE 'Current unix (milliseconds): %', (extract(epoch from now()) * 1000)::BIGINT;
END $$;

-- 1. テーブル構造の拡張
-- processed_at カラムの追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'point_task_queue' 
    AND column_name = 'processed_at'
  ) THEN
    ALTER TABLE public.point_task_queue 
    ADD COLUMN processed_at TIMESTAMPTZ;
    
    RAISE NOTICE '✅ Added processed_at column to point_task_queue table';
  ELSE
    RAISE NOTICE 'ℹ️ processed_at column already exists in point_task_queue table';
  END IF;
END $$;

-- error_message カラムの追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'point_task_queue' 
    AND column_name = 'error_message'
  ) THEN
    ALTER TABLE public.point_task_queue 
    ADD COLUMN error_message TEXT;
    
    RAISE NOTICE '✅ Added error_message column to point_task_queue table';
  ELSE
    RAISE NOTICE 'ℹ️ error_message column already exists in point_task_queue table';
  END IF;
END $$;

-- 2. インデックスの最適化
CREATE INDEX IF NOT EXISTS idx_point_task_queue_overdue_processing
ON point_task_queue(status, scheduled_for_unix, is_archive)
WHERE status = 'pending' AND is_archive = false;

-- 3. メイン処理関数の作成（ミリ秒対応版）
CREATE OR REPLACE FUNCTION process_overdue_point_tasks()
RETURNS TABLE(
  processed_count INTEGER,
  total_points_awarded INTEGER,
  task_ids UUID[]
) AS $$
DECLARE
  v_current_unix_ms BIGINT;  -- ミリ秒単位
  v_processed_count INTEGER := 0;
  v_total_points INTEGER := 0;
  v_task_ids UUID[] := '{}';
  v_task RECORD;
  v_customer_uuid UUID;
  v_result RECORD;
BEGIN
  -- 現在のUNIX時刻をミリ秒単位で取得
  v_current_unix_ms := (extract(epoch from now()) * 1000)::BIGINT;
  
  RAISE NOTICE 'Starting process_overdue_point_tasks at unix (ms): %', v_current_unix_ms;
  
  -- 過去のschedule_for_unixを持つpendingタスクをループ処理
  FOR v_task IN
    SELECT 
      id,
      customer_uid,
      tenant_id,
      org_id,
      points,
      scheduled_for_unix,
      reservation_id
    FROM point_task_queue 
    WHERE status = 'pending'
      AND scheduled_for_unix < v_current_unix_ms  -- ミリ秒単位で比較
      AND is_archive = false
      AND points > 0  -- 正のポイントのみ処理
    ORDER BY scheduled_for_unix ASC  -- 古いものから順に処理
    LIMIT 100  -- 一度に処理する件数を制限
  LOOP
    BEGIN
      -- customer_uidをUUID型に変換
      v_customer_uuid := v_task.customer_uid::UUID;
      
      RAISE NOTICE 'Processing task % for customer % with % points (scheduled: %)', 
        v_task.id, v_customer_uuid, v_task.points, v_task.scheduled_for_unix;
      
      -- トランザクション開始：ポイント加算とタスク削除を同時実行
      BEGIN
        -- 既存のアトミックポイント更新関数を使用してポイントを加算
        SELECT new_total_points, transaction_id 
        INTO v_result
        FROM update_customer_points_atomic(
          v_customer_uuid::TEXT,
          v_task.tenant_id,
          v_task.org_id,
          v_task.points,  -- 正のポイントを加算
          'point_award',
          '予約完了によるポイント付与',
          v_task.reservation_id
        );
        
        -- ポイント加算成功後、即座にタスクを削除
        DELETE FROM point_task_queue WHERE id = v_task.id;
        
        -- 処理済みカウントとポイント合計を更新
        v_processed_count := v_processed_count + 1;
        v_total_points := v_total_points + v_task.points;
        v_task_ids := array_append(v_task_ids, v_task.id);
        
        RAISE NOTICE 'Successfully processed and deleted task % - awarded % points (new total: %)', 
          v_task.id, v_task.points, v_result.new_total_points;
          
      EXCEPTION WHEN OTHERS THEN
        -- ポイント加算またはタスク削除でエラーが発生した場合
        RAISE WARNING 'Failed to process or delete task %: %', v_task.id, SQLERRM;
        -- 内部エラーを外部にre-raise
        RAISE;
      END;
        
    EXCEPTION WHEN OTHERS THEN
      -- エラーが発生した場合、タスクをerrorステータスに更新（削除はしない）
      UPDATE point_task_queue 
      SET 
        status = 'error',
        error_message = SQLERRM,
        updated_at = now()
      WHERE id = v_task.id;
      
      RAISE WARNING 'Failed to process task %: %', v_task.id, SQLERRM;
      -- エラーが発生してもループを続行
    END;
  END LOOP;
  
  RAISE NOTICE 'Completed processing. Processed: %, Total points awarded: %', 
    v_processed_count, v_total_points;
  
  -- 結果を返す
  RETURN QUERY SELECT v_processed_count, v_total_points, v_task_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 手動実行用のヘルパー関数（既存関数を削除してから作成）
DROP FUNCTION IF EXISTS manual_process_overdue_point_tasks();

CREATE OR REPLACE FUNCTION manual_process_overdue_point_tasks()
RETURNS TABLE(
  result_processed_count INTEGER,
  result_total_points_awarded INTEGER,
  result_task_ids UUID[],
  result_execution_time INTERVAL
) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
  v_processed_count INTEGER;
  v_total_points_awarded INTEGER;
  v_task_ids UUID[];
BEGIN
  v_start_time := now();
  
  RAISE NOTICE 'Manual execution started at: %', v_start_time;
  
  -- メイン処理関数を実行（エイリアスを使用して競合回避）
  SELECT p.processed_count, p.total_points_awarded, p.task_ids
  INTO v_processed_count, v_total_points_awarded, v_task_ids
  FROM process_overdue_point_tasks() p;
  
  v_end_time := now();
  
  RAISE NOTICE 'Manual execution completed at: %. Duration: %', 
    v_end_time, (v_end_time - v_start_time);
  
  -- 結果を返す（カラム名を変更して競合回避）
  RETURN QUERY SELECT 
    v_processed_count,
    v_total_points_awarded,
    v_task_ids,
    (v_end_time - v_start_time);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 統計情報取得用の関数（ミリ秒対応版）
-- 既存の関数を削除してから再作成
DROP FUNCTION IF EXISTS get_point_task_queue_stats();

CREATE OR REPLACE FUNCTION get_point_task_queue_stats()
RETURNS TABLE(
  pending_tasks INTEGER,
  overdue_tasks INTEGER,
  completed_tasks_today INTEGER,
  error_tasks_today INTEGER,
  total_overdue_points INTEGER,
  current_unix_ms BIGINT,
  sample_scheduled_times TEXT
) AS $$
DECLARE
  v_current_unix_ms BIGINT;
  v_today_start TIMESTAMP;
BEGIN
  v_current_unix_ms := (extract(epoch from now()) * 1000)::BIGINT;
  v_today_start := date_trunc('day', now());
  
  RETURN QUERY
  SELECT 
    -- 待機中のタスク数
    (SELECT COUNT(*)::INTEGER FROM point_task_queue 
     WHERE status = 'pending' AND is_archive = false),
    
    -- 期限切れタスク数（ミリ秒単位で比較）
    (SELECT COUNT(*)::INTEGER FROM point_task_queue 
     WHERE status = 'pending' AND scheduled_for_unix < v_current_unix_ms AND is_archive = false),
    
    -- 今日削除されたタスク数（completedタスクは削除されるため0になる）
    0::INTEGER,
    
    -- 今日エラーになったタスク数
    (SELECT COUNT(*)::INTEGER FROM point_task_queue 
     WHERE status = 'error' AND updated_at >= v_today_start AND is_archive = false),
    
    -- 期限切れタスクの合計ポイント
    (SELECT COALESCE(SUM(points), 0)::INTEGER FROM point_task_queue 
     WHERE status = 'pending' AND scheduled_for_unix < v_current_unix_ms AND is_archive = false),
    
    -- 現在時刻（ミリ秒）
    v_current_unix_ms,
    
    -- サンプルのスケジュール時刻（デバッグ用）
    (SELECT string_agg(scheduled_for_unix::TEXT, ', ') FROM (
      SELECT scheduled_for_unix FROM point_task_queue 
      WHERE status = 'pending' AND is_archive = false 
      ORDER BY scheduled_for_unix 
      LIMIT 5
    ) sample);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. CronJobの設定（毎日午前2時日本時間 = UTC 17:00）
-- 既存のCronJobがある場合は削除してから再作成
DO $$
BEGIN
  -- 既存のCronJobを削除（存在する場合）
  PERFORM cron.unschedule(jobid) 
  FROM cron.job 
  WHERE command LIKE '%process_overdue_point_tasks%';
  
  RAISE NOTICE 'Removed existing CronJob if any';
END $$;

SELECT cron.schedule(
  'process-overdue-point-tasks',  -- ジョブ名
  '0 17 * * *',                   -- 毎日午前2時（日本時間）= UTC 17:00
  'SELECT process_overdue_point_tasks();'  -- 実行するSQL
);

-- 7. 不要なビューの削除（使用しないため）
DROP VIEW IF EXISTS point_task_cron_logs;

-- 8. コメント追加
COMMENT ON FUNCTION process_overdue_point_tasks() IS '過去のschedule_for_unix（ミリ秒単位）を持つpoint_task_queueのpendingタスクを処理してポイントを加算し、完了後にタスクを削除する関数';
COMMENT ON FUNCTION manual_process_overdue_point_tasks() IS '過去のポイントタスクを手動で処理する関数（テスト用）';
COMMENT ON FUNCTION get_point_task_queue_stats() IS 'ポイントタスクキューの統計情報を取得する関数（ミリ秒対応）';
COMMENT ON COLUMN point_task_queue.processed_at IS 'タスクが処理された日時';
COMMENT ON COLUMN point_task_queue.error_message IS 'エラーが発生した場合のエラーメッセージ';

-- 9. 最終確認と結果表示
DO $$
BEGIN
  RAISE NOTICE '=== セットアップ完了確認 ===';
END $$;

-- 設定完了後の確認
SELECT 'pg_cron extension' as check_item, 
       CASE WHEN EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
            THEN '✅ Enabled' 
            ELSE '❌ Not enabled' 
       END as status
UNION ALL
SELECT 'CronJob scheduled' as check_item,
       CASE WHEN EXISTS(SELECT 1 FROM cron.job WHERE command LIKE '%process_overdue_point_tasks%')
            THEN '✅ Scheduled'
            ELSE '❌ Not scheduled'
       END as status
UNION ALL
SELECT 'Main function created' as check_item,
       CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'process_overdue_point_tasks')
            THEN '✅ Created'
            ELSE '❌ Not created'
       END as status
UNION ALL
SELECT 'Helper functions created' as check_item,
       CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_point_task_queue_stats')
            THEN '✅ Created'
            ELSE '❌ Not created'
       END as status;

-- 統計情報の表示（ミリ秒対応版）
SELECT * FROM get_point_task_queue_stats();

-- CronJobの確認
SELECT jobid, schedule, command, active 
FROM cron.job 
WHERE command LIKE '%process_overdue_point_tasks%';

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '=== ✅ ポイントタスクCronJobセットアップ完了 ===';
  RAISE NOTICE '実行スケジュール: 毎日午前2時（日本時間）';
  RAISE NOTICE '手動テスト実行: SELECT * FROM manual_process_overdue_point_tasks();';
  RAISE NOTICE '注意: scheduled_for_unixはミリ秒単位で処理されます';
END $$;