# 予約・決済処理統合ガイド

最終更新日: 2025年1月

## 1. 概要

本ガイドは、Bocker（ブッカー）の予約作成・キャンセル・決済処理の統合的な実装方針を定めます。Webhookベースの処理を中心に、シンプルで効率的な実装を目指します。

## 2. アーキテクチャ方針

### 2.1 基本原則

1. **Webhookファースト**: Stripe Webhookを主要な状態遷移トリガーとして使用
2. **楽観的在庫管理**: 予約作成時に即座に在庫を減算し、失敗時に復元
3. **最小限のCronジョブ**: Webhookのフォールバックとしてのみ使用（5分間隔）
4. **統合エンドポイント**: `/api/webhook/stripe`に一本化（レガシーエンドポイントは廃止予定）

### 2.2 データフロー

```
[顧客] → [予約作成] → [在庫減算] → [Stripe決済]
                                      ↓
                            [Webhook: 成功/失敗]
                                      ↓
                         [予約確定 or キャンセル+在庫復元]
```

## 3. 予約作成処理

### 3.1 実装フロー

```typescript
// convex/reservation/mutation.ts
export const create = mutation({
  handler: async (ctx, args) => {
    // 1. ダブルブッキング防止チェック
    const conflicts = await checkTimeSlotConflicts(ctx, args);
    if (conflicts.length > 0) {
      throw new Error("この時間帯は予約できません");
    }

    // 2. 在庫を楽観的に減算
    for (const optionId of args.option_ids) {
      const option = await ctx.db.get(optionId);
      if (!option || option.in_stock < 1) {
        throw new Error("在庫不足");
      }
      await ctx.db.patch(optionId, {
        in_stock: option.in_stock - 1,
        updated_at: Date.now(),
      });
    }

    // 3. 予約作成（pending状態）
    const reservation = {
      ...args,
      status: args.payment_method === 'cash' ? 'confirmed' : 'pending',
      payment_status: args.payment_method === 'cash' ? 'pending' : 'pending',
      pending_expiry: Date.now() + 30 * 60 * 1000, // 30分
      intended_point_use: args.usePoints || 0, // ポイントは決済成功後に使用
    };

    const reservationId = await ctx.db.insert('reservation', reservation);

    // 4. 現金決済の場合は即座に通知
    if (args.payment_method === 'cash') {
      // 非同期で通知送信（エラーは無視）
      ctx.scheduler.runAfter(0, internal.notification.sendReservationConfirmation, {
        reservationId,
      });
    }

    return reservationId;
  },
});
```

### 3.2 決済処理統合

```typescript
// app/api/stripe/checkout/route.ts
export async function POST(request: NextRequest) {
  const { reservationId, returnUrl, cancelUrl } = await request.json();

  // Checkout Session作成
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [...],
    mode: 'payment',
    success_url: returnUrl,
    cancel_url: cancelUrl,
    metadata: {
      reservationId,
      tenantId,
      orgId,
      customerUid,
    },
  });

  return NextResponse.json({ url: session.url });
}
```

## 4. Webhook処理（決済結果の処理）

### 4.1 統合Webhookハンドラー

```typescript
// services/webhook/stripe/handlers.checkout.ts
export async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const { reservationId, customerUid } = session.metadata;

  // 1. 予約確定
  await fetchMutation(api.reservation.payment.confirmPayment, {
    reservation_id: reservationId,
    stripe_payment_intent_id: session.payment_intent,
  });

  // 2. ポイント使用処理（intended_point_useを実際に使用）
  const reservation = await fetchQuery(api.reservation.query.getById, { 
    reservationId 
  });
  
  if (reservation.intended_point_use > 0) {
    await pointTransactionRepo.create({
      customer_id: customerUid,
      points: -reservation.intended_point_use,
      transaction_type: 'used',
      reservation_id: reservationId,
    });
  }

  // 3. 通知送信（エラーは無視）
  await Promise.allSettled([
    sendReservationConfirmationEmail(...),
    sendLineNotification(...),
  ]);

  // 4. 30日後のポイント付与予約
  await schedulePointAward(reservationId, 30);
}

export async function handlePaymentIntentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const { reservationId } = paymentIntent.metadata;

  // 予約キャンセル（在庫復元含む）
  await fetchMutation(api.reservation.mutation.cancelReservation, {
    reservationId,
    cancelledBy: 'system',
    cancelReason: '決済失敗',
  });
}

export async function handleCheckoutSessionExpired(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const { reservationId } = session.metadata;

  // 予約キャンセル（在庫復元含む）
  await fetchMutation(api.reservation.mutation.cancelReservation, {
    reservationId,
    cancelledBy: 'system',
    cancelReason: '決済タイムアウト',
  });
}
```

### 4.2 必要なWebhookイベント

- `checkout.session.completed`: 決済成功時の予約確定
- `payment_intent.payment_failed`: 決済失敗時の即座キャンセル
- `checkout.session.expired`: セッション期限切れ時のキャンセル

## 5. キャンセル処理

### 5.1 統一キャンセルMutation

```typescript
// convex/reservation/mutation.ts
export const cancelReservation = mutation({
  args: {
    reservationId: v.id("reservation"),
    cancelledBy: v.string(), // 'customer' | 'staff' | 'system'
    cancelReason: v.optional(v.string()),
    skipValidation: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    
    // 1. バリデーション
    if (!reservation || !['confirmed', 'pending'].includes(reservation.status)) {
      throw new Error("キャンセルできない予約です");
    }

    // 2. キャンセル期限チェック（顧客のみ）
    if (args.cancelledBy === 'customer' && !args.skipValidation) {
      const cancelDeadline = reservation.start_time_unix - 
        (config.available_cancel_days * 24 * 60 * 60 * 1000);
      if (Date.now() > cancelDeadline) {
        throw new Error("キャンセル期限を過ぎています");
      }
    }

    // 3. ステータス更新
    await ctx.db.patch(args.reservationId, {
      status: 'cancelled',
      cancelled_at: Date.now(),
      cancelled_by: args.cancelledBy,
      cancel_reason: args.cancelReason,
    });

    // 4. 在庫復元
    const detail = await getReservationDetail(ctx, args.reservationId);
    if (detail?.options) {
      for (const opt of detail.options) {
        const option = await ctx.db.get(opt.id);
        if (option) {
          await ctx.db.patch(opt.id, {
            in_stock: option.in_stock + opt.quantity,
          });
        }
      }
    }

    return { success: true };
  },
});
```

### 5.2 API Route（外部連携処理）

```typescript
// app/api/reservation/cancel/route.ts
export async function POST(request: NextRequest) {
  const { reservationId, reason } = await request.json();

  // 1. Convexでキャンセル処理
  await fetchMutation(api.reservation.mutation.cancelReservation, {
    reservationId,
    cancelledBy: isStaff ? 'staff' : 'customer',
    cancelReason: reason,
  });

  // 2. 外部システム連携（並列処理、エラーは許容）
  await Promise.allSettled([
    // ポイント返還
    handlePointRefund(reservation),
    // Stripe返金
    handleStripeRefund(reservation),
    // 通知送信
    sendCancellationNotification(reservation),
  ]);

  return NextResponse.json({ success: true });
}
```

## 6. フォールバック処理（最小限のCronジョブ）

### 6.1 期限切れPending予約のクリーンアップ

```typescript
// convex/crons.ts
crons.interval(
  "cleanup_expired_pending",
  { minutes: 5 }, // 5分間隔
  internal.reservation.payment.cleanupExpiredPendingReservations
);

// convex/reservation/payment.ts
export const cleanupExpiredPendingReservations = internalMutation({
  handler: async (ctx) => {
    const expired = await ctx.db
      .query('reservation')
      .withIndex('by_status_pending_expiry_archive')
      .filter(q => q.and(
        q.eq(q.field('status'), 'pending'),
        q.lt(q.field('pending_expiry'), Date.now()),
        q.eq(q.field('is_archive'), false)
      ))
      .take(100); // バッチサイズ制限

    for (const reservation of expired) {
      await ctx.runMutation(internal.reservation.mutation.cancelReservation, {
        reservationId: reservation._id,
        cancelledBy: 'system',
        cancelReason: 'Webhook未受信によるタイムアウト',
      });
    }
  },
});
```

## 7. エラーハンドリングとリカバリー

### 7.1 部分的失敗の許容

```typescript
// 重要な処理とそうでない処理を分離
const criticalOperations = [
  updateReservationStatus(),
  restoreInventory(),
];

const nonCriticalOperations = [
  sendEmail(),
  sendLineMessage(),
  updateAnalytics(),
];

// 重要な処理は必ず成功させる
await Promise.all(criticalOperations);

// 非重要な処理は失敗を許容
await Promise.allSettled(nonCriticalOperations);
```

### 7.2 べき等性の保証

- Stripe Webhookの重複処理防止（event.idで管理）
- キャンセル済み予約の再キャンセル防止
- 在庫の二重復元防止

## 8. パフォーマンス最適化

### 8.1 インデックス戦略

```typescript
// 効率的なクエリのためのインデックス
.index('by_status_pending_expiry_archive', ['status', 'pending_expiry', 'is_archive'])
.index('by_staff_start_time_archive', ['staff_id', 'start_time_unix', 'is_archive'])
.index('by_customer_status_archive', ['customer_id', 'status', 'is_archive'])
```

### 8.2 バッチ処理の最適化

- Cronジョブは100件ずつ処理（メモリ効率）
- 5分間隔で実行（リアルタイム性とリソースのバランス）

## 9. 実装チェックリスト

### Phase 1: 基本実装 ✅
- [x] 楽観的在庫管理の実装
- [x] 統合Webhookハンドラーの実装
- [x] 統一キャンセルMutationの実装
- [x] 最小限のCronジョブ設定

### Phase 2: 最適化
- [ ] レガシーWebhookエンドポイントの廃止
- [ ] キャンセル料金の実装

## 10. まとめ

本実装により、以下を実現します：

1. **シンプルな実装**: 楽観的在庫管理により複雑なテーブル管理が不要
2. **高い信頼性**: Webhookベースで即座に状態遷移、Cronジョブでフォールバック
3. **優れたUX**: 決済失敗時も即座に在庫解放、他の顧客が予約可能
4. **保守性**: 統一されたキャンセル処理、明確なエラーハンドリング

重要なのは、Webhookを主体とし、Cronジョブは保険として最小限に留めることです。これにより、リアルタイム性と信頼性を両立させています。