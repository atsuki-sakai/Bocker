-- ======================================
-- Supabase pg_cronを使用してポイントタスク処理のCronJobを設定
-- ======================================

-- 1. pg_cron拡張機能を有効化（Supabaseでは通常既に有効）
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. 過去のポイントタスクを処理するCronJobを設定
-- 毎日午前2時（日本時間）実行 = UTC 17:00
SELECT cron.schedule(
  'process-overdue-point-tasks',  -- ジョブ名
  '0 17 * * *',                   -- 毎日午前2時（日本時間）= UTC 17:00
  'SELECT process_overdue_point_tasks();'  -- 実行するSQL
);

-- 3. CronJobの実行ログを確認するためのビューを作成
CREATE OR REPLACE VIEW point_task_cron_logs AS
SELECT 
  jobid,
  jobname,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobname = 'process-overdue-point-tasks'
ORDER BY start_time DESC
LIMIT 50;

-- 4. 手動実行用のヘルパー関数（テスト用）
CREATE OR REPLACE FUNCTION manual_process_overdue_point_tasks()
RETURNS TABLE(
  processed_count INTEGER,
  total_points_awarded INTEGER,
  task_ids UUID[],
  execution_time INTERVAL
) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
  v_result RECORD;
BEGIN
  v_start_time := now();
  
  RAISE NOTICE 'Manual execution started at: %', v_start_time;
  
  -- メイン処理関数を実行
  SELECT processed_count, total_points_awarded, task_ids
  INTO v_result
  FROM process_overdue_point_tasks();
  
  v_end_time := now();
  
  RAISE NOTICE 'Manual execution completed at: %. Duration: %', 
    v_end_time, (v_end_time - v_start_time);
  
  -- 結果を返す
  RETURN QUERY SELECT 
    v_result.processed_count,
    v_result.total_points_awarded,
    v_result.task_ids,
    (v_end_time - v_start_time) as execution_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 統計情報取得用の関数
CREATE OR REPLACE FUNCTION get_point_task_queue_stats()
RETURNS TABLE(
  pending_tasks INTEGER,
  overdue_tasks INTEGER,
  completed_tasks_today INTEGER,
  error_tasks_today INTEGER,
  total_overdue_points INTEGER
) AS $$
DECLARE
  v_current_unix BIGINT;
  v_today_start TIMESTAMP;
BEGIN
  v_current_unix := extract(epoch from now())::BIGINT;
  v_today_start := date_trunc('day', now());
  
  RETURN QUERY
  SELECT 
    -- 待機中のタスク数
    (SELECT COUNT(*)::INTEGER FROM point_task_queue 
     WHERE status = 'pending' AND is_archive = false),
    
    -- 期限切れタスク数
    (SELECT COUNT(*)::INTEGER FROM point_task_queue 
     WHERE status = 'pending' AND scheduled_for_unix < v_current_unix AND is_archive = false),
    
    -- 今日完了したタスク数
    (SELECT COUNT(*)::INTEGER FROM point_task_queue 
     WHERE status = 'completed' AND processed_at >= v_today_start AND is_archive = false),
    
    -- 今日エラーになったタスク数
    (SELECT COUNT(*)::INTEGER FROM point_task_queue 
     WHERE status = 'error' AND updated_at >= v_today_start AND is_archive = false),
    
    -- 期限切れタスクの合計ポイント
    (SELECT COALESCE(SUM(points), 0)::INTEGER FROM point_task_queue 
     WHERE status = 'pending' AND scheduled_for_unix < v_current_unix AND is_archive = false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- コメント追加
COMMENT ON FUNCTION manual_process_overdue_point_tasks() IS '過去のポイントタスクを手動で処理する関数（テスト用）';
COMMENT ON FUNCTION get_point_task_queue_stats() IS 'ポイントタスクキューの統計情報を取得する関数';
COMMENT ON VIEW point_task_cron_logs IS 'ポイントタスク処理CronJobの実行ログビュー';