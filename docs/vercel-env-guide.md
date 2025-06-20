# Vercel環境変数確認ガイド

## 1. Vercel CLIでの環境変数確認手順

```bash
# 1. Vercel CLIのインストール（未インストールの場合）
npm i -g vercel

# 2. プロジェクトをリンク
vercel link

# 3. 本番環境の環境変数一覧を表示
vercel env ls --production

# 4. 開発環境の環境変数一覧を表示
vercel env ls --development

# 5. プレビュー環境の環境変数一覧を表示
vercel env ls --preview
```

## 2. 環境変数の確認と比較

```bash
# 開発環境の環境変数をファイルに出力
vercel env pull .env.dev.vercel --development

# 本番環境の環境変数をファイルに出力
vercel env pull .env.prod.vercel --production

# 差分を確認
diff .env.dev.vercel .env.prod.vercel
```

## 3. 環境変数の設定値比較表

| 環境変数名 | 開発環境の期待値 | 本番環境の期待値 |
|-----------|-----------------|----------------|
| **基本設定** | | |
| NODE_ENV | development | production |
| NEXT_PUBLIC_DEPLOY_URL | https://bocker-project.vercel.app | https://bocker.jp |
| **Convex** | | |
| CONVEX_DEPLOYMENT | dev:optimistic-herring-662 | prod:dutiful-lapwing-356 |
| NEXT_PUBLIC_CONVEX_URL | https://optimistic-herring-662.convex.cloud | https://dutiful-lapwing-356.convex.cloud |
| **Clerk** | | |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | pk_test_で始まる | pk_live_で始まる |
| CLERK_SECRET_KEY | sk_test_で始まる | sk_live_で始まる |
| CLERK_JWT_ISSUER_DOMAIN | https://distinct-muskox-3.clerk.accounts.dev | https://clerk.bocker.jp |
| **Stripe** | | |
| STRIPE_SECRET_KEY | sk_test_で始まる | sk_live_で始まる |
| **Supabase** | | |
| NEXT_PUBLIC_SUPABASE_URL | https://kafcgxiddgxbuimeitrm.supabase.co | https://fxpdfqrnaifxokumgrht.supabase.co |

## 4. Webhook URLの確認

### Clerk Webhook
```bash
# 開発環境
https://bocker-project.vercel.app/api/webhook/clerk

# 本番環境
https://bocker.jp/api/webhook/clerk
```

### Stripe Webhook
```bash
# 開発環境
https://bocker-project.vercel.app/api/webhook/stripe/subscription
https://bocker-project.vercel.app/api/webhook/stripe/connect
https://bocker-project.vercel.app/api/webhook/stripe/checkout

# 本番環境
https://bocker.jp/api/webhook/stripe/subscription
https://bocker.jp/api/webhook/stripe/connect
https://bocker.jp/api/webhook/stripe/checkout
```

### Convex Webhook
```bash
# 開発環境
https://optimistic-herring-662.convex.cloud/api/webhook/[endpoint]

# 本番環境
https://dutiful-lapwing-356.convex.cloud/api/webhook/[endpoint]
```

## 5. 環境変数の追加・更新

```bash
# 環境変数を追加（すべての環境）
vercel env add

# 特定の環境に環境変数を追加
vercel env add VARIABLE_NAME production
vercel env add VARIABLE_NAME development
vercel env add VARIABLE_NAME preview

# 環境変数を削除
vercel env rm VARIABLE_NAME

# 環境変数を更新（削除して再追加）
vercel env rm VARIABLE_NAME
vercel env add VARIABLE_NAME
```

## 6. トラブルシューティング

### 環境変数が反映されない場合
1. Vercelダッシュボードで再デプロイ
2. ローカルのキャッシュをクリア: `rm -rf .vercel`
3. 環境変数の名前が正しいか確認（大文字小文字に注意）

### Webhook署名の検証エラー
1. Webhook URLが正しいか確認
2. 署名シークレットが正しい環境のものか確認
3. 各サービスのダッシュボードでWebhook設定を確認
