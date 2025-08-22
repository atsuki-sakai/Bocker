# Supabaseマイグレーション実行ガイド

## 📋 概要

このガイドでは、トラッキング機能のSupabase完全移行のためのマイグレーション実行方法を説明します。

## 🔧 事前準備

### 1. 環境設定の確認

現在の`.env.local`設定を確認し、実際のSupabase環境に変更してください：

```bash
# 現在（テスト環境）
NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test_anon_key
SUPABASE_SERVICE_ROLE_KEY=service_role_test_key

# 本番環境に変更
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Supabase CLIの認証

```bash
# Supabaseにログイン
npx supabase login

# プロジェクトにリンク
npx supabase link --project-ref YOUR_PROJECT_REF
```

## 🚀 マイグレーション実行方法

### 方法A: CLI経由での実行（推奨）

```bash
# 1. マイグレーション実行
pnpm migrate:supabase

# または直接Supabase CLIを使用
npx supabase db push
```

### 方法B: Supabase Dashboard経由

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. プロジェクトを選択
3. `SQL Editor` → `New query`
4. 以下のファイル内容をコピー&ペースト：
   - `supabase/migrations/20250816000002_fixed_tracking_functions.sql`
5. `Run` ボタンをクリック

## 📁 実行されるマイグレーションファイル

### 主要ファイル
- **20250816000002_fixed_tracking_functions.sql**: 修正版トラッキング関数
  - ✅ Unix timestampのミリ秒対応
  - ✅ 安全なコンバージョン計算
  - ✅ エラーハンドリング強化

### 修正内容
```sql
-- 修正前（問題あり）
target_date_end := EXTRACT(EPOCH FROM (target_date + INTERVAL '1 day')::timestamp) - 1;
COUNT(*) FILTER (WHERE event_type = 'conversion') as conversion_count

-- 修正後（安全）
target_date_end := EXTRACT(EPOCH FROM (target_date + INTERVAL '1 day')::timestamp) * 1000 - 1;
SUM(CASE WHEN event_type = 'conversion' THEN 1 ELSE 0 END) as conversion_count
```

## ✅ 実行後の確認

### 1. 関数の作成確認

```sql
-- 関数が正常に作成されているか確認
SELECT proname FROM pg_proc 
WHERE proname IN (
    'aggregate_daily_tracking_data', 
    'cleanup_old_tracking_events',
    'run_tracking_aggregation_manual',
    'backfill_tracking_summaries'
);
```

### 2. Cronジョブの確認

```sql
-- Cronジョブが設定されているか確認
SELECT jobname, schedule, command FROM cron.job 
WHERE jobname IN ('daily-tracking-aggregation', 'weekly-tracking-cleanup');
```

### 3. 手動テスト実行

```sql
-- テストデータで集計を実行
SELECT run_tracking_aggregation_manual();

-- 結果を確認
SELECT * FROM tracking_aggregation_status LIMIT 5;
```

## 🔍 トラブルシューティング

### 権限エラーが発生した場合

```sql
-- サービスロールの権限を確認
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
```

### pg_cron拡張が無効な場合

```sql
-- pg_cron拡張を有効化
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 拡張の確認
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_cron';
```

### 関数実行エラーの場合

```sql
-- ログを確認（PostgreSQLログ）
SELECT * FROM pg_stat_statements WHERE query LIKE '%aggregate_daily_tracking_data%';

-- 手動でデバッグ実行
SELECT aggregate_daily_tracking_data('2025-08-15'::DATE);
```

## 📈 本番運用開始

### 1. データ確認

```sql
-- トラッキングイベントの存在確認
SELECT COUNT(*) FROM tracking_event WHERE is_archive = false;

-- 最新の集計データ確認
SELECT * FROM tracking_summaries ORDER BY summary_date DESC LIMIT 10;
```

### 2. 監視設定

```sql
-- 集計状況の監視
SELECT * FROM tracking_aggregation_status ORDER BY summary_date DESC;

-- Cronジョブの実行状況確認
SELECT jobname, last_run_start_time, last_run_status FROM cron.job_run_details
WHERE jobname IN ('daily-tracking-aggregation', 'weekly-tracking-cleanup')
ORDER BY run_start_time DESC;
```

## 🎯 重要なポイント

1. **環境設定**: 実際のSupabase認証情報への変更が必須
2. **集計ロジック**: ミリ秒対応とコンバージョン計算の修正済み
3. **Cronスケジュール**: 
   - 日次集計: 日本時間 02:15 (UTC 17:15)
   - 週次クリーンアップ: 日本時間 日曜 03:00 (UTC 18:00)
4. **監視**: `tracking_aggregation_status`ビューで実行状況を確認

## 📞 サポート

問題が発生した場合は、以下の情報を収集してください：
- エラーメッセージ
- 実行したSQL
- `SELECT version()`の結果
- pg_cron拡張のバージョン