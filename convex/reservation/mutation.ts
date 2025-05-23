"use node"

import { mutation, internalMutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { excludeFields, archiveRecord,updateRecord, killRecord, createRecord } from '@/convex/utils/helpers';
import { reservationStatusType, paymentMethodType,reservationPaymentStatusType, reservationMenuOrOptionType, imageType } from '@/convex/types';
import { validateRequired, validateRequiredNumber, validateDateStrToDate } from '@/convex/utils/validations';
import { checkAuth } from '@/convex/utils/auth';
import { api } from '@/convex/_generated/api';
import { ConvexError } from 'convex/values';
import { v4 as uuidv4 } from 'uuid';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';

// 予約の追加
export const create = mutation({
  args: {
    tenant_id: v.id('tenant'), // テナントID
    org_id: v.string(), // 組織ID
    customer_id: v.string(), // Supabase 側の customer.id
    staff_id: v.id('staff'), // スタッフID
    customer_name: v.string(), // 顧客名
    staff_name: v.string(), // スタッフ名
    status: reservationStatusType, // 予約ステータス
    date: v.string(), // 予約日 YYYY-MM-DD
    start_time_unix: v.number(), // 予約開始時間
    end_time_unix: v.number(), // 予約終了時間
    reservation_id: v.id('reservation'), // 予約ID
    coupon_id: v.optional(v.id('coupon')), // クーポンID
    payment_method: paymentMethodType, // 支払方法
    stripe_checkout_session_id: v.optional(v.string()), // Stripe Checkout Session ID
    payment_status: reservationPaymentStatusType, // 支払ステータス
    menus: v.array(reservationMenuOrOptionType), // メニュー/オプション
    options: v.array(reservationMenuOrOptionType), // オプション
    extra_charge: v.optional(v.number()), // 追加料金
    use_points: v.optional(v.number()), // 使用ポイント数
    coupon_discount: v.optional(v.number()), // クーポン割引額
    featured_hair_images: v.array(imageType), // フィーチャー画像
    notes: v.optional(v.string()), // メモ
  },
  handler: async (ctx, args) => {
   
    validateDateStrToDate(args.date, 'date')
    validateRequiredNumber(args.start_time_unix, 'start_time_unix')
    validateRequiredNumber(args.end_time_unix, 'end_time_unix')
    validateRequired(args.customer_id, 'customer_id')
    validateRequired(args.org_id, 'org_id')

    // スタッフの存在確認
    const staff = await ctx.db.get(args.staff_id)
    if (!staff) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'reservation.create',
        message: '指定されたスタッフが存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      })
    }

    // 組織の存在確認
    const organization = await ctx.db.query('organization').withIndex('by_tenant_org_archive', q => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_archive', false)).first()
    if (!organization) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'reservation.create',
        message: '指定された組織が存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }

    // 予約の重複チェック
    const checkDoubleBooking = await ctx.runQuery(
      api.reservation.query.checkDoubleBooking,
      {
        tenant_id: args.tenant_id,
        org_id: args.org_id,
        staff_id: args.staff_id,
        date: args.date,
        start_time_unix: args.start_time_unix,
        end_time_unix: args.end_time_unix,
      }
    )
    if (checkDoubleBooking.isOverlapping) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.CONFLICT,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'reservation.create',
        message: 'この時間帯の予約はすでにいっぱいです。別の時間を選択してください。',
        code: 'CONFLICT',
        status: 409,
        details: {
          ...args,
        },
      });
    }
    // 予約の作成
    const master_id = uuidv4()
    const reservationId = await createRecord(
      ctx,
      'reservation',
      {
        master_id: master_id,         // Convex & Supabase 共通識別子
        tenant_id: args.tenant_id, // テナントID
        org_id: args.org_id, // 組織ID
        customer_id: args.customer_id, // Supabase 側の customer.id
        staff_id: args.staff_id, // スタッフID
        customer_name: args.customer_name, // 顧客名
        staff_name: args.staff_name, // スタッフ名
        status: args.status, // 予約ステータス
        stripe_checkout_session_id: args.stripe_checkout_session_id, // Stripe Checkout Session ID
        payment_status: args.payment_status, // 支払ステータス
        date: args.date, // 予約日 YYYY-MM-DD
        start_time_unix: args.start_time_unix, // 予約開始時間
        end_time_unix: args.end_time_unix, // 予約終了時間
      }
    )

    await createRecord(
      ctx,
      'reservation_detail',
      {
        tenant_id: args.tenant_id, // テナントID
        org_id: args.org_id, // 組織ID
        reservation_id: reservationId, // 予約ID
        coupon_id: args.coupon_id, // クーポンID
        payment_method: args.payment_method, // 支払方法
        menus: args.menus, // メニュー/オプション
        options: args.options, // オプション
        extra_charge: args.extra_charge, // 追加料金
        use_points: args.use_points, // 使用ポイント数
        coupon_discount: args.coupon_discount, // クーポン割引額
        featured_hair_images: args.featured_hair_images, // フィーチャー画像
        notes: args.notes, // メモ
    })

    return reservationId
  },
})

// 予約情報の更新
export const update = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    reservation_id: v.id('reservation'),
    customer_id: v.string(),
    customer_name: v.string(),
    staff_id: v.id('staff'),
    staff_name: v.string(),
    menus: v.array(
        reservationMenuOrOptionType
    ),
    options: v.array(reservationMenuOrOptionType),
    unit_price: v.number(),
    total_price: v.number(),
    status: reservationStatusType,
    date: v.string(),
    start_time_unix: v.number(),
    end_time_unix: v.number(),
    featured_hair_images: v.array(imageType),
    use_points: v.number(),
    coupon_id: v.id('coupon'),
    coupon_discount: v.number(),
    notes: v.string(),
    payment_method: paymentMethodType,
    stripe_checkout_session_id: v.string(),
    payment_status: reservationPaymentStatusType,
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateDateStrToDate(args.date, 'date')
    validateRequiredNumber(args.start_time_unix, 'start_time_unix')
    validateRequiredNumber(args.end_time_unix, 'end_time_unix')
    validateRequired(args.customer_id, 'customer_id')
    validateRequired(args.org_id, 'org_id')

    // 予約の存在確認
    const reservation = await ctx.db.get(args.reservation_id)
    if (!reservation || reservation.is_archive) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'reservation.update',
        message: '指定された予約が存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      })
    }

    // 予約時間が変更されている場合、重複チェックを行う
    if (
      (args.start_time_unix !== reservation.start_time_unix ||
        args.end_time_unix !== reservation.end_time_unix)
    ) {
      // 予約時間の重複チェック（自分自身の予約は除外）
      const staffId = reservation.staff_id
      const tenantId = reservation.tenant_id

      // 既存の予約を除外した形で利用可能かチェック
      const existingReservations = await ctx.db
        .query('reservation')
        .withIndex('by_tenant_org_staff_date_status_archive', (q) =>
          q
            .eq('tenant_id', tenantId)
            .eq('org_id', args.org_id)
            .eq('staff_id', staffId)
            .eq('date', args.date)
            .eq('status', 'confirmed')
            .eq('is_archive', false)
        )
        .filter((q) =>
          q.and(
            // 自分自身の予約は除外
            q.neq(q.field('_id'), reservation._id),
            // 予約時間と重複するかどうかをチェック
            q.lt(q.field('start_time_unix'), args.end_time_unix!),
            q.gt(q.field('end_time_unix'), args.start_time_unix!)
          )
        )
        .collect()

      if (existingReservations.length > 0) {
        throw new ConvexError({
          message: 'この時間帯はすでに予約が入っています。別の時間を選択してください。',
          statusCode: ERROR_STATUS_CODE.CONFLICT,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'reservation.update',
          code: 'CONFLICT',
          status: 409,
          details: {
            ...args,
          },
        })
      }
    }

    const updateData = excludeFields(args, ['reservation_id'])

    await updateRecord(
      ctx,
      reservation._id,
      {
        master_id: reservation.master_id,         // Convex & Supabase 共通識別子
        tenant_id: args.tenant_id, // テナントID
        org_id: args.org_id, // 組織ID
        customer_id: args.customer_id, // Supabase 側の customer.id
        staff_id: args.staff_id, // スタッフID
        customer_name: args.customer_name, // 顧客名
        staff_name: args.staff_name, // スタッフ名
        status: args.status, // 予約ステータス
        date: args.date, // 予約日 YYYY-MM-DD
        start_time_unix: args.start_time_unix, // 予約開始時間
        end_time_unix: args.end_time_unix, // 予約終了時間
      }
    )

    return await ctx.db.patch(reservation._id, updateData)
  },
})

// 予約の削除
export const archive = mutation({
  args: {
    reservation_id: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    const reservationDetail = await ctx.db.query('reservation_detail').withIndex('by_reservation_archive', q => q.eq('reservation_id', args.reservation_id).eq('is_archive', false)).first()
    if (!reservationDetail) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'reservation.archive',
        message: '指定された予約の詳細が存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      })
    }
    await archiveRecord(ctx, reservationDetail._id)
    await archiveRecord(ctx, args.reservation_id)

    return true;
  },
})


export const kill = mutation({
  args: {
    reservation_id: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    const reservationDetail = await ctx.db.query('reservation_detail').withIndex('by_reservation_archive', q => q.eq('reservation_id', args.reservation_id).eq('is_archive', false)).first()
    if (!reservationDetail) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'reservation.archive',
        message: '指定された予約の詳細が存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      })
    }
    await killRecord(ctx, reservationDetail._id)
    await killRecord(ctx, args.reservation_id)
    return true;
  },
})

export const updateStatus = mutation({
  args: {
    reservation_id: v.id('reservation'),
    status: reservationStatusType,
  },
  handler: async (ctx, args) => {
    validateRequired(args.reservation_id, 'reservation_id')
    validateRequired(args.status, 'status')
    const reservation = await ctx.db.get(args.reservation_id)
    if (!reservation || reservation.is_archive) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'reservation.updateStatus',
        message: '指定された予約が存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      })
    }

    if (reservation.status == 'cancelled') {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'reservation.updateStatus',
        message: 'この予約はすでにキャンセルされています',
        code: 'BAD_REQUEST',
        status: 400,
        details: {
          ...args,
        },
      })
    }
    return await updateRecord(
      ctx,
      reservation._id,
      {
        status: args.status,
      }
    )
  },
})

export const updateReservationPaymentStatus = mutation({
  args: {
    reservation_id: v.id('reservation'),
    payment_status: reservationPaymentStatusType,
    stripe_checkout_session_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await updateRecord(
      ctx,
      args.reservation_id,
      {
        payment_status: args.payment_status,
        stripe_checkout_session_id: args.stripe_checkout_session_id,
      }
    )
  },
});

export const updateReservationStripeCheckoutSessionId = mutation({
  args: {
    reservation_id: v.id('reservation'),
    stripe_checkout_session_id: v.string(),
  },
  handler: async (ctx, args) => {
    await updateRecord(
      ctx,
      args.reservation_id,
      {
        stripe_checkout_session_id: args.stripe_checkout_session_id,
        payment_status: 'pending', // Checkout Session作成時はpendingに設定
      }
    )
  },
});

export const deleteReservationBatch = internalMutation({
  args: {
    ids: v.array(v.id("reservation")),
  },
  handler: async (ctx, { ids }) => {
    // 存在しないドキュメント削除エラーをキャッチして無視
    await Promise.all(ids.map(async (id) => {
      try{
        const reservationDetail = await ctx.db.query('reservation_detail').withIndex('by_reservation_archive', q => q.eq('reservation_id', id).eq('is_archive', false)).first()
        if (reservationDetail) {
          await killRecord(ctx, reservationDetail._id)
          await killRecord(ctx, id);
        }else{
          console.error("予約の詳細が存在しません" + id)
          await killRecord(ctx, id);
        }
      } catch (e) {
        console.error("予約の削除時にエラーが発生しました" + id, e)
      }
    }));
  },
});

