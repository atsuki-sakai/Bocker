import { mutation, query } from "./../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { removeEmptyFields, trashRecord, KillRecord, authCheck } from './../helpers';
import { CONVEX_ERROR_CODES } from './../constants';
import { validateCustomerPoints } from './../validators';

// 顧客ポイントの追加
export const add = mutation({
  args: {
    customerId: v.id('customer'),
    salonId: v.id('salon'),
    totalPoints: v.optional(v.number()),
    lastTransactionDate_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateCustomerPoints(args);
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      console.error('AddCustomerPoints: 指定された顧客が存在しません', { ...args });
      throw new ConvexError({
        message: '指定された顧客が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          customerId: args.customerId,
        },
      });
    }

    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      console.error('AddCustomerPoints: 指定されたサロンが存在しません', { ...args });
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

    const customerPointsId = await ctx.db.insert('customer_points', {
      ...args,
      isArchive: false,
    });
    return customerPointsId;
  },
});

// 顧客ポイント情報の更新
export const update = mutation({
  args: {
    customerPointsId: v.id('customer_points'),
    totalPoints: v.optional(v.number()),
    lastTransactionDate_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateCustomerPoints(args);
    // 顧客ポイントの存在確認
    const customerPoints = await ctx.db.get(args.customerPointsId);
    if (!customerPoints || customerPoints.isArchive) {
      console.error('UpdateCustomerPoints: 指定された顧客ポイントが存在しません', { ...args });
      throw new ConvexError({
        message: '指定された顧客ポイントが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          customerPointsId: args.customerPointsId,
        },
      });
    }

    const updateData = removeEmptyFields(args);
    // customerPointsId はパッチ対象から削除する
    delete updateData.customerPointsId;
    const newCustomerPointsId = await ctx.db.patch(args.customerPointsId, updateData);
    return newCustomerPointsId;
  },
});

// 顧客ポイントの削除
export const trash = mutation({
  args: {
    customerPointsId: v.id('customer_points'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // 顧客ポイントの存在確認
    const customerPoints = await ctx.db.get(args.customerPointsId);
    if (!customerPoints) {
      console.error('TrashCustomerPoints: 指定された顧客ポイントが存在しません', { ...args });
      throw new ConvexError({
        message: '指定された顧客ポイントが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          customerPointsId: args.customerPointsId,
        },
      });
    }

    await trashRecord(ctx, customerPoints._id);
    return true;
  },
});

export const upsert = mutation({
  args: {
    customerPointsId: v.id('customer_points'),
    customerId: v.id('customer'),
    salonId: v.id('salon'),
    totalPoints: v.optional(v.number()),
    lastTransactionDate_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateCustomerPoints(args);
    const existingCustomerPoints = await ctx.db
      .query('customer_points')
      .withIndex('by_salon_customer_archive', (q) =>
        q.eq('salonId', args.salonId).eq('customerId', args.customerId).eq('isArchive', false)
      )
      .first();

    if (!existingCustomerPoints || existingCustomerPoints.isArchive) {
      return await ctx.db.insert('customer_points', {
        ...args,
        isArchive: false,
      });
    } else {
      const updateData = removeEmptyFields(args);
      delete updateData.customerPointsId;
      return await ctx.db.patch(existingCustomerPoints._id, {
        ...updateData,
      });
    }
  },
});

export const kill = mutation({
  args: {
    customerPointsId: v.id('customer_points'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);

    const customerPoints = await ctx.db.get(args.customerPointsId);
    if (!customerPoints) {
      console.error('KillCustomerPoints: 指定された顧客ポイントが存在しません', { ...args });
      throw new ConvexError({
        message: '指定された顧客ポイントが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          customerPointsId: args.customerPointsId,
        },
      });
    }
    await KillRecord(ctx, args.customerPointsId);
  },
});

// サロンと顧客IDから顧客ポイントを取得
export const getBySalonAndCustomerId = query({
  args: {
    salonId: v.id('salon'),
    customerId: v.id('customer'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('customer_points')
      .withIndex('by_salon_customer_archive', (q) =>
        q.eq('salonId', args.salonId).eq('customerId', args.customerId).eq('isArchive', false)
      )
      .first();
  },
});