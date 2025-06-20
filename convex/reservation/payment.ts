import { mutation, internalMutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { updateRecord } from '@/convex/utils/helpers';
import { api } from '@/convex/_generated/api';

/**
 * 決済成功時の予約確定処理
 * Stripe Webhookから呼び出される
 */
export const confirmPayment = mutation({
  args: {
    reservation_id: v.id('reservation'),
    stripe_payment_intent_id: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { reservation_id, stripe_payment_intent_id } = args;

    // 予約情報を取得
    const reservation = await ctx.db.get(reservation_id);
    if (!reservation || reservation.is_archive) {
      throw new ConvexError({
        message: '予約が存在しません',
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'confirmPayment',
        details: { reservation_id },
      });
    }

    // すでに確定済みの場合はスキップ（べき等性）
    if (reservation.status === 'confirmed' && reservation.payment_status === 'completed') {
      return true;
    }

    // 予約ステータスを確定に更新
    await updateRecord(ctx, reservation_id, {
      status: 'confirmed',
      payment_status: 'completed',
      stripe_payment_intent_id: stripe_payment_intent_id || reservation.stripe_payment_intent_id,
    });

    // ポイント使用処理
    if (reservation.intended_point_use && reservation.intended_point_use > 0) {
      // ポイント使用処理はSupabase側で行う（API経由）
      // ここではフラグ管理のみ
      const detail = await ctx.db
        .query('reservation_detail')
        .withIndex('by_reservation_archive', (q) =>
          q.eq('reservation_id', reservation_id).eq('is_archive', false)
        )
        .first();
      
      if (detail) {
        await updateRecord(ctx, detail._id, {
          use_points: reservation.intended_point_use,
        });
      }
    }

    // 楽観的アプローチでは、在庫は予約作成時に既に減算済みのため、ここでは何もしない

    return true;
  },
});

/**
 * 期限切れpending予約のクリーンアップ
 * Cronジョブから定期的に呼び出される
 */
export const cleanupExpiredPendingReservations = internalMutation({
  args: {},
  returns: v.object({
    processed: v.number(),
    cancelled: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    
    // 期限切れのpending予約を取得
    const expiredReservations = await ctx.db
      .query('reservation')
      .withIndex('status_start_time_archive', (q) =>
        q.eq('status', 'pending')
      )
      .filter((q) =>
        q.and(
          q.eq(q.field('is_archive'), false),
          q.lte(q.field('pending_expiry'), now)
        )
      )
      .take(100); // バッチサイズ制限

    let processed = 0;
    let cancelled = 0;

    for (const reservation of expiredReservations) {
      try {
        // キャンセル処理（在庫復元も含む）
        await ctx.runMutation(api.reservation.mutation.cancelReservation, {
          reservationId: reservation._id,
          cancelledBy: 'system',
          cancelReason: '決済タイムアウト',
          skipValidation: true,
        });

        cancelled++;
      } catch (error) {
        console.error('Failed to cancel expired reservation:', reservation._id, error);
      }
      processed++;
    }

    return { processed, cancelled };
  },
});

/**
 * 決済再試行用の新しいCheckout Session作成
 * pending予約に対して再度決済を試みる
 */
export const retryPayment = mutation({
  args: {
    reservation_id: v.id('reservation'),
  },
  returns: v.object({
    success: v.boolean(),
    checkoutSessionId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { reservation_id } = args;

    // 予約情報を取得
    const reservation = await ctx.db.get(reservation_id);
    if (!reservation || reservation.is_archive) {
      throw new ConvexError({
        message: '予約が存在しません',
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'retryPayment',
        details: { reservation_id },
      });
    }

    // pending状態でない場合はエラー
    if (reservation.status !== 'pending') {
      throw new ConvexError({
        message: '再試行できない予約です',
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'retryPayment',
        details: { 
          reservation_id,
          status: reservation.status,
        },
      });
    }

    // 有効期限を延長
    const new_expiry = Date.now() + 30 * 60 * 1000; // 30分延長
    await updateRecord(ctx, reservation_id, {
      pending_expiry: new_expiry,
    });

    // 新しいCheckout Session IDは外部APIで作成される想定
    // ここでは有効期限の延長のみ行う
    return {
      success: true,
      checkoutSessionId: undefined, // 実際にはAPI経由で取得
    };
  },
});