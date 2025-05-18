import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { validatePointQueue, validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';

// 予約IDからポイントキューを取得
export const findByReservationId = query({
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
export const findByCustomerId = query({
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
export const findByScheduledFor = query({
  args: {
    scheduledForUnix: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validatePointQueue(args);
    return await ctx.db
      .query('point_task_queue')
      .withIndex('by_scheduled_for', (q) =>
        q.eq('scheduledForUnix', args.scheduledForUnix).eq('isArchive', false)
      )
      .paginate(args.paginationOpts);
  },
});
