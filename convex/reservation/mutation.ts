import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { excludeFields, archiveRecord, killRecord } from '@/services/convex/shared/utils/helper';
import { reservationStatusType, paymentMethodType } from '@/services/convex/shared/types/common';
import { validateReservation, validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { api } from '@/convex/_generated/api';
import { throwConvexError } from '@/lib/error';

// 予約の追加
export const create = mutation({
  args: {
    customerId: v.optional(v.id('customer')),
    customerName: v.optional(v.string()),
    staffId: v.id('staff'),
    staffName: v.optional(v.string()),
    menus: v.optional(
      v.array(
        v.object({
          menuId: v.id('menu'),
          quantity: v.number(),
        })
      )
    ),
    salonId: v.id('salon'),
    options: v.optional(
      v.array(
        v.object({
          optionId: v.id('salon_option'),
          quantity: v.number(),
        })
      )
    ),
    unitPrice: v.optional(v.number()),
    totalPrice: v.optional(v.number()),
    status: v.optional(reservationStatusType),
    startTimeUnix: v.optional(v.number()),
    endTimeUnix: v.optional(v.number()),
    hairImgFilePath: v.optional(v.string()),
    usePoints: v.optional(v.number()),
    couponId: v.optional(v.id('coupon')),
    couponDiscount: v.optional(v.number()),
    notes: v.optional(v.string()),
    paymentMethod: v.optional(paymentMethodType),
    stripeCheckoutSessionId: v.optional(v.string()),
    paymentStatus: v.optional(v.union(v.literal('pending'), // 未払い
      v.literal('paid'), // 支払い済み
      v.literal('failed'), // 支払い失敗
      v.literal('cancelled') // キャンセル済み
    ))
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)
    validateReservation(args)

    // 必須フィールドの存在確認
    if (!args.startTimeUnix || !args.endTimeUnix) {
      throw throwConvexError({
        message: '予約の開始時間と終了時間は必須です',
        status: 400,
        code: 'INVALID_ARGUMENT',
        title: '必須フィールドが不足しています',
        callFunc: 'reservation.create',
        severity: 'low',
        details: { ...args },
      })
    }

    // スタッフの存在確認
    const staff = await ctx.db.get(args.staffId)
    if (!staff) {
      throw throwConvexError({
        title: 'スタッフが見つかりません',
        message: '指定されたスタッフが存在しません',
        code: 'NOT_FOUND',
        status: 404,
        callFunc: 'reservation.create',
        severity: 'low',
        details: { ...args },
      })
    }

    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId)
    if (!salon) {
      throw throwConvexError({
        message: '指定されたサロンが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: 'サロンが見つかりません',
        callFunc: 'reservation.create',
        severity: 'low',
        details: { ...args },
      })
    }

    if (args.startTimeUnix === undefined || args.endTimeUnix === undefined) {
      throw throwConvexError({
        message: '予約の開始時間と終了時間は必須です',
        status: 400,
        code: 'INVALID_ARGUMENT',
        title: '必須フィールドが不足しています',
        callFunc: 'reservation.create',
        severity: 'low',
        details: { ...args },
      })
    }

    // 予約の重複チェック
    const checkDoubleBooking = await ctx.runQuery(
      api.schedule.staff_exception.query.checkDoubleBooking,
      {
        salonId: args.salonId,
        staffId: args.staffId,
        startTimeUnix: args.startTimeUnix,
        endTimeUnix: args.endTimeUnix,
      }
    )
    if (checkDoubleBooking.isOverlapping) {
      throw throwConvexError({
        message: 'この時間帯はすでに予約が入っています。別の時間を選択してください。',
        status: 409,
        code: 'CONFLICT',
        title: '予約が重複しています',
        callFunc: 'reservation.create',
        severity: 'low',
        details: { ...args },
      })
    }
    // 予約の作成
    const reservationId = await ctx.db.insert('reservation', {
      ...args,
      isArchive: false,
    })

    return reservationId
  },
})

// 予約情報の更新
export const update = mutation({
  args: {
    reservationId: v.id('reservation'),
    customerId: v.optional(v.id('customer')),
    customerName: v.optional(v.string()),
    staffId: v.id('staff'),
    staffName: v.optional(v.string()),
    menus: v.optional(
      v.array(
        v.object({
          menuId: v.id('menu'),
          quantity: v.number(),
        })
      )
    ),
    options: v.optional(
      v.array(
        v.object({
          optionId: v.id('salon_option'),
          quantity: v.number(),
        })
      )
    ),
    unitPrice: v.optional(v.number()),
    totalPrice: v.optional(v.number()),
    status: v.optional(reservationStatusType),
    startTimeUnix: v.optional(v.number()),
    endTimeUnix: v.optional(v.number()),
    hairImgFilePath: v.optional(v.string()),
    usePoints: v.optional(v.number()),
    couponId: v.optional(v.id('coupon')),
    couponDiscount: v.optional(v.number()),
    notes: v.optional(v.string()),
    paymentMethod: v.optional(paymentMethodType),
    stripeCheckoutSessionId: v.optional(v.string()),
    paymentStatus: v.optional(v.union(v.literal('pending'), // 未払い
      v.literal('paid'), // 支払い済み
      v.literal('failed'), // 支払い失敗
      v.literal('cancelled') // キャンセル済み
    ))
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateReservation(args)

    // 予約の存在確認
    const reservation = await ctx.db.get(args.reservationId)
    if (!reservation || reservation.isArchive) {
      throw throwConvexError({
        message: '指定された予約が存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '予約が見つかりません',
        callFunc: 'reservation.update',
        severity: 'low',
        details: { ...args },
      })
    }

    // 予約時間が変更されている場合、重複チェックを行う
    if (
      args.startTimeUnix !== undefined &&
      args.endTimeUnix !== undefined &&
      (args.startTimeUnix !== reservation.startTimeUnix ||
        args.endTimeUnix !== reservation.endTimeUnix)
    ) {
      // ミリ秒単位のタイムスタンプをそのまま使用し、予約日を取得
      const reservationDate = new Date(args.startTimeUnix!)

      // 予約時間の重複チェック（自分自身の予約は除外）
      const staffId = reservation.staffId
      const salonId = reservation.salonId

      // 既存の予約を除外した形で利用可能かチェック
      const existingReservations = await ctx.db
        .query('reservation')
        .withIndex('by_staff_id_status', (q) =>
          q
            .eq('salonId', salonId)
            .eq('staffId', staffId)
            .eq('isArchive', false)
            .eq('status', 'confirmed')
        )
        .filter((q) =>
          q.and(
            // 自分自身の予約は除外
            q.neq(q.field('_id'), args.reservationId),
            q.or(q.eq(q.field('status'), 'confirmed'), q.eq(q.field('status'), 'pending')),
            // 予約時間と重複するかどうかをチェック
            q.lt(q.field('startTimeUnix'), args.endTimeUnix!),
            q.gt(q.field('endTimeUnix'), args.startTimeUnix!)
          )
        )
        .collect()

      if (existingReservations.length > 0) {
        throw throwConvexError({
          message: 'この時間帯はすでに予約が入っています。別の時間を選択してください。',
          status: 409,
          code: 'CONFLICT',
          title: '予約が重複しています',
          callFunc: 'reservation.update',
          severity: 'low',
          details: { ...args },
        })
      }
    }

    const updateData = excludeFields(args, ['reservationId'])

    return await ctx.db.patch(args.reservationId, updateData)
  },
})

// 予約の削除
export const archive = mutation({
  args: {
    reservationId: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateRequired(args.reservationId, 'reservationId')
    return await archiveRecord(ctx, args.reservationId)
  },
})

export const upsert = mutation({
  args: {
    reservationId: v.id('reservation'),
    customerId: v.id('customer'),
    staffId: v.id('staff'),
    menus: v.optional(
      v.array(
        v.object({
          menuId: v.id('menu'),
          quantity: v.number(),
        })
      )
    ),
    salonId: v.id('salon'),
    options: v.optional(
      v.array(
        v.object({
          optionId: v.id('salon_option'),
          quantity: v.number(),
        })
      )
    ),
    unitPrice: v.optional(v.number()),
    totalPrice: v.optional(v.number()),
    status: v.optional(reservationStatusType),
    startTimeUnix: v.optional(v.number()),
    endTimeUnix: v.optional(v.number()),
    hairImgFilePath: v.optional(v.string()),
    usePoints: v.optional(v.number()),
    couponId: v.optional(v.id('coupon')),
    couponDiscount: v.optional(v.number()),
    notes: v.optional(v.string()),
    paymentMethod: v.optional(paymentMethodType),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateReservation(args)

    // 必須フィールドの存在確認
    if (!args.startTimeUnix || !args.endTimeUnix) {
      throw throwConvexError({
        message: '予約の開始時間と終了時間は必須です',
        status: 400,
        code: 'INVALID_ARGUMENT',
        title: '予約の開始時間と終了時間は必須です',
        callFunc: 'reservation.upsert',
        severity: 'low',
        details: { ...args },
      })
    }

    const existingReservation = await ctx.db.get(args.reservationId)

    if (!existingReservation || existingReservation.isArchive) {
      return await ctx.db.insert('reservation', {
        ...args,
        isArchive: false,
      })
    } else {
      // 既存予約の更新の場合
      // 予約時間が変更されている場合、重複チェックを行う
      if (
        args.startTimeUnix !== existingReservation.startTimeUnix ||
        args.endTimeUnix !== existingReservation.endTimeUnix
      ) {
        // 既存の予約を除外した形で利用可能かチェック
        const existingReservations = await ctx.db
          .query('reservation')
          .withIndex('by_staff_id_status', (q) =>
            q
              .eq('salonId', args.salonId)
              .eq('staffId', args.staffId)
              .eq('isArchive', false)
              .eq('status', 'confirmed')
          )
          .filter((q) =>
            q.and(
              // 自分自身の予約は除外
              q.neq(q.field('_id'), args.reservationId),
              q.or(q.eq(q.field('status'), 'confirmed'), q.eq(q.field('status'), 'pending')),
              // 予約時間と重複するかどうかをチェック
              q.lt(q.field('startTimeUnix'), args.endTimeUnix!),
              q.gt(q.field('endTimeUnix'), args.startTimeUnix!)
            )
          )
          .collect()

        if (existingReservations.length > 0) {
          throw throwConvexError({
            message: 'この時間帯はすでに予約が入っています。別の時間を選択してください。',
            status: 409,
            code: 'CONFLICT',
            title: '予約が重複しています',
            callFunc: 'reservation.upsert',
            severity: 'low',
            details: { ...args },
          })
        }
      }

      const updateData = excludeFields(args, ['reservationId'])
      return await ctx.db.patch(existingReservation._id, updateData)
    }
  },
})

export const kill = mutation({
  args: {
    reservationId: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateRequired(args.reservationId, 'reservationId')
    return await killRecord(ctx, args.reservationId)
  },
})

export const updateStatus = mutation({
  args: {
    reservationId: v.id('reservation'),
    status: reservationStatusType,
  },
  handler: async (ctx, args) => {
    validateRequired(args.reservationId, 'reservationId')
    validateRequired(args.status, 'status')
    const reservation = await ctx.db.get(args.reservationId)
    if (!reservation || reservation.isArchive) {
      throw throwConvexError({
        message: '指定された予約が存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '予約が見つかりません',
        callFunc: 'reservation.cancel',
        severity: 'low',
        details: { ...args },
      })
    }

    if (reservation.status == 'cancelled') {
      throw throwConvexError({
        message: 'この予約はすでにキャンセルされています',
        status: 400,
        code: 'INVALID_ARGUMENT',
        title: '予約はすでにキャンセルされています',
        callFunc: 'reservation.updateStatus',
        severity: 'low',
        details: { ...args },
      })
    }

    return await ctx.db.patch(args.reservationId, {
      status: args.status,
    })
  },
})

export const updateReservationPaymentStatus = mutation({
  args: {
    reservationId: v.id('reservation'),
    paymentStatus: v.union(
      v.literal('pending'),
      v.literal('paid'),
      v.literal('failed'),
      v.literal('cancelled')
    ),
    stripeCheckoutSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reservationId, {
      paymentStatus: args.paymentStatus,
      ...(args.stripeCheckoutSessionId && { stripeCheckoutSessionId: args.stripeCheckoutSessionId }),
    });
  },
});

export const updateReservationStripeCheckoutSessionId = mutation({
  args: {
    reservationId: v.id('reservation'),
    stripeCheckoutSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reservationId, {
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      paymentStatus: 'pending', // Checkout Session作成時はpendingに設定
    });
  },
}); 

