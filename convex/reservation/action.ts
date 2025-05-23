"use node"

import { internalAction } from "@/convex/_generated/server";
import { v } from "convex/values";
import { api, internal } from "@/convex/_generated/api";
import { getSupabaseAdminService } from "@/services/supabase/SupabaseService";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { convertConvexToSupabaseRecord } from "@/services/supabase/utils/helper";
    
export const processReservationBatch = internalAction({
  args: {
    afterId: v.optional(v.id("reservation")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { afterId, limit = 500 }): Promise<{
    processed: number;
    nextCursor: Id<"reservation"> | undefined;
    isDone: boolean;
  }> => {
    const supabaseService = getSupabaseAdminService();
    try {
      // ① Convex からバッチ取得
      const { reservations, nextCursor, isDone } = await ctx.runQuery(
        api.reservation.query.syncReservationToSupabase,
        { cursor: afterId, limit }
      );
      if (reservations.length === 0) {
        return { processed: 0, nextCursor: undefined, isDone };
      }

      // Convexから取得したreservationsをSupabase用に変換
      const payloads = reservations.map((rec: Doc<"reservation">) => {
        const convertedTable = convertConvexToSupabaseRecord(rec, false, { stringifyArrays: true, dateToIso: true });
        const {
          _creation_time: rawCreation,
          updated_time: rawUpdated,
          _id,
          start_time_unix: rawStartTime,
          end_time_unix: rawEndTime,
          ...rest
        } = convertedTable;
        return {
          ...rest,
          _id,
          start_time_unix: rawStartTime !== undefined
            ? new Date(rawStartTime).toISOString()
            : null,
          end_time_unix: rawEndTime !== undefined
            ? new Date(rawEndTime).toISOString()
            : null,
          _creation_time: rawCreation !== undefined
            ? new Date(rawCreation).toISOString()
            : null,
          updated_time: rawUpdated !== undefined
            ? new Date(rawUpdated).toISOString()
            : null,
        };
      });
      await supabaseService.upsert("reservation", payloads, { onConflict: "_id" });

      // ③ Convex 側データ削除（mutation 経由）
      const ids = reservations.map((rec: Doc<"reservation">) => rec._id);
      await ctx.runMutation(internal.reservation.mutation.deleteReservationBatch, { ids });

      // ④ 次バッチ自己スケジュール
      if (!isDone) {
        await ctx.scheduler.runAfter(
          0,
          internal.reservation.action.processReservationBatch,
          { afterId: nextCursor ? (nextCursor as Id<"reservation">) : undefined, limit }
        );
      }

      return {
        processed: reservations.length,
        nextCursor: nextCursor ? (nextCursor as Id<"reservation">) : undefined,
        isDone
      };
    } catch (error) {
     
      await ctx.scheduler.runAfter(
        5000,
        internal.reservation.action.processReservationBatch,
        { afterId, limit }
      );
      throw error;
    }
  },
});