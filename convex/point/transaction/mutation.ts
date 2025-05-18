import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { excludeFields, killRecord, archiveRecord } from '@/services/convex/shared/utils/helper';
import {
  validatePointTransaction,
  validateRequired,
} from '@/services/convex/shared/utils/validation';
import { pointTransactionType } from '@/services/convex/shared/types/common';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { throwConvexError } from '@/lib/error';

// ポイント取引の追加
export const create = mutation({
  args: {
    salonId: v.id('salon'),
    reservationId: v.id('reservation'),
    customerId: v.id('customer'),
    points: v.optional(v.number()),
    transactionType: v.optional(pointTransactionType), // 獲得、使用、調整、期限切れ
    transactionDateUnix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validatePointTransaction(args)
    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId)
    if (!salon) {
      throw throwConvexError({
        message: '指定されたサロンが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたサロンが存在しません',
        callFunc: 'point.transaction.create',
        severity: 'low',
        details: { ...args },
      })
    }

    // 予約の存在確認
    const reservation = await ctx.db.get(args.reservationId)
    if (!reservation) {
      throw throwConvexError({
        message: '指定された予約が存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定された予約が存在しません',
        callFunc: 'point.transaction.create',
        severity: 'low',
        details: { ...args },
      })
    }

    // 顧客の存在確認
    const customer = await ctx.db.get(args.customerId)
    if (!customer) {
      throw throwConvexError({
        message: '指定された顧客が存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定された顧客が存在しません',
        callFunc: 'point.transaction.create',
        severity: 'low',
        details: { ...args },
      })
    }

    const pointTransactionId = await ctx.db.insert('point_transaction', {
      ...args,
      isArchive: false,
    })
    return pointTransactionId
  },
})

// ポイント取引情報の更新
export const update = mutation({
  args: {
    pointTransactionId: v.id('point_transaction'),
    points: v.optional(v.number()),
    transactionType: v.optional(pointTransactionType),
    transactionDateUnix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validatePointTransaction(args);
    // ポイント取引の存在確認
    const pointTransaction = await ctx.db.get(args.pointTransactionId);
    if (!pointTransaction || pointTransaction.isArchive) {
      throw throwConvexError({
        message: '指定されたポイント取引が存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたポイント取引が存在しません',
        callFunc: 'point.transaction.update',
        severity: 'low',
        details: { ...args },
      });
    }

    const updateData = excludeFields(args, ['pointTransactionId']);
    const newPointTransactionId = await ctx.db.patch(args.pointTransactionId, updateData);
    return newPointTransactionId;
  },
});

// ポイント取引の削除
export const archive = mutation({
  args: {
    pointTransactionId: v.id('point_transaction'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.pointTransactionId, 'pointTransactionId');

    return await archiveRecord(ctx, args.pointTransactionId);
  },
});

export const upsert = mutation({
  args: {
    pointTransactionId: v.id('point_transaction'),
    salonId: v.id('salon'),
    reservationId: v.id('reservation'),
    customerId: v.id('customer'),
    points: v.optional(v.number()),
    transactionType: v.optional(pointTransactionType),
    transactionDateUnix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validatePointTransaction(args)
    const existingPointTransaction = await ctx.db.get(args.pointTransactionId)
    if (!existingPointTransaction || existingPointTransaction.isArchive) {
      return await ctx.db.insert('point_transaction', {
        ...args,
        isArchive: false,
      })
    } else {
      const updateData = excludeFields(args, [
        'pointTransactionId',
        'salonId',
        'customerId',
        'reservationId',
      ])
      return await ctx.db.patch(existingPointTransaction._id, updateData)
    }
  },
})

export const kill = mutation({
  args: {
    pointTransactionId: v.id('point_transaction'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.pointTransactionId, 'pointTransactionId');
    return await killRecord(ctx, args.pointTransactionId);
  },
});
