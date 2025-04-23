import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { throwConvexError } from '@/lib/error';
import {
  removeEmptyFields,
  archiveRecord,
  killRecord,
} from '@/services/convex/shared/utils/helper';
import { validatePointAuth } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { validateRequired } from '@/services/convex/shared/utils/validation';

// 予約ポイント認証の追加
export const create = mutation({
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
      throw throwConvexError({
        message: '指定された予約が存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定された予約が存在しません',
        callFunc: 'point.auth.create',
        severity: 'low',
        details: { ...args },
      });
    }

    // 顧客の存在確認
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw throwConvexError({
        message: '指定された顧客が存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定された顧客が存在しません',
        callFunc: 'point.auth.create',
        severity: 'low',
        details: { ...args },
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
      throw throwConvexError({
        message: '指定された予約ポイント認証が存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定された予約ポイント認証が存在しません',
        callFunc: 'point.auth.update',
        severity: 'low',
        details: { ...args },
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
