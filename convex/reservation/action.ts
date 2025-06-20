"use node"

import { internalAction } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { PointTaskQueueRepository } from '@/services/supabase/repositories/point';
import { SupabaseService } from '@/services/supabase/SupabaseService';
import { createClient } from '@supabase/supabase-js';

// import { internalAction } from "@/convex/_generated/server";
// import { v } from "convex/values";
// import { api, internal } from "@/convex/_generated/api";
// import { getSupabaseAdminService } from "@/services/supabase/SupabaseService";
// import { Id, Doc } from "@/convex/_generated/dataModel";
// import { convertConvexToSupabaseRecord } from "@/services/supabase/utils/helper";
    
// export const processReservationBatch = internalAction({
//   args: {
//     afterId: v.optional(v.id("reservation")),
//     limit: v.optional(v.number()),
//   },
//   handler: async (ctx, { afterId, limit = 500 }): Promise<{
//     processed: number;
//     nextCursor: Id<"reservation"> | undefined;
//     isDone: boolean;
//   }> => {
//     const supabaseService = getSupabaseAdminService();
//     try {
//       // ① Convex からバッチ取得
//       const { reservations, nextCursor, isDone } = await ctx.runQuery(
//         api.reservation.query.syncReservationToSupabase,
//         { cursor: afterId, limit }
//       );
//       if (reservations.length === 0) {
//         return { processed: 0, nextCursor: undefined, isDone };
//       }

//       // Convexから取得したreservationsをSupabase用に変換
//       const payloads = reservations.map((rec: Doc<"reservation">) => {
//         const convertedTable = convertConvexToSupabaseRecord(rec, false, { stringifyArrays: true, dateToIso: true });
//         const {
//           _creation_time: rawCreation,
//           updated_time: rawUpdated,
//           _id,
//           start_time_unix: rawStartTime,
//           end_time_unix: rawEndTime,
//           ...rest
//         } = convertedTable;
//         return {
//           ...rest,
//           _id,
//           start_time_unix: rawStartTime !== undefined
//             ? new Date(rawStartTime).toISOString()
//             : null,
//           end_time_unix: rawEndTime !== undefined
//             ? new Date(rawEndTime).toISOString()
//             : null,
//           _creation_time: rawCreation !== undefined
//             ? new Date(rawCreation).toISOString()
//             : null,
//           updated_time: rawUpdated !== undefined
//             ? new Date(rawUpdated).toISOString()
//             : null,
//         };
//       });
//       await supabaseService.upsert("reservation", payloads, { onConflict: "_id" });

//       // ③ Convex 側データ削除（mutation 経由）
//       const ids = reservations.map((rec: Doc<"reservation">) => rec._id);
//       await ctx.runMutation(internal.reservation.mutation.deleteReservationBatch, { ids });

//       // ④ 次バッチ自己スケジュール
//       if (!isDone) {
//         await ctx.scheduler.runAfter(
//           0,
//           internal.reservation.action.processReservationBatch,
//           { afterId: nextCursor ? (nextCursor as Id<"reservation">) : undefined, limit }
//         );
//       }

//       return {
//         processed: reservations.length,
//         nextCursor: nextCursor ? (nextCursor as Id<"reservation">) : undefined,
//         isDone
//       };
//     } catch (error) {
     
//       await ctx.scheduler.runAfter(
//         5000,
//         internal.reservation.action.processReservationBatch,
//         { afterId, limit }
//       );
//       throw error;
//     }
//   },
// });

/**
 * 予約IDに紐づくポイントタスクを削除する
 * キャンセル時にポイント付与を阻止するために使用
 */
export const deletePointTaskForReservation = internalAction({
  args: {
    tenant_id: v.string(),
    org_id: v.string(),
    reservation_id: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Supabase管理者クライアントを作成
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const supabaseService = new SupabaseService(supabase);
      const pointTaskQueueRepo = new PointTaskQueueRepository(supabaseService);
      
      // 予約に紐づくポイントタスクを検索
      const pointTask = await pointTaskQueueRepo.findByReservation(
        args.tenant_id,
        args.org_id,
        args.reservation_id
      );
      
      if (pointTask && pointTask.status === 'pending') {
        // タスクがpending状態の場合のみ削除
        await pointTaskQueueRepo.delete('id', pointTask.id);
        console.log(`ポイントタスクを削除しました: ${pointTask.id} (予約ID: ${args.reservation_id})`);
        return { deleted: true, taskId: pointTask.id };
      }
      
      console.log(`削除対象のポイントタスクが見つかりませんでした: 予約ID ${args.reservation_id}`);
      return { deleted: false, reason: 'task_not_found_or_not_pending' };
      
    } catch (error) {
      console.error('ポイントタスク削除エラー:', error);
      throw error;
    }
  },
});