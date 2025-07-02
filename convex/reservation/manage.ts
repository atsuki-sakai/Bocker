import { v } from "convex/values";
import { mutation, MutationCtx } from "@/convex/_generated/server";
import { internal } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { ConvexError } from "convex/values";
import {
  checkReservationDoubleBooking,
  createReservationWithDetails,
} from "./reservation.helpers";
import { validateDateStrToDate, validateRequiredNumber, validateRequired } from "@/convex/utils/validations";
import { ReservationMenu, ReservationOption, ImageType, PaymentMethod, ReservationStatus, ReservationPaymentStatus } from "@/convex/types";
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from "@/lib/errors/constants";
import { cancelableDeadline } from "./reservation.helpers";
import { reservationMenuType, reservationOptionType, imageType, paymentMethodType, reservationStatusType, reservationPaymentStatusType } from "@/convex/types";
import { getAppUrl } from "@/lib/env-config";

// Payload型定義
type CreatePayload = {
  tenant_id: Id<'tenant'>;
  org_id: Id<'organization'>;
  customer_id?: string;
  staff_id?: Id<'staff'>;
  customer_name: string;
  staff_name?: string;
  is_free_nomination?: boolean;
  status: ReservationStatus;
  date: string;
  start_time_unix: number;
  end_time_unix: number;
  total_price: number;
  coupon_id?: Id<'coupon'>;
  payment_method: PaymentMethod;
  stripe_checkout_session_id?: string;
  payment_status?: ReservationPaymentStatus;
  menus: ReservationMenu[];
  options: ReservationOption[];
  extra_charge?: number;
  use_points?: number;
  coupon_discount?: number;
  featured_hair_images: ImageType[];
  notes?: string;
  pending_duration_minutes?: number;
  checkout_url?: string;
};

type ConfirmPayload = {
  reservation_id: Id<'reservation'>;
  stripe_payment_intent_id?: string;
  stripe_checkout_session_id?: string;
};

type CancelPayload = {
  reservationId: Id<'reservation'>;
  cancelledBy: 'customer' | 'staff' | 'system';
  cancelReason?: string;
  skipValidation?: boolean;
};

type StatusPayload = {
  reservationId: Id<'reservation'>;
  status: ReservationStatus;
};

type ManagePayload = CreatePayload | ConfirmPayload | CancelPayload | StatusPayload;

// 副次処理用のエンリッチPayload型
type EnrichedPayload = ManagePayload & {
  reservation?: Doc<'reservation'> & {
    detail?: Doc<'reservation_detail'> | null;
  };
  pointConfig?: Doc<'point_config'> | null;
};

// 統合予約管理Mutation
export const handleReservationManage = mutation({
  args: {
    mode: v.union(
      v.literal("create"),
      v.literal("confirm"),
      v.literal("cancel"),
      v.literal("status")
    ),
    payload: v.union(
      // create mode
      v.object({
        tenant_id: v.id('tenant'),
        org_id: v.id('organization'),
        customer_id: v.optional(v.string()),
        staff_id: v.optional(v.id('staff')),
        customer_name: v.string(),
        staff_name: v.optional(v.string()),
        is_free_nomination: v.optional(v.boolean()),
        status: reservationStatusType,
        date: v.string(),
        start_time_unix: v.number(),
        end_time_unix: v.number(),
        total_price: v.number(),
        coupon_id: v.optional(v.id('coupon')),
        payment_method: paymentMethodType,
        stripe_checkout_session_id: v.optional(v.string()),
        payment_status: v.optional(reservationPaymentStatusType),
        menus: v.array(reservationMenuType),
        options: v.array(reservationOptionType),
        extra_charge: v.optional(v.number()),
        use_points: v.optional(v.number()),
        coupon_discount: v.optional(v.number()),
        featured_hair_images: v.array(imageType),
        notes: v.optional(v.string()),
        pending_duration_minutes: v.optional(v.number()),
        checkout_url: v.optional(v.string()),
      }),
      // confirm mode
      v.object({
        reservation_id: v.id('reservation'),
        stripe_payment_intent_id: v.optional(v.string()),
        stripe_checkout_session_id: v.optional(v.string()),
      }),
      // cancel mode
      v.object({
        reservationId: v.id('reservation'),
        cancelledBy: v.union(v.literal('customer'), v.literal('staff'), v.literal('system')),
        cancelReason: v.optional(v.string()),
        skipValidation: v.optional(v.boolean()),
      }),
      // status mode
      v.object({
        reservationId: v.id('reservation'),
        status: reservationStatusType,
      })
    ),
    eventId: v.optional(v.string()),
  },
  handler: async (ctx, { mode, payload, eventId }) => {
    // ① べき等性チェック
    if (eventId) {
      const done = await ctx.db
        .query("webhook_events")
        .withIndex("by_event_id", (q) => 
          q.eq("event_id", eventId)
        )
        .unique();
      if (done && done.processing_result === "success") {
        try {
          return JSON.parse(done.processing_result);
        } catch {
          return done.processing_result;
        }
      }
    }

    let result: {
      reservationId: Id<"reservation">;
      status?: ReservationStatus;
      payment_method?: PaymentMethod;
      checkout_url?: string;
      alreadyConfirmed?: boolean;
      newStatus?: ReservationStatus;
      refundedOptions?: ReservationOption[];
    };
    
    try {
      // モードに応じた処理
      switch (mode) {
        case "create":
          result = await createReservationCore(ctx, payload as CreatePayload);
          break;
        case "confirm":
          result = await confirmReservationCore(ctx, payload as ConfirmPayload);
          break;
        case "cancel":
          result = await cancelReservationCore(ctx, payload as CancelPayload);
          break;
        case "status":
          result = await updateStatusCore(ctx, payload as StatusPayload);
          break;
        default:
          throw new Error(`Unknown mode: ${mode}`);
      }

      // ② 副次処理 (失敗時は throw で roll-back)
      // 副次処理に必要な追加データを取得
      let enrichedPayload: EnrichedPayload = { ...payload } as EnrichedPayload;
      
      if (mode === "confirm" || mode === "cancel" || mode === "status") {
        // 予約詳細を取得
        const reservationId = mode === "confirm" ? result.reservationId : 
                            mode === "cancel" ? (payload as CancelPayload).reservationId :
                            (payload as StatusPayload).reservationId;
        const reservation = await ctx.db.get(reservationId);
        if (!reservation) {
          throw new ConvexError({
            code: "NOT_FOUND",
            message: "予約が見つかりません",
          });
        }
        const detail = await ctx.db
          .query("reservation_detail")
          .withIndex("by_reservation_archive", (q) => 
            q.eq("reservation_id", reservation._id).eq("is_archive", false)
          )
          .first();
          
        enrichedPayload = {
          ...payload,
          reservation: Object.assign(reservation, { detail }),
        } as EnrichedPayload;
        
        
        // ポイント設定を取得（confirm時またはstatus変更時）
        if ((mode === "confirm" || mode === "status") && reservation) {
          const pointConfig = await ctx.db
            .query("point_config")
            .withIndex("by_tenant_org_active_archive", (q) =>
              q.eq("tenant_id", reservation.tenant_id)
                .eq("org_id", reservation.org_id)
                .eq("is_active", true)
                .eq("is_archive", false)
            )
            .first();
          enrichedPayload.pointConfig = pointConfig;
        }
      }
      
      await ctx.scheduler.runAfter(0, internal.reservation.action.performSideEffects, {
        mode,
        payload: enrichedPayload,
        coreResult: result,
      });

      // ③ eventId保存
      if (eventId && 'tenant_id' in payload && 'org_id' in payload && payload.tenant_id && payload.org_id) {
        await ctx.db.insert("webhook_events", {
          event_id: eventId,
          processing_result: "success",
          event_type: "reservation_manage:" + mode,
          processed_at: Date.now(),
        });
      }

      return result;
    } catch (error) {
      // エラー時もeventId保存
      if (eventId && 'tenant_id' in payload && 'org_id' in payload && payload.tenant_id && payload.org_id) {
        await ctx.db.insert("webhook_events", {
          event_id: eventId,
          processing_result: "error",
          event_type: "reservation_manage:" + mode,
          processed_at: Date.now(),
          error_message: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }
  },
});

// Core関数: 予約作成
async function createReservationCore(ctx: MutationCtx, p: CreatePayload) {
  // 入力検証
  validateDateStrToDate(p.date, 'date');
  validateRequiredNumber(p.start_time_unix, 'start_time_unix');
  validateRequiredNumber(p.end_time_unix, 'end_time_unix');
  validateRequired(p.org_id, 'org_id');

  // スタッフ存在確認（指名フリーでない場合のみ）
  if (p.staff_id) {
    const staff = await ctx.db.get(p.staff_id);
    if (!staff) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "指定されたスタッフが存在しません",
      });
    }
  }

  // 組織存在確認
  const organization = await ctx.db
    .query('organization')
    .withIndex('by_tenant_active_archive', q => 
      q.eq('tenant_id', p.tenant_id).eq('is_active', true).eq('is_archive', false)
    )
    .first();
    
  if (!organization) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "指定された有効な組織が存在しません",
    });
  }

  // 1. 重複チェック（指名フリーでない場合のみ）
  if (p.staff_id && !p.is_free_nomination) {
    const isOverlapping = await checkReservationDoubleBooking(ctx, {
      tenant_id: p.tenant_id,
      org_id: p.org_id,
      staff_id: p.staff_id,
      date: p.date,
      start_time_unix: p.start_time_unix,
      end_time_unix: p.end_time_unix,
    });
    
    if (isOverlapping) {
      throw new ConvexError({ 
        code: ERROR_STATUS_CODE.CONFLICT, 
        severity: ERROR_SEVERITY.ERROR,
        message: "この時間帯の予約はすでにいっぱいです。別の時間を選択してください。",
        status: ERROR_STATUS_CODE.CONFLICT,
      });
    }
  }
  

  // 2. 在庫減算（オプションがある場合）
  if (p.options && p.options.length > 0) {
    const stockResult = await ctx.runMutation(internal.option.stock.decrementStockForReservation, {
      options: p.options.map((opt: ReservationOption) => ({
        id: opt.id,
        quantity: opt.quantity,
      })),
    });
    
    if (!stockResult.success && stockResult.errors.length > 0) {
      throw new ConvexError({
        code: ERROR_STATUS_CODE.BAD_REQUEST,
        message: stockResult.errors[0].error,
        severity: ERROR_SEVERITY.WARNING,
        status: ERROR_STATUS_CODE.BAD_REQUEST,
      });
    }
  }

  // 3. pending期限設定
  const pending_expiry = p.payment_method === "credit_card" 
    ? Date.now() + 30 * 60 * 1000 
    : undefined;

  // 4. 予約作成
  const { reservationId } = await createReservationWithDetails(ctx, {
    tenant_id: p.tenant_id,
    org_id: p.org_id,
    customer_id: p.customer_id,
    staff_id: p.staff_id,
    customer_name: p.customer_name,
    staff_name: p.staff_name,
    is_free_nomination: p.is_free_nomination,
    status: p.payment_method === "cash" ? "confirmed" : "pending",
    date: p.date,
    start_time_unix: p.start_time_unix,
    end_time_unix: p.end_time_unix,
    payment_method: p.payment_method,
    payment_status: "pending",
    stripe_checkout_session_id: p.stripe_checkout_session_id,
    coupon_id: p.coupon_id,
    total_price: p.total_price,
    menus: p.menus,
    options: p.options,
    extra_charge: p.extra_charge,
    use_points: p.use_points,
    coupon_discount: p.coupon_discount,
    featured_hair_images: p.featured_hair_images || [],
    notes: p.notes || undefined,
    pending_expiry: pending_expiry || undefined,
  });


  return { 
    reservationId,
    status: (p.payment_method === "cash" ? "confirmed" : "pending") as ReservationStatus,
    payment_method: p.payment_method,
    checkout_url: p.checkout_url,
  };
}

// Core関数: 決済確定
async function confirmReservationCore(
  ctx: MutationCtx,
  payload: ConfirmPayload
) {
  const reservation = await ctx.db.get(payload.reservation_id);
  if (!reservation) {
    throw new ConvexError({ 
      code: "NOT_FOUND", 
      message: "予約が見つかりません" 
    });
  }

  // すでに確定済みの場合は何もしない（冪等性）
  if (reservation.status === "confirmed" && reservation.payment_status === "paid" || reservation.payment_status === "completed") {
    return { 
      reservationId: payload.reservation_id,
      alreadyConfirmed: true 
    };
  }

  await ctx.db.patch(payload.reservation_id, {
    status: "confirmed",
    payment_status: "paid",
    stripe_payment_intent_id: payload.stripe_payment_intent_id,
    stripe_checkout_session_id: payload.stripe_checkout_session_id,
    updated_at: Date.now(),
  });

  return { 
    reservationId: payload.reservation_id,
    alreadyConfirmed: false 
  };
}

// Core関数: キャンセル
async function cancelReservationCore(
  ctx: MutationCtx,
  args: CancelPayload
) {
  const reservation = await ctx.db.get(args.reservationId);
  if (!reservation) {
    throw new ConvexError({ 
      code: "NOT_FOUND", 
      message: "予約が見つかりません" 
    });
  }

  // すでにキャンセル済みの場合
  if (reservation.status === "cancelled" || reservation.status === "refunded" || reservation.status === "completed") {
    throw new ConvexError({
      code: ERROR_STATUS_CODE.CONFLICT,
      message: "この予約はキャンセルされているか、返金済み、または施術完了しています。",
      severity: ERROR_SEVERITY.ERROR,
      status: ERROR_STATUS_CODE.CONFLICT,
    });
  }

  // 予約詳細取得
  const detail = await ctx.db
    .query("reservation_detail")
    .withIndex("by_reservation_archive", (q) => 
      q.eq("reservation_id", args.reservationId).eq("is_archive", false)
    )
    .first();

  // 顧客キャンセルの場合は期限チェック
  if (args.cancelledBy === "customer" && !args.skipValidation) {
    const orgConfig = await ctx.db
      .query("reservation_config")
      .withIndex("by_tenant_org_archive", (q) =>
        q.eq("tenant_id", reservation.tenant_id)
          .eq("org_id", reservation.org_id)
          .eq("is_archive", false)
      )
      .first();
    const cancelDeadline = cancelableDeadline(orgConfig?.available_cancel_days ?? 1, reservation.start_time_unix);
    
    if (Date.now() > cancelDeadline) {
      throw new ConvexError({
        code: "CANCELLATION_DEADLINE_PASSED",
        message: "キャンセル期限を過ぎているため、キャンセルできません",
        severity: ERROR_SEVERITY.ERROR,
        status: ERROR_STATUS_CODE.BAD_REQUEST,
      });
    }
  }

  // 在庫復元
  if (detail?.options && detail.options.length > 0) {
    await ctx.runMutation(internal.option.stock.restoreStockForCancellation, {
      options: detail.options.map(opt => ({
        id: opt.id,
        quantity: opt.quantity,
      })),
    });
  }

  // ステータス更新
  await ctx.db.patch(args.reservationId, {
    status: "cancelled",
    cancelled_at: Date.now(),
    cancelled_by: args.cancelledBy,
    cancel_reason: args.cancelReason,
    updated_at: Date.now(),
  });

  // 詳細にもキャンセル情報記録
  if (detail) {
    await ctx.db.patch(detail._id, {
      cancellation_info: {
        cancelled_at: Date.now(),
        cancelled_by: args.cancelledBy,
        reason: args.cancelReason,
      },
      updated_at: Date.now(),
    });
  }
  
  // LINEでキャンセル通知を送信
  try {
    // 組織情報とAPIコンフィグを取得
    const [organization, apiConfig] = await Promise.all([
      ctx.db
        .query('organization')
        .withIndex('by_tenant_active_archive', q => 
          q.eq('tenant_id', reservation.tenant_id).eq('is_active', true).eq('is_archive', false)
        )
        .first(),
      ctx.db
        .query('api_config')
        .withIndex('by_tenant_org_archive', q =>
          q.eq('tenant_id', reservation.tenant_id)
            .eq('org_id', reservation.org_id)
            .eq('is_archive', false)
        )
        .first(),
    ]);

    if (!organization) {
      console.warn('キャンセル通知: 組織情報が見つかりません');
      return { 
        reservationId: args.reservationId,
        refundedOptions: detail?.options || [],
      };
    }

    // 顧客にキャンセル通知を送信（customer_idがある場合のみ）
    if (reservation.customer_id && apiConfig?.line_access_token) {
      try {
        // 顧客向けキャンセル通知のデータを準備
        const customerNotificationData = {
          tenantId: reservation.tenant_id,
          organizationId: reservation.org_id,
          customerUid: reservation.customer_id,
          cancelData: {
            reservationId: reservation._id,
            date: reservation.date,
            startTimeUnix: reservation.start_time_unix,
            endTimeUnix: reservation.end_time_unix,
            staffName: reservation.staff_name || '指名フリー',
            menus: detail?.menus || [],
            options: detail?.options || [],
            totalPrice: detail?.total_price || 0,
            cancelledBy: args.cancelledBy,
            cancelReason: args.cancelReason,
          },
        };

        const baseUrl = getAppUrl()
        const customerResponse = await fetch(`${baseUrl}/api/line/customer-cancellation-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customerNotificationData),
        });

        if (!customerResponse.ok) {
          console.error('顧客キャンセル通知APIエラー:', customerResponse.status);
        } else {
          console.log('顧客キャンセル通知送信成功');
        }
        
      } catch (customerNotificationError) {
        console.warn('顧客キャンセル通知の送信に失敗しました:', customerNotificationError);
        // 顧客通知の失敗はキャンセル処理をブロックしない
      }
    }

    // サロンにキャンセル通知を送信（org_line_idがある場合のみ）
    if (apiConfig?.org_line_id) {
      try {
        // 環境変数から弊社のLINEチャンネル情報を取得
        const companyLineAccessToken = process.env.COMPANY_LINE_CHANNEL_ACCESS_TOKEN;
        
        if (companyLineAccessToken) {
          // サロン向けキャンセル通知のデータを準備
          const salonNotificationData = {
            tenantId: reservation.tenant_id,
            organizationId: reservation.org_id,
            reservationId: reservation._id,
            cancelData: {
              reservationId: reservation._id,
              customerName: reservation.customer_name,
              staffName: reservation.staff_name || '不明なスタッフ',
              date: reservation.date,
              startTimeUnix: reservation.start_time_unix,
              endTimeUnix: reservation.end_time_unix,
              menus: detail?.menus || [],
              options: detail?.options || [],
              totalPrice: detail?.total_price || 0,
              cancelledBy: args.cancelledBy,
              cancelReason: args.cancelReason,
            },
          };

          const baseUrl = getAppUrl()
          const salonResponse = await fetch(`${baseUrl}/api/line/salon-cancellation-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(salonNotificationData),
          });

          if (!salonResponse.ok) {
            console.error('サロンキャンセル通知APIエラー:', salonResponse.status);
          } else {
            console.log('サロンキャンセル通知送信成功');
          }
        } else {
          console.warn('キャンセル通知: COMPANY_LINE_CHANNEL_ACCESS_TOKENが設定されていません');
        }
      } catch (salonNotificationError) {
        console.warn('サロンキャンセル通知の送信に失敗しました:', salonNotificationError);
        // サロン通知の失敗はキャンセル処理をブロックしない
      }
    }
  } catch (notificationError) {
    console.warn('キャンセル通知処理でエラーが発生しました:', notificationError);
    // 通知の失敗はキャンセル処理をブロックしない
  }
  return { 
    reservationId: args.reservationId,
    refundedOptions: detail?.options || [],
  };
}

// Core関数: ステータス更新
async function updateStatusCore(
  ctx: MutationCtx,
  payload: StatusPayload
) {
  const reservation = await ctx.db.get(payload.reservationId);
  if (!reservation) {
    throw new ConvexError({ 
      code: "NOT_FOUND", 
      message: "予約が見つかりません",
      severity: ERROR_SEVERITY.ERROR,
      status: ERROR_STATUS_CODE.NOT_FOUND,
    });
  }

  await ctx.db.patch(payload.reservationId, { 
    status: payload.status,
    updated_at: Date.now(),
  });
  
  return { 
    reservationId: payload.reservationId,
    newStatus: payload.status,
  };
}



