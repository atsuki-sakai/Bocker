import { query } from '../../_generated/server';
import { v } from 'convex/values';
import { validateCoupon } from '../../../services/convex/shared/utils/validation';
import { checkAuth } from '../../../services/convex/shared/utils/auth';
import { couponService } from '../../../services/convex/services';
import { paginationOptsValidator } from 'convex/server';

export const list = query({
  args: {
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    includeArchive: v.optional(v.boolean()),
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCoupon(args);
    return await couponService.list(ctx, args);
  },
});

export const findByCouponUid = query({
  args: {
    salonId: v.id('salon'),
    couponUid: v.string(),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)
    validateCoupon(args);
    return await couponService.findByCouponUid(ctx, args);
  },
});

export const findCouponComplete = query({
  args: {
    couponId: v.id('coupon'),
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCoupon(args);
    return await couponService.findCouponComplete(ctx, args.couponId, args.salonId);
  },
});
