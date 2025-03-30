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
import { CONVEX_ERROR_CODES } from '../constants';
import { validatePointAuth } from '../validators';

// 予約ポイント認証の追加
export const add = mutation({
  args: {
    reservationId: v.id('reservation'),
    customerId: v.id('customer'),
    authCode: v.optional(v.string()),
    expirationTime_unix: v.optional(v.number()),
    points: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validatePointAuth(args);
    // 予約の存在確認
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      console.error('AddPointAuth: 指定された予約が存在しません', { ...args });
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
      console.error('AddPointAuth: 指定された顧客が存在しません', { ...args });
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

    const pointAuthId = await ctx.db.insert('point_auth', {
      ...args,
      isArchive: false,
    });
    return pointAuthId;
  },
});

// 予約ポイント認証の更新
export const update = mutation({
  args: {
    pointAuthId: v.id('point_auth'),
    authCode: v.optional(v.string()),
    expirationTime_unix: v.optional(v.number()),
    points: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validatePointAuth(args);
    // 予約ポイント認証の存在確認
    const pointAuth = await ctx.db.get(args.pointAuthId);
    if (!pointAuth || pointAuth.isArchive) {
      console.error('UpdatePointAuth: 指定された予約ポイント認証が存在しません', { ...args });
      throw new ConvexError({
        message: '指定された予約ポイント認証が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          pointAuthId: args.pointAuthId,
        },
      });
    }

    const updateData = removeEmptyFields(args);
    // pointAuthId はパッチ対象から削除する
    delete updateData.pointAuthId;

    const newPointAuthId = await ctx.db.patch(args.pointAuthId, updateData);
    return newPointAuthId;
  },
});

// 予約ポイント認証の削除
export const trash = mutation({
  args: {
    pointAuthId: v.id('point_auth'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);

    // 予約ポイント認証の存在確認
    const pointAuth = await ctx.db.get(args.pointAuthId);
    if (!pointAuth) {
      console.error('TrashPointAuth: 指定された予約ポイント認証が存在しません', { ...args });
      throw new ConvexError({
        message: '指定された予約ポイント認証が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          pointAuthId: args.pointAuthId,
        },
      });
    }

    await trashRecord(ctx, pointAuth._id);
    return true;
  },
});

export const upsert = mutation({
  args: {
    pointAuthId: v.id('point_auth'),
    reservationId: v.id('reservation'),
    customerId: v.id('customer'),
    authCode: v.optional(v.string()),
    expirationTime_unix: v.optional(v.number()),
    points: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validatePointAuth(args);
    const existingPointAuth = await ctx.db.get(args.pointAuthId);

    if (!existingPointAuth || existingPointAuth.isArchive) {
      return await ctx.db.insert('point_auth', {
        ...args,
        isArchive: false,
      });
    } else {
      const updateData = removeEmptyFields(args);
      delete updateData.pointAuthId;
      return await ctx.db.patch(existingPointAuth._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    pointAuthId: v.id('point_auth'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const pointAuth = await ctx.db.get(args.pointAuthId);
    if (!pointAuth || pointAuth.isArchive) {
      console.error('KillPointAuth: 指定された予約ポイント認証が存在しません', { ...args });
      throw new ConvexError({
        message: '指定された予約ポイント認証が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
      });
    }
    await KillRecord(ctx, args.pointAuthId);
  },
});

// 予約IDから予約ポイント認証を取得
export const getByReservationId = query({
  args: {
    reservationId: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('point_auth')
      .withIndex('by_reservation_id', (q) =>
        q.eq('reservationId', args.reservationId).eq('isArchive', false)
      )
      .first();
  },
});

// 顧客IDから予約ポイント認証を取得
export const getByCustomerId = query({
  args: {
    customerId: v.id('customer'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('point_auth')
      .withIndex('by_customer_id', (q) =>
        q.eq('customerId', args.customerId).eq('isArchive', false)
      )
      .first();
  },
});

// 有効期限から予約ポイント認証を取得
export const getByExpirationTime = query({
  args: {
    expirationTime_unix: v.number(),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('point_auth')
      .withIndex('by_expiration_time', (q) =>
        q.eq('expirationTime_unix', args.expirationTime_unix).eq('isArchive', false)
      )
      .first();
  },
});