# 在庫管理システム設計書

## 概要

本ドキュメントでは、Bockerの予約システムにおける在庫管理の実装設計について説明します。特に、決済処理中の在庫管理の課題と解決策について詳述します。

## 課題

### 現在の問題点

1. **在庫の二重予約問題**
   - ユーザーAとユーザーBが同時に最後の1個の商品を予約しようとした場合
   - 両方とも予約画面に進めてしまい、決済処理で競合が発生する

2. **決済タイムアウト問題**
   - ユーザーが決済画面で30分放置した場合
   - その間、他のユーザーは在庫があるのに予約できない

3. **キャンセル・失敗時の在庫戻し忘れ**
   - 決済失敗時に在庫数を戻す処理が漏れる可能性

## 解決策の比較

### 案1: option_stock_holdテーブルを使用する方法（複雑）

```
予約作成
├─ optionの在庫確認
├─ option_stock_holdに仮押さえレコード作成（expires_at付き）
├─ 決済処理
│  ├─ 成功: option_stock_holdをconfirmedに更新 → optionのin_stockを減算
│  └─ 失敗: option_stock_holdをreleasedに更新
└─ Cronジョブで期限切れの仮押さえを定期解放
```

**メリット:**
- 仮押さえの履歴が残る
- 複雑な在庫管理ロジックに対応可能
- デバッグが容易

**デメリット:**
- テーブルが増えて複雑
- クエリが増える
- 管理コストが高い

### 案2: optionテーブルのみで管理する方法（シンプル） ✅ 推奨

```
予約作成
├─ optionのin_stockを直接減算（楽観的アプローチ）
├─ reservationにpending_expiryを設定
├─ 決済処理
│  ├─ 成功: 何もしない（既に減算済み）
│  └─ 失敗: optionのin_stockを加算して戻す
└─ Cronジョブで期限切れpending予約をキャンセル → in_stockを戻す
```

**メリット:**
- シンプルで理解しやすい
- パフォーマンスが良い
- 管理が容易

**デメリット:**
- 仮押さえの履歴が残らない
- 在庫数の不整合リスク（適切な実装で回避可能）

## 推奨実装（案2：シンプルな方法）

### 1. スキーマ変更

```typescript
// convex/schema.ts
// option_stock_holdテーブルは作成しない

// reservationテーブルに既に追加済みのフィールドを活用
reservation: defineTable({
  // ... 既存フィールド
  intended_point_use: v.optional(v.number()), // 使用予定ポイント
  pending_expiry: v.optional(v.number()), // pending状態の有効期限
  // ... 
})
  // 期限切れpending予約を効率的に検索するためのインデックス
  .index('by_status_pending_expiry_archive', ['status', 'pending_expiry', 'is_archive'])
```

### 2. 予約作成フロー

```typescript
// convex/reservation/mutation.ts
export const create = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    // 1. オプションの在庫確認と減算
    for (const optionId of args.option_ids) {
      const option = await ctx.db.get(optionId);
      if (!option || option.in_stock < 1) {
        throw new Error('在庫不足');
      }
      
      // 楽観的に在庫を減算
      await ctx.db.patch(optionId, {
        in_stock: option.in_stock - 1,
        updated_at: Date.now(),
      });
    }

    // 2. 予約作成（pending状態、30分の有効期限付き）
    const reservationId = await ctx.db.insert('reservation', {
      ...args,
      status: 'pending',
      pending_expiry: Date.now() + 30 * 60 * 1000, // 30分後
      created_at: Date.now(),
    });

    return reservationId;
  },
});
```

### 3. 決済成功処理

```typescript
// convex/reservation/payment.ts
export const confirmPayment = mutation({
  args: { reservation_id: v.id('reservation') },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservation_id);
    if (!reservation || reservation.status !== 'pending') {
      return;
    }

    // statusをconfirmedに更新
    await ctx.db.patch(args.reservation_id, {
      status: 'confirmed',
      payment_status: 'paid',
      updated_at: Date.now(),
    });

    // ポイント使用処理
    if (reservation.intended_point_use > 0) {
      // Supabase側でポイント減算
    }

    // 在庫は既に減算済みなので何もしない
  },
});
```

### 4. 決済失敗・キャンセル処理

```typescript
// convex/reservation/mutation.ts
export const cancelReservation = mutation({
  args: {
    reservation_id: v.id('reservation'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservation_id);
    if (!reservation || reservation.status === 'cancelled') {
      return;
    }

    // 1. 予約をキャンセル
    await ctx.db.patch(args.reservation_id, {
      status: 'cancelled',
      cancelled_at: Date.now(),
      cancel_reason: args.reason,
      updated_at: Date.now(),
    });

    // 2. 在庫を戻す（pending/confirmedどちらの場合も）
    const detail = await ctx.db
      .query('reservation_detail')
      .withIndex('by_reservation_archive')
      .filter(q => q.eq(q.field('reservation_id'), args.reservation_id))
      .filter(q => q.eq(q.field('is_archive'), false))
      .unique();

    if (detail?.option_ids) {
      for (const optionId of detail.option_ids) {
        const option = await ctx.db.get(optionId);
        if (option) {
          await ctx.db.patch(optionId, {
            in_stock: option.in_stock + 1,
            updated_at: Date.now(),
          });
        }
      }
    }
  },
});
```

### 5. バッチ処理（Cronジョブ）

```typescript
// convex/reservation/payment.ts
export const cleanupExpiredPendingReservations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // 期限切れpending予約を取得
    const expiredReservations = await ctx.db
      .query('reservation')
      .withIndex('by_status_pending_expiry_archive', 
        q => q.eq('status', 'pending')
             .lt('pending_expiry', now)
             .eq('is_archive', false)
      )
      .collect();

    for (const reservation of expiredReservations) {
      // キャンセル処理を呼び出す（在庫戻しも含む）
      await ctx.runMutation(api.reservation.mutation.cancelReservation, {
        reservation_id: reservation._id,
        reason: 'payment_timeout',
      });
    }

    return { processed: expiredReservations.length };
  },
});
```

### 6. Cronジョブ設定

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 5分ごとに期限切れpending予約をクリーンアップ
crons.interval(
  "cleanup_expired_pending_reservations",
  { minutes: 5 },
  internal.reservation.payment.cleanupExpiredPendingReservations
);

export default crons;
```

## フロー図

### 正常系フロー
```
1. 予約作成
   ↓ in_stock -= 1
2. Stripe決済画面
   ↓
3. 決済成功
   ↓ status = 'confirmed'
4. 完了
```

### 異常系フロー（決済失敗）
```
1. 予約作成
   ↓ in_stock -= 1
2. Stripe決済画面
   ↓
3. 決済失敗/タイムアウト
   ↓ Webhookまたはバッチ処理
4. 予約キャンセル
   ↓ in_stock += 1
5. 在庫復元
```

## まとめ

`option_stock_hold`テーブルを作成せずに、シンプルに`option`テーブルの`in_stock`を直接増減させる方法で十分です。この方法により：

1. **実装がシンプル**: 理解しやすく、バグが発生しにくい
2. **パフォーマンスが良い**: 追加のテーブル参照が不要
3. **管理が容易**: 在庫数は常に`option`テーブルを見れば分かる

重要なのは、以下の処理を確実に実装することです：

- 予約作成時の在庫減算
- キャンセル/失敗時の在庫復元
- 期限切れpending予約の自動クリーンアップ

これにより、煩雑性を増やすことなく、堅牢な在庫管理システムを実現できます。