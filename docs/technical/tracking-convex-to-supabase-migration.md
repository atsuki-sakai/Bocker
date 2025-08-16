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

## 📊 データフローと集計方法の詳細

### 1. トラッキングデータの全体フロー

```mermaid
graph TD
    A[ユーザーアクション] --> B[useAnalytics Hook]
    B --> C[Session & UTM管理]
    C --> D[/api/tracking/event]
    D --> E[Validation & Auth]
    E --> F[tracking_event テーブル]
    
    F --> G[日次バッチ処理<br/>pg_cron 17:15 UTC]
    G --> H[aggregate_daily_tracking_data()]
    H --> I[tracking_summaries テーブル]
    
    I --> J[分析ダッシュボード]
    I --> K[レポート・可視化]
    
    F --> L[データクリーンアップ<br/>pg_cron 週次]
    L --> M[cleanup_old_tracking_events()]
```

### 2. テーブル構造とフィールド詳細

#### 2.1 tracking_event テーブル（生データ）
```sql
CREATE TABLE tracking_event (
    -- 基本情報
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,           -- マルチテナント分離ID
    org_id TEXT NOT NULL,              -- 組織ID（Clerk Organization）
    
    -- セッション追跡
    session_id TEXT NOT NULL,          -- クライアント生成UUID（30分有効）
    event_timestamp_unix BIGINT NOT NULL, -- イベント発生時刻（Unix timestamp）
    
    -- イベント分類
    event_type TEXT NOT NULL,          -- 'page_view', 'conversion', 'click'
    event_source TEXT NOT NULL,        -- 'web', 'mobile', 'api'
    
    -- ページ情報
    page_url TEXT,                     -- 発生ページのURL
    page_title TEXT,                   -- ページタイトル
    target_element TEXT,               -- クリック対象要素 or コンバージョンタイプ
    
    -- UTMパラメータ（マーケティング追跡）
    utm_source TEXT,                   -- 参照元（google, facebook, direct等）
    utm_medium TEXT,                   -- メディア（cpc, email, social等）
    utm_campaign TEXT,                 -- キャンペーン名
    utm_term TEXT,                     -- 検索キーワード
    utm_content TEXT,                  -- 広告コンテンツ識別子
    
    -- 拡張データ
    custom_data_json JSONB,            -- カスタムイベントデータ（予約ID、金額等）
    
    -- システム管理
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_archive BOOLEAN DEFAULT false,  -- ソフト削除フラグ
    sort_key TEXT                      -- 並び順キー（将来用）
);
```

#### 2.2 tracking_summaries テーブル（集計データ）
```sql
CREATE TABLE tracking_summaries (
    -- 基本情報
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,           -- マルチテナント分離ID
    org_id TEXT NOT NULL,              -- 組織ID
    
    -- 集計軸
    summary_date DATE NOT NULL,        -- 集計対象日（YYYY-MM-DD）
    dimension_type TEXT NOT NULL,      -- 集計軸の種類
    dimension_value TEXT NOT NULL,     -- 集計軸の値
    
    -- 集計メトリクス
    total_count INTEGER NOT NULL,      -- 総イベント数
    unique_user_count INTEGER,         -- ユニークセッション数
    conversion_count INTEGER,          -- コンバージョン数
    
    -- システム管理
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_archive BOOLEAN DEFAULT false
);
```

#### 2.3 dimension_type の種類と説明
| dimension_type | dimension_value例 | 説明 |
|----------------|------------------|------|
| `utm_source` | `google`, `facebook`, `(direct)` | 流入元サイト・サービス |
| `utm_medium` | `cpc`, `email`, `social`, `(none)` | 流入メディアタイプ |
| `utm_campaign` | `summer2024`, `new_user`, `(not set)` | マーケティングキャンペーン |
| `page_url` | `/reservation/123`, `/dashboard` | アクセスページURL |

### 3. 集計処理の詳細ロジック

#### 3.1 イベントカウントのタイミングと基準

**🕒 データ収集タイミング:**
```typescript
// 1. ページビュー: ページロード時に自動記録
useEffect(() => {
  trackPageView() // ClientLayout.tsx内のAnalyticsTrackerで実行
}, [trackPageView])

// 2. コンバージョン: 明示的なアクション完了時
const handleReservationComplete = async (reservationData) => {
  await trackConversion('reservation_completed', {
    reservation_id: reservationData.id,
    amount: reservationData.total_amount,
    menu_items: reservationData.menus
  })
}

// 3. クリック: 重要な要素クリック時（手動実装）
<Button onClick={() => trackClick('cta_button', '/reservation')}>
  予約する
</Button>
```

**📊 集計実行タイミング:**
```bash
# 日次集計: 毎日17:15 UTC (JST 02:15) 実行
# 対象: 前日00:00:00 〜 23:59:59 のイベント
# 遅延理由: タイムゾーン差異や遅延送信への対応

例: 2025-08-16 02:15 JST に実行
├── 対象データ: 2025-08-15 00:00:00 〜 23:59:59 JST
├── Unix範囲: 1723737600 〜 1723823999
└── 処理内容: 4つのdimension_typeで並列集計
```

#### 3.2 日次集計バッチの処理フロー

**Phase 1: 準備・検証**
```sql
-- 1. 対象期間の決定（前日24時間）
target_date := CURRENT_DATE - INTERVAL '1 day';
target_date_start := EXTRACT(EPOCH FROM target_date::timestamp);
target_date_end := EXTRACT(EPOCH FROM (target_date + INTERVAL '1 day')::timestamp) - 1;

-- 2. 対象イベント数をカウント（処理量予測）
SELECT COUNT(*) INTO events_count
FROM tracking_event 
WHERE event_timestamp_unix >= target_date_start 
  AND event_timestamp_unix <= target_date_end
  AND is_archive = false;

-- 3. 既存集計データの削除（再実行対応）
DELETE FROM tracking_summaries WHERE summary_date = target_date;
```

**Phase 2: 4軸並列集計**
```sql
-- 🎯 UTM Source別集計
INSERT INTO tracking_summaries (...)
SELECT 
    tenant_id,
    org_id,
    target_date,
    'utm_source' as dimension_type,
    COALESCE(utm_source, '(direct)') as dimension_value,
    COUNT(*) as total_count,                                    -- 📊 総イベント数
    COUNT(DISTINCT session_id) as unique_user_count,            -- 👥 ユニークセッション数  
    COUNT(*) FILTER (WHERE event_type = 'conversion') as conversion_count -- 🎯 コンバージョン数
FROM tracking_event 
WHERE event_timestamp_unix BETWEEN target_date_start AND target_date_end
  AND is_archive = false
  AND tenant_id IS NOT NULL AND org_id IS NOT NULL
GROUP BY tenant_id, org_id, COALESCE(utm_source, '(direct)');

-- 🎯 UTM Medium別集計
INSERT INTO tracking_summaries (...)
SELECT 
    tenant_id, org_id, target_date,
    'utm_medium' as dimension_type,
    COALESCE(utm_medium, '(none)') as dimension_value,
    COUNT(*) as total_count,
    COUNT(DISTINCT session_id) as unique_user_count,
    COUNT(*) FILTER (WHERE event_type = 'conversion') as conversion_count
FROM tracking_event 
WHERE [同じ条件]
GROUP BY tenant_id, org_id, COALESCE(utm_medium, '(none)');

-- 🎯 UTM Campaign別集計  
INSERT INTO tracking_summaries (...)
SELECT 
    tenant_id, org_id, target_date,
    'utm_campaign' as dimension_type,
    COALESCE(utm_campaign, '(not set)') as dimension_value,
    COUNT(*) as total_count,
    COUNT(DISTINCT session_id) as unique_user_count,
    COUNT(*) FILTER (WHERE event_type = 'conversion') as conversion_count
FROM tracking_event 
WHERE [同じ条件]
GROUP BY tenant_id, org_id, COALESCE(utm_campaign, '(not set)');

-- 🎯 Page URL別集計
INSERT INTO tracking_summaries (...)
SELECT 
    tenant_id, org_id, target_date,
    'page_url' as dimension_type,
    page_url as dimension_value,
    COUNT(*) as total_count,
    COUNT(DISTINCT session_id) as unique_user_count,
    COUNT(*) FILTER (WHERE event_type = 'conversion') as conversion_count
FROM tracking_event 
WHERE [同じ条件] AND page_url IS NOT NULL
GROUP BY tenant_id, org_id, page_url;
```

#### 3.3 集計メトリクスの詳細定義

| メトリクス | カウント基準 | 説明・用途 |
|------------|-------------|------------|
| **total_count** | `COUNT(*)` | その軸での総イベント数<br/>→ 流入量・人気度の指標 |
| **unique_user_count** | `COUNT(DISTINCT session_id)` | ユニークセッション数<br/>→ 実際の訪問者数の近似値 |
| **conversion_count** | `COUNT(*) FILTER (WHERE event_type = 'conversion')` | コンバージョン数<br/>→ 成果・効果の指標 |

**💡 実際の集計例:**
```sql
-- 2025-08-15の例（Google広告経由）
dimension_type: 'utm_source'
dimension_value: 'google' 
total_count: 1,250          -- Googleからの総イベント数
unique_user_count: 89       -- Google経由のユニークセッション数  
conversion_count: 12        -- Google経由のコンバージョン数
→ コンバージョン率: 12/1,250 = 0.96%
```

#### 3.4 マルチテナント対応の集計処理

```sql
-- テナント・組織別に完全分離した集計
SELECT 
    tenant_id,           -- サロンチェーン識別子
    org_id,              -- 個別店舗識別子
    dimension_type,      -- 集計軸
    dimension_value,     -- 軸の値
    SUM(total_count),    -- テナント内合計
    SUM(unique_user_count),
    SUM(conversion_count)
FROM tracking_summaries 
WHERE summary_date = '2025-08-15'
  AND tenant_id = 'salon_chain_a' 
GROUP BY tenant_id, org_id, dimension_type, dimension_value
ORDER BY SUM(total_count) DESC;

-- 結果例:
-- tenant_id: 'salon_chain_a'
-- org_id: 'store_shibuya'  
-- dimension_type: 'utm_source'
-- dimension_value: 'instagram'
-- total_count: 450 (Instagram経由で450イベント)
```

#### 3.5 リアルタイム性とバッチ処理の使い分け

**⚡ リアルタイム用途（直接クエリ）:**
```sql
-- 当日の最新状況を確認（ダッシュボード）
SELECT 
    COALESCE(utm_source, '(direct)') as source,
    COUNT(*) as today_events,
    COUNT(DISTINCT session_id) as today_sessions
FROM tracking_event 
WHERE DATE(to_timestamp(event_timestamp_unix)) = CURRENT_DATE
  AND tenant_id = $1 AND org_id = $2
GROUP BY COALESCE(utm_source, '(direct)')
ORDER BY COUNT(*) DESC;
```

**📊 分析用途（集計済みデータ）:**
```sql
-- 過去30日のトレンド分析（レポート）
SELECT 
    summary_date,
    dimension_value as source,
    total_count,
    unique_user_count,
    conversion_count,
    (conversion_count::float / total_count * 100) as conversion_rate
FROM tracking_summaries
WHERE summary_date >= CURRENT_DATE - INTERVAL '30 days'
  AND dimension_type = 'utm_source'
  AND tenant_id = $1 AND org_id = $2
ORDER BY summary_date DESC, total_count DESC;
```

#### 3.2 集計における NULL値の処理
| フィールド | NULL時の変換 | 理由 |
|-----------|--------------|------|
| `utm_source` | `'(direct)'` | 直接アクセスを明示 |
| `utm_medium` | `'(none)'` | メディア未指定を明示 |
| `utm_campaign` | `'(not set)'` | キャンペーン未設定を明示 |
| `page_url` | スキップ | URLが必須のため除外 |

#### 3.3 パフォーマンス最適化手法

**インデックス活用:**
```sql
-- 時系列範囲検索の最適化
CREATE INDEX idx_tracking_event_timestamp ON tracking_event (event_timestamp_unix);

-- マルチテナント検索の最適化
CREATE INDEX idx_tracking_event_tenant_org ON tracking_event (tenant_id, org_id);

-- UTM検索の最適化（部分インデックス）
CREATE INDEX idx_tracking_event_utm_source ON tracking_event (utm_source) 
WHERE utm_source IS NOT NULL;
```

**メモリ効率化:**
- GROUP BY処理によるインメモリ集計
- DISTINCT処理の最適化
- 条件フィルターの前置

### 4. データ保持とクリーンアップ戦略

#### 4.1 データライフサイクル
```
Raw Events (tracking_event):
├── アクティブ期間: 90日（高速アクセス）
├── アーカイブ期間: 90日〜2年（参照用）
└── 削除: 2年経過後（週次バッチで自動削除）

Summary Data (tracking_summaries):
├── 永続保存（集計済みのため容量小）
└── 必要に応じて手動アーカイブ
```

#### 4.2 自動クリーンアップ設定
```sql
-- 週次実行: 日曜18:00 UTC（月曜3:00 JST）
SELECT cron.schedule(
    'weekly-tracking-cleanup',
    '0 18 * * 0',
    'SELECT cleanup_old_tracking_events(730);' -- 2年保持
);
```

### 5. 監視とアラート設定

#### 5.1 ヘルスチェックビュー
```sql
CREATE VIEW tracking_aggregation_status AS
SELECT 
    summary_date,
    COUNT(*) as summary_count,                    -- 集計レコード数
    COUNT(DISTINCT tenant_id) as tenant_count,    -- アクティブテナント数
    SUM(total_count) as total_events,             -- 総イベント数
    SUM(conversion_count) as total_conversions,   -- 総コンバージョン数
    (SUM(conversion_count)::float / SUM(total_count) * 100) as conversion_rate, -- CV率
    MAX(created_at) as last_aggregated_at         -- 最終集計時刻
FROM tracking_summaries
GROUP BY summary_date
ORDER BY summary_date DESC;
```

#### 5.2 アラート条件
- 集計データが24時間以上作成されていない
- 前日比でイベント数が50%以上減少
- エラー率が1%を超過
- 集計処理時間が5分を超過

### 6. バックフィルとデータ修復

#### 6.1 過去データの一括集計
```sql
-- 特定期間の再集計
SELECT * FROM backfill_tracking_summaries(
    '2025-08-01'::DATE,  -- 開始日
    '2025-08-15'::DATE   -- 終了日
);
```

#### 6.2 データ整合性チェック
```sql
-- 生データと集計データの突合
WITH consistency_check AS (
    SELECT 
        DATE(to_timestamp(event_timestamp_unix)) as event_date,
        COUNT(*) as raw_events,
        (SELECT SUM(total_count) FROM tracking_summaries 
         WHERE summary_date = DATE(to_timestamp(event_timestamp_unix))) as summary_events
    FROM tracking_event 
    WHERE event_timestamp_unix >= EXTRACT(EPOCH FROM CURRENT_DATE - INTERVAL '7 days')
    GROUP BY DATE(to_timestamp(event_timestamp_unix))
)
SELECT 
    event_date,
    raw_events,
    summary_events,
    (raw_events = summary_events) as is_consistent
FROM consistency_check
ORDER BY event_date DESC;
```

---

## 📈 パフォーマンス指標と期待値

### 集計処理時間
- **小規模テナント** (1万イベント/日): ~30秒
- **中規模テナント** (10万イベント/日): ~2分  
- **大規模テナント** (100万イベント/日): ~10分

### ストレージ使用量
- **生データ**: 約500KB/万イベント
- **集計データ**: 約50KB/万イベント（90%削減）

### 分析クエリ応答時間
- **ダッシュボード表示**: <500ms
- **月次レポート**: <2秒
- **年次分析**: <10秒

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