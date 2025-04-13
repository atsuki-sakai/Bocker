import { mutation, query } from './../_generated/server';
import { v } from 'convex/values';
import {
  removeEmptyFields,
  archiveRecord,
  killRecord,
} from '../../services/convex/shared/utils/helper';
import { paginationOptsValidator } from 'convex/server';
import {
  validateCouponConfig,
  validateRequired,
} from '../../services/convex/shared/utils/validation';
import { checkAuth } from '../../services/convex/shared/utils/auth';
import { ConvexCustomError } from '../../services/convex/shared/utils/error';

// クーポン設定の追加
export const add = mutation({
  args: {
    salonId: v.id('salon'),
    couponId: v.id('coupon'),
    startDate_unix: v.optional(v.number()),
    endDate_unix: v.optional(v.number()),
    maxUseCount: v.optional(v.number()),
    numberOfUse: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCouponConfig(args);
    const couponConfigId = await ctx.db.insert('coupon_config', {
      ...args,
      salonId: args.salonId,
      isArchive: false,
    });
    return couponConfigId;
  },
});

export const get = query({
  args: {
    couponId: v.id('coupon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCouponConfig(args);
    return await ctx.db
      .query('coupon_config')
      .withIndex('by_coupon_id', (q) => q.eq('couponId', args.couponId).eq('isArchive', false))
      .first();
  },
});
// クーポン設定の更新
export const update = mutation({
  args: {
    couponConfigId: v.id('coupon_config'),
    startDate_unix: v.optional(v.number()),
    endDate_unix: v.optional(v.number()),
    maxUseCount: v.optional(v.number()),
    numberOfUse: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCouponConfig(args);

    // クーポン設定の存在確認
    const couponConfig = await ctx.db.get(args.couponConfigId);
    if (!couponConfig || couponConfig.isArchive) {
      throw new ConvexCustomError('low', '指定されたクーポン設定が存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    const updateData = removeEmptyFields(args);
    // couponConfigId はパッチ対象から削除する
    delete updateData.couponConfigId;

    const newCouponConfigId = await ctx.db.patch(args.couponConfigId, updateData);
    return newCouponConfigId;
  },
});

// クーポン設定の削除
export const archive = mutation({
  args: {
    couponConfigId: v.id('coupon_config'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.couponConfigId, 'couponConfigId');
    return await archiveRecord(ctx, args.couponConfigId);
  },
});

export const upsert = mutation({
  args: {
    salonId: v.id('salon'),
    couponConfigId: v.id('coupon_config'),
    couponId: v.id('coupon'),
    startDate_unix: v.optional(v.number()),
    endDate_unix: v.optional(v.number()),
    maxUseCount: v.optional(v.number()),
    numberOfUse: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCouponConfig(args);

    const existingCouponConfig = await ctx.db.get(args.couponConfigId);

    if (!existingCouponConfig || existingCouponConfig.isArchive) {
      return await ctx.db.insert('coupon_config', {
        ...args,
        isArchive: false,
      });
    } else {
      const updateData = removeEmptyFields(args);
      delete updateData.couponConfigId;
      delete updateData.salonId;
      delete updateData.couponId;
      return await ctx.db.patch(existingCouponConfig._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    couponConfigId: v.id('coupon_config'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.couponConfigId, 'couponConfigId');
    return await killRecord(ctx, args.couponConfigId);
  },
});

// クーポンIDからクーポン設定を取得
export const getAllByCouponId = query({
  args: {
    couponId: v.id('coupon'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCouponConfig(args);
    return await ctx.db
      .query('coupon_config')
      .withIndex('by_coupon_id', (q) =>
        q.eq('couponId', args.couponId).eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});
