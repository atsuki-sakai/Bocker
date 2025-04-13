import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import {
  removeEmptyFields,
  killRecord,
  archiveRecord,
} from '@/services/convex/shared/utils/helper';
import { paginationOptsValidator } from 'convex/server';
import { validatePointQueue, validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';
// ポイントキューの追加
export const add = mutation({
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
      throw new ConvexCustomError('low', '指定された予約が存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    // 顧客の存在確認
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new ConvexCustomError('low', '指定された顧客が存在しません', 'NOT_FOUND', 404, {
        ...args,
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
      throw new ConvexCustomError(
        'low',
        '指定されたポイントキューが存在しません',
        'NOT_FOUND',
        404,
        {
          ...args,
        }
      );
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

// 予約IDからポイントキューを取得
export const getByReservationId = query({
  args: {
    reservationId: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.reservationId, 'reservationId');
    return await ctx.db
      .query('point_task_queue')
      .withIndex('by_reservation_id', (q) =>
        q.eq('reservationId', args.reservationId).eq('isArchive', false)
      )
      .first();
  },
});

// 顧客IDからポイントキューを取得
export const getByCustomerId = query({
  args: {
    customerId: v.id('customer'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validatePointQueue(args);
    return await ctx.db
      .query('point_task_queue')
      .withIndex('by_customer_id', (q) =>
        q.eq('customerId', args.customerId).eq('isArchive', false)
      )
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
    checkAuth(ctx);
    validatePointQueue(args);
    return await ctx.db
      .query('point_task_queue')
      .withIndex('by_scheduled_for', (q) =>
        q.eq('scheduledFor_unix', args.scheduledFor_unix).eq('isArchive', false)
      )
      .paginate(args.paginationOpts);
  },
});