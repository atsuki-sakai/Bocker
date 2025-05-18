import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { archiveRecord, killRecord, excludeFields } from '@/services/convex/shared/utils/helper';
import {
  validateCustomerPoints,
  validateRequired,
} from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { throwConvexError } from '@/lib/error';

// 顧客ポイントの追加
export const create = mutation({
  args: {
    customerId: v.id('customer'),
    salonId: v.id('salon'),
    totalPoints: v.optional(v.number()),
    lastTransactionDateUnix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCustomerPoints(args);
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw throwConvexError({
        message: '指定された顧客が存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定された顧客が存在しません',
        callFunc: 'customer.points.create',
        severity: 'low',
        details: { ...args },
      });
    }

    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      throw throwConvexError({
        message: '指定されたサロンが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたサロンが存在しません',
        callFunc: 'customer.points.create',
        severity: 'low',
        details: { ...args },
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
    lastTransactionDateUnix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCustomerPoints(args);
    // 顧客ポイントの存在確認
    const customerPoints = await ctx.db.get(args.customerPointsId);
    if (!customerPoints || customerPoints.isArchive) {
      throw throwConvexError({
        message: '指定された顧客ポイントが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定された顧客ポイントが存在しません',
        callFunc: 'customer.points.update',
        severity: 'low',
        details: { ...args },
      });
    }

    const updateData = excludeFields(args, ['customerPointsId']);
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
    lastTransactionDateUnix: v.optional(v.number()),
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
      const updateData = excludeFields(args, ['customerPointsId', 'customerId', 'salonId']);
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
