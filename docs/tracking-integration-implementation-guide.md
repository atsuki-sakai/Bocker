# トラッキング機能統合実装ガイド

## 📋 概要

このガイドは、Convex→Supabase移行に加えて、**日次クリーンアップ統合版**の実装手順を説明します。

### 主な変更点
- ✅ **週次クリーンアップの廃止**: 古いデータは日次集計後に自動削除
- ✅ **cronジョブの統合**: 1つのジョブで集計+クリーンアップを実行
- ✅ **90日保持**: 90日より古いデータは自動削除（設定可能）

---

## 🔧 実装手順

### Step 1: Supabaseダッシュボードでのマイグレーション実行

#### 1.1 ダッシュボードにアクセス
1. [Supabaseダッシュボード](https://supabase.com/dashboard)にログイン
2. プロジェクト「DEV_Bocker」を選択
3. 左メニューから「SQL Editor」を選択

#### 1.2 マイグレーションファイルの実行
1. 「New query」をクリック
2. `supabase/migrations/20250821000001_tracking_daily_cleanup_integration.sql`の内容をコピー&ペースト
3. 「Run」ボタンをクリックして実行
4. エラーがないことを確認

**期待する出力:**
```
✅ Tracking integration migration completed successfully
🔄 Daily aggregation with cleanup scheduled at 17:15 UTC
🧹 Old data (90+ days) will be automatically cleaned after each aggregation
📊 Use tracking_integrated_status view for monitoring
🔧 Manual execution: SELECT run_tracking_aggregation_with_cleanup_manual();
```

### Step 2: 実装確認

#### 2.1 関数の存在確認
```sql
-- 作成された関数を確認
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%tracking%'
  AND routine_schema = 'public'
ORDER BY routine_name;
```

**期待する結果:**
- `aggregate_daily_tracking_data_with_cleanup`
- `backfill_tracking_summaries_with_cleanup` 
- `run_tracking_aggregation_with_cleanup_manual`

#### 2.2 cronジョブの確認
```sql
-- cronジョブの設定確認
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active
FROM cron.job 
WHERE jobname LIKE '%tracking%'
ORDER BY jobname;
```

**期待する結果:**
- `daily-tracking-aggregation-with-cleanup` が active=true で存在
- 古い週次ジョブは削除済み

### Step 3: テストデータでの動作確認

#### 3.1 テストファイルの実行
1. SQL Editorで新しいクエリを作成
2. `test_tracking_integration.sql`の内容をコピー&ペースト
3. セクションごとに実行（一度に全部実行しない）

#### 3.2 テスト手順
1. **前提条件確認** (Section 1-2)
2. **テストデータ作成** (Section 3)
3. **統合関数の手動実行** (Section 5)
4. **結果確認** (Section 6)
5. **テストデータクリーンアップ** (Section 7)

### Step 4: 統合監視ビューの確認

```sql
-- 統合処理の状況確認
SELECT * FROM tracking_integrated_status 
ORDER BY summary_date DESC 
LIMIT 5;
```

---

## 🎯 新機能の使用方法

### 手動実行（開発・テスト用）
```sql
-- 基本実行（昨日のデータ集計 + 90日保持）
SELECT run_tracking_aggregation_with_cleanup_manual();

-- カスタム設定での実行
SELECT run_tracking_aggregation_with_cleanup_manual(
    '2025-08-20'::DATE,  -- 特定日の集計
    60  -- 60日保持（より短い保持期間）
);
```

### バックフィル実行（過去データの一括処理）
```sql
-- 過去7日間のデータを一括処理
SELECT * FROM backfill_tracking_summaries_with_cleanup(
    CURRENT_DATE - INTERVAL '7 days',
    CURRENT_DATE - INTERVAL '1 day'
);
```

### 監視・運用
```sql
-- 処理状況の監視
SELECT * FROM tracking_integrated_status;

-- 古いデータの残存確認
SELECT COUNT(*) as old_events_remaining
FROM tracking_event 
WHERE event_timestamp_unix < EXTRACT(EPOCH FROM (CURRENT_DATE - INTERVAL '90 days')::timestamp)
  AND is_archive = false;
```

---

## 📊 自動実行スケジュール

### 日次統合処理
- **実行時間**: 毎日17:15 UTC (JST 02:15)
- **処理内容**: 
  1. 前日24時間のデータ集計
  2. 4つのdimension_type別に集計
  3. 90日より古いデータの自動削除
- **cronジョブ名**: `daily-tracking-aggregation-with-cleanup`

### 実行確認
```sql
-- cronジョブの実行履歴確認
SELECT 
    j.jobname,
    jrd.status,
    jrd.return_message,
    jrd.start_time,
    jrd.end_time
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname = 'daily-tracking-aggregation-with-cleanup'
ORDER BY jrd.start_time DESC 
LIMIT 5;
```

---

## 🔧 設定変更

### 保持期間の変更
```sql
-- cronジョブの保持期間を60日に変更
SELECT cron.alter_job(
    job_id := (SELECT jobid FROM cron.job WHERE jobname = 'daily-tracking-aggregation-with-cleanup'),
    command := 'SELECT aggregate_daily_tracking_data_with_cleanup(CURRENT_DATE - INTERVAL ''1 day'', 60);'
);
```

### 実行時間の変更
```sql
-- 実行時間を18:00 UTCに変更
SELECT cron.alter_job(
    job_id := (SELECT jobid FROM cron.job WHERE jobname = 'daily-tracking-aggregation-with-cleanup'),
    schedule := '0 18 * * *'
);
```

---

## 🚨 トラブルシューティング

### よくある問題

#### 1. pg_cron拡張が見つからない
```sql
-- 確認
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 解決策: Supabaseサポートに連絡してpg_cron有効化を依頼
```

#### 2. 権限エラー
```sql
-- 権限の再付与
GRANT EXECUTE ON FUNCTION aggregate_daily_tracking_data_with_cleanup TO service_role;
GRANT USAGE ON SCHEMA cron TO service_role;
```

#### 3. メモリ不足エラー
```sql
-- バッチサイズを小さくして再実行
-- 大量のデータがある場合は、日付範囲を分割して処理
SELECT backfill_tracking_summaries_with_cleanup(
    '2025-08-01'::DATE,
    '2025-08-07'::DATE  -- 週単位で実行
);
```

#### 4. データ整合性の問題
```sql
-- 集計前の生データと集計後データの突合
WITH raw_data AS (
    SELECT 
        DATE(to_timestamp(event_timestamp_unix)) as event_date,
        COUNT(*) as raw_count
    FROM tracking_event 
    WHERE DATE(to_timestamp(event_timestamp_unix)) = CURRENT_DATE - INTERVAL '1 day'
    GROUP BY DATE(to_timestamp(event_timestamp_unix))
),
summary_data AS (
    SELECT 
        summary_date,
        SUM(total_count) as summary_count
    FROM tracking_summaries 
    WHERE summary_date = CURRENT_DATE - INTERVAL '1 day'
    GROUP BY summary_date
)
SELECT 
    r.event_date,
    r.raw_count,
    s.summary_count,
    (r.raw_count = s.summary_count) as is_consistent
FROM raw_data r
LEFT JOIN summary_data s ON r.event_date = s.summary_date;
```

---

## ✅ 実装完了確認チェックリスト

### 必須確認項目
- [ ] **マイグレーション正常実行**: エラーなく完了
- [ ] **統合関数作成確認**: 3つの新関数が存在
- [ ] **cronジョブ設定確認**: 新ジョブが active
- [ ] **テストデータでの動作確認**: 手動実行が成功
- [ ] **監視ビュー動作確認**: tracking_integrated_statusが機能

### パフォーマンス確認項目
- [ ] **集計処理時間**: 中規模データで2分以内
- [ ] **クリーンアップ効率**: 古いデータの適切な削除
- [ ] **メモリ使用量**: 正常範囲内での実行

### 運用確認項目
- [ ] **自動実行確認**: 17:15 UTCでの実行
- [ ] **ログ監視**: cronジョブ実行ログの確認
- [ ] **アラート設定**: 失敗時の通知設定（オプション）

---

## 🎉 完了後の効果

### ✅ コスト削減
- Convex利用料金の削除
- 単一データベースでの運用コスト削減

### ✅ 運用効率化
- 週次→日次でのデータクリーンアップ
- 1つのcronジョブでの統合管理
- ストレージ容量の自動最適化

### ✅ パフォーマンス向上
- PostgreSQL nativeでの高速集計
- 古いデータの自動削除による検索性能向上
- ダッシュボード応答時間の改善

この実装により、トラッキング機能はより効率的で保守性の高いシステムとなります。