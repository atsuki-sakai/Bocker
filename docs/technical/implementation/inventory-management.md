# 在庫管理実装ガイド

最終更新日: 2025年6月

## 1. 概要

Bockerの在庫管理システムは、シンプルさと信頼性を重視した楽観的アプローチを採用しています。複雑な仮押さえテーブルを使用せず、`option`テーブルの`in_stock`フィールドを直接管理することで、実装の簡潔性とパフォーマンスを両立させています。

## 2. 設計方針

### 2.1 楽観的在庫管理

```
予約作成時: 在庫を即座に減算
決済成功時: 何もしない（既に減算済み）
決済失敗/キャンセル時: 在庫を復元
```

### 2.2 シンプルな実装の利点

1. **理解しやすい**: 在庫数は常に`option.in_stock`を見れば分かる
2. **高速**: 追加のテーブル参照が不要
3. **バグが少ない**: 複雑な状態管理が不要

## 3. 実装詳細

### 3.1 スキーマ定義

```typescript
// convex/schema.ts
export default defineSchema({
  option: defineTable({
    // ... 既存フィールド
    in_stock: v.union(v.number(), v.null()), // null = 在庫管理なし
    max_stock: v.optional(v.number()),
    low_stock_threshold: v.optional(v.number()),
    // ...
  })
    .index("by_menu_archive", ["menu_id", "is_archive"])
    .index("by_tenant_org_archive", ["tenant_id", "org_id", "is_archive"]),

  reservation: defineTable({
    // ... 既存フィールド
    pending_expiry: v.optional(v.number()), // pending状態の有効期限
    // ...
  })
    .index('by_status_pending_expiry_archive', ['status', 'pending_expiry', 'is_archive']),
});
```

### 3.2 在庫操作の実装

#### 予約作成時の在庫減算

```typescript
// convex/reservation/mutation.ts
export const create = mutation({
  handler: async (ctx, args) => {
    // 在庫確認と減算をアトミックに実行
    const stockOperations = [];
    
    for (const item of args.options) {
      const option = await ctx.db.get(item.optionId);
      
      // 在庫管理対象外の場合はスキップ
      if (option.in_stock === null) continue;
      
      // 在庫不足チェック
      if (option.in_stock < item.quantity) {
        throw new Error(`${option.name}の在庫が不足しています`);
      }
      
      // 在庫減算の準備
      stockOperations.push({
        id: item.optionId,
        newStock: option.in_stock - item.quantity,
      });
    }
    
    // すべての在庫を一括更新
    await Promise.all(
      stockOperations.map(op => 
        ctx.db.patch(op.id, {
          in_stock: op.newStock,
          updated_at: Date.now(),
        })
      )
    );
    
    // 予約作成
    const reservationId = await ctx.db.insert('reservation', {
      ...args,
      status: 'pending',
      pending_expiry: Date.now() + 30 * 60 * 1000, // 30分
    });
    
    return reservationId;
  },
});
```

#### キャンセル時の在庫復元

```typescript
// convex/reservation/mutation.ts
export const cancelReservation = mutation({
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) return;
    
    // 予約詳細から使用オプション情報を取得
    const detail = await ctx.db
      .query('reservation_detail')
      .withIndex('by_reservation_archive')
      .filter(q => q.and(
        q.eq(q.field('reservation_id'), args.reservationId),
        q.eq(q.field('is_archive'), false)
      ))
      .unique();
    
    if (!detail?.options) return;
    
    // 在庫復元
    const restoreOperations = detail.options.map(async (opt) => {
      const option = await ctx.db.get(opt.id);
      if (!option || option.in_stock === null) return;
      
      await ctx.db.patch(opt.id, {
        in_stock: option.in_stock + opt.quantity,
        updated_at: Date.now(),
      });
    });
    
    await Promise.all(restoreOperations);
    
    // 予約をキャンセル状態に更新
    await ctx.db.patch(args.reservationId, {
      status: 'cancelled',
      cancelled_at: Date.now(),
      cancelled_by: args.cancelledBy,
      cancel_reason: args.cancelReason,
    });
  },
});
```

### 3.3 在庫管理ヘルパー関数

```typescript
// convex/option/stock.ts
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// 在庫状況の確認
export const checkStockAvailability = query({
  args: {
    optionId: v.id("option"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const option = await ctx.db.get(args.optionId);
    if (!option) return { available: false, reason: "オプションが見つかりません" };
    
    // 在庫管理対象外
    if (option.in_stock === null) {
      return { available: true, unlimited: true };
    }
    
    // 在庫チェック
    if (option.in_stock < args.quantity) {
      return { 
        available: false, 
        reason: `在庫不足（残り${option.in_stock}個）`,
        currentStock: option.in_stock,
      };
    }
    
    // 低在庫警告
    const isLowStock = option.low_stock_threshold && 
      option.in_stock <= option.low_stock_threshold;
    
    return { 
      available: true,
      currentStock: option.in_stock,
      isLowStock,
    };
  },
});

// 在庫数の一括更新（管理画面用）
export const updateStockBulk = mutation({
  args: {
    updates: v.array(v.object({
      optionId: v.id("option"),
      newStock: v.union(v.number(), v.null()),
    })),
  },
  handler: async (ctx, args) => {
    const results = await Promise.allSettled(
      args.updates.map(async (update) => {
        const option = await ctx.db.get(update.optionId);
        if (!option) throw new Error("オプションが見つかりません");
        
        await ctx.db.patch(update.optionId, {
          in_stock: update.newStock,
          updated_at: Date.now(),
        });
        
        return { optionId: update.optionId, success: true };
      })
    );
    
    return results;
  },
});
```

### 3.4 期限切れ予約の自動処理

```typescript
// convex/reservation/payment.ts
export const cleanupExpiredPendingReservations = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    
    // 期限切れpending予約を効率的に取得
    const expiredReservations = await ctx.db
      .query('reservation')
      .withIndex('by_status_pending_expiry_archive')
      .filter(q => q.and(
        q.eq(q.field('status'), 'pending'),
        q.lt(q.field('pending_expiry'), now),
        q.eq(q.field('is_archive'), false)
      ))
      .take(100); // バッチサイズ制限
    
    // 各予約をキャンセル（在庫復元も実行される）
    const results = await Promise.allSettled(
      expiredReservations.map(reservation =>
        ctx.runMutation(internal.reservation.mutation.cancelReservation, {
          reservationId: reservation._id,
          cancelledBy: 'system',
          cancelReason: '決済タイムアウト',
        })
      )
    );
    
    return {
      processed: expiredReservations.length,
      succeeded: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
    };
  },
});
```

## 4. 在庫管理のベストプラクティス

### 4.1 同時実行制御

```typescript
// ダブルブッキング防止と同様の考え方で在庫競合を防ぐ
const createReservationWithStockCheck = mutation({
  handler: async (ctx, args) => {
    // トランザクション的な処理
    const stockChecks = await Promise.all(
      args.options.map(async (opt) => {
        const option = await ctx.db.get(opt.optionId);
        return {
          optionId: opt.optionId,
          requested: opt.quantity,
          available: option?.in_stock || 0,
          canFulfill: !option || option.in_stock === null || option.in_stock >= opt.quantity,
        };
      })
    );
    
    // 一つでも在庫不足があれば全体をキャンセル
    const insufficientStock = stockChecks.find(check => !check.canFulfill);
    if (insufficientStock) {
      throw new Error("在庫不足のため予約できません");
    }
    
    // すべてOKなら在庫減算と予約作成を実行
    // ...
  },
});
```
## 5. UI実装ガイド
在庫表示はOptionList.tsxで表示します。

## 7. パフォーマンス考慮事項

### 7.1 インデックス最適化

- `by_status_pending_expiry_archive`: 期限切れ予約の効率的な検索
- `by_menu_archive`: メニュー別オプションの高速取得

### 7.2 バッチ処理の最適化

- Cronジョブは100件ずつ処理してメモリ効率を保つ
- 5分間隔で実行してシステム負荷を分散

## 8. まとめ

楽観的在庫管理により、以下を実現しています：

1. **シンプルな実装**: 仮押さえテーブル不要で理解しやすい
2. **高いパフォーマンス**: 追加のテーブル参照が不要
3. **確実な在庫管理**: 予約作成・キャンセル時の在庫操作が確実
4. **優れたUX**: リアルタイムな在庫表示と即座の在庫解放

重要なのは、複雑さを排除し、本質的な機能に集中することです。これにより、バグの少ない、保守しやすいシステムを実現しています。