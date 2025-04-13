import { mutation, query } from "../_generated/server";
import { v } from 'convex/values';
import {
  removeEmptyFields,
  killRecord,
  archiveRecord,
} from '../../services/convex/shared/utils/helper';
import { paginationOptsValidator } from 'convex/server';
import {
  validatePointTransaction,
  validateRequired,
} from '@/services/convex/shared/utils/validation';
import { pointTransactionType } from '@/services/convex/shared/types/common';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';
// ポイント取引の追加
export const add = mutation({
  args: {
    salonId: v.id('salon'),
    reservationId: v.id('reservation'),
    customerId: v.id('customer'),
    points: v.optional(v.number()),
    menuId: v.optional(v.id('menu')),
    transactionType: v.optional(pointTransactionType), // 獲得、使用、調整、期限切れ
    transactionDate_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validatePointTransaction(args);
    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      throw new ConvexCustomError('low', '指定されたサロンが存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    // 予約の存在確認
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      throw new ConvexCustomError('low', '指定された予約が存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    // 顧客の存在確認
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new ConvexCustomError('low', '指定された顧客が存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    // メニューの存在確認（指定されている場合）
    if (args.menuId) {
      const menu = await ctx.db.get(args.menuId);
      if (!menu) {
        throw new ConvexCustomError('low', '指定されたメニューが存在しません', 'NOT_FOUND', 404, {
          ...args,
        });
      }
    }
    const pointTransactionId = await ctx.db.insert('point_transaction', {
      ...args,
      isArchive: false,
    });
    return pointTransactionId;
  },
});

// ポイント取引情報の更新
export const update = mutation({
  args: {
    pointTransactionId: v.id('point_transaction'),
    points: v.optional(v.number()),
    transactionType: v.optional(pointTransactionType),
    transactionDate_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validatePointTransaction(args);
    // ポイント取引の存在確認
    const pointTransaction = await ctx.db.get(args.pointTransactionId);
    if (!pointTransaction || pointTransaction.isArchive) {
      throw new ConvexCustomError('low', '指定されたポイント取引が存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    const updateData = removeEmptyFields(args);
    // pointTransactionId はパッチ対象から削除する
    delete updateData.pointTransactionId;
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
    menuId: v.optional(v.id('menu')),
    transactionType: v.optional(pointTransactionType),
    transactionDate_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validatePointTransaction(args);
    const existingPointTransaction = await ctx.db.get(args.pointTransactionId);
    if (!existingPointTransaction || existingPointTransaction.isArchive) {
      return await ctx.db.insert('point_transaction', {
        ...args,
        isArchive: false,
      });
    } else {
      const updateData = removeEmptyFields(args);
      delete updateData.pointTransactionId;
      delete updateData.salonId;
      delete updateData.customerId;
      delete updateData.reservationId;
      return await ctx.db.patch(existingPointTransaction._id, updateData);
    }
  },
});

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

// サロンと予約IDからポイント取引を取得
export const getBySalonAndReservationId = query({
  args: {
    salonId: v.id('salon'),
    reservationId: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonId, 'salonId');
    validateRequired(args.reservationId, 'reservationId');
    return await ctx.db
      .query('point_transaction')
      .withIndex('by_salon_reservation_id', (q) =>
        q.eq('salonId', args.salonId).eq('reservationId', args.reservationId).eq('isArchive', false)
      )
      .first();
  },
});

// サロンと顧客IDからポイント取引を取得
export const getBySalonAndCustomerId = query({
  args: {
    salonId: v.id('salon'),
    customerId: v.id('customer'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonId, 'salonId');
    validateRequired(args.customerId, 'customerId');
    return await ctx.db
      .query('point_transaction')
      .withIndex('by_salon_customer_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('customerId', args.customerId)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// サロンと顧客と予約IDからポイント取引を取得
export const getBySalonCustomerAndReservation = query({
  args: {
    salonId: v.id('salon'),
    customerId: v.id('customer'),
    reservationId: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validatePointTransaction(args);
    return await ctx.db
      .query('point_transaction')
      .withIndex('by_salon_customer_reservation', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('customerId', args.customerId)
          .eq('reservationId', args.reservationId)
          .eq('isArchive', false)
      )
      .first();
  },
});