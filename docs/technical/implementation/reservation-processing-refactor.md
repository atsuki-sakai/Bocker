# 予約処理リファクタリング実装ガイド

**最終更新**: 2025-06-26  
**作業対象リリース**: v2.1.x

---

## 0. 目的

1. 予約関連の **重複ロジックを集約** し、保守性・拡張性を高める。
2. クーポン／ポイント／在庫／カルテ更新など **副次処理** を安全に実行するトランザクションフローへ統合。
3. Convex ↔ Supabase 間の **一貫性保証** と **エラーハンドリング標準化** を実現。

---

## 1. 現状実装の概要

| 処理フェーズ | 主体ファイル | 場所 | 備考 |
|--------------|-------------|------|------|
| 予約作成（顧客画面） | `app/[locale]/(reservation)/reservation/[id]/calendar/page.tsx` | **frontend** | 現金／カード分岐
| 予約作成（管理画面） | `app/[locale]/(dashboard)/dashboard/reservation/add/ReservationForm.tsx` | **frontend** | 現金のみ
| カード決済確定 | `services/webhook/stripe/handlers.checkout.ts` | **backend** | Checkout 完了時 `confirmPayment`
| キャンセル（顧客） | `app/api/reservation/cancel/route.ts` | **backend** | Convex `cancelReservation` 呼び出し
| ステータス変更（スタッフ） | `app/[locale]/(dashboard)/dashboard/reservation/[reservation_id]/page.tsx` | **frontend** | Convex `updateStatus` 呼び出し(これがトリガーとなりステータス毎の処理が実行される)

副次処理（クーポン履歴作成・在庫調整・カルテ更新・ポイント処理 etc.）が **各 UI / Webhook で分散実装** されている。

---

## 2. 主な課題

1. **ロジック重複** – 予約作成/更新処理が 3 ファイルに分散。
2. **副次処理失敗時のRollback欠如** – Supabase 処理が失敗しても Convex 変更が確定してしまう。
3. **べき等性担保不足** – Webhook 重複時や再試行時にポイント二重処理のリスク。
4. **在庫ロック粒度** – オプション在庫を UI から直接 `balanceStock` 呼び出し → レース発生の可能性。

---

## 3. 目標アーキテクチャ

```ascii
Frontend --> Convex(manage) : createOrUpdateReservation
Convex --> Convex : ① 衝突/在庫チェック + ロック
Convex --> Supabase : ② 副次処理 (カルテ/ポイント/クーポン)
Convex --> Frontend : 予約ID または Checkout URL

Stripe Webhook --> Convex(manage) : confirm / cancel
Convex --> Convex : 状態遷移 + 在庫復元
Convex --> Supabase : ポイント返還 / タスク削除
```

### キーポイント
- **Convex 統合 Mutation `reservation.manage`** を新設。
- 副次処理は **Convex Action** で Supabase Repository を順序制御。
- Webhook からも同一 Action を呼び出し **べき等性** を確保。

---

## 4. 実装ステップ詳細（拡張版）

以下は **ブランチ `feature/reservation-manage-mutation`** で作業する想定の
日次タスクレベルのチェックリストです。各ステップに最小限のサンプルコードを
示し、実プロジェクトにそのまま貼り付けられる形にしています。

> **記号説明**  
> 🛠️ = コード実装  
> ✅ = テスト項目  
> 🔄 = 既存コード修正/削除

### 4.1 Convex – `reservation.manage` Mutation 🛠️

```ts
// convex/reservation/mutation.ts
import { internalAction } from "convex/server";
import { v } from "convex/values";
import { performSideEffects } from "./action";

export const manage = mutation({
  args: {
    mode: v.union(
      v.literal("create"),
      v.literal("confirm"),
      v.literal("cancel"),
      v.literal("status")
    ),
    payload: v.any(),           // 各モード専用の型は後述
    idempotency_key: v.optional(v.string()),
  },
  handler: async (ctx, { mode, payload, idempotency_key }) => {
    // ① べき等性チェック
    if (idempotency_key) {
      const done = await ctx.db
        .query("webhook_events")
        .withIndex("idempotency", q => q.eq("key", idempotency_key))
        .unique();
      if (done) return done.result; // 以前の結果を返す
    }

    let result;
    await ctx.db.transact(async () => {
      switch (mode) {
        case "create":
          result = await createReservationCore(ctx, payload);
          break;
        case "confirm":
          result = await confirmReservationCore(ctx, payload);
          break;
        case "cancel":
          result = await cancelReservationCore(ctx, payload);
          break;
        case "status":
          result = await updateStatusCore(ctx, payload);
          break;
      }
    });

    // ② 副次処理 (失敗時は throw で roll-back)
    await ctx.runAction(internal.reservation.action.performSideEffects, {
      mode,
      payload,
      coreResult: result,
    });

    // ③ idempotency 保存 (エラーが出た場合はcatchで rollback 済)
    if (idempotency_key) {
      await ctx.db.insert("webhook_events", {
        key: idempotency_key,
        result,
        created_at: Date.now(),
      });
    }
    return result;
  },
});
```

### 4.2 Convex – `performSideEffects` Action 🛠️

```ts
// convex/reservation/action.ts
import { internalAction } from "convex/server";
import { SupabaseService } from "@/services/supabase/SupabaseService";
import { CustomerRepository } from "@/services/supabase/repositories/customer";
// … 他 repo import

export const performSideEffects = internalAction({
  args: { mode: v.string(), payload: v.any(), coreResult: v.any() },
  handler: async (ctx, { mode, payload, coreResult }) => {
    const sb = new SupabaseService();
    const customerRepo = new CustomerRepository(sb);

    // try/catch で soft-fail → Sentry
    try {
      switch (mode) {
        case "create":
          // カルテ作成など
          await sb.transaction(async (trx) => {
            await customerRepo.updateLastReservation(trx, /* … */);
            // … 他 repo 呼び出し
          });
          break;
        case "confirm":
          // ポイント使用 / クーポン履歴 / LTV 加算
          break;
        case "cancel":
          // ポイント返還 / 在庫復元は Core 内で完了済だが Supabase side など追加処理
          break;
      }
    } catch (e) {
      console.error("SideEffects error", e);
      Sentry.captureException(e);
      // ここで throw すると mutation も rollback
      throw e;
    }
  },
});
```

### 4.3 Frontend – 顧客予約画面 🔄

```ts
// before
const reservationId = await createReservationMutation(reservationData);

// after
const res = await manageReservationMutation({
  mode: "create",
  payload: reservationData,
});
const { reservationId, checkoutUrl } = res;
```

`manageReservationMutation` は Convex 生成 API (`api.reservation.mutation.manage`) を import。

### 4.4 Stripe Webhook 🛠️

```ts
// services/webhook/stripe/handlers.checkout.ts
await fetchMutation(api.reservation.mutation.manage, {
  mode: "confirm",
  payload: { reservation_id, stripe_payment_intent_id },
  idempotency_key: eventId,
});
```

### 4.5 API Cancel Route 🔄

```ts
await fetchMutation(api.reservation.mutation.manage, {
  mode: "cancel",
  payload: { reservationId, cancelledBy: "customer", cancelReason: reason },
});
```

### 4.6 Race Condition 対策 (Convex 内部) ✅

```ts
// 残在庫 >= 0 を保証
await ctx.db.patch(optionId, {
  stock: q.sub("stock", qty),
}).if(q.gte(q.field("stock"), qty));
```

これにより二重予約によるマイナス在庫を防止。

---

## 10. テスト & 監視 (更新) ✅

| 種類 | ツール | テスト内容例 |
|------|--------|-------------|
| Unit | Vitest | `createReservationCore` – 在庫が減る / 足りない時に throw |
| Unit | Vitest | `performSideEffects` – Supabase トランザクション commit/rollback |
| Integration | Cypress | 予約 → キャンセル → ポイント返還を UI で確認 |
| Webhook Replay | Stripe CLI | `checkout.session.completed` → status=confirmed & 副次処理 |
| Load | k6 | 100 rps で manage Mutation throughput 測定 |
| Observability | Sentry | error 発生時 stack trace が紐付くか |

---

## 11. 今後の改善余地 (改訂)

1. **Saga パターン** + 転送再試行のアウトボックス実装 (Supabase → Convex キュー)。
2. **在庫ホールドテーブル** で pending 中の確保状態を明示。
3. Supabase **Row Level Security** + アプリレイヤ JWT Claim(`tenant_id`) で強制分離。

---

## 12. データ操作マトリクス

各モード (`create / confirm / cancel / status`) において **どのエンティティをどの順序** で操作するのかを明示した一覧です。

| # | レイヤ | テーブル / コレクション | 操作 | 主キー | 主なフィールド | 補足 |
|---|--------|------------------------|------|--------|----------------|------|
| **CREATE** |
| 1 | Convex | `reservation` | insert | `_id` | `status:pending or confirmed`<br>`payment_status:pending`<br>`pending_expiry` | `createReservationCore` 内 |
| 2 | Convex | `reservation_detail` | insert | `_id` | `menus / options / total_price` | 予約本体作成直後 |
| 3 | Convex | `option` | patch (decrement) | `id` | `stock = stock - qty` | **if** `option.stock !== null` |
| 4 | Supabase | `carte` | upsert | `id` | `ltv_price` (加算しない) | `performSideEffects:create` |
| 5 | Supabase | `carte_detail` | insert | `id` | `menu_details / option_details / total_price` | |
| 6 | Supabase | `customer` | update | `uid` | `last_reservation_date_unix` (現金時のみ)<br>`total_reservation_count +1` | |

| **CONFIRM (決済成功)** |
| 1 | Convex | `reservation` | patch | `_id` | `status:confirmed`<br>`payment_status:paid` | `confirmReservationCore` |
| 2 | Convex | `option_stock_hold` *(将来)* | patch → delete |  | `status:confirmed` | |
| 3 | Supabase | `point_transaction` | insert | `id` | `points:-intended_point_use` | **if** intended_point_use>0 |
| 4 | Supabase | `customer_points` | update | `uid` | `total_points - intended_point_use` | |
| 5 | Supabase | `coupon_transaction` | insert | `id` | `discount_amount` | **if** coupon_discount>0 |
| 6 | Supabase | `carte.ltv_price` | update | `id` | `+ total_price` | |
| 7 | Supabase | `point_task_queue` | insert | `id` | `points: earnPoints`<br>`scheduled_for_unix: +30d` | **if** earnPoints>0 |

| **CANCEL** |
| 1 | Convex | `reservation` | patch | `_id` | `status:cancelled` | `cancelReservationCore` |
| 2 | Convex | `option` | patch (restore) | `id` | `stock = stock + qty` | |
| 3 | Supabase | `point_transaction` | insert | `id` | `points:+use_points` | **if** use_points>0 |
| 4 | Supabase | `customer_points` | update | `uid` | `total_points + use_points` | |
| 5 | Supabase | `point_task_queue` | delete | `reservation_id` |  | 未実行の付与タスクを削除 |
| 6 | Supabase | `coupon_transaction` | delete | `reservation_id` | | 任意 (ポリシー次第) |
| 7 | Supabase | `reservation` *(履歴DB)* | insert | `uid` | `_convex_id` 等 | バッチで移行 or Action で即時 |

| **STATUS (スタッフ手動変更)** |
| - | Convex | `reservation` | patch | `_id` | `status` | `updateStatusCore` |
| - | Supabase | (副次処理なし) |  |  |  | 完了→ポイント付与 実装予定 |

### 12.1 サンプル: `createReservationCore`

```ts
async function createReservationCore(ctx, p: CreateArgs) {
  // 1. 重複チェック
  const overlap = await ctx.db
    .query("reservation")
    .withIndex("by_staff_start_time_archive", q =>
      q.eq("staff_id", p.staff_id).eq("date", p.date).eq("is_archive", false)
    )
    .filter(q => q.and(
      q.lte(q.field("start_time_unix"), p.end_time_unix),
      q.gte(q.field("end_time_unix"), p.start_time_unix)
    ))
    .unique();
  if (overlap) throw new ConvexError({ code:"CONFLICT", message:"ダブルブッキング" });

  // 2. 在庫アトミック減算
  for (const opt of p.options) {
    await ctx.db.patch(opt.id, { stock: q.sub("stock", opt.quantity) })
      .if(q.gte(q.field("stock"), opt.quantity));
  }

  // 3. 予約&詳細作成
  const reservationId = await ctx.db.insert("reservation", {
    ...p,
    status: p.payment_method === "cash" ? "confirmed" : "pending",
    payment_status: "pending",
    _creationTime: Date.now(),
  });

  await ctx.db.insert("reservation_detail", {
    reservation_id: reservationId,
    ...pick(p, ["menus","options","total_price","payment_method"]),
    extra_charge: p.extra_charge ?? 0,
  });

  return { reservationId };
}
```

> **注意**: `q.sub()` と `.if()` は Convex v1.23 の [アトミック演算 API](https://docs.convex.dev/database/atomic) を使用。

### 12.2 Supabase トランザクション例

```ts
await supabase.transaction(async (trx) => {
  await trx.from("point_transaction").insert(pointRow);
  await trx.from("customer_points").update({
    total_points: trx.raw("total_points + ?", [deltaPts]),
    last_transaction_date_unix: Date.now(),
  }).eq("customer_uid", uid);
});
```

これにより Convex ↔ Supabase 間の **最小2PC** を実現。(Convex 側が先に commit し、副作用が失敗すると Rollback、成功すると Supabase commit)

---

これで「いつ・どのデータストア・どのテーブルをどう操作するか」が一目で追える構成になりました。

---

## 13. Core 関数サンプル実装

以下は **Convex v1.23** の構文に合わせたリファレンス実装です。
業務ロジックに応じてフィールド名やバリデータを調整してください。

> ⚠️ **注意**: 省略している補助関数（`pick` など）は util に実装済み前提。
>
> `Doc<"reservation">` など Convex の自動生成型を import して下さい。

### 13.1 `createReservationCore`

```ts
import { mutation, ConvexError } from "convex/server";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { q, v } from "convex/values";

export interface CreateArgs {
  tenant_id: Id<"tenant">;
  org_id: Id<"organization">;
  customer_id: string;
  staff_id: Id<"staff">;
  date: string;
  start_time_unix: number;
  end_time_unix: number;
  menus: { id: Id<"menu">; quantity: number; price: number }[];
  options: { id: Id<"option">; quantity: number; price: number }[];
  total_price: number;
  payment_method: "cash" | "credit_card";
  extra_charge?: number;
  coupon_id?: Id<"coupon">;
  coupon_discount?: number;
  intended_point_use?: number;
}

export async function createReservationCore(ctx: Ctx, p: CreateArgs) {
  // 1. スタッフ重複チェック
  const isOverlap = await ctx.db
    .query("reservation")
    .withIndex("by_staff_start_time_archive", q =>
      q.eq("staff_id", p.staff_id).eq("date", p.date).eq("is_archive", false)
    )
    .filter(q =>
      q.and(
        q.lte(q.field("start_time_unix"), p.end_time_unix),
        q.gte(q.field("end_time_unix"), p.start_time_unix)
      )
    )
    .unique();
  if (isOverlap)
    throw new ConvexError({ code: "CONFLICT", message: "ダブルブッキング" });

  // 2. 在庫アトミック減算
  for (const opt of p.options) {
    await ctx.db
      .patch(opt.id, { stock: q.sub("stock", opt.quantity) })
      .if(q.gte(q.field("stock"), opt.quantity));
  }

  // 3. reservation insert
  const reservationId = await ctx.db.insert("reservation", {
    ...pick(p, [
      "tenant_id",
      "org_id",
      "customer_id",
      "staff_id",
      "date",
      "start_time_unix",
      "end_time_unix",
      "total_price",
    ]),
    status: p.payment_method === "cash" ? "confirmed" : "pending",
    payment_status: "pending",
    stripe_checkout_session_id: undefined,
    pending_expiry:
      p.payment_method === "credit_card"
        ? Date.now() + 30 * 60 * 1000
        : undefined,
    intended_point_use: p.intended_point_use ?? 0,
    _creationTime: Date.now(),
  });

  // 4. reservation_detail insert
  await ctx.db.insert("reservation_detail", {
    reservation_id: reservationId,
    tenant_id: p.tenant_id,
    org_id: p.org_id,
    menus: p.menus,
    options: p.options,
    total_price: p.total_price,
    payment_method: p.payment_method,
    extra_charge: p.extra_charge ?? 0,
    coupon_id: p.coupon_id,
    coupon_discount: p.coupon_discount ?? 0,
  });

  return { reservationId };
}
```

### 13.2 `confirmReservationCore`

```ts
export async function confirmReservationCore(
  ctx: Ctx,
  { reservation_id, stripe_payment_intent_id }: { reservation_id: Id<"reservation">; stripe_payment_intent_id: string }
) {
  await ctx.db.patch(reservation_id, {
    status: "confirmed",
    payment_status: "paid",
    stripe_checkout_session_id: stripe_payment_intent_id,
  });
  return { reservationId: reservation_id };
}
```

### 13.3 `cancelReservationCore`

```ts
export async function cancelReservationCore(
  ctx: Ctx,
  args: { reservationId: Id<"reservation">; cancelledBy: string; cancelReason?: string }
) {
  const reservation = await ctx.db.get(args.reservationId);
  if (!reservation) throw new ConvexError("NOT_FOUND");

  // 在庫復元
  const detail = await ctx.db
    .query("reservation_detail")
    .withIndex("by_reservation_id", q => q.eq("reservation_id", args.reservationId))
    .unique();
  if (detail?.options) {
    for (const opt of detail.options) {
      await ctx.db.patch(opt.id, { stock: q.add("stock", opt.quantity) });
    }
  }

  await ctx.db.patch(args.reservationId, {
    status: "cancelled",
    cancelled_by: args.cancelledBy,
    cancel_reason: args.cancelReason,
  });

  return { reservationId: args.reservationId };
}
```

### 13.4 `updateStatusCore`

```ts
export async function updateStatusCore(ctx: Ctx, { reservationId, status }: { reservationId: Id<"reservation">; status: Status }) {
  await ctx.db.patch(reservationId, { status });
  return { reservationId };
}
```

### 13.5 `performSideEffects` 内の例 (ポイント使用)

```ts
if (mode === "confirm" && coreResult) {
  if (detail.intended_point_use > 0) {
    await trx.from("point_transaction").insert({
      tenant_id: detail.tenant_id,
      org_id: detail.org_id,
      reservation_id: detail.reservation_id,
      customer_id: customerUid,
      points: -detail.intended_point_use,
      transaction_type: "used",
      transaction_date_unix: Date.now(),
    });
    await trx.from("customer_points").update({
      total_points: trx.raw("total_points - ?", [detail.intended_point_use]),
    }).eq("customer_uid", customerUid);
  }
}
```

---

これらのコードをベースに、既存ファイルで TODO としてマークした箇所を置換すれば動作します。型ファイル・インデックスは既にスキーマに含まれている想定です。

---

## 14. ファイル別 CRUD 対応表 & 修正ポイント

| 区分 | ファイルパス | 既存実装行 | 今回の置換/追記 | CRUD 対象データ | 目的 |
|------|--------------|-----------|-----------------|----------------|------|
| Create | `app/[locale]/(reservation)/reservation/[id]/calendar/page.tsx` | `processCreditCardPayment()` 339行目〜 / `handleConfirmReservation()` 534行目〜 | `createReservationMutation` → `manageReservationMutation({mode:"create"})` | Convex:`reservation`,`reservation_detail`,`option` | UI 顧客予約作成を統合 Mutation に移行 |
| Create(Admin) | `app/[locale]/(dashboard)/dashboard/reservation/add/ReservationForm.tsx` | `createReservation` 呼び出し 1483行目〜 | 同上 | Convex:`reservation`,`reservation_detail`,`option` | 管理者予約作成統合 |
| Confirm | `services/webhook/stripe/handlers.checkout.ts` | `handleCheckoutSessionCompleted()` 1〜260行 | `confirmPayment` → `manage` mode:"confirm" | Convex:`reservation` Supabase:`point_transaction`,`coupon_transaction`,`carte` | 決済成功確定処理 |
| Cancel(API) | `app/api/reservation/cancel/route.ts` | 全体 | Convex call → `manage` mode:"cancel" | Convex:`reservation`,`option` Supabase:`point_transaction`,`customer_points`,`point_task_queue` | 顧客キャンセル |
| Status Update | `app/[locale]/(dashboard)/dashboard/reservation/[reservation_id]/page.tsx` | `handleUpdateStatus` 144行目〜 | `updateStatus` → `manage` mode:"status" | Convex:`reservation` | スタッフ手動ステータス変更 |
| Convex Core | `convex/reservation/mutation.ts` | 新規 | `manage` Mutation + `create / confirm / cancel / updateStatus` Core funcs | Convex:`reservation`,`reservation_detail`,`option` | 単一真実ソース |
| Convex SideFx | `convex/reservation/action.ts` | 新規 | `performSideEffects` | Supabase 各種 | 副次処理標準化 |
| Cron Cleanup | `convex/crons.ts` | 関数呼び替え | `cleanupExpiredPendingReservations` → `manage` mode:"cancel" | Convex, Supabase | ペンディング期限切れ処理 |

### 14.1 CRUD 対象データ早見表

| 操作 | Convex | Supabase | 外部API |
|------|--------|----------|---------|
| create | reservation (insert) <br> reservation_detail (insert) <br> option(stock--) | carte (upsert) <br> carte_detail (insert) <br> customer (update) | – |
| confirm | reservation (patch) | point_transaction (insert) <br> customer_points (update) <br> coupon_transaction (insert) <br> carte (ltv +) <br> point_task_queue (insert) | Line, Resend Mail |
| cancel | reservation (patch) <br> option(stock++) | point_transaction (refund insert) <br> customer_points (+) <br> point_task_queue (delete) | Line Mail (取消) |
| status | reservation (patch) | (将来) carte ltv / point_task_queue (完了時付与) | – |

> この表を「チェックリスト」として Pull Request の説明欄に貼り付けるとレビュアーが容易に確認できます。