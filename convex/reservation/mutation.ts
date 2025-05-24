import { mutation, internalMutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { excludeFields, updateRecord } from '@/convex/utils/helpers';
import { reservationStatusType,  paymentMethodType,reservationPaymentStatusType, reservationMenuOrOptionType, imageType } from '@/convex/types';
import { validateRequired, validateRequiredNumber, validateDateStrToDate } from '@/convex/utils/validations';
import { checkAuth } from '@/convex/utils/auth';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import {
  createReservationWithDetails,
  archiveReservationWithDetails,
  deleteReservationWithDetails,
  checkDoubleBooking,
} from '@/convex/reservation/reservation.helpers';

// 予約の追加処理
// 予約作成に必要な情報を受け取り、入力バリデーションやスタッフ・組織の存在確認を行う。
// さらに、予約時間の重複チェック（Race condition防止）を実施し、問題なければ予約と予約詳細を同時に作成する。
// 共通ヘルパーを利用することで、予約と関連情報の一貫性を保ちつつ効率的に処理を行う。
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
    // 入力値の妥当性を検証し、不正なデータの登録を防止するためのバリデーション処理
    validateDateStrToDate(args.date, 'date')
    validateRequiredNumber(args.start_time_unix, 'start_time_unix')
    validateRequiredNumber(args.end_time_unix, 'end_time_unix')
    validateRequired(args.customer_id, 'customer_id')
    validateRequired(args.org_id, 'org_id')

    // スタッフIDに対応するスタッフが存在するかを確認し、存在しなければエラーを返す
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

    // 組織が存在し、かつアーカイブされていないことを確認する
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

    // 予約時間の重複を防ぐため、同じスタッフ・日時での予約が既に存在しないかをチェックする（Race condition防止）
    const isOverlapping = await checkDoubleBooking(ctx, {
      tenant_id: args.tenant_id,
      org_id: args.org_id,
      staff_id: args.staff_id,
      date: args.date,
      start_time_unix: args.start_time_unix,
      end_time_unix: args.end_time_unix,
    });

    if (isOverlapping) {
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

    // 予約本体と詳細情報を一括で作成する共通ヘルパーを呼び出すことで、データの整合性を確保しつつ効率的に処理
    const { reservationId } = await createReservationWithDetails(ctx, args);
    return reservationId;
  },
})

// 予約情報の更新処理
// 予約内容の変更時に必要なバリデーションや認証チェックを行い、予約が存在しアーカイブされていないことを確認する。
// 予約時間が変更された場合は重複チェックを行い、問題なければ更新処理を実行する。
// 予約IDを除外した更新データを用いて、予約レコードの整合性を保ちながら更新する。
export const update = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    reservation_id: v.id('reservation'),
    customer_id: v.string(),
    customer_name: v.string(),
    staff_id: v.id('staff'),
    staff_name: v.string(),
    menus: v.array(reservationMenuOrOptionType),
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
    // 認証チェック: ログイン済みユーザーのみ更新可能
    checkAuth(ctx)
    // 入力値の妥当性検証
    validateDateStrToDate(args.date, 'date')
    validateRequiredNumber(args.start_time_unix, 'start_time_unix')
    validateRequiredNumber(args.end_time_unix, 'end_time_unix')
    validateRequired(args.customer_id, 'customer_id')
    validateRequired(args.org_id, 'org_id')

    // 対象予約が存在し、アーカイブされていないことを確認
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

    // 予約時間が変更された場合は重複チェックを実施し、同時間帯に他の予約が存在しないかを検証（Race condition防止）
    if (
      (args.start_time_unix !== reservation.start_time_unix ||
        args.end_time_unix !== reservation.end_time_unix)
    ) {
      const isOverlapping = await checkDoubleBooking(ctx, {
        tenant_id: args.tenant_id,
        org_id: args.org_id,
        staff_id: args.staff_id,
        date: args.date,
        start_time_unix: args.start_time_unix,
        end_time_unix: args.end_time_unix,
        excludeReservationId: reservation._id, // 自分自身の予約は除外
      });

      if (isOverlapping) {
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

    // 更新対象から予約IDを除外し、更新データを準備
    const updateData = excludeFields(args, ['reservation_id'])

    // 予約の基本情報を先に更新し、その後詳細情報を更新することで整合性を保つ
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

    // 予約詳細情報を更新し、最新の状態をDBに反映
    return await ctx.db.patch(reservation._id, updateData)
  },
})

// 予約の論理削除（アーカイブ）処理
// 予約を物理的に削除せず、アーカイブフラグを立てることで履歴を保持しつつ非表示にする。
// 関連する予約詳細も同時にアーカイブする共通ヘルパーを利用し、一貫した状態管理を実現。
export const archive = mutation({
  args: {
    reservation_id: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    // 認証チェック: ログイン済みユーザーのみ実行可能
    checkAuth(ctx)
    // 予約と関連詳細をアーカイブ状態に更新
    await archiveReservationWithDetails(ctx, args.reservation_id)
    return true;
  },
})

// 予約の物理削除処理
// 予約とその関連詳細を完全に削除する。削除後は復元不可のため注意が必要。
// 共通ヘルパーを利用して関連情報も漏れなく削除する。
export const kill = mutation({
  args: {
    reservation_id: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    // 認証チェック: ログイン済みユーザーのみ実行可能
    checkAuth(ctx)
    // 予約と関連詳細を完全に削除
    await deleteReservationWithDetails(ctx, args.reservation_id)
    return true;
  },
})

// 予約ステータスの更新処理
// 予約の状態変更を行う。キャンセル済みの予約に対しては変更不可とし、整合性を保つ。
export const updateStatus = mutation({
  args: {
    reservation_id: v.id('reservation'),
    status: reservationStatusType,
  },
  handler: async (ctx, args) => {
    // 入力値の必須チェック
    validateRequired(args.reservation_id, 'reservation_id')
    validateRequired(args.status, 'status')
    // 予約の存在確認とアーカイブ状態のチェック
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

    // キャンセル済み予約のステータス変更を禁止し、不整合を防止
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
    // ステータス更新を実行
    return await updateRecord(
      ctx,
      reservation._id,
      {
        status: args.status,
      }
    )
  },
})

// 予約の支払ステータスおよびStripe Checkout Session IDの更新処理
// 支払状況を管理し、必要に応じてStripeのセッション情報も更新する。
// 予約と関連情報の整合性を保つため共通の更新処理を利用。
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

// Stripe Checkout Session IDの更新処理
// Checkout Session作成時に呼び出し、支払ステータスをpendingに設定することで決済待ち状態を管理。
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

// 複数予約の一括削除処理（内部用）
// 指定された複数の予約IDに対して、関連詳細を含めて物理削除を行う。
// 削除時に存在しないドキュメントがあってもエラーを無視し、処理を継続することで堅牢性を向上。
export const deleteReservationBatch = internalMutation({
  args: {
    ids: v.array(v.id("reservation")),
  },
  handler: async (ctx, { ids }) => {
    // 複数の予約IDに対して並列で削除処理を実行
    await Promise.all(ids.map(async (id) => {
      try{
        await deleteReservationWithDetails(ctx, id);
      } catch (e) {
        // 削除時にエラーが発生してもログに記録し処理は継続
        console.error("予約の削除時にエラーが発生しました" + id, e)
      }
    }));
  },
});