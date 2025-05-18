// convex/sync/mutation.ts
import { internalMutation } from "@/convex/_generated/server";
import { v } from "convex/values";

export const deleteReservationBatch = internalMutation({
  args: {
    ids: v.array(v.id("reservation")),
  },
  handler: async (ctx, { ids }) => {
    // 存在しないドキュメント削除エラーをキャッチして無視
    await Promise.all(ids.map(async (id) => {
      try {
        await ctx.db.delete(id);
      } catch (e) {
        // ドキュメントが存在しない場合は無視
      }
    }));
  },
});