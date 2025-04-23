import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import {
  removeEmptyFields,
  archiveRecord,
  killRecord,
} from '@/services/convex/shared/utils/helper';
import { reservationStatusType, paymentMethodType } from '@/services/convex/shared/types/common';
import { validateReservation, validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { api } from '@/convex/_generated/api';
import { throwConvexError } from '@/lib/error';

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

    // 必須フィールドの存在確認
    if (!args.startTime_unix || !args.endTime_unix) {
      throw throwConvexError({
        message: '予約の開始時間と終了時間は必須です',
        status: 400,
        code: 'INVALID_ARGUMENT',
        title: '必須フィールドが不足しています',
        callFunc: 'reservation.create',
        severity: 'low',
        details: { ...args },
      });
    }

    // スタッフの存在確認
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw throwConvexError({
        title: 'スタッフが見つかりません',
        message: '指定されたスタッフが存在しません',
        code: 'NOT_FOUND',
        status: 404,
        callFunc: 'reservation.create',
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
        title: 'サロンが見つかりません',
        callFunc: 'reservation.create',
        severity: 'low',
        details: { ...args },
      });
    }

    if (args.startTime_unix === undefined || args.endTime_unix === undefined) {
      throw throwConvexError({
        message: '予約の開始時間と終了時間は必須です',
        status: 400,
        code: 'INVALID_ARGUMENT',
        title: '必須フィールドが不足しています',
        callFunc: 'reservation.create',
        severity: 'low',
        details: { ...args },
      });
    }
    // 予約時間の日付を取得
    const reservationDate = new Date(args.startTime_unix * 1000);
    const dateString = reservationDate.toISOString().split('T')[0]; // YYYY-MM-DD形式

    // 予約時間の重複チェック
    const isAvailable = await ctx.runQuery(api.reservation.query.checkAvailableTimeSlot, {
      salonId: args.salonId,
      staffId: args.staffId,
      date: dateString,
      startTime: args.startTime_unix,
      endTime: args.endTime_unix,
    });

    if (!isAvailable) {
      throw throwConvexError({
        message: '予約が重複しています。別の時間を選択してください。',
        status: 409,
        code: 'CONFLICT',
        title: '予約が重複しています',
        callFunc: 'reservation.create',
        severity: 'low',
        details: {
          ...args,
        },
      });
    }

    // 予約の作成
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
      throw throwConvexError({
        message: '指定された予約が存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '予約が見つかりません',
        callFunc: 'reservation.update',
        severity: 'low',
        details: { ...args },
      });
    }

    // 予約時間が変更されている場合、重複チェックを行う
    if (
      args.startTime_unix !== undefined &&
      args.endTime_unix !== undefined &&
      (args.startTime_unix !== reservation.startTime_unix ||
        args.endTime_unix !== reservation.endTime_unix)
    ) {
      // 予約時間の日付を取得
      const reservationDate = new Date(args.startTime_unix * 1000);
      const dateString = reservationDate.toISOString().split('T')[0]; // YYYY-MM-DD形式

      // 予約時間の重複チェック（自分自身の予約は除外）
      const staffId = reservation.staffId;
      const salonId = reservation.salonId;

      // 既存の予約を除外した形で利用可能かチェック
      const existingReservations = await ctx.db
        .query('reservation')
        .withIndex('by_staff_id', (q) =>
          q.eq('salonId', salonId).eq('staffId', staffId).eq('isArchive', false)
        )
        .filter((q) =>
          q.and(
            // 自分自身の予約は除外
            q.neq(q.field('_id'), args.reservationId),
            q.or(q.eq(q.field('status'), 'confirmed'), q.eq(q.field('status'), 'pending')),
            // 予約時間と重複するかどうかをチェック
            q.lt(q.field('startTime_unix'), args.endTime_unix!),
            q.gt(q.field('endTime_unix'), args.startTime_unix!)
          )
        )
        .collect();

      if (existingReservations.length > 0) {
        throw throwConvexError({
          message: 'この時間帯はすでに予約が入っています。別の時間を選択してください。',
          status: 409,
          code: 'CONFLICT',
          title: '予約が重複しています',
          callFunc: 'reservation.update',
          severity: 'low',
          details: { ...args },
        });
      }

      // スタッフのスケジュールもチェック
      const isAvailable = await ctx.runQuery(api.reservation.query.checkAvailableTimeSlot, {
        salonId: salonId,
        staffId: staffId,
        date: dateString,
        startTime: args.startTime_unix,
        endTime: args.endTime_unix,
      });

      if (!isAvailable) {
        throw throwConvexError({
          message:
            'この時間帯はスタッフのスケジュールと重複しています。別の時間を選択してください。',
          status: 409,
          code: 'CONFLICT',
          title: '予約が重複しています',
          callFunc: 'reservation.update',
          severity: 'low',
          details: { ...args },
        });
      }
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

    // 必須フィールドの存在確認
    if (!args.startTime_unix || !args.endTime_unix) {
      throw throwConvexError({
        message: '予約の開始時間と終了時間は必須です',
        status: 400,
        code: 'INVALID_ARGUMENT',
        title: '予約の開始時間と終了時間は必須です',
        callFunc: 'reservation.upsert',
        severity: 'low',
        details: { ...args },
      });
    }

    // 予約時間の日付を取得
    const reservationDate = new Date(args.startTime_unix * 1000);
    const dateString = reservationDate.toISOString().split('T')[0]; // YYYY-MM-DD形式

    const existingReservation = await ctx.db.get(args.reservationId);

    if (!existingReservation || existingReservation.isArchive) {
      // 新規予約の場合、重複チェックを行う
      const isAvailable = await ctx.runQuery(api.reservation.query.checkAvailableTimeSlot, {
        salonId: args.salonId,
        staffId: args.staffId,
        date: dateString,
        startTime: args.startTime_unix,
        endTime: args.endTime_unix,
      });

      if (!isAvailable) {
        throw throwConvexError({
          message:
            'この時間帯はすでに予約が入っているか、スタッフのスケジュールと重複しています。別の時間を選択してください。',
          status: 409,
          code: 'CONFLICT',
          title: '予約が重複しています',
          callFunc: 'reservation.upsert',
          severity: 'low',
          details: { ...args },
        });
      }

      return await ctx.db.insert('reservation', {
        ...args,
        isArchive: false,
      });
    } else {
      // 既存予約の更新の場合
      // 予約時間が変更されている場合、重複チェックを行う
      if (
        args.startTime_unix !== existingReservation.startTime_unix ||
        args.endTime_unix !== existingReservation.endTime_unix
      ) {
        // 既存の予約を除外した形で利用可能かチェック
        const existingReservations = await ctx.db
          .query('reservation')
          .withIndex('by_staff_id', (q) =>
            q.eq('salonId', args.salonId).eq('staffId', args.staffId).eq('isArchive', false)
          )
          .filter((q) =>
            q.and(
              // 自分自身の予約は除外
              q.neq(q.field('_id'), args.reservationId),
              q.or(q.eq(q.field('status'), 'confirmed'), q.eq(q.field('status'), 'pending')),
              // 予約時間と重複するかどうかをチェック
              q.lt(q.field('startTime_unix'), args.endTime_unix!),
              q.gt(q.field('endTime_unix'), args.startTime_unix!)
            )
          )
          .collect();

        if (existingReservations.length > 0) {
          throw throwConvexError({
            message: 'この時間帯はすでに予約が入っています。別の時間を選択してください。',
            status: 409,
            code: 'CONFLICT',
            title: '予約が重複しています',
            callFunc: 'reservation.upsert',
            severity: 'low',
            details: { ...args },
          });
        }

        // スタッフのスケジュールもチェック
        const isAvailable = await ctx.runQuery(api.reservation.query.checkAvailableTimeSlot, {
          salonId: args.salonId,
          staffId: args.staffId,
          date: dateString,
          startTime: args.startTime_unix,
          endTime: args.endTime_unix,
        });

        if (!isAvailable) {
          throw throwConvexError({
            message:
              'この時間帯はスタッフのスケジュールと重複しています。別の時間を選択してください。',
            status: 409,
            code: 'CONFLICT',
            title: '予約が重複しています',
            callFunc: 'reservation.upsert',
            severity: 'low',
            details: { ...args },
          });
        }
      }

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
