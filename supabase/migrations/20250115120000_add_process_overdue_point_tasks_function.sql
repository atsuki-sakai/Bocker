-- ======================================
-- 過去のschedule_for_unixを持つpoint_task_queueを処理する関数
-- ======================================

-- 1. 過去のポイントタスクを処理する関数を作成
CREATE OR REPLACE FUNCTION process_overdue_point_tasks()
RETURNS TABLE(
  processed_count INTEGER,
  total_points_awarded INTEGER,
  task_ids UUID[]
) AS $$
DECLARE
  v_current_unix BIGINT;
  v_processed_count INTEGER := 0;
  v_total_points INTEGER := 0;
  v_task_ids UUID[] := '{}';
  v_task RECORD;
  v_customer_uuid UUID;
  v_result RECORD;
BEGIN
  -- 現在のUNIX時刻を取得
  v_current_unix := extract(epoch from now())::BIGINT;
  
  RAISE NOTICE 'Starting process_overdue_point_tasks at unix: %', v_current_unix;
  
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
      AND scheduled_for_unix < v_current_unix
      AND is_archive = false
      AND points > 0  -- 正のポイントのみ処理
    ORDER BY scheduled_for_unix ASC  -- 古いものから順に処理
    LIMIT 100  -- 一度に処理する件数を制限
  LOOP
    BEGIN
      -- customer_uidをUUID型に変換
      v_customer_uuid := v_task.customer_uid::UUID;
      
      RAISE NOTICE 'Processing task % for customer % with % points', 
        v_task.id, v_customer_uuid, v_task.points;
      
      -- 既存のアトミックポイント更新関数を使用してポイントを加算
      SELECT new_total_points, transaction_id 
      INTO v_result
      FROM update_customer_points_atomic(
        v_customer_uuid::TEXT,
        v_task.tenant_id,
        v_task.org_id,
        v_task.points,  -- 正のポイントを加算
        'point_award',
        'Scheduled point award processed',
        v_task.reservation_id
      );
      
      -- タスクのステータスを完了に更新
      UPDATE point_task_queue 
      SET 
        status = 'completed',
        updated_at = now(),
        processed_at = now()
      WHERE id = v_task.id;
      
      -- 処理済みカウントとポイント合計を更新
      v_processed_count := v_processed_count + 1;
      v_total_points := v_total_points + v_task.points;
      v_task_ids := array_append(v_task_ids, v_task.id);
      
      RAISE NOTICE 'Successfully processed task % - awarded % points (new total: %)', 
        v_task.id, v_task.points, v_result.new_total_points;
        
    EXCEPTION WHEN OTHERS THEN
      -- エラーが発生した場合、タスクをerrorステータスに更新
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

-- 2. processed_at カラムがpoint_task_queueテーブルに存在しない場合は追加
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
    
    RAISE NOTICE 'Added processed_at column to point_task_queue table';
  ELSE
    RAISE NOTICE 'processed_at column already exists in point_task_queue table';
  END IF;
END $$;

-- 3. error_message カラムがpoint_task_queueテーブルに存在しない場合は追加
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
    
    RAISE NOTICE 'Added error_message column to point_task_queue table';
  ELSE
    RAISE NOTICE 'error_message column already exists in point_task_queue table';
  END IF;
END $$;

-- 4. インデックスの最適化（処理効率向上のため）
CREATE INDEX IF NOT EXISTS idx_point_task_queue_overdue_processing
ON point_task_queue(status, scheduled_for_unix, is_archive)
WHERE status = 'pending' AND is_archive = false;

-- コメント追加
COMMENT ON FUNCTION process_overdue_point_tasks() IS '過去のschedule_for_unixを持つpoint_task_queueのpendingタスクを処理してポイントを加算する関数';
COMMENT ON COLUMN point_task_queue.processed_at IS 'タスクが処理された日時';
COMMENT ON COLUMN point_task_queue.error_message IS 'エラーが発生した場合のエラーメッセージ';