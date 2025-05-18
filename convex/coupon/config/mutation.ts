import { mutation } from '../../_generated/server';
import { v } from 'convex/values';
import { validateCouponConfig } from '../../../services/convex/shared/utils/validation';
import { checkAuth } from '../../../services/convex/shared/utils/auth';
import { couponService } from '../../../services/convex/services';

export const create = mutation({
  args: {
    salonId: v.id('salon'),
    couponId: v.id('coupon'),
    startDateUnix: v.optional(v.number()),
    endDateUnix: v.optional(v.number()),
    maxUseCount: v.optional(v.number()),
    numberOfUse: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCouponConfig(args);
    return await couponService.createCouponConfig(ctx, args);
  },
});

export const update = mutation({
  args: {
    couponConfigId: v.id('coupon_config'),
    startDateUnix: v.optional(v.number()),
    endDateUnix: v.optional(v.number()),
    maxUseCount: v.optional(v.number()),
    numberOfUse: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCouponConfig(args);
    const { couponConfigId, ...updateData } = args;
    return await couponService.updateCouponConfig(ctx, couponConfigId, updateData);
  },
});
