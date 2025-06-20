# システムセットアップガイド

最終更新日: 2025年1月

## 1. 概要

本ガイドは、Bocker（ブッカー）システムの初期セットアップ、特にStripe Webhookの設定と運用について説明します。Webhookベースのアーキテクチャを中心に、最小限の設定で最大の効果を得ることを目指します。

## 2. Stripe Webhook設定

### 2.1 アーキテクチャ方針

- **統合エンドポイント推奨**: `/api/webhook/stripe` に一本化
- **必要最小限のイベント**: 決済とキャンセルに必要なイベントのみ登録
- **フォールバック**: Cronジョブは5分間隔でWebhook漏れをカバー

### 2.2 必須Webhookイベント

```yaml
決済関連（必須）:
  - checkout.session.completed     # 決済成功時の予約確定
  - payment_intent.payment_failed  # 決済失敗時の即座キャンセル
  - checkout.session.expired       # セッション期限切れ

```

### 2.3 開発環境セットアップ

#### Stripe CLI（推奨）

```bash
# 1. インストール
brew install stripe/stripe-cli/stripe

# 2. ログイン
stripe login

# 3. Webhook転送開始
stripe listen --forward-to localhost:3000/api/webhook/stripe

# 4. 表示されたシークレットを.env.localに設定
STRIPE_WEBHOOK_ENDPOINT_SECRET=whsec_xxxxx
```

#### 環境変数設定

```bash
# .env.local
# Stripe基本設定
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Webhook署名検証
STRIPE_WEBHOOK_ENDPOINT_SECRET=whsec_xxxxx

# Convex
NEXT_PUBLIC_CONVEX_URL=https://xxxxx.convex.cloud
CONVEX_DEPLOY_KEY=xxxxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# その他
RESEND_API_KEY=re_xxxxx
LINE_CHANNEL_ACCESS_TOKEN=xxxxx
```

### 2.4 本番環境セットアップ

#### Stripe Dashboard設定

1. https://dashboard.stripe.com/webhooks にアクセス
2. 「エンドポイントを追加」をクリック
3. エンドポイントURL: `https://your-domain.com/api/webhook/stripe`
4. イベントを選択（上記の必須イベント）
5. 署名シークレットをコピー

#### Vercel環境変数

```bash
# Production環境変数
STRIPE_WEBHOOK_ENDPOINT_SECRET=whsec_prod_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
```

## 3. システム初期設定

### 3.1 データベーススキーマ

#### Convex初期化

```bash
# Convexプロジェクト作成
npx convex dev

# スキーマ適用（自動）
# convex/schema.tsが自動的に適用される
```

#### Supabaseマイグレーション

```bash
# マイグレーション実行
pnpm migrate:supabase

# 必要なテーブル:
# - customer_points: ポイント管理
# - point_transaction: ポイント履歴
# - carte_detail: カルテ情報
# - tracking_events: アクセス解析
```

### 3.2 組織初期設定

```typescript
// 初期組織設定の例
const defaultOrgConfig = {
  // 基本設定
  name: "サンプルサロン",
  business_hours: {
    monday: { open: "10:00", close: "20:00" },
    // ... 他の曜日
  },
  
  // 予約設定
  reservation_config: {
    available_days: 30,           // 30日先まで予約可能
    available_cancel_days: 1,     // 1日前までキャンセル可能
    available_sheet: 3,           // 同時予約数上限
    interval_minutes: 30,         // 予約間隔
  },
  
  // 決済設定
  payment_methods: ["cash", "credit_card"],
  stripe_account_id: null,      // Stripe Connect後に設定
  
  // ポイント設定
  point_config: {
    enabled: true,
    rate: 0.01,                  // 1%還元
    expiry_days: 365,            // 365日有効
  },
};
```

## 4. Cronジョブ設定

### 4.1 最小限のCronジョブ

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 期限切れpending予約のクリーンアップ（5分ごと）
crons.interval(
  "cleanup_expired_pending",
  { minutes: 5 },
  internal.reservation.payment.cleanupExpiredPendingReservations
);

// ポイント付与処理（1日1回）
crons.daily(
  "process_point_awards",
  { hourUTC: 17, minuteUTC: 0 }, // 日本時間 AM 2:00
  internal.point.action.processScheduledPointAwards
);

export default crons;
```

### 4.2 Cronジョブの監視

```typescript
// Cronジョブの実行状況を記録
export const logCronExecution = internalMutation({
  args: {
    jobName: v.string(),
    status: v.union(v.literal("started"), v.literal("completed"), v.literal("failed")),
    details: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("cron_logs", {
      ...args,
      executed_at: Date.now(),
    });
  },
});
```

## 5. エラー処理とモニタリング

### 5.1 Sentryセットアップ

```typescript
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  
  beforeSend(event, hint) {
    // センシティブ情報をフィルタリング
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    return event;
  },
});
```

### 5.2 Webhook処理の監視

```typescript
// Webhook処理メトリクス
interface WebhookMetrics {
  totalReceived: number;
  successfullyProcessed: number;
  failed: number;
  averageProcessingTime: number;
  lastProcessedAt: Date;
}

// メトリクス記録
export const recordWebhookMetric = async (
  event: string,
  success: boolean,
  processingTime: number
) => {
  await supabase
    .from("webhook_metrics")
    .insert({
      event_type: event,
      success,
      processing_time_ms: processingTime,
      processed_at: new Date(),
    });
};
```

## 6. セキュリティ設定

### 6.1 環境変数の管理

```bash
# 開発環境: .env.local（gitignore済み）
# 本番環境: Vercel環境変数

# 必須環境変数チェック
const requiredEnvVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_ENDPOINT_SECRET',
  'CONVEX_DEPLOY_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});
```

### 6.2 Webhook署名検証

```typescript
// 必ず署名を検証
export async function verifyWebhookSignature(
  req: Request,
  endpointSecret: string
): Promise<Stripe.Event> {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    throw new Error('Missing stripe-signature header');
  }
  
  return stripe.webhooks.constructEvent(
    body,
    signature,
    endpointSecret
  );
}
```

## 7. テスト環境構築

### 7.1 テストデータ準備

```typescript
// scripts/setup-test-data.ts
async function setupTestData() {
  // テスト組織作成
  const org = await createOrganization({
    name: "テストサロン",
    tenant_id: "test-tenant",
  });
  
  // テストスタッフ作成
  const staff = await createStaff({
    name: "テストスタッフ",
    email: "staff@test.com",
    org_id: org.id,
  });
  
  // テストメニュー作成
  const menu = await createMenu({
    name: "カット",
    price: 5000,
    duration_minutes: 60,
    org_id: org.id,
  });
  
  // テストオプション作成
  const option = await createOption({
    name: "トリートメント",
    price: 2000,
    in_stock: 10,
    menu_id: menu.id,
  });
  
  console.log("Test data created successfully");
}
```

### 7.2 E2Eテスト設定

```typescript
// e2e/reservation-flow.spec.ts
import { test, expect } from '@playwright/test';

test('予約作成から決済完了まで', async ({ page }) => {
  // 1. 予約ページアクセス
  await page.goto('/reservation/test-org/calendar');
  
  // 2. メニュー選択
  await page.click('[data-testid="menu-card-cut"]');
  
  // 3. スタッフ選択
  await page.click('[data-testid="staff-card-1"]');
  
  // 4. 日時選択
  await page.click('[data-testid="date-tomorrow"]');
  await page.click('[data-testid="time-1400"]');
  
  // 5. 決済方法選択
  await page.click('[data-testid="payment-credit"]');
  
  // 6. 確認画面
  await page.click('[data-testid="confirm-button"]');
  
  // 7. Stripe決済（モック）
  await page.fill('[data-testid="card-number"]', '4242424242424242');
  await page.click('[data-testid="pay-button"]');
  
  // 8. 完了画面
  await expect(page).toHaveURL('/reservation/complete');
});
```

## 8. トラブルシューティング

### 8.1 よくある問題と解決策

| 問題 | 原因 | 解決策 |
|------|------|--------|
| Webhook署名エラー | 環境変数の設定ミス | 本番/開発の署名シークレットを確認 |
| 予約がpendingのまま | Webhook未受信 | Stripe Dashboardでイベント配信を確認 |
| 在庫が復元されない | キャンセル処理エラー | ログを確認し、手動で在庫調整 |
| ポイントが付与されない | Cronジョブ停止 | Convex Dashboardでcron実行状況確認 |

### 8.2 デバッグツール

```bash
# Stripe CLIでイベント確認
stripe events list --limit 10

# Convexログ確認
npx convex logs --follow

# Webhookテスト送信
curl -X POST http://localhost:3000/api/webhook/stripe \
  -H "stripe-signature: test" \
  -H "Content-Type: application/json" \
  -d '{"type":"checkout.session.completed"}'
```

## 9. 運用チェックリスト

### 9.1 日次確認項目

- [ ] Webhook成功率（Stripe Dashboard）
- [ ] Cronジョブ実行状況（Convex Dashboard）
- [ ] エラーログ（Sentry）
- [ ] pending予約の数

### 9.2 週次メンテナンス

- [ ] 期限切れデータのアーカイブ
- [ ] パフォーマンスメトリクスの確認
- [ ] セキュリティアップデートの確認

### 9.3 月次レビュー

- [ ] Webhook処理時間の分析
- [ ] エラー率の傾向分析
- [ ] インフラコストの最適化

## 10. まとめ

本セットアップガイドに従うことで、以下を実現できます：

1. **シンプルな構成**: 必要最小限のWebhookイベントとCronジョブ
2. **高い信頼性**: Webhookとフォールバックの組み合わせ
3. **容易な運用**: 明確な監視ポイントとトラブルシューティング
4. **セキュアな実装**: 署名検証とべき等性の保証

重要なのは、複雑さを避け、Webhookベースのシンプルなアーキテクチャを維持することです。これにより、スケーラブルで保守しやすいシステムを実現できます。