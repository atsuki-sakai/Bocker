import { mutation, query } from "./../_generated/server";
import { v } from "convex/values";
import {
  removeEmptyFields,
  archiveRecord,
  killRecord,
} from '../../services/convex/shared/utils/helper';
import {
  validateCustomerPoints,
  validateRequired,
} from '../../services/convex/shared/utils/validation';
import { checkAuth } from '../../services/convex/shared/utils/auth';
import { ConvexCustomError } from '../../services/convex/shared/utils/error';

// 顧客ポイントの追加
export const add = mutation({
  args: {
    customerId: v.id('customer'),
    salonId: v.id('salon'),
    totalPoints: v.optional(v.number()),
    lastTransactionDate_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCustomerPoints(args);
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new ConvexCustomError('low', '指定された顧客が存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      throw new ConvexCustomError('low', '指定されたサロンが存在しません', 'NOT_FOUND', 404, {
        ...args,
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
    checkAuth(ctx);
    validateCustomerPoints(args);
    // 顧客ポイントの存在確認
    const customerPoints = await ctx.db.get(args.customerPointsId);
    if (!customerPoints || customerPoints.isArchive) {
      throw new ConvexCustomError('low', '指定された顧客ポイントが存在しません', 'NOT_FOUND', 404, {
        ...args,
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
export const archive = mutation({
  args: {
    customerPointsId: v.id('customer_points'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.customerPointsId, 'customerPointsId');
    return await archiveRecord(ctx, args.customerPointsId);
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
    checkAuth(ctx);
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
      delete updateData.customerId;
      delete updateData.salonId;
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
    checkAuth(ctx);
    validateRequired(args.customerPointsId, 'customerPointsId');
    await killRecord(ctx, args.customerPointsId);
  },
});

// サロンと顧客IDから顧客ポイントを取得
export const getBySalonAndCustomerId = query({
  args: {
    salonId: v.id('salon'),
    customerId: v.id('customer'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCustomerPoints(args);
    return await ctx.db
      .query('customer_points')
      .withIndex('by_salon_customer_archive', (q) =>
        q.eq('salonId', args.salonId).eq('customerId', args.customerId).eq('isArchive', false)
      )
      .first();
  },
});