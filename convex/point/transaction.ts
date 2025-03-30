import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import {
  handleConvexApiError,
  removeEmptyFields,
  trashRecord,
  KillRecord,
  authCheck,
} from '../helpers';
import { paginationOptsValidator } from 'convex/server';
import { CONVEX_ERROR_CODES } from '../constants';
import { validatePointTransaction } from '../validators';
import { pointTransactionType } from '../types';

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
    authCheck(ctx);
    validatePointTransaction(args);
    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      console.error('AddPointTransaction: 指定されたサロンが存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたサロンが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonId: args.salonId,
        },
      });
    }

    // 予約の存在確認
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      console.error('AddPointTransaction: 指定された予約が存在しません', { ...args });
      throw new ConvexError({
        message: '指定された予約が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          reservationId: args.reservationId,
        },
      });
    }

    // 顧客の存在確認
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      console.error('AddPointTransaction: 指定された顧客が存在しません', { ...args });
      throw new ConvexError({
        message: '指定された顧客が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          customerId: args.customerId,
        },
      });
    }

    // メニューの存在確認（指定されている場合）
    if (args.menuId) {
      const menu = await ctx.db.get(args.menuId);
      if (!menu) {
        console.error('AddPointTransaction: 指定されたメニューが存在しません', { ...args });
        throw new ConvexError({
          message: '指定されたメニューが存在しません',
          code: CONVEX_ERROR_CODES.NOT_FOUND,
          severity: 'low',
          status: 404,
          context: {
            menuId: args.menuId,
          },
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
    transactionType: v.optional(
      v.union(v.literal('earned'), v.literal('used'), v.literal('adjusted'), v.literal('expired'))
    ),
    transactionDate_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validatePointTransaction(args);
    // ポイント取引の存在確認
    const pointTransaction = await ctx.db.get(args.pointTransactionId);
    if (!pointTransaction || pointTransaction.isArchive) {
      console.error('UpdatePointTransaction: 指定されたポイント取引が存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたポイント取引が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          pointTransactionId: args.pointTransactionId,
        },
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
export const trash = mutation({
  args: {
    pointTransactionId: v.id('point_transaction'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // ポイント取引の存在確認
    const pointTransaction = await ctx.db.get(args.pointTransactionId);
    if (!pointTransaction) {
      console.error('TrashPointTransaction: 指定されたポイント取引が存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたポイント取引が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          pointTransactionId: args.pointTransactionId,
        },
      });
    }

    await trashRecord(ctx, pointTransaction._id);
    return true;
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
    transactionType: v.optional(
      v.union(v.literal('earned'), v.literal('used'), v.literal('adjusted'), v.literal('expired'))
    ),
    transactionDate_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
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
      return await ctx.db.patch(existingPointTransaction._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    pointTransactionId: v.id('point_transaction'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const pointTransaction = await ctx.db.get(args.pointTransactionId);
    if (!pointTransaction) {
      console.error('KillPointTransaction: 指定されたポイント取引が存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたポイント取引が存在しません',
      });
    }
    await KillRecord(ctx, args.pointTransactionId);
  },
});

// サロンと予約IDからポイント取引を取得
export const getBySalonAndReservationId = query({
  args: {
    salonId: v.id('salon'),
    reservationId: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
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
    salonId: v.id("salon"),
    customerId: v.id("customer"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("point_transaction")
      .withIndex("by_salon_customer_id", (q) => 
        q.eq("salonId", args.salonId).eq("customerId", args.customerId).eq("isArchive", false)
      )
      .paginate(args.paginationOpts);
  },
});

// サロンと顧客と予約IDからポイント取引を取得
export const getBySalonCustomerAndReservation = query({
  args: {
    salonId: v.id("salon"),
    customerId: v.id("customer"),
    reservationId: v.id("reservation"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("point_transaction")
      .withIndex("by_salon_customer_reservation", (q) => 
        q.eq("salonId", args.salonId)
         .eq("customerId", args.customerId)
         .eq("reservationId", args.reservationId)
         .eq("isArchive", false)
      )
      .first();
  },
});