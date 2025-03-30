import { mutation, query } from "./../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { removeEmptyFields, trashRecord, KillRecord, authCheck } from './../helpers';
import { CONVEX_ERROR_CODES } from './../constants';
import { validateCouponConfig } from './../validators';

// クーポン設定の追加
export const add = mutation({
  args: {
    couponId: v.id('coupon'),
    startDate_unix: v.optional(v.number()),
    endDate_unix: v.optional(v.number()),
    maxUseCount: v.optional(v.number()),
    numberOfUse: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateCouponConfig(args);

    // クーポンの存在確認
    const coupon = await ctx.db.get(args.couponId);
    if (coupon) {
      console.error('AddCouponConfig: 指定されたクーポンはすでに存在します', { ...args });
      throw new ConvexError({
        message: '指定されたクーポンはすでに存在します',
        code: CONVEX_ERROR_CODES.DUPLICATE_RECORD,
        status: 400,
        severity: 'low',
        context: {
          couponId: args.couponId,
        },
      });
    }
    const couponConfigId = await ctx.db.insert('coupon_config', {
      ...args,
      isArchive: false,
    });
    return couponConfigId;
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
    authCheck(ctx);
    validateCouponConfig(args);

    // クーポン設定の存在確認
    const couponConfig = await ctx.db.get(args.couponConfigId);
    if (!couponConfig || couponConfig.isArchive) {
      console.error('UpdateCouponConfig: 指定されたクーポン設定が存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたクーポン設定が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          couponConfigId: args.couponConfigId,
        },
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
export const trash = mutation({
  args: {
    couponConfigId: v.id('coupon_config'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);

    // クーポン設定の存在確認
    const couponConfig = await ctx.db.get(args.couponConfigId);
    if (!couponConfig) {
      console.error('TrashCouponConfig: 指定されたクーポン設定が存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたクーポン設定が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          couponConfigId: args.couponConfigId,
        },
      });
    }

    await trashRecord(ctx, couponConfig._id);
    return true;
  },
});

export const upsert = mutation({
  args: {
    couponConfigId: v.id('coupon_config'),
    couponId: v.id('coupon'),
    startDate_unix: v.optional(v.number()),
    endDate_unix: v.optional(v.number()),
    maxUseCount: v.optional(v.number()),
    numberOfUse: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
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
      return await ctx.db.patch(existingCouponConfig._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    couponConfigId: v.id('coupon_config'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const couponConfig = await ctx.db.get(args.couponConfigId);
    if (!couponConfig) {
      console.error('KillCouponConfig: 指定されたクーポン設定が存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたクーポン設定が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          couponConfigId: args.couponConfigId,
        },
      });
    }
    return await KillRecord(ctx, args.couponConfigId);
  },
});

// クーポンIDからクーポン設定を取得
export const getByCouponId = query({
  args: {
    couponId: v.id('coupon'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('coupon_config')
      .withIndex('by_coupon_id', (q) => q.eq('couponId', args.couponId).eq('isArchive', false))
      .first();
  },
});