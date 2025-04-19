import { mutation, query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import {
  removeEmptyFields,
  archiveRecord,
  killRecord,
} from '@/services/convex/shared/utils/helper';
import { paginationOptsValidator } from 'convex/server';
import { reservationStatusType, paymentMethodType } from '@/services/convex/shared/types/common';
import { validateReservation, validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';
import { api } from '@/convex/_generated/api';
// 予約の追加
export const create = mutation({
  args: {
    customerId: v.optional(v.id('customer')),
    staffId: v.id('staff'),
    staffName: v.optional(v.string()),
    menuIds: v.optional(v.array(v.id('menu'))),
    salonId: v.id('salon'),
    optionIds: v.optional(v.array(v.id('salon_option'))),
    unitPrice: v.optional(v.number()),
    totalPrice: v.optional(v.number()),
    status: v.optional(reservationStatusType),
    startTime_unix: v.optional(v.number()),
    endTime_unix: v.optional(v.number()),
    hairImgFilePath: v.optional(v.string()),
    usePoints: v.optional(v.number()),
    couponId: v.optional(v.id('coupon')),
    notes: v.optional(v.string()),
    paymentMethod: v.optional(paymentMethodType),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);

    // スタッフの存在確認
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      const err = new ConvexCustomError(
        'low',
        '指定されたスタッフが存在しません',
        'NOT_FOUND',
        404,
        {
          ...args,
        }
      );
      throw err;
    }

    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      const err = new ConvexCustomError('low', '指定されたサロンが存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
      throw err;
    }
    const reservationId = await ctx.db.insert('reservation', {
      ...args,
      isArchive: false,
    });
    return reservationId;
  },
});

// 予約情報の更新
export const update = mutation({
  args: {
    reservationId: v.id('reservation'),
    optionIds: v.optional(v.array(v.id('salon_option'))),
    unitPrice: v.optional(v.number()),
    totalPrice: v.optional(v.number()),
    status: v.optional(reservationStatusType),
    startTime_unix: v.optional(v.number()),
    endTime_unix: v.optional(v.number()),
    hairImgFilePath: v.optional(v.string()),
    usePoints: v.optional(v.number()),
    couponId: v.optional(v.id('coupon')),
    notes: v.optional(v.string()),
    paymentMethod: v.optional(paymentMethodType),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);
    // 予約の存在確認
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation || reservation.isArchive) {
      const err = new ConvexCustomError('low', '指定された予約が存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
      throw err;
    }

    const updateData = removeEmptyFields(args);
    // reservationId はパッチ対象から削除する
    delete updateData.reservationId;

    return await ctx.db.patch(args.reservationId, updateData);
  },
});

// 予約の削除
export const archive = mutation({
  args: {
    reservationId: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.reservationId, 'reservationId');
    return await archiveRecord(ctx, args.reservationId);
  },
});

export const upsert = mutation({
  args: {
    reservationId: v.id('reservation'),
    customerId: v.id('customer'),
    staffId: v.id('staff'),
    menuId: v.id('menu'),
    salonId: v.id('salon'),
    optionIds: v.optional(v.array(v.id('salon_option'))),
    unitPrice: v.optional(v.number()),
    totalPrice: v.optional(v.number()),
    status: v.optional(reservationStatusType),
    startTime_unix: v.optional(v.number()),
    endTime_unix: v.optional(v.number()),
    hairImgFilePath: v.optional(v.string()),
    usePoints: v.optional(v.number()),
    couponId: v.optional(v.id('coupon')),
    notes: v.optional(v.string()),
    paymentMethod: v.optional(paymentMethodType),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);
    const existingReservation = await ctx.db.get(args.reservationId);
    if (!existingReservation || existingReservation.isArchive) {
      return await ctx.db.insert('reservation', {
        ...args,
        isArchive: false,
      });
    } else {
      const updateData = removeEmptyFields(args);
      delete updateData.reservationId;
      return await ctx.db.patch(existingReservation._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    reservationId: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.reservationId, 'reservationId');
    return await killRecord(ctx, args.reservationId);
  },
});
