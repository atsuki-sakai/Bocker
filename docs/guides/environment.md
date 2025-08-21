# Bocker 環境変数ガイド（統一版）

## 概要

開発は `.env.local` 1 つに集約します。本番は Vercel/Convex のダッシュボードに設定し、リポジトリに置きません。過去の `.env.development*`, `.env.test` などは廃止予定です。

## 環境構成

### 環境URL

| 環境 | URL | 用途 |
|------|-----|------|
| **本番環境** | https://bocker.jp | 実際のサービス提供 |
| **開発環境** | https://bocker-project.vercel.app | 開発・テスト用 |

### 利用サービスと環境別設定

| サービス | 開発環境 | 本番環境 | 用途 |
|----------|----------|----------|------|
| **GCP** | Cloud Storage, CDN | 同左 | 画像保存・配信 |
| **Supabase** | DEV_Bocker | Bocker | 分析/履歴 DB |
| **Convex** | Development | Production | リアルタイムDB |
| **Clerk** | clerk:dev | clerk:prod | 認証 |
| **Stripe** | stripe:dev | stripe:prod | 決済 |

## 環境変数設定

### ファイル運用（開発）

- 使うのは `.env.local` のみ
- ひな形は `.env.example` をコピーして作成
- 変更反映には `pnpm dev` の再起動が必要

### 本番の管理

- Next.js: Vercel の Project Settings → Environment Variables
- Convex: `convex env set KEY VALUE` で Development/Production それぞれに設定（CLERK などサーバーのみの値）

> 注意: Convex 関数内では `lib/env-config.ts` 経由で `process.env` を参照します。Convex 側にも同じキーを設定してください。

### 主要な環境変数

#### 1. 基本設定

```bash
# 開発環境 (.env.dev)
NODE_ENV=development
NEXT_PUBLIC_DEPLOY_URL=https://bocker-project.vercel.app
NEXT_PUBLIC_DEVELOP_URL=http://localhost:3000/ja

# 本番環境 (.env.prod)
NODE_ENV=production
NEXT_PUBLIC_DEPLOY_URL=https://bocker.jp
NEXT_PUBLIC_DEVELOP_URL=http://localhost:3000/ja
```

#### 2. Convex設定

```bash
# 開発環境
CONVEX_DEPLOYMENT=dev:optimistic-herring-662
NEXT_PUBLIC_CONVEX_URL=https://optimistic-herring-662.convex.cloud

# 本番環境
CONVEX_DEPLOYMENT=prod:dutiful-lapwing-356
NEXT_PUBLIC_CONVEX_URL=https://dutiful-lapwing-356.convex.cloud
```

#### 3. Clerk認証設定

```bash
# 開発環境
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_[...]
CLERK_SECRET_KEY=sk_test_[...]
CLERK_WEBHOOK_SIGNING_SECRET=whsec_[...]
CLERK_JWT_ISSUER_DOMAIN=https://distinct-muskox-3.clerk.accounts.dev

# 本番環境
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_[...]
CLERK_SECRET_KEY=sk_live_[...]
CLERK_WEBHOOK_SIGNING_SECRET=whsec_[...]
CLERK_JWT_ISSUER_DOMAIN=https://clerk.bocker.jp
```

#### 4. Stripe決済設定

```bash
# 両環境共通（環境ごとに異なるキーを使用）
STRIPE_SECRET_KEY=sk_[test|live]_[...]
STRIPE_SUBSCRIPTION_WEBHOOK_SECRET=whsec_[...]
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_[...]
STRIPE_CHECKOUT_WEBHOOK_SECRET=whsec_[...]

# プロダクトID・価格ID（環境ごとに設定）
NEXT_PUBLIC_LITE_PROD_ID=prod_[...]
NEXT_PUBLIC_PRO_PROD_ID=prod_[...]
NEXT_PUBLIC_LITE_MONTHLY_PRC_ID=price_[...]
NEXT_PUBLIC_LITE_YEARLY_PRC_ID=price_[...]
NEXT_PUBLIC_PRO_MONTHLY_PRC_ID=price_[...]
NEXT_PUBLIC_PRO_YEARLY_PRC_ID=price_[...]
```

#### 5. その他のサービス

```bash
# Supabase（環境ごとに異なるプロジェクト）
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ[...]
SUPABASE_SERVICE_ROLE_KEY=eyJ[...]

# GCP Cloud Storage（共通バケット、環境でパス分離）
GCP_PROJECT=bocker-cloud-storage
GCP_CLIENT_EMAIL=[service-account]@[project].iam.gserviceaccount.com
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[...]\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_GCP_STORAGE_BUCKET_NAME=bocker-prod-images
NEXT_PUBLIC_CDN_DOMAIN=https://cdn.bocker.jp
```

## Webhook処理

### Webhook エンドポイント

| サービス | エンドポイント | 処理内容 |
|----------|----------------|----------|
| **Stripe Checkout** | `/api/webhook/stripe/checkout` | 決済完了処理 |
| **Stripe Subscription** | `/api/webhook/stripe/subscription` | サブスクリプション更新 |
| **Stripe Connect** | `/api/webhook/stripe/connect` | Connect アカウント管理 |
| **Clerk** | `/api/webhook/clerk` | ユーザー・組織管理 |

### Webhook実装の特徴

1. **環境変数による設定管理**
   - `lib/env-config.ts` で一元管理
   - 環境ごとに異なるWebhook署名シークレット

2. **エラーハンドリング**
   - 署名検証の実装
   - べき等性の保証
   - リトライロジック

3. **並列処理**
   - `services/webhook/parallel.ts` による高速化
   - メトリクス収集によるモニタリング

## 環境切り替えの仕組み

### 1. EnvConfigManager (`lib/env-config.ts`)

```typescript
// 環境に応じたURLを自動取得
const appUrl = getAppUrl(); // development: develop_url, production: deploy_url

// 環境判定
if (isDevelopment()) {
  // 開発環境固有の処理
} else if (isProduction()) {
  // 本番環境固有の処理
}
```

### 2. 各サービスでの環境対応

- **Convex**: `convex/auth.config.ts` で環境変数から設定を読み込み
- **Stripe**: `services/stripe/StripeService.ts` で環境変数からAPIキーを取得
- **Supabase**: `services/supabase/SupabaseService.ts` で環境ごとのプロジェクトに接続
- **GCP**: `services/gcp/cloud_storage/GoogleStorageService.ts` でバケット・CDN設定

## 画像配信（CDN）

### GCS + Cloud CDN構成

1. **アップロード**: GCSバケット（`bocker-prod-images`）に直接保存
2. **配信**: Cloud CDN経由で配信（`https://cdn.bocker.jp`）
3. **URL変換**: `lib/cdn-client-utils.ts` でGCS URLをCDN URLに自動変換

### 環境別の画像パス

- 開発環境: `/dev/[年]/[月]/[日]/[uuid].webp`
- 本番環境: `/prod/[年]/[月]/[日]/[uuid].webp`

## 環境設定の確認方法

### 1. 環境変数の検証

```bash
# 必須環境変数のチェック
pnpm run check:env

# または手動で確認
node -e "require('./lib/env-config').validateEnv()"
```

### 2. MCPツールでの確認

各MCPツールを使用して、サービスの設定を確認できます：

- **Convex**: プロジェクト設定・デプロイメント状態
- **Supabase**: データベース接続・マイグレーション状態
- **Stripe**: Webhook設定・プロダクト設定
- **Clerk**: 組織設定・認証設定
- **GCP**: バケット設定・CDN設定

### 3. Webhook動作確認

各Webhookエンドポイントに対してGETリクエストを送信：

```bash
# 開発環境
curl https://bocker-project.vercel.app/api/webhook/clerk
curl https://bocker-project.vercel.app/api/webhook/stripe/checkout

# 本番環境
curl https://bocker.jp/api/webhook/clerk
curl https://bocker.jp/api/webhook/stripe/checkout
```

## トラブルシューティング

### 1. 環境変数が読み込まれない

- `.env.local` ファイルが存在することを確認
- 環境変数名のスペルミスをチェック
- Next.jsを再起動（環境変数の変更後は必須）

### 2. Webhook署名エラー

- 環境ごとの署名シークレットが正しく設定されているか確認
- Stripe/ClerkのWebhook設定画面でエンドポイントURLを確認

### 3. 画像が表示されない

- CDN設定が正しいか確認（`NEXT_PUBLIC_CDN_DOMAIN`）
- GCSバケットのCORS設定を確認
- 画像のアップロードパスが環境に応じて正しく設定されているか確認

## セキュリティ上の注意事項

1. **環境変数の管理**
   - 本番環境のシークレットキーは絶対にコミットしない
   - `.env.local` は `.gitignore` に含める
   - Vercelのダッシュボードから本番環境変数を設定

2. **Webhook署名の検証**
   - 全てのWebhookで署名検証を必須化
   - 署名シークレットは定期的に更新

3. **アクセス制御**
   - 管理画面へのアクセスはClerk認証で保護
   - APIエンドポイントは適切な認証・認可を実装

## まとめ

Bockerプロジェクトは、開発環境と本番環境を明確に分離し、環境変数による設定管理を徹底しています。
各サービス（Convex、Supabase、Stripe、Clerk、GCP）は環境ごとに独立したプロジェクト・設定を持ち、
`lib/env-config.ts` による一元的な環境変数管理により、環境の切り替えがスムーズに行えます。

Webhook処理は堅牢な実装がされており、署名検証・べき等性・並列処理により、
信頼性の高いイベント処理を実現しています。