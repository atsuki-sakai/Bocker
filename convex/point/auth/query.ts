import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { validateRequiredNumber } from '@/services/convex/shared/utils/validation';
import { validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';

// 予約IDから予約ポイント認証を取得
export const findByReservationId = query({
  args: {
    reservationId: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    validateRequired(args.reservationId, 'reservationId');
    checkAuth(ctx, true);
    return await ctx.db
      .query('point_auth')
      .withIndex('by_reservation_id', (q) =>
        q.eq('reservationId', args.reservationId).eq('isArchive', false)
      )
      .first();
  },
});

// 顧客IDから予約ポイント認証を取得
export const findByCustomerId = query({
  args: {
    customerId: v.id('customer'),
  },
  handler: async (ctx, args) => {
    validateRequired(args.customerId, 'customerId');
    checkAuth(ctx, true);
    return await ctx.db
      .query('point_auth')
      .withIndex('by_customer_id', (q) =>
        q.eq('customerId', args.customerId).eq('isArchive', false)
      )
      .first();
  },
});

// 有効期限から予約ポイント認証を取得
export const findByExpirationTime = query({
  args: {
    expirationTime_unix: v.number(),
  },
  handler: async (ctx, args) => {
    validateRequiredNumber(args.expirationTime_unix, 'expirationTime_unix');
    checkAuth(ctx, true);
    return await ctx.db
      .query('point_auth')
      .withIndex('by_expiration_time', (q) =>
        q.eq('expirationTime_unix', args.expirationTime_unix).eq('isArchive', false)
      )
      .first();
  },
});
