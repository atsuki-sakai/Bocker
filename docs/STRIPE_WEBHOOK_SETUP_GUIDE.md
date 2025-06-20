# Stripe Webhook設定ガイド

最終更新日: 2025年1月

## 1. 概要

BockerシステムでStripe決済を正しく動作させるために、Stripe管理画面でWebhookエンドポイントを設定する必要があります。このガイドでは、開発環境と本番環境それぞれの設定手順を説明します。

## 2. Webhookエンドポイント

### 2.1 現在の実装状況

システムには2つのWebhookエンドポイントが存在します：

1. **統合Webhookエンドポイント**（推奨）
   - URL: `https://your-domain.com/api/webhook/stripe`
   - 複数のStripeイベントを処理
   - WebhookProcessorベースの実装

2. **Checkout専用エンドポイント**（レガシー）
   - URL: `https://your-domain.com/api/stripe/checkout/webhook`
   - checkout.session.completedのみ処理
   - 将来的に統合エンドポイントに移行予定

### 2.2 必要なイベントタイプ

以下のイベントタイプを設定する必要があります：

#### 必須イベント
- `checkout.session.completed` - 決済完了時の予約確定処理

#### Stripe Connect関連（サロンの収益管理用）
- `account.updated` - 接続アカウントの更新
- `account.external_account.deleted` - 銀行口座の削除
- `capability.updated` - 機能の更新

#### サブスクリプション関連（プラン管理用）
- `customer.subscription.updated` - サブスクリプションの更新
- `customer.subscription.deleted` - サブスクリプションの削除
- `invoice.payment_succeeded` - 請求書の支払い成功
- `invoice.payment_failed` - 請求書の支払い失敗

## 3. 開発環境の設定

### 3.1 Stripe CLIを使用する方法（推奨）

1. **Stripe CLIのインストール**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # その他のOS
   # https://stripe.com/docs/stripe-cli#install
   ```

2. **ログイン**
   ```bash
   stripe login
   ```

3. **Webhookの転送開始**
   ```bash
   # 統合エンドポイント用
   stripe listen --forward-to localhost:3000/api/webhook/stripe

   # または、Checkout専用エンドポイント用
   stripe listen --forward-to localhost:3000/api/stripe/checkout/webhook
   ```

4. **Webhook署名シークレットの取得**
   - コマンド実行後に表示される`whsec_...`で始まる文字列をコピー
   - `.env.local`に設定：
     ```
     STRIPE_WEBHOOK_ENDPOINT_SECRET=whsec_...
     # または
     STRIPE_CHECKOUT_WEBHOOK_SECRET=whsec_...
     ```

### 3.2 ngrokを使用する方法

1. **ngrokのインストールと起動**
   ```bash
   ngrok http 3000
   ```

2. **Stripe管理画面での設定**
   - https://dashboard.stripe.com/webhooks にアクセス
   - 「エンドポイントを追加」をクリック
   - エンドポイントURL: `https://xxx.ngrok.io/api/webhook/stripe`
   - 上記のイベントタイプを選択

## 4. 本番環境の設定

### 4.1 Stripe管理画面での設定手順

1. **Stripe Dashboard にログイン**
   - https://dashboard.stripe.com/webhooks

2. **「エンドポイントを追加」をクリック**

3. **エンドポイントURLを入力**
   ```
   https://your-production-domain.com/api/webhook/stripe
   ```

4. **イベントタイプを選択**
   - 「イベントを選択」をクリック
   - 以下のイベントにチェック：
     - Checkout: `checkout.session.completed`
     - Connect: `account.updated`, `account.external_account.deleted`, `capability.updated`
     - Customer: `customer.subscription.updated`, `customer.subscription.deleted`
     - Invoice: `invoice.payment_succeeded`, `invoice.payment_failed`

5. **「エンドポイントを追加」をクリック**

6. **署名シークレットを取得**
   - 作成されたエンドポイントの詳細画面を開く
   - 「署名シークレット」セクションの「表示」をクリック
   - 表示された`whsec_...`をコピー

### 4.2 環境変数の設定

Vercelまたはホスティングサービスの環境変数に追加：

```bash
# 統合Webhookエンドポイント用
STRIPE_WEBHOOK_ENDPOINT_SECRET=whsec_your_production_secret

# Checkout専用エンドポイント用（使用する場合）
STRIPE_CHECKOUT_WEBHOOK_SECRET=whsec_your_checkout_secret

# その他の必須環境変数
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## 5. Webhookの動作確認

### 5.1 テスト手順

1. **テストイベントの送信**
   - Stripe管理画面のWebhookエンドポイント詳細ページ
   - 「イベントを送信」タブを選択
   - `checkout.session.completed`を選択
   - 「テストイベントを送信」をクリック

2. **ログの確認**
   - アプリケーションログでWebhook受信を確認
   - レスポンスステータスが200であることを確認

3. **実際の決済テスト**
   - テストカード（4242 4242 4242 4242）で決済
   - 予約ステータスが更新されることを確認
   - 通知メールが送信されることを確認

### 5.2 トラブルシューティング

#### エラー: 署名検証に失敗
```
Error: Stripe signature verification failed
```
**解決方法**:
- 環境変数の署名シークレットが正しいか確認
- 本番/開発環境の署名シークレットを混同していないか確認

#### エラー: 400 Bad Request
**解決方法**:
- リクエストボディが正しく送信されているか確認
- Content-Typeヘッダーが適切か確認

#### エラー: タイムアウト
**解決方法**:
- 処理時間を最適化（30秒以内に応答する必要がある）
- 重い処理は非同期で実行

## 6. セキュリティのベストプラクティス

### 6.1 署名検証は必須
```typescript
// 必ず署名を検証する
const signature = req.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(
  rawBody,
  signature,
  webhookSecret
);
```

### 6.2 べき等性の実装
- 同じイベントIDの重複処理を防ぐ
- データベースにイベントIDを記録

### 6.3 エラーハンドリング
- 常に200レスポンスを返す（Stripeの再試行を防ぐ）
- エラーはログに記録し、別途対応

## 7. 監視とメンテナンス

### 7.1 Webhookの監視
- Stripe管理画面でWebhookの成功率を定期的に確認
- 失敗率が高い場合はログを調査

### 7.2 イベントの再送信
- 失敗したイベントはStripe管理画面から手動で再送信可能
- 最大3日間のイベント履歴が保存される

### 7.3 定期的な動作確認
- 月1回程度、テストイベントで動作確認
- APIバージョンの更新に注意

## 8. 移行計画

現在2つのWebhookエンドポイントが存在しますが、将来的には統合エンドポイントに一本化する予定です：

1. **現状維持フェーズ**（現在）
   - 両方のエンドポイントを並行運用
   - 新規実装は統合エンドポイントを使用

2. **移行フェーズ**
   - Checkout専用エンドポイントの処理を統合エンドポイントに移植
   - 十分なテストを実施

3. **統合完了フェーズ**
   - Checkout専用エンドポイントを廃止
   - Stripe管理画面から旧エンドポイントを削除

## 9. チェックリスト

### 開発環境
- [ ] Stripe CLIをインストール
- [ ] Webhook転送を開始
- [ ] 署名シークレットを.env.localに設定
- [ ] テスト決済で動作確認

### 本番環境
- [ ] Stripe管理画面でエンドポイントを追加
- [ ] 必要なイベントタイプをすべて選択
- [ ] 署名シークレットを環境変数に設定
- [ ] テストイベントで動作確認
- [ ] 実際の決済で動作確認

---

作成者: Claude
作成日: 2025年1月