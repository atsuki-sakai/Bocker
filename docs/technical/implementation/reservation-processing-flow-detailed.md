# Bocker予約システム処理フロー詳細レポート

## 調査結果サマリー

`app/[locale]/(reservation)/reservation/[id]/calendar/page.tsx`における予約処理の詳細分析により、以下の複雑な処理フローが確認されました。

## 1. 主要な処理フロー概要

### 1.1 予約作成時のエントリーポイント

- **現金決済**: `handleConfirmReservation()` - `app/[locale]/(reservation)/reservation/[id]/calendar/page.tsx:637`
- **クレジット決済**: `processCreditCardPayment()` - `app/[locale]/(reservation)/reservation/[id]/calendar/page.tsx:339`

### 1.2 Convex側のメイン処理

- **予約作成**: `createReservationMutation` → `api.reservation.mutation.create` - `convex/reservation/mutation.ts:79`

## 2. 詳細な処理フロー分析

### 2.1 現金決済フロー（722行目〜）

#### A. 予約作成（Convex）

```typescript
const reservationId = await createReservationMutation(reservationDataForCash)
```

#### B. カルテ処理（Supabase）- 733行目〜

```typescript
// 1. カルテ取得または作成
const carte = await carteRepository.findOrCreateByCustomer(...)

// 2. LTV価格更新
const newLtvPrice = (carte.ltv_price || 0) + reservationDataForCash.total_price
await carteRepository.updateLtvPrice(carte.id, newLtvPrice)

// 3. カルテ詳細作成
await carteDetailRepository.createCarteDetail({
  reservation_id: reservationId,
  staff_id: reservationDataForCash.staff_id,
  total_price: reservationDataForCash.total_price,
  // ... その他詳細情報
})
```

#### C. オプション在庫調整（808行目〜）

```typescript
const optionCounts = countOptionOccurrences(selectedOptions)
for (const { id, quantity } of optionCounts) {
  await balanceStockMutation({
    option_id: id,
    quantity: -quantity, // 在庫減算
  })
}
```

#### D. ポイント処理（829行目〜）

```typescript
// アトミックポイント使用処理
if (usePoints > 0) {
  await customerRepository.updatePointsAtomic(
    sessionCustomer.customerUid,
    sessionCustomer.tenantId,
    organizationComplete.organization._id,
    -usePoints, // 使用は負の値
    'used',
    'ポイント使用による割引',
    reservationId
  )
}
```

#### E. クーポン利用履歴（849行目〜）

```typescript
if (appliedDiscount.couponId && appliedDiscount.discount > 0) {
  const response = await fetch('/api/coupon/create-transaction', {
    method: 'POST',
    body: JSON.stringify({
      tenant_id: sessionCustomer.tenantId,
      org_id: organizationComplete.organization._id,
      coupon_id: appliedDiscount.couponId,
      customer_id: customerData.customer.uid,
      reservation_id: reservationId,
      discount_amount: appliedDiscount.discount,
    }),
  })
}
```

#### F. LINE/メール通知（897行目〜）

```typescript
// LINE通知
if (sessionCustomer.lineUserId) {
  const flexMessages = reservationFlexMessageTemplate(...)
  await fetch('/api/line/flex-message', {
    method: 'POST',
    body: JSON.stringify({
      lineId: sessionCustomer?.lineUserId,
      messages: flexMessages,
      accessToken: organizationComplete.apiConfig?.line_access_token,
    }),
  })
}

// メール通知（フォールバック）
else if (sessionCustomer.email) {
  await fetch('/api/resend', {
    method: 'POST',
    body: JSON.stringify({
      to: sessionCustomer.email,
      subject: mailSubject,
      templateProps: emailTemplateProps,
    }),
  })
}
```

#### G. ポイント付与タスク作成（1043行目〜）

```typescript
if (earnPoints > 0) {
  const scheduledForUnix = Math.floor(reservationStartDateTime.getTime() / 1000) + 60 * 60 * 24 * 30 // 30日後

  const pointQueue = await pointTaskQueueRepository.createPointTask({
    tenant_id: sessionCustomer.tenantId,
    org_id: organizationComplete.organization._id,
    reservation_id: reservationId,
    customer_id: customerData.customer.uid,
    points: earnPoints,
    scheduled_for_unix: scheduledForUnix,
  })
}
```

### 2.2 クレジット決済フロー（339行目〜）

#### A. 予約作成（pending状態）

```typescript
const reservationId = await createReservationMutation({
  ...reservationData,
  status: 'pending',
  intended_point_use: usePoints, // 使用予定ポイント
  pending_duration_minutes: 30, // 30分有効期限
})
```

#### B. カルテ処理（393行目〜）

現金決済と同様の処理

#### C. Stripe決済処理（497行目〜）

```typescript
// ラインアイテム作成（割引適用）
const stripeLineItems = lineItemsRaw.map(item => {
  let discountedPrice = item.originalPrice
  if (totalDiscountAmount > 0) {
    const itemDiscountShare = (item.originalPrice / subtotalBeforeDiscount) * totalDiscountAmount
    discountedPrice = Math.max(0, item.originalPrice - itemDiscountShare)
  }
  return {
    price_data: {
      currency: 'jpy',
      product_data: { name: item.name },
      unit_amount: Math.round(discountedPrice),
    },
    quantity: 1,
  }
})

// Stripe Checkout セッション作成
const response = await fetch('/api/stripe/checkout', {
  method: 'POST',
  body: JSON.stringify({
    stripeConnectId: organizationComplete.organization.stripe_account_id,
    reservationId,
    lineItems: stripeLineItems,
    couponId: appliedDiscount.couponId,
    pointsUsedAmount: usePoints,
  }),
})
```

## 3. Convex側の詳細処理

### 3.1 重複チェック機能

```typescript
// convex/reservation/mutation.ts:147
const isOverlapping = await checkReservationDoubleBooking(ctx, {
  tenant_id: args.tenant_id,
  org_id: args.org_id,
  staff_id: args.staff_id,
  date: args.date,
  start_time_unix: args.start_time_unix,
  end_time_unix: args.end_time_unix,
})
```

### 3.2 楽観的在庫管理

```typescript
// convex/reservation/mutation.ts:176
if (args.options && args.options.length > 0) {
  const stockResult = await ctx.runMutation(internal.option.stock.decrementStockForReservation, {
    options: args.options.map(opt => ({
      id: opt.id,
      quantity: opt.quantity,
    })),
  })
}
```

### 3.3 予約レコード作成

```typescript
// convex/reservation/mutation.ts:201
const { reservationId } = await createReservationWithDetails(ctx, {
  ...args,
  intended_point_use: args.intended_point_use || args.use_points,
  pending_expiry,
})
```

## 4. 問題点と改善提案

### 4.1 現在の問題点

#### RPC数の多さ

- 1回の予約作成で8-15回のRPCが発生
- 特にオプション在庫調整で個別にRPCを実行

#### 処理の分散

- Convex、Supabase、外部APIにまたがる複雑な処理
- エラー時の部分失敗リスク

#### 重複処理

- カルテ処理がクレジット/現金で重複実装
- 顧客情報更新も重複

### 4.2 最適化提案

#### A. 統合ミューテーション作成

```typescript
// 新しい統合ミューテーション
export const createReservationComplete = mutation({
  handler: async (ctx, args) => {
    // 1. 予約作成
    // 2. カルテ処理
    // 3. 在庫調整
    // 4. ポイント処理
    // 5. 通知タスク登録
    // すべてを1つのトランザクションで実行
  }
})
```

#### B. バッチ処理の活用

```typescript
// オプション在庫の一括更新
export const batchUpdateOptionStock = mutation({
  handler: async (ctx, options) => {
    // Promise.allで並列処理
    await Promise.all(options.map(opt =>
      ctx.db.patch(opt.id, { in_stock: opt.newStock })
    ))
  }
})
```

#### C. サービス層の統合

```typescript
class ReservationService {
  async createReservation(data) {
    // 1. Convex予約作成
    // 2. Supabase処理
    // 3. 外部API呼び出し
    // 統合的なエラーハンドリング
  }
}
```

## 5. パフォーマンス改善案

### 5.1 即座実行すべき処理

- 予約作成（Convex）
- 在庫調整（楽観的ロック）
- 重複チェック

### 5.2 非同期処理化すべき処理

- カルテ作成
- ポイント使用
- 通知送信
- クーポン履歴作成

### 5.3 推奨アーキテクチャ

```typescript
// メイン処理（同期）
const reservation = await createCoreReservation(data)

// 副次処理（非同期）
scheduler.runAfter(0, internal.reservation.processPostReservation, {
  reservationId: reservation.id,
  // その他必要なデータ
})
```

## まとめ

この分析により、現在の処理は機能的には完全ですが、パフォーマンスとメンテナンス性の観点で改善の余地があることが判明しました。特に以下の点に注力した最適化が推奨されます：

1. **統合ミューテーションによるRPC削減**
2. **非同期処理による応答性向上**
3. **共通処理の統合によるコード重複排除**
4. **エラーハンドリングの統一化**

これらの改善により、予約作成処理の性能向上とメンテナンス性の改善が期待できます。