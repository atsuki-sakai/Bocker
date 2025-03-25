import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "../helpers";
import { paginationOptsValidator } from "convex/server";
import { ERROR_CODES } from "../errors";
import { Doc } from "../_generated/dataModel";
import { MAX_POINTS } from "../../lib/constants";

// ポイントキューのバリデーション
function validatePointQueue(args: Partial<Doc<"point_task_queue">>) {
  if (args.points && args.points < 0) {
    throw new ConvexError({message: "ポイントは0以上で入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.points && args.points > MAX_POINTS) {
    throw new ConvexError({message: `ポイントは${MAX_POINTS}以下で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
}

// ポイントキューの追加
export const add = mutation({
  args: {
    reservationId: v.id("reservation"),
    customerId: v.id("customer"),
    points: v.optional(v.number()),
    scheduledFor_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // 予約の存在確認
      const reservation = await ctx.db.get(args.reservationId);
      if (!reservation) {
        console.error("指定された予約が存在しません", args.reservationId);
        throw new ConvexError({
          message: "指定された予約が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      // 顧客の存在確認
      const customer = await ctx.db.get(args.customerId);
      if (!customer) {
        console.error("指定された顧客が存在しません", args.customerId);
        throw new ConvexError({
          message: "指定された顧客が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      validatePointQueue(args);
      const pointQueueId = await ctx.db.insert("point_task_queue", {
        ...args,
        isArchive: false,
      });
      return pointQueueId;
    } catch (error) {
      handleConvexApiError("ポイントキューの追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// ポイントキュー情報の更新
export const update = mutation({
  args: {
    pointQueueId: v.id("point_task_queue"),
    points: v.optional(v.number()),
    scheduledFor_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // ポイントキューの存在確認
      const pointQueue = await ctx.db.get(args.pointQueueId);
      if (!pointQueue || pointQueue.isArchive) {
        throw new ConvexError({
          message: "指定されたポイントキューが存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // pointQueueId はパッチ対象から削除する
      delete updateData.pointQueueId;

      validatePointQueue(updateData);

      const newPointQueueId = await ctx.db.patch(args.pointQueueId, updateData);
      return newPointQueueId;
    } catch (error) {
      handleConvexApiError("ポイントキュー情報の更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// ポイントキューの削除
export const trash = mutation({
  args: {
    pointQueueId: v.id("point_task_queue"),
  },
  handler: async (ctx, args) => {
    try {
      // ポイントキューの存在確認
      const pointQueue = await ctx.db.get(args.pointQueueId);
      if (!pointQueue) {
        throw new ConvexError({
          message: "指定されたポイントキューが存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      await trashRecord(ctx, pointQueue._id);
      return true;
    } catch (error) {
      handleConvexApiError("ポイントキューのアーカイブに失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const upsert = mutation({
  args: {
    pointQueueId: v.id("point_task_queue"),
    reservationId: v.id("reservation"),
    customerId: v.id("customer"),
    points: v.optional(v.number()),
    scheduledFor_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const existingPointQueue = await ctx.db.get(args.pointQueueId);

      if (!existingPointQueue || existingPointQueue.isArchive) {
        validatePointQueue(args);
        return await ctx.db.insert("point_task_queue", {
          ...args,
          isArchive: false,
        });
      } else {
        validatePointQueue(args);
        const updateData = removeEmptyFields(args);
        delete updateData.pointQueueId;
        return await ctx.db.patch(existingPointQueue._id, updateData);
      }
    } catch (error) {
      handleConvexApiError("ポイントキューの追加/更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const kill = mutation({
  args: {
    pointQueueId: v.id("point_task_queue"),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.pointQueueId);
    } catch (error) {
      handleConvexApiError("ポイントキューの削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// 予約IDからポイントキューを取得
export const getByReservationId = query({
  args: {
    reservationId: v.id("reservation"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("point_task_queue")
      .withIndex("by_reservation_id", (q) => q.eq("reservationId", args.reservationId).eq("isArchive", false))
      .first();
  },
});

// 顧客IDからポイントキューを取得
export const getByCustomerId = query({
  args: {
    customerId: v.id("customer"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("point_task_queue")
      .withIndex("by_customer_id", (q) => q.eq("customerId", args.customerId).eq("isArchive", false))
      .paginate(args.paginationOpts);
  },
});

// スケジュール日からポイントキューを取得
export const getByScheduledFor = query({
  args: {
    scheduledFor_unix: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("point_task_queue")
      .withIndex("by_scheduled_for", (q) => q.eq("scheduledFor_unix", args.scheduledFor_unix).eq("isArchive", false))
      .paginate(args.paginationOpts);
  },
});