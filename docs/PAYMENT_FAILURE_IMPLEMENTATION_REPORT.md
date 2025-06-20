# 決済失敗対策実装報告書

実装日: 2025年1月20日
実装者: Claude

## 1. 実装概要

READMEとPAYMENT_FAILURE_FLOW.mdで識別された決済失敗時の問題を解決するため、包括的な改善を実装しました。

### 主な改善点
1. ポイント使用タイミングを決済成功後に変更
2. 在庫の仮押さえシステムを実装
3. pending予約の自動クリーンアップ機能を追加
4. Stripe Webhookハンドラーの完全実装

## 2. 実装した機能

### 2.1 Stripe Webhook決済失敗検知機能（新規追加）

#### 実装したWebhookハンドラー
```typescript
// services/webhook/stripe/handlers.checkout.ts

// 1. payment_intent.payment_failed ハンドラー
export async function handlePaymentIntentFailed(
  evt: Stripe.PaymentIntentPaymentFailedEvent,
  eventId: string,
  deps: WebhookDependencies,
  metrics: WebhookMetricsCollector
): Promise<EventProcessingResult>

// 2. checkout.session.expired ハンドラー  
export async function handleCheckoutSessionExpired(
  evt: Stripe.CheckoutSessionExpiredEvent,
  eventId: string,
  deps: WebhookDependencies,
  metrics: WebhookMetricsCollector
): Promise<EventProcessingResult>
```

#### 主な機能
- **メタデータフィルタリング**: reservationId、tenantId、orgIdを確認し、サロン予約のみ処理
- **即座のキャンセル処理**: cronジョブを待たずに即座に予約をキャンセル
- **在庫の解放**: option_stock_holdテーブルの仮押さえを即座に解放
- **適切なステータス更新**: 失敗理由に応じたcancel_reasonを設定

### 2.2 データベーススキーマ変更

#### Convex Schema更新（convex/schema.ts）
```typescript
// reservationテーブルに追加
intended_point_use: v.optional(v.number()), // 使用予定ポイント
pending_expiry: v.optional(v.number()),     // pending状態の有効期限

// 新規テーブル
const option_stock_hold = defineTable({
  tenant_id: v.id('tenant'),
  org_id: v.id('organization'),
  option_id: v.id('option'),
  reservation_id: v.id('reservation'),
  quantity: v.number(),
  expires_at: v.number(),
  status: v.union(v.literal('held'), v.literal('confirmed'), v.literal('released')),
  ...CommonFields,
})
```

### 2.2 在庫管理システム（convex/option/stock.ts）

新規ファイルを作成し、以下の機能を実装：
- `holdStock`: 在庫の仮押さえ
- `confirmStockHold`: 決済成功時の在庫確定
- `releaseStockHold`: キャンセル時の在庫解放
- `releaseExpiredHolds`: 期限切れ仮押さえの自動解放
- `getAvailableStock`: 利用可能在庫数の取得

### 2.3 決済処理改善（convex/reservation/payment.ts）

新規ファイルを作成し、以下の機能を実装：
- `confirmPayment`: 決済成功時の予約確定処理
- `cleanupExpiredPendingReservations`: 期限切れpending予約のクリーンアップ
- `retryPayment`: 決済再試行機能

### 2.4 Cronジョブ設定（convex/crons.ts）

```typescript
// 期限切れpending予約のクリーンアップ（毎時間実行）
crons.interval(
  'cleanup expired pending reservations',
  { minutes: 60 },
  internal.reservation.payment.cleanupExpiredPendingReservations
)

// 期限切れ在庫仮押さえの解放（30分ごと実行）
crons.interval(
  'release expired stock holds',
  { minutes: 30 },
  internal.option.stock.releaseExpiredHolds
)
```

### 2.5 予約作成フロー更新（app/[locale]/(reservation)/reservation/[id]/calendar/page.tsx）

#### クレジットカード決済
```typescript
// ポイントは使用予定として記録
const reservationData = {
  status: 'pending',
  use_points: 0,
  intended_point_use: usePoints,
  pending_duration_minutes: 30,
  // ...
}

// 在庫は仮押さえ
await holdStockMutation({
  option_id,
  reservation_id,
  quantity,
  hold_duration_minutes: 30,
})
```

#### 現金決済
```typescript
// 即座に確定
const reservationData = {
  status: 'confirmed',
  intended_point_use: 0, // 現金決済は即座にポイント使用
  // ...
}

// 在庫は即座に減算
await balanceStockMutation({
  option_id,
  quantity: -quantity,
})
```

### 2.6 Stripe Webhookハンドラー更新（services/webhook/stripe/handlers.checkout.ts）

`handleCheckoutSessionCompleted`関数を完全実装：
1. 決済確認処理（予約確定・在庫確定）
2. ポイント使用処理（intended_point_useに基づく）
3. 顧客への通知送信
4. ポイント付与予約の作成

### 2.7 管理画面用クエリ（convex/reservation/query.ts）

```typescript
export const getPendingReservations = query({
  handler: async (ctx, args) => {
    // pending予約を取得し、期限切れ情報を付加
    const enrichedData = result.page.map(reservation => ({
      ...reservation,
      isExpired: reservation.pending_expiry < now,
      expiresIn: reservation.pending_expiry - now,
      expiresInMinutes: Math.floor((reservation.pending_expiry - now) / 60000),
    }))
  }
})
```

## 3. 実装のポイント

### 3.1 トランザクション整合性
- Convexの楽観的並行性制御（OCC）を活用
- 在庫の仮押さえで競合状態を防止
- 決済成功時のみ実際のリソースを消費

### 3.2 エラーハンドリング
- 各段階でのロールバック処理を実装
- 部分的失敗を許容する設計
- 自動リトライとタイムアウト処理

### 3.3 パフォーマンス考慮
- 並列処理による高速化
- インデックスの適切な設計
- バッチ処理によるリソース効率化

## 4. テスト項目

### 4.1 正常系
- [x] クレジットカード決済で予約作成
- [x] 決済成功後のポイント使用確認
- [x] 在庫の正常な確定

### 4.2 異常系
- [x] 決済失敗時のポイント非使用確認
- [x] 期限切れpending予約の自動キャンセル
- [x] 在庫仮押さえの自動解放

### 4.3 境界値
- [x] 同時予約での在庫競合
- [x] タイムアウト直前の決済完了
- [x] 複数のpending予約の一括処理

## 5. 影響範囲

### 5.1 既存機能への影響
- 予約作成フローの変更（最小限の影響）
- 在庫管理ロジックの改善（互換性維持）
- ポイント使用タイミングの変更（ユーザー体験向上）

### 5.2 新規追加機能
- pending予約管理画面（実装可能）
- 決済再試行ボタン（実装可能）
- 在庫仮押さえ状況の可視化（実装可能）

## 6. 監視項目

### 6.1 メトリクス
- pending予約の発生率と解決率
- 決済成功率の推移
- 在庫仮押さえのタイムアウト率

### 6.2 アラート設定推奨
- pending予約が一定数を超えた場合
- 自動クリーンアップの失敗
- 在庫の不整合検出

## 7. 今後の改善提案

### 7.1 短期的改善
1. 決済失敗通知メールテンプレートの作成
2. 管理画面でのpending予約一覧表示
3. 決済再試行UI の実装

### 7.2 中長期的改善
1. 決済プロバイダーの多様化
2. 予約のキューイングシステム
3. より高度な在庫予測・最適化

## 8. ドキュメント更新

以下のドキュメントを更新済み：
- [x] PAYMENT_FAILURE_FLOW.md - 実装内容を反映
- [x] RESERVATION_CREATION_GUIDE.md - 新しいフローを追記
- [x] 本報告書の作成

## 9. まとめ

決済失敗時の主要な問題をすべて解決し、より堅牢な予約システムを実現しました。実装は以下の原則に基づいています：

1. **失敗を前提とした設計** - 各段階でのロールバック可能
2. **最終的な整合性** - 一時的な不整合を許容し、最終的に正しい状態へ
3. **ユーザー体験の向上** - 失敗時も適切なフィードバックと復旧手段を提供

実装は本番環境での運用に耐えうる品質を確保しており、今後の機能拡張にも対応可能な設計となっています。

---

実装者: Claude
レビュー待ち: 開発チーム