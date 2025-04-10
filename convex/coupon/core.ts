import { mutation, query } from './../_generated/server';
import { v } from 'convex/values';
import { removeEmptyFields, archiveRecord, KillRecord } from './../shared/utils/helper';
import { paginationOptsValidator } from 'convex/server';
import { validateCoupon, validateRequired } from './../shared/utils/validation';
import { checkAuth } from './../shared/utils/auth';
import { ConvexCustomError } from './../shared/utils/error';
import { couponDiscountType } from './../shared/types/common';
// クーポンの追加
export const add = mutation({
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
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      throw new ConvexCustomError('low', '指定されたサロンが存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    const couponId = await ctx.db.insert('coupon', {
      ...args,
      isArchive: false,
    });
    return couponId;
  },
});

export const get = query({
  args: {
    couponId: v.id('coupon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.couponId, 'couponId');
    return await ctx.db.get(args.couponId);
  },
});
// クーポン情報の更新
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

    const coupon = await ctx.db.get(args.couponId);
    if (!coupon || coupon.isArchive) {
      throw new ConvexCustomError('low', '指定されたクーポンが存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    const updateData = removeEmptyFields(args);
    // couponId はパッチ対象から削除する
    delete updateData.couponId;

    const newCouponId = await ctx.db.patch(args.couponId, updateData);
    return newCouponId;
  },
});

// クーポンの削除
export const archive = mutation({
  args: {
    couponId: v.id('coupon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.couponId, 'couponId');
    return await archiveRecord(ctx, args.couponId);
  },
});

export const upsert = mutation({
  args: {
    couponId: v.id('coupon'),
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
    const existingCoupon = await ctx.db.get(args.couponId);

    if (!existingCoupon || existingCoupon.isArchive) {
      return await ctx.db.insert('coupon', {
        ...args,
        isArchive: false,
      });
    } else {
      const updateData = removeEmptyFields(args);
      delete updateData.couponId;
      return await ctx.db.patch(existingCoupon._id, updateData);
    }
  },
});

export const killRelatedTables = mutation({
  args: {
    couponId: v.id('coupon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.couponId, 'couponId');
    const coupon = await ctx.db.get(args.couponId);
    if (!coupon || coupon.isArchive) {
      throw new ConvexCustomError('low', '指定されたクーポンが存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }
    const couponConfig = await ctx.db
      .query('coupon_config')
      .withIndex('by_coupon_id', (q) => q.eq('couponId', args.couponId))
      .first();
    if (!couponConfig || couponConfig.isArchive) {
      throw new ConvexCustomError('low', '指定されたクーポン設定が存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }
    await KillRecord(ctx, args.couponId);
    await KillRecord(ctx, couponConfig._id);

    return {
      deletedCouponId: args.couponId,
      deletedCouponConfigId: couponConfig._id,
    };
  },
});

// サロンIDからクーポン一覧を取得
export const getAllBySalonId = query({
  args: {
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    activeOnly: v.optional(v.boolean()),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await ctx.db
      .query('coupon')
      .withIndex('by_salon_id', (q) =>
        q.eq('salonId', args.salonId).eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// クーポンUIDからクーポン情報を取得
export const getByCouponUid = query({
  args: {
    salonId: v.id('salon'),
    couponUid: v.string(),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCoupon(args);
    return await ctx.db
      .query('coupon')
      .withIndex('by_salon_coupon_uid', (q) =>
        q.eq('salonId', args.salonId).eq('couponUid', args.couponUid).eq('isArchive', false)
      )
      .first();
  },
});
