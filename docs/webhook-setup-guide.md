# Webhook URL設定確認ガイド

## 各サービスのWebhook設定

### 1. Clerk Webhook設定

**開発環境:**
- URL: `https://bocker-project.vercel.app/api/webhook/clerk`
- Signing Secret: `whsec_ohC7yKVDDo5t+UmV+bcQTYAJxbbP+dcO`
- 設定場所: https://dashboard.clerk.com/apps/[APP_ID]/webhooks

**本番環境:**
- URL: `https://bocker.jp/api/webhook/clerk`
- Signing Secret: `whsec_URGciGtr8NoDDCdsNjCQQ8EXRjMUANwD`
- 設定場所: https://dashboard.clerk.com/apps/[APP_ID]/webhooks

**イベント設定:**
- user.created
- user.updated
- user.deleted
- organization.created
- organization.updated
- organizationMembership.created
- organizationMembership.updated

### 2. Stripe Webhook設定

**開発環境:**

**Subscription Webhook:**
- URL: `https://bocker-project.vercel.app/api/webhook/stripe/subscription`
- Signing Secret: `we_1R4Ui6E4yvIVY0lGgN2Tfvn9`
- イベント:
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_succeeded
  - invoice.payment_failed

**Connect Webhook:**
- URL: `https://bocker-project.vercel.app/api/webhook/stripe/connect`
- Signing Secret: `we_1R8mCiE4yvIVY0lGOyjxgFhS`
- イベント:
  - account.updated
  - account.application.authorized
  - account.application.deauthorized
  - capability.updated
  - person.created
  - person.updated

**Checkout Webhook:**
- URL: `https://bocker-project.vercel.app/api/webhook/stripe/checkout`
- Signing Secret: `we_1Rbk3fE4yvIVY0lGykUCiSSD`
- イベント:
  - checkout.session.completed
  - checkout.session.expired

**本番環境:**

**Subscription Webhook:**
- URL: `https://bocker.jp/api/webhook/stripe/subscription`
- Signing Secret: `we_1Rc4vHE4yvIVY0lGPxoulUUr`

**Connect Webhook:**
- URL: `https://bocker.jp/api/webhook/stripe/connect`
- Signing Secret: `we_1Rc4xJE4yvIVY0lGuecCKR7s`

**Checkout Webhook:**
- URL: `https://bocker.jp/api/webhook/stripe/checkout`
- Signing Secret: `we_1Rc4MuE4yvIVY0lG1IQK5Z3I`

### 3. Convex Webhook設定

Convexの場合、WebhookはConvex Functions内で直接処理されるため、外部からのWebhook URLは不要です。

## 環境別の確認コマンド

### Stripe Webhookの確認

```bash
# Stripe CLIのインストール
brew install stripe/stripe-cli/stripe

# ログイン
stripe login

# 開発環境のWebhookエンドポイント一覧
stripe webhooks list --api-key sk_test_6HdomeRplYVEdqcQqCS8pwTrfv2S16asx1bpwwCgxs

# 本番環境のWebhookエンドポイント一覧
stripe webhooks list --api-key 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

# Webhookのテスト（開発環境）
stripe trigger payment_intent.succeeded --api-key sk_test_6HdomeRplYVEdqcQqCS8pwTrfv2S16asx1bpwwCgxs
```

### Clerkの確認

Clerk Dashboardで以下を確認:
1. Webhooks → Endpoints でURLが正しく設定されているか
2. Signing Secretが環境変数と一致しているか
3. 必要なイベントがすべて選択されているか

## トラブルシューティングチェックリスト

### ✅ 基本的な確認事項

- [ ] Webhook URLがHTTPSで始まっているか
- [ ] URLの末尾にスラッシュが含まれていないか
- [ ] 環境変数名が正確に一致しているか（大文字小文字）
- [ ] Signing Secretが正しい環境のものか

### ✅ デバッグ方法

1. **ローカルでのWebhookテスト**
   ```bash
   # ngrokでローカルをトンネリング
   ngrok http 3000
   
   # Stripe CLIでローカルにフォワード
   stripe listen --forward-to localhost:3000/api/webhook/stripe/subscription
   ```

2. **ログの確認**
   ```bash
   # Vercelのログを確認
   vercel logs --follow
   
   # 特定の関数のログ
   vercel logs api/webhook/clerk --follow
   ```

3. **Webhook署名の検証**
   ```javascript
   // @services/webhook/stripe.ts での検証例
   const sig = headers.get('stripe-signature');
   const webhookSecret = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;
   
   try {
     const event = stripe.webhooks.constructEvent(
       body,
       sig,
       webhookSecret
     );
   } catch (err) {
     console.error('Webhook署名検証エラー:', err);
     return new Response('Invalid signature', { status: 400 });
   }
   ```

## 環境変数の更新手順

1. **Vercel Dashboard経由（推奨）**
   - https://vercel.com/[YOUR_TEAM]/[PROJECT]/settings/environment-variables
   - 環境を選択（Production/Preview/Development）
   - 変数を追加・更新
   - 再デプロイ

2. **Vercel CLI経由**
   ```bash
   # 削除して再追加
   vercel env rm STRIPE_SUBSCRIPTION_WEBHOOK_SECRET
   vercel env add STRIPE_SUBSCRIPTION_WEBHOOK_SECRET production
   ```

## セキュリティのベストプラクティス

1. **Webhook署名の検証を必ず実装**
2. **IPホワイトリストの設定（可能な場合）**
3. **リトライロジックの実装**
4. **イベントの重複処理対策（idempotency）**
5. **タイムアウトの適切な設定（30秒以内）**
