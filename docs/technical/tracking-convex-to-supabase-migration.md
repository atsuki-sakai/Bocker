# トラッキング機能 Convex → Supabase 完全移行手順書

## 📋 概要

Bockerの顧客獲得トラッキング機能の日次集計処理を、ConvexからSupabaseのpg_cronに完全移行するための詳細手順書です。

### 移行の目的
- **コスト削減**: Convex利用料金の削除
- **運用簡素化**: 単一データベースでの一元管理
- **パフォーマンス向上**: ネットワーク往復の削減とSQLネイティブ処理

---

## 🏗️ 移行前後のアーキテクチャ

### Before (Convex併用)
```
Frontend → API Routes → Supabase PostgreSQL
                           ↓
                    Raw Event Storage
                           ↓
Convex Cron → TrackingEventRepository → Daily Aggregation
     ↓                  ↓                       ↓
Schedule Only    Read from Supabase    Write to Supabase
```

### After (Supabase完全統合)
```
Frontend → API Routes → Supabase PostgreSQL
                           ↓
                Raw Event Storage + Aggregation
                           ↓
                  pg_cron Built-in Scheduler
                           ↓
               PostgreSQL Native Functions
```

---

## 🚀 移行手順

### Phase 1: Supabase設定

#### 1.1 マイグレーション実行
```bash
# 移行用マイグレーションの適用
supabase db push

# または個別実行
psql -h YOUR_SUPABASE_HOST -U postgres -d postgres \
     -f supabase/migrations/20250816000001_migrate_tracking_from_convex_to_supabase.sql
```

#### 1.2 pg_cron拡張の確認
```sql
-- Supabaseダッシュボードまたはpsqlで実行
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- pg_cronが有効でない場合（通常Supabaseでは事前有効化済み）
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

#### 1.3 Cronジョブの確認
```sql
-- 設定されたcronジョブを確認
SELECT * FROM cron.job WHERE jobname LIKE '%tracking%';

-- 期待する結果:
-- jobname: 'daily-tracking-aggregation', schedule: '15 17 * * *'
-- jobname: 'weekly-tracking-cleanup', schedule: '0 18 * * 0'
```

### Phase 2: 詳細なSupabase設定

#### 2.1 権限設定の確認
```sql
-- サービスロール権限の確認
SELECT 
    grantee, 
    privilege_type, 
    is_grantable
FROM information_schema.routine_privileges 
WHERE routine_name IN ('aggregate_daily_tracking_data', 'cleanup_old_tracking_events');

-- 不足している場合は追加
GRANT EXECUTE ON FUNCTION aggregate_daily_tracking_data TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_tracking_events TO service_role;
```

#### 2.2 RLS (Row Level Security) の設定
```sql
-- RLSが有効になっているか確認
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('tracking_event', 'tracking_summaries');

-- RLSポリシーの確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('tracking_event', 'tracking_summaries');
```

#### 2.3 インデックスの最適化確認
```sql
-- インデックスの存在確認
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename IN ('tracking_event', 'tracking_summaries')
ORDER BY tablename, indexname;

-- 期待するインデックス:
-- idx_tracking_event_tenant_org
-- idx_tracking_event_timestamp  
-- idx_tracking_event_session
-- idx_tracking_summaries_tenant_org_date
-- idx_tracking_summaries_dimension
```

#### 2.4 環境変数の設定（必要に応じて）
```bash
# .env.local に以下を追加（まだ設定していない場合）
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# pg_cronの実行に必要な場合
PGCRON_DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
```

### Phase 3: 機能テスト

#### 3.1 手動テスト実行
```sql
-- 昨日のデータで集計テスト
SELECT * FROM run_tracking_aggregation_manual();

-- 結果例:
-- "Manual tracking aggregation completed for 2025-08-15: 1250 events processed, 45 summaries created in 234 ms"
```

#### 3.2 集計結果の確認
```sql
-- 集計状況の確認
SELECT * FROM tracking_aggregation_status 
ORDER BY summary_date DESC 
LIMIT 5;

-- 特定日のデータ詳細確認
SELECT 
    dimension_type,
    dimension_value,
    total_count,
    unique_user_count,
    conversion_count
FROM tracking_summaries 
WHERE summary_date = CURRENT_DATE - INTERVAL '1 day'
ORDER BY dimension_type, total_count DESC;
```

#### 3.3 Cronジョブのログ確認
```sql
-- pg_cron実行ログの確認
SELECT 
    jobid,
    schedule,
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details 
WHERE jobid IN (
    SELECT jobid FROM cron.job 
    WHERE jobname IN ('daily-tracking-aggregation', 'weekly-tracking-cleanup')
)
ORDER BY start_time DESC 
LIMIT 10;
```

### Phase 4: バックフィル（必要に応じて）

#### 4.1 過去データの一括集計
```sql
-- 過去7日間のデータを一括集計
SELECT * FROM backfill_tracking_summaries(
    CURRENT_DATE - INTERVAL '7 days',
    CURRENT_DATE - INTERVAL '1 day'
);

-- より長期間の場合（例：過去30日）
SELECT * FROM backfill_tracking_summaries(
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE - INTERVAL '1 day'
);
```

#### 4.2 データ整合性チェック
```sql
-- 集計前の生データと集計後データの整合性確認
WITH raw_data AS (
    SELECT 
        DATE(to_timestamp(event_timestamp_unix)) as event_date,
        tenant_id,
        org_id,
        COUNT(*) as raw_count,
        COUNT(DISTINCT session_id) as raw_unique_sessions,
        COUNT(*) FILTER (WHERE event_type = 'conversion') as raw_conversions
    FROM tracking_event 
    WHERE DATE(to_timestamp(event_timestamp_unix)) = CURRENT_DATE - INTERVAL '1 day'
    GROUP BY DATE(to_timestamp(event_timestamp_unix)), tenant_id, org_id
),
summary_data AS (
    SELECT 
        summary_date,
        tenant_id,
        org_id,
        SUM(total_count) as summary_count,
        SUM(unique_user_count) as summary_unique_sessions,
        SUM(conversion_count) as summary_conversions
    FROM tracking_summaries 
    WHERE summary_date = CURRENT_DATE - INTERVAL '1 day'
    GROUP BY summary_date, tenant_id, org_id
)
SELECT 
    COALESCE(r.event_date, s.summary_date) as date,
    COALESCE(r.tenant_id, s.tenant_id) as tenant_id,
    COALESCE(r.org_id, s.org_id) as org_id,
    r.raw_count,
    s.summary_count,
    (r.raw_count = s.summary_count) as count_match,
    r.raw_unique_sessions,
    s.summary_unique_sessions,
    (r.raw_unique_sessions = s.summary_unique_sessions) as session_match
FROM raw_data r
FULL OUTER JOIN summary_data s ON r.tenant_id = s.tenant_id AND r.org_id = s.org_id;
```

---

## 🔧 Supabase詳細設定手順

### 1. Supabaseダッシュボードでの設定

#### 1.1 プロジェクト設定
1. Supabaseダッシュボードにログイン
2. 対象プロジェクトを選択
3. Settings → Database → Extensions
4. `pg_cron` が有効になっていることを確認

#### 1.2 SQL Editorでの実行
1. SQL Editor に移動
2. 新しいクエリを作成
3. マイグレーションファイルの内容を実行
4. 実行結果でエラーがないことを確認

#### 1.3 ログ監視の設定
1. Logs & Metrics セクションに移動
2. Postgres Logs で集計処理のログを監視
3. アラート設定（オプション）

### 2. CLI経由での設定

#### 2.1 Supabase CLI経由
```bash
# Supabase CLIでの接続
supabase db reset --linked

# マイグレーション実行
supabase db push

# 関数の動作確認
supabase db functions list
```

#### 2.2 psql直接接続
```bash
# psql接続
psql "postgresql://postgres:[password]@[host]:5432/postgres"

# 集計関数の実行
\c postgres
SELECT run_tracking_aggregation_manual();

# Cronジョブの確認
SELECT * FROM cron.job;
```

### 3. 監視・アラート設定

#### 3.1 基本監視クエリ
```sql
-- 日次実行状況の監視
CREATE OR REPLACE VIEW daily_tracking_health AS
SELECT 
    CURRENT_DATE - INTERVAL '1 day' as target_date,
    (SELECT COUNT(*) FROM tracking_summaries WHERE summary_date = CURRENT_DATE - INTERVAL '1 day') as summaries_created,
    (SELECT COUNT(*) FROM tracking_event WHERE DATE(to_timestamp(event_timestamp_unix)) = CURRENT_DATE - INTERVAL '1 day') as events_processed,
    (SELECT MAX(created_at) FROM tracking_summaries WHERE summary_date = CURRENT_DATE - INTERVAL '1 day') as last_aggregation_time,
    CASE 
        WHEN (SELECT COUNT(*) FROM tracking_summaries WHERE summary_date = CURRENT_DATE - INTERVAL '1 day') > 0 
        THEN 'HEALTHY'
        ELSE 'MISSING_DATA'
    END as status;
```

#### 3.2 Webhook通知設定（オプション）
```sql
-- 集計失敗時の通知関数
CREATE OR REPLACE FUNCTION notify_tracking_failure()
RETURNS void AS $$
BEGIN
    -- Slack/Discord webhook通知などを実装
    PERFORM pg_notify('tracking_failure', 'Daily tracking aggregation failed');
END;
$$ LANGUAGE plpgsql;

-- 集計関数にエラーハンドリング追加
-- （実際の関数を拡張する場合）
```

---

## ✅ 検証チェックリスト

### 必須確認項目
- [ ] マイグレーションが正常に実行された
- [ ] pg_cron拡張が有効になっている  
- [ ] 2つのcronジョブが正常に設定されている
- [ ] 集計関数が手動実行できる
- [ ] 昨日のデータで集計テストが成功する
- [ ] tracking_aggregation_statusビューでデータが確認できる
- [ ] RLSポリシーが適切に設定されている
- [ ] 必要なインデックスが存在する

### パフォーマンス確認項目
- [ ] 集計処理が2分以内に完了する
- [ ] メモリ使用量が適切な範囲内
- [ ] データベース接続数が正常範囲内
- [ ] ダッシュボードのクエリ応答時間が改善している

### セキュリティ確認項目
- [ ] サービスロール権限が最小限に設定されている
- [ ] RLSポリシーが全テーブルで有効
- [ ] 不要なpublic権限が削除されている
- [ ] audit log が適切に記録されている

---

## 🚨 トラブルシューティング

### よくある問題と解決策

#### 1. pg_cron拡張が見つからない
```sql
-- 解決策: Supabaseサポートに連絡してpg_cronの有効化を依頼
-- または別のスケジューラー（GitHub Actions等）を検討
```

#### 2. 権限エラー
```sql
-- 解決策: サービスロール権限の確認と追加
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA cron TO service_role;
```

#### 3. メモリ不足エラー
```sql
-- 解決策: バッチサイズの調整
-- 集計関数内でLIMIT/OFFSETを使用した分割処理を実装
```

#### 4. タイムゾーンの問題
```sql
-- 解決策: UTCでの実行時間確認
SELECT NOW() AT TIME ZONE 'UTC' as utc_time,
       NOW() AT TIME ZONE 'Asia/Tokyo' as jst_time;
```

---

## 📊 移行後の運用

### 日次監視項目
- Cronジョブの実行状況確認
- 集計データの整合性チェック
- ダッシュボードの表示確認
- エラーログの確認

### 週次保守項目
- 古いデータのクリーンアップ確認
- パフォーマンスメトリクスの確認
- データベース容量の確認

### 月次最適化項目
- インデックス使用状況の確認
- クエリパフォーマンスの分析
- 集計ロジックの見直し

---

## 🎯 期待される効果

### コスト削減
- Convex利用料金: 月額$XXX → $0
- 運用工数削減: データベース管理の一元化

### パフォーマンス向上
- 集計処理速度: 最大50%高速化
- ダッシュボード表示: レスポンス時間短縮
- リアルタイム分析: Supabaseリアルタイム機能活用可能

### 運用性向上
- 監視・ログ: 単一プラットフォームで管理
- バックアップ・復旧: Supabaseの標準機能活用
- スケーリング: PostgreSQLの標準的な手法適用

この移行により、Bockerのトラッキング機能はより効率的で保守性の高いシステムとなります。