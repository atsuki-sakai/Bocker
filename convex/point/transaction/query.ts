import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import {
  validatePointTransaction,
  validateRequired,
} from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';

// サロンと予約IDからポイント取引を取得
export const getBySalonAndReservationId = query({
  args: {
    salonId: v.id('salon'),
    reservationId: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonId, 'salonId');
    validateRequired(args.reservationId, 'reservationId');
    return await ctx.db
      .query('point_transaction')
      .withIndex('by_salon_reservation_id', (q) =>
        q.eq('salonId', args.salonId).eq('reservationId', args.reservationId).eq('isArchive', false)
      )
      .first();
  },
});

// サロンと顧客IDからポイント取引を取得
export const getBySalonAndCustomerId = query({
  args: {
    salonId: v.id('salon'),
    customerId: v.id('customer'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonId, 'salonId');
    validateRequired(args.customerId, 'customerId');
    return await ctx.db
      .query('point_transaction')
      .withIndex('by_salon_customer_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('customerId', args.customerId)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// サロンと顧客と予約IDからポイント取引を取得
export const getBySalonCustomerAndReservation = query({
  args: {
    salonId: v.id('salon'),
    customerId: v.id('customer'),
    reservationId: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validatePointTransaction(args);
    return await ctx.db
      .query('point_transaction')
      .withIndex('by_salon_customer_reservation', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('customerId', args.customerId)
          .eq('reservationId', args.reservationId)
          .eq('isArchive', false)
      )
      .first();
  },
});
