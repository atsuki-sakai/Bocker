# Supabase CronJob設定要件

## 必要な設定項目

### 1. pg_cron拡張機能の有効化

Supabaseでpg_cronを使用するには、データベース設定で拡張機能を有効にする必要があります。

#### Supabase Dashboardでの設定手順：

1. **Supabase Dashboard** にログイン
2. プロジェクト（`DEV_Bocker`）を選択
3. **Database** → **Extensions** に移動
4. `pg_cron` を検索して **Enable** をクリック

#### SQLでの確認・有効化：

```sql
-- pg_cron拡張機能が有効かどうか確認
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 有効化されていない場合は実行（superuser権限が必要）
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### 2. データベース権限の確認

CronJobを設定するには、適切な権限が必要です。

```sql
-- 現在のユーザーの権限を確認
SELECT current_user, session_user;

-- cron schemaへのアクセス権限を確認
SELECT has_schema_privilege('cron', 'USAGE');
```

### 3. タイムゾーン設定の確認

CronJobは通常UTC時間で動作するため、日本時間との時差を考慮する必要があります。

```sql
-- 現在のタイムゾーン設定を確認
SHOW timezone;

-- 現在時刻をUTCと日本時間で確認
SELECT 
  now() as utc_time,
  now() AT TIME ZONE 'Asia/Tokyo' as japan_time,
  extract(epoch from now()) as current_unix;
```

### 4. CronJob設定の制限事項

#### Supabase Free Tierの制限：
- **最大CronJob数**: プロジェクトあたり5個まで
- **実行時間制限**: 1つのジョブあたり最大60秒
- **リソース制限**: 同時実行数に制限あり

#### Pro Tierの制限：
- **最大CronJob数**: プロジェクトあたり25個まで
- **実行時間制限**: より長時間の実行が可能

## セットアップ確認チェックリスト

### 事前確認

- [ ] Supabaseプロジェクトのプラン確認（Free/Pro）
- [ ] pg_cron拡張機能の有効化
- [ ] データベース権限の確認
- [ ] 既存CronJobの数を確認

### 実行前テスト

```sql
-- 1. 拡張機能の確認
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 2. 既存CronJobの確認
SELECT jobname, schedule, command, active 
FROM cron.job 
ORDER BY jobname;

-- 3. テスト用関数の実行
SELECT * FROM manual_process_overdue_point_tasks();

-- 4. 統計情報の確認
SELECT * FROM get_point_task_queue_stats();
```

### マイグレーション実行

```bash
# 開発環境でマイグレーションを実行
cd /Users/atsukisakai/Desktop/bokcer-project/bocker
npx supabase db push

# または、Supabase Dashboardから直接SQLを実行
```

### 実行後確認

```sql
-- 1. CronJobが正常に設定されたか確認
SELECT * FROM cron.job WHERE jobname = 'process-overdue-point-tasks';

-- 2. 関数が作成されたか確認
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname IN ('process_overdue_point_tasks', 'manual_process_overdue_point_tasks', 'get_point_task_queue_stats');

-- 3. ビューが作成されたか確認
SELECT * FROM information_schema.views WHERE table_name = 'point_task_cron_logs';

-- 4. テーブルカラムが追加されたか確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'point_task_queue' 
AND column_name IN ('processed_at', 'error_message');
```

## 注意事項

### 1. 本番環境への適用

- **段階的適用**: まず開発環境でテストしてから本番環境に適用
- **バックアップ**: 本番環境適用前にデータベースのバックアップを取得
- **監視**: 初回実行後は必ずログと結果を確認

### 2. パフォーマンス考慮

- **バッチサイズ**: 一度に100件まで処理（必要に応じて調整可能）
- **実行時間**: 大量データがある場合は実行時間を監視
- **インデックス**: 最適化用のインデックスが自動作成されます

### 3. エラーハンドリング

- **個別エラー**: 1つのタスクでエラーが発生しても他は継続処理
- **ログ記録**: エラー内容は`error_message`カラムに記録
- **手動復旧**: エラー状態のタスクは手動で状態をリセット可能

## トラブルシューティング

### pg_cron拡張機能が有効化できない場合

Supabase Dashboardから有効化するか、サポートに問い合わせてください。一部のプランでは制限がある場合があります。

### CronJobが実行されない場合

```sql
-- cron.job_run_detailsでエラー内容を確認
SELECT * FROM cron.job_run_details 
WHERE jobname = 'process-overdue-point-tasks' 
ORDER BY start_time DESC 
LIMIT 5;
```

### 権限エラーが発生する場合

```sql
-- 関数の実行権限を確認・付与
GRANT EXECUTE ON FUNCTION process_overdue_point_tasks() TO authenticated;
GRANT EXECUTE ON FUNCTION process_overdue_point_tasks() TO service_role;
```