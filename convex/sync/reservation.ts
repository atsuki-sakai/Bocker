// convex/sync/reservation.ts
import { query } from "@/convex/_generated/server";
import { v } from "convex/values";

/**
 * バッチ同期向けカーソルベースページネーションを提供するクエリ
 *
 * - `afterId` が指定されていれば、その ID よりも前のレコードを取得
 * - 取得件数は `limit` で決定（デフォルト 5,000）
 * - 結果と次カーソル、完了フラグを返却
 */
export const syncReservationToSupabase = query({
  args: {
    afterId: v.optional(v.id("reservation")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { afterId, limit = 5000 }) => {
    // ソート順を降順（最新から）に設定
    let q = ctx.db.query("reservation").order("desc");

    // afterId があればカーソルとして使用
    if (afterId) {
      q = q.filter((r) => r.lt(r.field("_id"), afterId));
    }

    // 指定件数を取得
    const reservations = await q.take(limit);

    // 次カーソル (最後に取得したレコードの _id) を算出
    const nextCursor = reservations.length > 0
      ? reservations[reservations.length - 1]._id
      : null;

    // 完了判定 (取得件数 < limit ならデータ終端)
    const isDone = reservations.length < limit;

    return { reservations, nextCursor, isDone };
  },
});