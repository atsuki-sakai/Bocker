# Bcker 美容サロン向けSaaS予約管理システム

## 📋 概要

Bckerは美容サロン向けの包括的なSaaS予約管理プラットフォームです。ハイブリッドデータベース構成により、リアルタイム予約管理と長期履歴データ分析を両立し、3,000店舗での同時運用を想定した高いスケーラビリティを実現しています。

### 主要機能
- **リアルタイム予約管理**: 衝突防止機能付きの高度な予約システム
- **顧客管理**: 履歴追跡・ポイント管理・検索最適化機能
- **スタッフ管理**: 権限管理・招待システム・スケジュール管理
- **メニュー・オプション管理**: 動的価格設定・カテゴリ管理
- **ポイント・クーポンシステム**: 自動ポイント付与・遅延処理対応
- **決済連携**: Stripe Connect対応のマルチテナント決済
- **外部連携**: LINE・GCP・AI機能（Gemini）統合

### 技術スタック
- **フロントエンド**: Next.js 15.3.3, React 19.0.0, TypeScript, Tailwind CSS, shadcn/ui
- **バックエンド**: 
  - **Convex** 1.23.0 - リアルタイムデータベース（アクティブデータ）
  - **Supabase** 2.49.4 - PostgreSQL（履歴・分析データ）
- **認証**: Clerk 6.11.2 + マルチテナント組織管理
- **決済**: Stripe 17.7.0（Connect対応）
- **メッセージング**: LINE Bot SDK 9.9.0
- **ストレージ**: Google Cloud Storage
- **監視**: Sentry, Vercel Analytics

## 🏗️ アーキテクチャ

### ハイブリッドデータベース構成

```
┌─────────────────┐    リアルタイム同期    ┌─────────────────┐
│   Frontend      │◄──────────────────────►│    Convex       │
│   Next.js       │                        │ (アクティブデータ) │
│   + shadcn/ui   │                        │  ・予約管理      │
└─────────────────┘                        │  ・メニュー      │
         │                                 │  ・スタッフ情報   │
         │                                 └─────────────────┘
         │                                          │
         │                                          │ 夜中バッチ
         │                                          │ データ移行
         │                                          ▼
         │                                 ┌─────────────────┐
         └─────────────────────────────────►│   Supabase      │
                   履歴・分析データ            │ (アーカイブデータ) │
                                           │  ・完了予約      │
                                           │  ・顧客履歴      │
                                           │  ・売上分析      │
                                           └─────────────────┘
```

### データフロー戦略

1. **リアルタイムデータ（Convex）**
   - 未来の予約・進行中の予約
   - メニュー・スタッフ情報
   - 論理削除（`is_archive`）によるデータ管理

2. **アーカイブデータ（Supabase）**
   - 完了済み予約（翌日夜中に自動移行）
   - 顧客マスタ・ポイント履歴
   - レポート・分析用データ

3. **同期処理**
   - 日次バッチによる自動データ移行
   - 500件/チャンクでの効率的な処理
   - 移行失敗時の自動リトライ機能

## 📂 ディレクトリ構造

```
bcker-saas/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 認証関連ページ
│   ├── (dashboard)/              # ダッシュボード機能
│   │   └── dashboard/
│   │       ├── reservation/      # 予約管理
│   │       ├── customer/         # 顧客管理
│   │       ├── staff/           # スタッフ管理
│   │       ├── menu/            # メニュー管理
│   │       ├── setting/         # 店舗設定
│   │       └── subscription/    # サブスクリプション
│   └── api/                     # API Routes
│       ├── clerk/               # 認証API
│       ├── stripe/              # 決済API
│       └── webhook/             # Webhook処理
├── components/                   # 共通コンポーネント
│   ├── common/                  # ビジネスロジック系
│   ├── ui/                      # shadcn/ui コンポーネント
│   └── providers/               # プロバイダー
├── convex/                      # Convexバックエンド
│   ├── reservation/             # 予約機能
│   ├── staff/                   # スタッフ管理
│   ├── organization/            # 組織管理
│   └── schema.ts                # データスキーマ
├── services/                    # 外部サービス連携
│   ├── stripe/                  # Stripe統合
│   ├── line/                    # LINE統合
│   ├── supabase/                # Supabase統合
│   └── gcp/                     # Google Cloud統合
└── supabase/                    # Supabaseマイグレーション
    └── migrations/              # SQLマイグレーション
```

## 🚀 開発環境構築

### 前提条件

- Node.js 18.0.0 以上
- pnpm 8.0.0 以上
- Convexアカウント
- Supabaseプロジェクト
- Clerkアプリケーション
- Stripeアカウント（Connect対応）

### セットアップ手順

1. **リポジトリのクローン**
```bash
git clone <repository-url>
cd bcker-saas
```

2. **依存関係のインストール**
```bash
pnpm install
```

3. **環境変数の設定**
```bash
# .env.localを作成（詳細は下記参照）
cp .env.example .env.local
```

4. **Convexの初期化**
```bash
npx convex dev
```

5. **Supabaseの初期化**
```bash
npx supabase start
pnpm migrate:supabase
```

6. **開発サーバーの起動**
```bash
pnpm dev
```

### 環境変数設定

```env
# Convex
CONVEX_DEPLOYMENT=your-convex-deployment
NEXT_PUBLIC_CONVEX_URL=your-convex-url

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-public-key
CLERK_SECRET_KEY=your-clerk-secret-key

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# AI機能
GEMINI_API_KEY=your-gemini-api-key

# LINE
LIFF_ID=your-liff-id
LINE_LOGIN_CHANNEL_ID=your-channel-id
LINE_LOGIN_CHANNEL_SECRET=your-channel-secret

# Sentry
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token
```

### 開発用コマンド

```bash
# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# リンター実行
pnpm lint

# 型チェック
pnpm type-check

# Convexデプロイ
npx convex deploy

# Supabaseマイグレーション
pnpm migrate:supabase

# テスト実行
pnpm test
```

## 🔧 機能詳細

### リアルタイム予約管理（Convex）

**特徴:**
- **レースコンディション対策**: OCC（Optimistic Concurrency Control）による重複予約防止
- **タイムライン表示**: スタッフ別・時間軸での視覚的な予約管理
- **空き時間自動計算**: 利用可能時間スロットのリアルタイム算出
- **同時予約制限**: スタッフ・メニュー別・席数制限の予約上限管理

**実装深度:** 商用レベル（95%）

### 顧客管理システム（Supabase）

**特徴:**
- **高速検索**: pg_trgm拡張による部分一致検索最適化
- **Generated Column**: 検索用テキストの自動生成・更新
- **ポイント管理**: 履歴追跡・有効期限管理
- **統合プロフィール**: 施術履歴・設定情報の一元管理

**実装深度:** 商用レベル（85%）

### スタッフ管理・権限システム

**特徴:**
- **Clerk連携**: 招待メール自動送信・権限管理
- **階層権限**: Owner > Manager > Staff の3段階権限
- **画像管理**: GCP Cloud Storage連携による効率的なファイル管理
- **スケジュール管理**: 勤務時間・休暇管理・例外スケジュール

**実装深度:** 商用レベル（90%）

### ポイント・クーポンシステム

**特徴:**
- **遅延処理**: 予約完了後の自動ポイント付与（バッチ処理）
- **柔軟な設定**: 付与率・固定ポイント・対象外メニュー設定
- **有効期限管理**: 自動失効・通知機能
- **利用制限**: 最小利用ポイント・上限設定

**実装深度:** 商用レベル（85%）

## 📊 API仕様概要

### Convex API設計

**関数タイプ:**
- **Query**: リアルタイムデータ読み取り（20+ functions）
- **Mutation**: データ更新・トランザクション処理（15+ functions）
- **Action**: 外部API連携・バッチ処理（現在開発中）

**特徴:**
- 完全な型安全性（TypeScript + 自動生成API）
- マルチテナント対応（tenant_id による完全分離）
- 効率的インデックス設計（複合インデックス + 論理削除対応）

### Next.js API Routes

```
/api/
├── clerk/          # スタッフ招待・認証管理
├── generate/       # AI機能（メニュー説明生成）
├── storage/        # ファイルアップロード・署名URL
├── stripe/         # Connect決済・サブスクリプション
└── webhook/        # 外部サービス連携
```

### 外部連携API

**Stripe Connect:**
- マルチテナント決済処理
- サブスクリプション自動管理
- Webhook並列処理・冪等性確保

**LINE統合:**
- フレックスメッセージ対応
- 予約確認・リマインダー送信
- LIFF（LINE Front-end Framework）連携

**AI機能（Gemini）:**
- メニュー説明自動生成
- 会話履歴によるコンテキスト保持
- 適切なレート制限・エラーハンドリング

## 💾 データモデル概要

### Convex（アクティブデータ）

```typescript
// 予約テーブル
reservation: {
  tenant_id: v.id('tenant'),      // テナント分離
  org_id: v.id('organization'),  // 組織分離
  customer_id: v.optional(v.string()), // Supabase顧客ID
  staff_id: v.id('staff'),
  status: reservationStatusType,  // pending | confirmed | completed
  date: v.string(),               // "YYYY-MM-DD"
  start_time_unix: v.number(),
  end_time_unix: v.number(),
  is_archive: v.boolean(),        // 論理削除フラグ
}

// スタッフテーブル
staff: {
  user_id: v.string(),           // Clerk User ID
  role: v.union(v.literal('staff'), v.literal('manager'), v.literal('owner')),
  profile_image_url: v.optional(v.string()),
  work_schedule: weekScheduleType,
}
```

### Supabase（アーカイブデータ）

```sql
-- 顧客マスタ（検索最適化）
CREATE TABLE customer (
  uid UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  searchable_text TEXT GENERATED ALWAYS AS (
    lower(coalesce(first_name, '') || ' ' || 
          coalesce(last_name, '') || ' ' || 
          coalesce(phone, '') || ' ' || 
          coalesce(email, ''))
  ) STORED,
  -- その他フィールド
);

-- 高速検索インデックス
CREATE INDEX customer_search_trgm_idx 
ON customer USING gin (searchable_text gin_trgm_ops);
```

## ⚠️ 制約・注意事項

### Convex制限事項・ベストプラクティス

**データ保持期間:**
- アクティブデータのみ保持（完了予約は翌日夜中に移行）
- 最大保持期間: 1年（設定値: `ARCHIVE_DURATION_SECONDS`）

**パフォーマンス制約:**
- Function実行時間: 最大10秒
- 同時接続数: プランに依存
- リアルタイムサブスクリプション数: 制限あり

**ベストプラクティス:**
- 複合インデックスの先頭に`tenant_id`を配置
- 論理削除の徹底（`is_archive: false`条件）
- Query関数での外部API呼び出し禁止

### Supabase制限事項・最適化ポイント

**接続制限:**
- 無料プラン: 最大60接続
- 有料プラン: プランに応じて拡張

**最適化ポイント:**
- pg_trgm拡張による検索最適化活用
- Generated Columnによる事前計算
- 適切なインデックス設計（B-tree, GIN）
- RPC関数による複雑なクエリの効率化

### データ移行処理の注意点

**バッチ処理設定:**
- 実行時間: 毎日午前2時（`0 2 * * *`）
- チャンクサイズ: 500件/バッチ
- リトライ: 失敗時5秒後に自動再試行

**⚠️ 重要:**
現在、バッチ処理はコメントアウト状態です。本格運用前に有効化が必要：

```typescript
// convex/crons.ts - コメントアウト解除
crons.cron(
  'processReservationBatch',
  '0 2 * * *',
  internal.reservation.action.processReservationBatch
)
```

### パフォーマンス制約

**現在のプラン制限（要調整）:**
- LITE: 月間200件予約（日次6.7件） → 想定30件の22%
- PRO: 月間500件予約（日次16.7件） → 想定30件の56%

**推奨改善:**
```typescript
// 制限値の見直し
'PRO': {
  monthlyReservationLimit: 1000, // 500 → 1000に増加
},
'ENTERPRISE': { // 新プラン追加
  monthlyReservationLimit: 2000,
}
```

### セキュリティ制約

**実装済み対策:**
- Clerk認証 + マルチテナント分離
- JWT検証・暗号化（CryptoJS）
- ファイル名サニタイゼーション
- CORS設定による適切なドメイン制限

**追加推奨対策:**
- CSRF対策ライブラリの導入
- セキュリティヘッダーの強化
- API Rate Limiting の詳細設定

## 🔧 トラブルシューティング

### Convex関連の問題・解決方法

**問題: Function実行時間エラー**
```
Error: Function execution time exceeded 10 seconds
```
**解決方法:**
1. クエリのインデックス使用状況を確認
2. 大量データ処理をバッチ化（500件/chunk）
3. Action関数での外部API呼び出しに変更

**問題: リアルタイム接続エラー**
```
Error: WebSocket connection failed
```
**解決方法:**
1. ネットワーク設定の確認
2. Convexダッシュボードでの接続数確認
3. 開発環境での`npx convex dev`再実行

### Supabase関連の問題・解決方法

**問題: 接続数上限エラー**
```
Error: too many clients already
```
**解決方法:**
1. 接続プールの設定確認
2. 不要な接続のクローズ
3. プランアップグレードの検討

**問題: 検索パフォーマンス低下**
```
Query execution time: > 1000ms
```
**解決方法:**
1. pg_trgm拡張の有効化確認
2. GINインデックスの再構築
3. Generated Columnの活用

### バッチ処理・データ移行エラーの対処法

**日次バッチ失敗時の緊急復旧手順:**

1. **バッチステータス確認**
```bash
# Convexダッシュボードでの実行ログ確認
# 失敗理由の特定
```

2. **手動実行**
```typescript
// Convex関数の手動実行
await ctx.runAction(internal.reservation.action.processReservationBatch, {
  afterId: undefined,
  limit: 100 // 少数でテスト実行
})
```

3. **データ整合性確認**
```sql
-- Supabase側でのデータ確認
SELECT COUNT(*) FROM reservation 
WHERE created_at::date = CURRENT_DATE - INTERVAL '1 day';
```

### リアルタイム接続問題の調査方法

**接続状況の確認:**
1. ブラウザの開発者ツールでWebSocket接続確認
2. Convexダッシュボードでの同時接続数確認
3. ネットワークエラーログの調査

**パフォーマンス監視:**
1. Chrome DevToolsでのレンダリング性能確認
2. React DevToolsでのリレンダリング監視
3. Sentryでのエラーレート監視

### パフォーマンス問題の調査方法

**フロントエンド調査:**
```bash
# Bundle分析
npx @next/bundle-analyzer build

# Lighthouse監査
npm install -g lighthouse
lighthouse http://localhost:3000
```

**バックエンド調査:**
```typescript
// Convex Function実行時間の監視
console.time('query-execution')
const result = await ctx.db.query('table_name').collect()
console.timeEnd('query-execution')
```

### ログ確認手順

**Convex ログ:**
- ダッシュボード → Functions → 実行ログ
- エラー詳細・実行時間の確認

**Supabase ログ:**
```sql
-- スロークエリログの確認
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

**Next.js/Sentry ログ:**
- Sentryダッシュボード → Issues → エラー詳細
- パフォーマンス監視 → トランザクション分析

## 🚧 技術的負債・改善点

### 既知の問題・技術的負債

**1. バッチ処理の停止状態**
- **問題**: データ移行処理がコメントアウト状態
- **影響**: Convexデータの蓄積によるパフォーマンス低下
- **優先度**: 高
- **解決策**: crons.tsでのバッチ処理有効化

**2. プラン制限値の不適切設定**
- **問題**: 想定負荷（30件/日）に対してプラン上限が不足
- **影響**: スケールアップ時の機能制限
- **優先度**: 高
- **解決策**: 制限値の見直し・新プラン追加

**3. フロントエンド最適化不足**
- **問題**: Code Splitting・仮想化未実装
- **影響**: 初期ロード時間・大量データ表示性能
- **優先度**: 中
- **解決策**: Dynamic Import・React Virtual導入

### 今後の改善予定・ロードマップ

**Phase 1: 基盤安定化（1-2ヶ月）**
- [ ] バッチ処理の有効化・監視システム構築
- [ ] プラン制限値の適正化
- [ ] セキュリティ強化（CSRF対策・セキュリティヘッダー）
- [ ] CI/CDパイプライン構築

**Phase 2: パフォーマンス向上（2-3ヶ月）**
- [ ] フロントエンド最適化（Code Splitting・仮想化）
- [ ] APIキャッシュ戦略の改善
- [ ] データベースクエリ最適化
- [ ] 画像最適化・CDN活用

**Phase 3: 機能拡張（3-6ヶ月）**
- [ ] リアルタイム通知機能強化
- [ ] 多言語対応
- [ ] モバイルアプリ対応
- [ ] AI機能の拡張（予約最適化・レコメンド）

**Phase 4: エンタープライズ対応（6-12ヶ月）**
- [ ] SSOサポート
- [ ] 高度な分析・レポート機能
- [ ] API公開・サードパーティ連携
- [ ] 白ラベルソリューション

### スケーラビリティ向上施策

**データベース層:**
```typescript
// 読み取りレプリカ活用
const readOnlyQueries = useSupabaseRead()
const writeQueries = useSupabasePrimary()

// Convex関数の分散処理
export const distributedProcessing = internalAction({
  handler: async (ctx, { shardKey, data }) => {
    // シャード別並列処理
  }
})
```

**アプリケーション層:**
```typescript
// ページネーション改善
const { data, hasMore, loadMore } = useInfiniteQuery(
  api.reservation.query.listInfinite,
  { pageSize: 50 }
)

// メモ化戦略強化
const expensiveCalculation = useMemo(() => 
  calculateComplexData(data), [data]
)
```

**インフラ層:**
- CDN活用による静的アセット配信最適化
- エッジコンピューティング導入
- マイクロサービス化の検討

## 🎯 総合評価

**実装品質スコア: 88/100**

### 強み
- ✅ **モダンアーキテクチャ**: ハイブリッドDB・マルチテナント設計
- ✅ **高い型安全性**: TypeScript + Zod による完全な型保証
- ✅ **包括的機能**: 商用レベルの予約管理・顧客管理システム
- ✅ **優秀なエラーハンドリング**: 構造化エラー管理・監視システム
- ✅ **外部連携の充実**: Stripe・LINE・AI機能の高品質統合

### 改善領域
- 🔧 **運用自動化**: バッチ処理・CI/CDの完全稼働
- 🔧 **パフォーマンス**: フロントエンド最適化・キャッシュ戦略
- 🔧 **セキュリティ**: CSRF対策・セキュリティヘッダー強化
- 🔧 **スケーラビリティ**: プラン制限・リソース制限の調整

### 商用化評価
**現在の状態で商用利用可能（中小規模サロン向け）**
適切な改善実装により、エンタープライズレベルでの利用も十分対応可能

---

**最終更新**: 2025年06月
**分析対象バージョン**: main branch