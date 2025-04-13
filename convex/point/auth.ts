import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import {
  removeEmptyFields,
  archiveRecord,
  killRecord,
} from '@/services/convex/shared/utils/helper';
import {
  validatePointAuth,
  validateRequired,
  validateRequiredNumber,
} from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';

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
    checkAuth(ctx, true);
    validatePointAuth(args);
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
    checkAuth(ctx, true);
    validatePointAuth(args);
    // 予約ポイント認証の存在確認
    const pointAuth = await ctx.db.get(args.pointAuthId);
    if (!pointAuth || pointAuth.isArchive) {
      throw new ConvexCustomError(
        'low',
        '指定された予約ポイント認証が存在しません',
        'NOT_FOUND',
        404,
        {
          ...args,
        }
      );
    }

    const updateData = removeEmptyFields(args);
    // pointAuthId はパッチ対象から削除する
    delete updateData.pointAuthId;

    const newPointAuthId = await ctx.db.patch(args.pointAuthId, updateData);
    return newPointAuthId;
  },
});

// 予約ポイント認証の削除
export const archive = mutation({
  args: {
    pointAuthId: v.id('point_auth'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.pointAuthId, 'pointAuthId');
    return await archiveRecord(ctx, args.pointAuthId);
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
    checkAuth(ctx, true);
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
      delete updateData.reservationId;
      delete updateData.customerId;
      return await ctx.db.patch(existingPointAuth._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    pointAuthId: v.id('point_auth'),
  },
  handler: async (ctx, args) => {
    validateRequired(args.pointAuthId, 'pointAuthId');
    checkAuth(ctx, true);
    return await killRecord(ctx, args.pointAuthId);
  },
});

// 予約IDから予約ポイント認証を取得
export const getByReservationId = query({
  args: {
    reservationId: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    validateRequired(args.reservationId, 'reservationId');
    checkAuth(ctx, true);
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
    validateRequired(args.customerId, 'customerId');
    checkAuth(ctx, true);
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
    validateRequiredNumber(args.expirationTime_unix, 'expirationTime_unix');
    checkAuth(ctx, true);
    return await ctx.db
      .query('point_auth')
      .withIndex('by_expiration_time', (q) =>
        q.eq('expirationTime_unix', args.expirationTime_unix).eq('isArchive', false)
      )
      .first();
  },
});
