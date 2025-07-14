-- 2年経過パーティション自動削除の設定
-- CRON拡張を使用した定期実行設定

-- 1. pg_cron拡張が利用可能かチェック（Supabaseでは利用不可の場合がある）
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. 手動実行用の削除スクリプト（推奨）
-- 毎月1日に手動で実行することを推奨

-- 手動実行用：2年経過パーティション削除
-- SELECT * FROM cleanup_old_partitions_v2(); -- 削除対象の確認
-- 実際の削除を行う場合は上記のコメントを外して実行

-- 3. 削除実行履歴テーブル（監査ログ用）
CREATE TABLE partition_cleanup_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  executed_at timestamptz NOT NULL DEFAULT now(),
  cutoff_date date NOT NULL,
  deleted_partitions jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_deleted integer NOT NULL DEFAULT 0,
  execution_duration_ms integer,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  executed_by text DEFAULT current_user
);

-- 4. 監査ログ付き削除関数（安全版）
CREATE OR REPLACE FUNCTION cleanup_old_partitions_with_audit()
RETURNS TABLE(
  status text,
  total_deleted integer,
  deleted_partitions jsonb,
  execution_duration_ms integer,
  log_id uuid
) AS $$
DECLARE
  cutoff_date date := date_trunc('month', CURRENT_DATE - interval '2 years');
  start_time timestamptz := clock_timestamp();
  deleted_list jsonb := '[]'::jsonb;
  delete_count integer := 0;
  log_record_id uuid;
  part_record record;
  table_patterns text[] := ARRAY['daily_sales_summary_%', 'staff_sales_summary_%', 'menu_sales_summary_%'];
  pattern text;
  error_msg text;
BEGIN
  -- 削除ログレコードを作成
  INSERT INTO partition_cleanup_log (cutoff_date, status)
  VALUES (cutoff_date, 'running')
  RETURNING id INTO log_record_id;

  BEGIN
    FOREACH pattern IN ARRAY table_patterns
    LOOP
      FOR part_record IN 
        SELECT 
          tablename,
          to_date(right(tablename, 6), 'YYYYMM') as partition_date,
          pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
        FROM pg_tables 
        WHERE tablename LIKE pattern
          AND to_date(right(tablename, 6), 'YYYYMM') < cutoff_date
        ORDER BY tablename
      LOOP
        BEGIN
          -- パーティション削除実行
          EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', part_record.tablename);
          
          -- 削除リストに追加
          deleted_list := deleted_list || jsonb_build_object(
            'table_name', part_record.tablename,
            'partition_date', part_record.partition_date::text,
            'size', part_record.size,
            'deleted_at', now()::text
          );
          
          delete_count := delete_count + 1;
          
        EXCEPTION WHEN OTHERS THEN
          -- 個別パーティション削除エラーをログに記録
          deleted_list := deleted_list || jsonb_build_object(
            'table_name', part_record.tablename,
            'partition_date', part_record.partition_date::text,
            'error', SQLERRM,
            'failed_at', now()::text
          );
        END;
      END LOOP;
    END LOOP;

    -- 成功時のログ更新
    UPDATE partition_cleanup_log 
    SET 
      status = 'success',
      deleted_partitions = deleted_list,
      total_deleted = delete_count,
      execution_duration_ms = EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
    WHERE id = log_record_id;

  EXCEPTION WHEN OTHERS THEN
    -- 全体エラー時のログ更新
    error_msg := SQLERRM;
    UPDATE partition_cleanup_log 
    SET 
      status = 'error',
      error_message = error_msg,
      deleted_partitions = deleted_list,
      total_deleted = delete_count,
      execution_duration_ms = EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000
    WHERE id = log_record_id;
  END;

  -- 結果を返す
  RETURN QUERY SELECT 
    CASE 
      WHEN error_msg IS NULL THEN 'success'::text 
      ELSE 'error'::text 
    END,
    delete_count,
    deleted_list,
    (EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000)::integer,
    log_record_id;
END $$ LANGUAGE plpgsql;

-- 5. パーティション統計レポート関数
CREATE OR REPLACE FUNCTION get_partition_cleanup_report()
RETURNS TABLE(
  summary_type text,
  total_partitions bigint,
  oldest_partition text,
  newest_partition text,
  partitions_over_2_years bigint,
  estimated_cleanup_size text
) AS $$
BEGIN
  RETURN QUERY
  WITH partition_info AS (
    SELECT 
      CASE 
        WHEN tablename LIKE 'daily_sales_summary_%' THEN 'daily_sales'
        WHEN tablename LIKE 'staff_sales_summary_%' THEN 'staff_sales'
        WHEN tablename LIKE 'menu_sales_summary_%' THEN 'menu_sales'
      END as table_type,
      tablename,
      to_date(right(tablename, 6), 'YYYYMM') as partition_date,
      pg_total_relation_size(tablename::regclass) as size_bytes
    FROM pg_tables 
    WHERE tablename ~ '^(daily_sales_summary_|staff_sales_summary_|menu_sales_summary_)\d{6}$'
  ),
  summary_stats AS (
    SELECT 
      table_type,
      COUNT(*) as total_partitions,
      MIN(tablename) as oldest_partition,
      MAX(tablename) as newest_partition,
      COUNT(*) FILTER (WHERE partition_date < date_trunc('month', CURRENT_DATE - interval '2 years')) as old_partitions,
      SUM(size_bytes) FILTER (WHERE partition_date < date_trunc('month', CURRENT_DATE - interval '2 years')) as old_partitions_size
    FROM partition_info
    GROUP BY table_type
  )
  SELECT 
    table_type as summary_type,
    total_partitions,
    oldest_partition,
    newest_partition,
    old_partitions as partitions_over_2_years,
    pg_size_pretty(COALESCE(old_partitions_size, 0)) as estimated_cleanup_size
  FROM summary_stats
  ORDER BY table_type;
END $$ LANGUAGE plpgsql;

-- 6. 削除履歴確認用ビュー
CREATE VIEW partition_cleanup_history AS
SELECT 
  id,
  executed_at,
  cutoff_date,
  total_deleted,
  status,
  execution_duration_ms,
  CASE 
    WHEN deleted_partitions IS NOT NULL 
    THEN jsonb_array_length(deleted_partitions) 
    ELSE 0 
  END as partitions_processed,
  executed_by
FROM partition_cleanup_log
ORDER BY executed_at DESC;

-- 7. 運用手順のコメント
COMMENT ON FUNCTION cleanup_old_partitions_with_audit IS '
2年経過パーティション削除関数（監査ログ付き）

実行方法:
1. 削除対象確認: SELECT * FROM get_partition_cleanup_report();
2. 削除実行: SELECT * FROM cleanup_old_partitions_with_audit();
3. 実行履歴確認: SELECT * FROM partition_cleanup_history;

推奨実行頻度: 毎月1日
注意: 削除されたデータは復旧できません。事前にバックアップを推奨。
';

COMMENT ON TABLE partition_cleanup_log IS '
パーティション削除実行ログテーブル
削除実行の監査証跡として使用
';

-- 8. 権限設定
GRANT EXECUTE ON FUNCTION cleanup_old_partitions_with_audit TO service_role;
GRANT EXECUTE ON FUNCTION get_partition_cleanup_report TO service_role;
GRANT SELECT ON partition_cleanup_log TO service_role;
GRANT SELECT ON partition_cleanup_history TO service_role;

-- 一般ユーザーには実行権限なし
REVOKE EXECUTE ON FUNCTION cleanup_old_partitions_with_audit FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_partition_cleanup_report FROM PUBLIC;