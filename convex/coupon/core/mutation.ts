import { mutation } from '../../_generated/server';
import { v } from 'convex/values';
import {
  validateCoupon,
  validateRequired,
  validateCouponConfig,
} from '../../../services/convex/shared/utils/validation';
import { checkAuth } from '../../../services/convex/shared/utils/auth';
import { couponDiscountType } from '../../../services/convex/shared/types/common';
import { couponService } from '../../../services/convex/services';

export const create = mutation({
  args: {
    salonId: v.id('salon'),
    couponUid: v.optional(v.string()),
    name: v.optional(v.string()),
    discountType: v.optional(couponDiscountType),
    percentageDiscountValue: v.optional(v.number()),
    fixedDiscountValue: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCoupon(args);
    return await couponService.create(ctx, args);
  },
});

export const update = mutation({
  args: {
    couponId: v.id('coupon'),
    couponUid: v.optional(v.string()),
    name: v.optional(v.string()),
    discountType: v.optional(couponDiscountType),
    percentageDiscountValue: v.optional(v.number()),
    fixedDiscountValue: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCoupon(args);
    const { couponId, ...updateData } = args;
    return await couponService.update(ctx, couponId, updateData);
  },
});

export const createCouponRelatedTables = mutation({
  args: {
    salonId: v.id('salon'),
    couponUid: v.optional(v.string()),
    name: v.optional(v.string()),
    discountType: v.optional(couponDiscountType),
    percentageDiscountValue: v.optional(v.number()),
    fixedDiscountValue: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    startDateUnix: v.optional(v.number()),
    endDateUnix: v.optional(v.number()),
    maxUseCount: v.optional(v.number()),
    numberOfUse: v.optional(v.number()),
    selectedMenuIds: v.optional(v.array(v.id('menu'))),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCoupon(args);
    validateCouponConfig(args);
    return await couponService.createCouponRelatedTables(ctx, args);
  },
});

export const updateCouponRelatedTables = mutation({
  args: {
    salonId: v.id('salon'),
    couponId: v.id('coupon'),
    couponConfigId: v.id('coupon_config'),
    couponUid: v.optional(v.string()),
    name: v.optional(v.string()),
    discountType: v.optional(couponDiscountType),
    percentageDiscountValue: v.optional(v.number()),
    fixedDiscountValue: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    startDateUnix: v.optional(v.number()),
    endDateUnix: v.optional(v.number()),
    maxUseCount: v.optional(v.number()),
    numberOfUse: v.optional(v.number()),
    selectedMenuIds: v.optional(v.array(v.id('menu'))),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCoupon(args);
    validateCouponConfig(args);
    return await couponService.updateCouponRelatedTables(ctx, args);
  },
});
export const killRelatedTables = mutation({
  args: {
    couponId: v.id('coupon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.couponId, 'couponId');
    return await couponService.killRelatedTables(ctx, args.couponId);
  },
});
