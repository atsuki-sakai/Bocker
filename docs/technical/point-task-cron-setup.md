# ポイントタスクCronJob設定ガイド

## 概要

過去の`schedule_for_unix`を持つ`point_task_queue`テーブルのタスクを自動処理し、対応する顧客の`customer_points.total_points`にポイントを加算するSupabase CronJobの設定方法です。

## 実装内容

### 1. 作成されたマイグレーションファイル

- `20250115120000_add_process_overdue_point_tasks_function.sql`: メイン処理関数
- `20250115130000_setup_point_task_cron_job.sql`: CronJob設定

### 2. 主要な機能

#### `process_overdue_point_tasks()` 関数
- 現在時刻より過去の`scheduled_for_unix`を持つ`pending`状態のタスクを処理
- 既存の`update_customer_points_atomic()`関数を使用してアトミックにポイント加算
- 一度に最大100件まで処理（パフォーマンス考慮）
- エラーハンドリング付き（エラー時は`error`ステータスに更新）

#### CronJobスケジュール
- **実行間隔**: 毎日午前2時（日本時間）（`0 17 * * *` = UTC 17:00）
- **実行内容**: `process_overdue_point_tasks()`関数の呼び出し

### 3. 追加されたテーブルカラム

`point_task_queue`テーブルに以下のカラムを追加：
- `processed_at`: タスクが処理された日時
- `error_message`: エラーが発生した場合のエラーメッセージ

### 4. 監視・管理用の機能

#### `point_task_cron_logs` ビュー
CronJobの実行ログを確認できます：
```sql
SELECT * FROM point_task_cron_logs;
```

#### `get_point_task_queue_stats()` 関数
ポイントタスクの統計情報を取得：
```sql
SELECT * FROM get_point_task_queue_stats();
```

#### `manual_process_overdue_point_tasks()` 関数
手動でポイントタスクを処理（テスト用）：
```sql
SELECT * FROM manual_process_overdue_point_tasks();
```

## セットアップ手順

### 1. マイグレーションの実行

```bash
# Supabase CLIを使用してマイグレーションを実行
npx supabase db push

# または、Supabase Dashboardから直接SQLを実行
```

### 2. CronJobの確認

```sql
-- 設定されたCronJobの一覧を確認
SELECT * FROM cron.job WHERE jobname = 'process-overdue-point-tasks';

-- CronJobの実行履歴を確認
SELECT * FROM point_task_cron_logs;
```

### 3. 動作テスト

```sql
-- 統計情報を確認
SELECT * FROM get_point_task_queue_stats();

-- 手動で処理を実行（テスト用）
SELECT * FROM manual_process_overdue_point_tasks();
```

## 処理フロー

1. **タスク検索**: `status = 'pending'` かつ `scheduled_for_unix < 現在時刻` のタスクを検索
2. **ポイント加算**: `update_customer_points_atomic()`を使用してアトミックにポイント加算
3. **ステータス更新**: タスクを`completed`ステータスに更新
4. **エラーハンドリング**: 失敗時は`error`ステータスに更新し、エラーメッセージを記録

## 注意事項

- **パフォーマンス**: 一度に最大100件まで処理（大量データ対応）
- **アトミック処理**: 既存の`update_customer_points_atomic()`関数を使用
- **エラー処理**: 個別タスクでエラーが発生しても他のタスクの処理は継続
- **ログ**: 処理結果とエラーはPostgreSQLのログに記録

## 管理コマンド

### CronJobの停止
```sql
SELECT cron.unschedule('process-overdue-point-tasks');
```

### CronJobの再開
```sql
SELECT cron.schedule(
  'process-overdue-point-tasks',
  '0 17 * * *',
  'SELECT process_overdue_point_tasks();'
);
```

### CronJobの実行間隔変更
```sql
-- 停止
SELECT cron.unschedule('process-overdue-point-tasks');

-- 新しいスケジュールで再設定（例：毎日午前3時）
SELECT cron.schedule(
  'process-overdue-point-tasks',
  '0 18 * * *',  -- 日本時間午前3時 = UTC 18:00
  'SELECT process_overdue_point_tasks();'
);
```

## トラブルシューティング

### 1. CronJobが実行されない場合
```sql
-- pg_cron拡張機能の確認
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- CronJobの設定確認
SELECT * FROM cron.job;
```

### 2. エラーが発生している場合
```sql
-- エラーログの確認
SELECT * FROM point_task_cron_logs WHERE status != 'succeeded';

-- エラー状態のタスクを確認
SELECT * FROM point_task_queue WHERE status = 'error' ORDER BY updated_at DESC;
```

### 3. 処理が遅い場合
```sql
-- 期限切れタスクの件数確認
SELECT COUNT(*) FROM point_task_queue 
WHERE status = 'pending' AND scheduled_for_unix < extract(epoch from now())::BIGINT;

-- 必要に応じて実行間隔を短縮（例：毎5分）
SELECT cron.unschedule('process-overdue-point-tasks');
SELECT cron.schedule('process-overdue-point-tasks', '*/5 * * * *', 'SELECT process_overdue_point_tasks();');
```