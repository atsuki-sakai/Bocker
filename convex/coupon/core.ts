import { mutation, query } from "./../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { removeEmptyFields, trashRecord, KillRecord, authCheck } from './../helpers';
import { paginationOptsValidator } from 'convex/server';
import { CONVEX_ERROR_CODES } from './../constants';
import { couponDiscountType } from './../types';
import { validateCoupon } from './../validators';

// クーポンの追加
export const add = mutation({
  args: {
    salonId: v.id('salon'),
    couponUId: v.optional(v.string()),
    name: v.optional(v.string()),
    discountType: v.optional(couponDiscountType),
    percentageDiscountValue: v.optional(v.number()),
    fixedDiscountValue: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateCoupon(args);
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      console.error('AddCoupon: 指定されたサロンが存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたサロンが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          salonId: args.salonId,
        },
      });
    }

    const couponId = await ctx.db.insert('coupon', {
      ...args,
      isArchive: false,
    });
    return couponId;
  },
});

// クーポン情報の更新
export const update = mutation({
  args: {
    couponId: v.id('coupon'),
    menuIds: v.optional(v.array(v.id('menu'))),
    couponUId: v.optional(v.string()),
    name: v.optional(v.string()),
    discountType: v.optional(couponDiscountType),
    percentageDiscountValue: v.optional(v.number()),
    fixedDiscountValue: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateCoupon(args);

    const coupon = await ctx.db.get(args.couponId);
    if (!coupon || coupon.isArchive) {
      console.error('UpdateCoupon: 指定されたクーポンが存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたクーポンが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          couponId: args.couponId,
        },
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
export const trash = mutation({
  args: {
    couponId: v.id('coupon'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);

    const coupon = await ctx.db.get(args.couponId);
    if (!coupon) {
      console.error('TrashCoupon: 指定されたクーポンが存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたクーポンが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          couponId: args.couponId,
        },
      });
    }

    await trashRecord(ctx, coupon._id);
    return true;
  },
});

export const upsert = mutation({
  args: {
    couponId: v.id('coupon'),
    salonId: v.id('salon'),
    menuIds: v.optional(v.array(v.id('menu'))),
    couponUId: v.optional(v.string()),
    name: v.optional(v.string()),
    discountType: v.optional(couponDiscountType),
    percentageDiscountValue: v.optional(v.number()),
    fixedDiscountValue: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
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

export const kill = mutation({
  args: {
    couponId: v.id('coupon'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const coupon = await ctx.db.get(args.couponId);
    if (!coupon || coupon.isArchive) {
      console.error('KillCoupon: 指定されたクーポンが存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたクーポンが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          couponId: args.couponId,
        },
      });
    }
    await KillRecord(ctx, args.couponId);
  },
});

// サロンIDからクーポン一覧を取得
export const getBySalonId = query({
  args: {
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('coupon')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .paginate(args.paginationOpts);
  },
});

// クーポンUIDからクーポン情報を取得
export const getByCouponUId = query({
  args: {
    salonId: v.id('salon'),
    couponUId: v.string(),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('coupon')
      .withIndex('by_salon_coupon_uid', (q) =>
        q.eq('salonId', args.salonId).eq('couponUId', args.couponUId)
      )
      .first();
  },
});