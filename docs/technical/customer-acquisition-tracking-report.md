# Bocker 顧客獲得トラッキング機能 詳細技術報告書

## 📋 執行サマリー

本報告書は、Bockerサロン管理システムに実装された顧客獲得トラッキング機能の包括的な技術分析結果をまとめたものです。実装は高度に構造化されており、エンタープライズグレードのマーケティング分析基盤として機能する設計となっています。

**実装状況**: ✅ 基本機能完成 / ⚠️ 一部設定・最適化が必要

---

## 🏗️ アーキテクチャ概要

### システム構成
```
Frontend (Next.js 15) → API Routes → Supabase (PostgreSQL)
     ↓                      ↓              ↓
Analytics Hook       Tracking API    Raw Event Store
     ↓                      ↓              ↓
Auto Tracking        Rate Limiting   Daily Aggregation
```

### 技術スタック
- **フロントエンド**: Next.js 15, React 19, TypeScript
- **バックエンド**: Next.js API Routes, Convex
- **データベース**: Supabase PostgreSQL
- **認証**: Clerk (マルチテナント)
- **セキュリティ**: CORS, Rate Limiting, PII Hashing

---

## 📊 データベース設計

### 1. tracking_event テーブル
```sql
CREATE TABLE tracking_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,           -- マルチテナント分離
    org_id TEXT NOT NULL,              -- 組織分離
    session_id TEXT NOT NULL,          -- セッション追跡
    event_timestamp_unix BIGINT NOT NULL,
    event_type TEXT NOT NULL,          -- 'page_view', 'conversion', 'click'
    event_source TEXT NOT NULL,        -- 'web', 'mobile', etc.
    page_url TEXT,
    page_title TEXT,
    target_element TEXT,               -- クリック対象やコンバージョンタイプ
    utm_source TEXT,                   -- UTM追跡パラメータ
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    custom_data_json JSONB,            -- 拡張可能なメタデータ
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_archive BOOLEAN DEFAULT false,
    sort_key TEXT
);
```

### 2. tracking_summaries テーブル
```sql
CREATE TABLE tracking_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    summary_date DATE NOT NULL,        -- 集計日
    dimension_type TEXT NOT NULL,      -- 'utm_source', 'utm_medium', 'utm_campaign', 'page_url'
    dimension_value TEXT NOT NULL,     -- 実際の値
    total_count INTEGER NOT NULL,      -- 総イベント数
    unique_user_count INTEGER,         -- ユニークユーザー数
    conversion_count INTEGER,          -- コンバージョン数
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_archive BOOLEAN DEFAULT false
);
```

### 最適化されたインデックス設計
```sql
-- パフォーマンス最適化インデックス
CREATE INDEX idx_tracking_event_tenant_org ON tracking_event (tenant_id, org_id);
CREATE INDEX idx_tracking_event_timestamp ON tracking_event (event_timestamp_unix);
CREATE INDEX idx_tracking_event_session ON tracking_event (session_id);
CREATE INDEX idx_tracking_event_type ON tracking_event (event_type);
CREATE INDEX idx_tracking_event_utm_source ON tracking_event (utm_source) WHERE utm_source IS NOT NULL;

CREATE INDEX idx_tracking_summaries_tenant_org_date ON tracking_summaries (tenant_id, org_id, summary_date);
CREATE INDEX idx_tracking_summaries_dimension ON tracking_summaries (dimension_type, dimension_value);
```

---

## 🔧 実装詳細

### 1. フロントエンド実装 (`hooks/useAnalytics.ts`)

#### セッション管理
```typescript
const getSessionId = (): string => {
  let sessionId = Cookies.get(SESSION_COOKIE_NAME)
  if (!sessionId) {
    sessionId = uuidv4()
  }
  Cookies.set(SESSION_COOKIE_NAME, sessionId, { expires: 1 / 48 }) // 30分
  return sessionId
}
```

#### PII保護機能
```typescript
// メール情報の安全なハッシュ化
if (processedCustomData?.email && typeof processedCustomData.email === 'string') {
  const salt = process.env.NEXT_PUBLIC_PII_SALT
  if (!salt) {
    console.warn('NEXT_PUBLIC_PII_SALT is not defined. Email will not be tracked.')
    delete processedCustomData.email
  } else {
    const email = processedCustomData.email
    delete processedCustomData.email
    processedCustomData.email_hash = await sha256(`${salt}:${email}`)
  }
}
```

#### UTM追跡
```typescript
const storeUtmParams = (searchParams: URLSearchParams) => {
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
  const newUtmParams: Record<string, string> = {}
  
  utmKeys.forEach((key) => {
    if (searchParams.has(key)) {
      const value = searchParams.get(key)
      if (value) {
        newUtmParams[key] = value
      }
    }
  })

  if (Object.keys(newUtmParams).length > 0) {
    sessionStorage.setItem(UTM_PARAMS_KEY, JSON.stringify(newUtmParams))
  }
}
```

### 2. API実装 (`app/api/tracking/event/route.ts`)

#### バリデーション・セキュリティ
```typescript
const eventSchema = z.object({
  session_id: z.string(),
  event_type: z.enum(['page_view', 'conversion', 'click']),
  page_url: z.string(),
  page_title: z.string().optional(),
  target_element: z.string().optional(),
  conversion_type: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
  custom_data_json: z.any().optional(),
})
```

#### マルチテナント対応
```typescript
const { tenantId, orgId } = await getTenantAndOrg()
if (!tenantId || !orgId) {
  return NextResponse.json(
    { error: 'Tenant or Organization ID is missing.' },
    { status: 400 }
  )
}
```

### 3. セキュリティ実装 (`middleware.ts`)

#### レート制限
```typescript
// Rate limit tracking API
if (pathname.startsWith('/api/tracking/event')) {
  const ip = req.ip ?? '127.0.0.1'
  const now = Date.now()
  const requests = ipRequestCounts.get(ip) ?? []
  const requestsInWindow = requests.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  )

  if (requestsInWindow.length >= RATE_LIMIT_MAX_REQUESTS) {
    return new NextResponse('Too Many Requests', { status: 429 })
  }
}
```

### 4. 日次集計バッチ (`convex/tracking/action.ts`)

#### 効率的なデータ集計
```typescript
// メモリ内集計による高速処理
for (const event of events) {
  for (const dimension of dimensions) {
    const value = event[dimension]
    if (value) {
      const key = `${event.tenant_id}:${event.org_id}:${dimension}:${value}`
      if (!summaries.has(key)) {
        summaries.set(key, {
          tenant_id: event.tenant_id,
          org_id: event.org_id,
          summary_date: summaryDate,
          dimension_type: dimension,
          dimension_value: value,
          total_count: 0,
          unique_sessions: new Set(),
          conversion_count: 0,
        })
      }
      // 集計処理...
    }
  }
}
```

---

## 🛡️ セキュリティ分析

### ✅ 実装済みセキュリティ機能

1. **PII保護**
   - メールアドレスのSHA256ハッシュ化
   - ソルト付きハッシュによる逆算防止

2. **マルチテナント分離**
   - 全クエリでtenant_id/org_id必須
   - データ漏洩防止

3. **レート制限**
   - IP別20リクエスト/分制限
   - DDoS攻撃防止

4. **認証・認可**
   - Clerk認証必須
   - 組織レベル権限制御

### ⚠️ セキュリティ推奨事項

1. **HTTPS強制**
   ```typescript
   // 本番環境でHTTPS必須設定を追加
   if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
     return NextResponse.redirect(`https://${req.headers.host}${req.url}`)
   }
   ```

2. **CSPヘッダー追加**
   ```typescript
   response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'")
   ```

---

## 📈 パフォーマンス分析

### ✅ 最適化済み要素

1. **データベースインデックス**
   - 複合インデックスによる高速クエリ
   - 部分インデックス（WHERE句付き）

2. **バッチ処理**
   - 日次集計による読み取り最適化
   - メモリ内集計による高速処理

3. **非同期処理**
   - トラッキングAPIの非ブロッキング実装

### ⚠️ パフォーマンス推奨事項

1. **接続プーリング設定**
   ```typescript
   // supabase接続設定
   const supabase = createClient(url, key, {
     db: { schema: 'public' },
     global: { headers: { 'x-my-custom-header': 'my-app-name' } },
     pooler: { enabled: true, poolMode: 'transaction' }
   })
   ```

2. **データパーティショニング**
   ```sql
   -- 大規模運用時の月次パーティション
   CREATE TABLE tracking_event_y2024m01 PARTITION OF tracking_event
   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
   ```

---

## 🔍 必要な設定・手順

### 1. 環境変数設定
```bash
# .env.local
NEXT_PUBLIC_PII_SALT=your-secure-salt-here-minimum-32-chars
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Supabaseセットアップ

#### マイグレーション実行
```bash
# 既存のマイグレーションが適用済みかを確認
supabase db push

# 新規プロジェクトの場合
supabase migration up
```

#### RLS (Row Level Security) 設定
```sql
-- tracking_eventテーブルのRLS
CREATE POLICY "Users can only access their tenant data" 
ON tracking_event FOR ALL 
USING (tenant_id = current_setting('app.current_tenant'));

-- tracking_summariesテーブルのRLS
CREATE POLICY "Users can only access their tenant summaries" 
ON tracking_summaries FOR ALL 
USING (tenant_id = current_setting('app.current_tenant'));
```

### 3. Convex cronジョブ有効化
```bash
# 本番環境でcronを有効化
npx convex deploy --cmd-env production
```

### 4. CORS設定 (`next.config.js`)
```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/api/tracking/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGINS || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}
```

---

## 🚨 抜け漏れ・問題点

### 🔴 Critical Issues

1. **データリテンション設定なし**
   ```sql
   -- 推奨: 自動クリーンアップ設定
   CREATE OR REPLACE FUNCTION cleanup_old_tracking_events()
   RETURNS void AS $$
   BEGIN
     DELETE FROM tracking_event 
     WHERE created_at < NOW() - INTERVAL '2 years';
   END;
   $$ LANGUAGE plpgsql;
   ```

2. **エラーハンドリング不完全**
   ```typescript
   // API障害時のフォールバック機能が必要
   const sendTrackingEvent = async (eventData: object) => {
     try {
       await fetch('/api/tracking/event', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(eventData),
       })
     } catch (error) {
       // localStorage backup 機能を追加推奨
       console.error('Tracking API request failed:', error)
     }
   }
   ```

### 🟡 Medium Priority Issues

1. **モニタリング不足**
   - API応答時間監視
   - エラー率監視
   - データ品質監視

2. **テスト不足**
   - E2Eテストなし
   - パフォーマンステストなし

### 🟢 Low Priority Issues

1. **ドキュメント不足**
   - 運用手順書
   - トラブルシューティングガイド

---

## 🎯 外部サービス連携

### Google Analytics 4 連携
```typescript
// GA4イベント送信
const sendToGA4 = (eventData: any) => {
  if (typeof gtag !== 'undefined') {
    gtag('event', eventData.event_type, {
      custom_parameter_1: eventData.utm_source,
      custom_parameter_2: eventData.utm_campaign,
    })
  }
}
```

### Meta Pixel 連携
```typescript
// Facebook Pixel連携
const sendToFacebookPixel = (conversionData: any) => {
  if (typeof fbq !== 'undefined') {
    fbq('track', 'Purchase', {
      value: conversionData.value,
      currency: 'JPY',
      content_ids: conversionData.reservation_id,
    })
  }
}
```

---

## 📊 推奨監視メトリクス

### 1. ビジネスメトリクス
```sql
-- 日次コンバージョン率
SELECT 
  summary_date,
  SUM(total_count) as total_sessions,
  SUM(conversion_count) as total_conversions,
  (SUM(conversion_count)::float / SUM(total_count) * 100) as conversion_rate
FROM tracking_summaries 
WHERE dimension_type = 'utm_source'
GROUP BY summary_date
ORDER BY summary_date DESC;
```

### 2. 技術メトリクス
- API応答時間 (目標: <200ms)
- エラー率 (目標: <0.1%)
- データ整合性チェック

---

## 🎁 総合評価・推奨事項

### ✅ 評価ポイント
1. **アーキテクチャ**: エンタープライズレベルの設計
2. **セキュリティ**: 適切なPII保護とマルチテナント分離
3. **スケーラビリティ**: 日次集計による高速分析
4. **開発体験**: TypeScriptによる型安全性

### 🚀 即座に実装すべき項目
1. 環境変数`NEXT_PUBLIC_PII_SALT`の設定
2. RLSポリシーの有効化
3. データリテンション設定
4. 基本的な監視ダッシュボード

### 📈 中長期改善項目
1. リアルタイム分析機能
2. A/Bテスト機能
3. 予測分析機能
4. より詳細なユーザージャーニー追跡

実装されたトラッキング機能は、美容サロン業界向けの包括的なマーケティング分析基盤として十分に機能する設計となっており、適切な設定と監視体制の構築により、企業レベルでの運用が可能です。

---

## 📝 ファイル構成

### 主要ファイル一覧
```
├── app/api/tracking/event/route.ts          # トラッキングAPI
├── hooks/useAnalytics.ts                    # フロントエンド分析フック
├── app/[locale]/(dashboard)/dashboard/analytics/acquisition/page.tsx  # 分析ダッシュボード
├── services/supabase/repositories/tracking/
│   ├── TrackingEventRepository.ts           # イベントデータアクセス
│   └── TrackingSummariesRepository.ts       # 集計データアクセス
├── convex/tracking/action.ts                # 日次集計バッチ
├── convex/crons.ts                          # Cronジョブ設定
├── middleware.ts                            # レート制限・CORS
├── lib/crypto.ts                            # PIIハッシュ化
└── app/[locale]/ClientLayout.tsx            # 自動トラッキング統合
```

### データフロー
```
1. ユーザーアクション (ページビュー・コンバージョン)
2. useAnalytics フック → セッション・UTM管理
3. /api/tracking/event → バリデーション・保存
4. tracking_event テーブル → 生データ蓄積
5. 日次バッチ処理 → tracking_summaries 集計
6. 分析ダッシュボード → 可視化・レポート
```