import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import {
  removeEmptyFields,
  killRecord,
  archiveRecord,
} from '@/services/convex/shared/utils/helper';
import { validatePointQueue, validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { throwConvexError } from '@/lib/error';
// ポイントキューの追加
export const create = mutation({
  args: {
    reservationId: v.id('reservation'),
    customerId: v.id('customer'),
    points: v.optional(v.number()),
    scheduledFor_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validatePointQueue(args);
    // 予約の存在確認
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      throw throwConvexError({
        message: '指定された予約が存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定された予約が存在しません',
        callFunc: 'point.task_queue.create',
        severity: 'low',
        details: { ...args },
      });
    }
    // 顧客の存在確認
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw throwConvexError({
        message: '指定された顧客が存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定された顧客が存在しません',
        callFunc: 'point.task_queue.create',
        severity: 'low',
        details: { ...args },
      });
    }

    const pointQueueId = await ctx.db.insert('point_task_queue', {
      ...args,
      isArchive: false,
    });
    return pointQueueId;
  },
});

// ポイントキュー情報の更新
export const update = mutation({
  args: {
    pointQueueId: v.id('point_task_queue'),
    points: v.optional(v.number()),
    scheduledFor_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validatePointQueue(args);
    // ポイントキューの存在確認
    const pointQueue = await ctx.db.get(args.pointQueueId);
    if (!pointQueue || pointQueue.isArchive) {
      throw throwConvexError({
        message: '指定されたポイントキューが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたポイントキューが存在しません',
        callFunc: 'point.task_queue.update',
        severity: 'low',
        details: { ...args },
      });
    }

    const updateData = removeEmptyFields(args);
    // pointQueueId はパッチ対象から削除する
    delete updateData.pointQueueId;

    const newPointQueueId = await ctx.db.patch(args.pointQueueId, updateData);
    return newPointQueueId;
  },
});

// ポイントキューの削除
export const archive = mutation({
  args: {
    pointQueueId: v.id('point_task_queue'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.pointQueueId, 'pointQueueId');

    return await archiveRecord(ctx, args.pointQueueId);
  },
});

export const upsert = mutation({
  args: {
    pointQueueId: v.id('point_task_queue'),
    reservationId: v.id('reservation'),
    customerId: v.id('customer'),
    points: v.optional(v.number()),
    scheduledFor_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validatePointQueue(args);
    const existingPointQueue = await ctx.db.get(args.pointQueueId);

    if (!existingPointQueue || existingPointQueue.isArchive) {
      validatePointQueue(args);
      return await ctx.db.insert('point_task_queue', {
        ...args,
        isArchive: false,
      });
    } else {
      validatePointQueue(args);
      const updateData = removeEmptyFields(args);
      delete updateData.pointQueueId;
      return await ctx.db.patch(existingPointQueue._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    pointQueueId: v.id('point_task_queue'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.pointQueueId, 'pointQueueId');

    return await killRecord(ctx, args.pointQueueId);
  },
});
