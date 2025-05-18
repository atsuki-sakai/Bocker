// convex/sync/reservation.ts
import { query } from "@/convex/_generated/server";
import { v } from "convex/values";

/**
 * バッチ同期向けカーソルベースページネーションを提供するクエリ
 *
 * - `cursor` が指定されていれば、そのカーソル以降のレコードを取得
 * - 取得件数は `limit` で決定（デフォルト 5,000）
 * - 結果と次カーソル、完了フラグを返却
 */
export const syncReservationToSupabase = query({
  args: {
    // paginate が期待するカーソルの型に変更
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { cursor, limit = 5000 }) => {
    
    let queryBuilder = ctx.db.query("reservation").withIndex("by_status_start_time", q => 
      q
      .eq("status", "completed")
      .lt("startTimeUnix", new Date().getTime())
    );
    // ページネーションを適用
    // cursor が null または undefined の場合、最初のページから取得
    const page = await queryBuilder.paginate({
      numItems: limit,
      cursor: cursor ?? null, // cursor が undefined の場合は null を渡す
    });
    const reservations = page.page;

    // 次カーソル
    const nextCursor = page.isDone ? null : page.continueCursor;

    // 完了判定
    const isDone = page.isDone;

    return { reservations, nextCursor, isDone };
  },
});