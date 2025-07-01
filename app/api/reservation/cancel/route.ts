import { NextRequest, NextResponse } from 'next/server';
import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { cookies } from 'next/headers';
import { validateRequest, createValidationErrorResponse } from '@/lib/api/validation';
import { z } from 'zod';
import { stripeService } from '@/services/stripe/StripeService';
import { PointTransactionRepository } from '@/services/supabase/repositories/point';
import { getSupabaseAdminService } from '@/services/supabase/SupabaseService';
import { LineService } from '@/services/line/LineService';
import * as Sentry from '@sentry/nextjs';
import jwt from 'jsonwebtoken'; 
import { getEnv } from '@/lib/env-config'

// キャンセルリクエストのバリデーションスキーマ
const cancelReservationSchema = z.object({
  reservationId: z.string(),
  reason: z.string().optional(),
  isStaffAction: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    // 1. リクエストのバリデーション
    const validation = await validateRequest(request, cancelReservationSchema);
    if (!validation.success) {
      return createValidationErrorResponse(validation.error);
    }

    const { reservationId, reason, isStaffAction } = validation.data;

    // 2. 認証確認
    const cookieStore = await cookies();
    const token = cookieStore.get('bocker_login_session')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // JWTトークンをデコード
    let session: { customerUid: string; email?: string; lineUserId?: string };
    try {
      session = jwt.verify(token, getEnv('APP_JWT_SECRET') || 'your-secret-key') as typeof session;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 3. 予約情報取得
    const reservationWithDetail = await fetchQuery(
      api.reservation.query.getWithDetailById,
      { id: reservationId as Id<"reservation"> }
    );

    if (!reservationWithDetail?.reservation || !reservationWithDetail?.reservationDetail) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    const reservation = reservationWithDetail.reservation;
    const reservationDetail = reservationWithDetail.reservationDetail;

    // 4. 権限確認
    if (!isStaffAction && reservation.customer_id !== session.customerUid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 5. Convexでステータス更新
    await fetchMutation(
      api.reservation.mutation.cancelReservation,
      {
        reservationId: reservationId as Id<"reservation">,
        cancelledBy: isStaffAction ? 'staff' : 'customer',
        cancelReason: reason,
        skipValidation: isStaffAction,
      }
    );

    // 6. 並列処理で関連データを更新
    const results = await Promise.allSettled([
      // 6.1 ポイント処理
      handlePointRefund(reservation, reservationDetail),
      
      // 6.2 在庫復元
      handleStockRestore(reservationDetail),
      
      // 6.3 決済キャンセル（クレジットカードの場合）
      handlePaymentRefund(reservation, reservationDetail),
      
      // 6.4 通知送信
      sendCancellationNotification({
        reservation,
        reservationDetail,
        customerEmail: session.email,
        lineUserId: session.lineUserId,
      }),
    ]);

    // エラーチェック
    const errors = results
      .filter(r => r.status === 'rejected')
      .map(r => (r as PromiseRejectedResult).reason);

    if (errors.length > 0) {
      console.error('Cancellation side effects failed:', errors);
      // 部分的失敗でも、キャンセル自体は成功として扱う
      return NextResponse.json({
        success: true,
        warnings: errors.map(e => e.message || 'Unknown error'),
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Reservation cancellation failed:', error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// ヘルパー関数

interface ReservationData {
  _id: string;
  customer_id?: string;
  tenant_id: string;
  org_id: string;
  stripe_checkout_session_id?: string;
  stripe_payment_intent_id?: string;
  date: string;
  start_time_unix: number;
  staff_name?: string;
  customer_name: string;
}

interface ReservationDetailData {
  _id: string;
  use_points?: number;
  payment_method: 'all' | 'cash' | 'credit_card';
  total_price?: number;
}

async function handlePointRefund(reservation: ReservationData, detail: ReservationDetailData) {
  if (!detail?.use_points || detail.use_points <= 0 || !reservation.customer_id) return;
  
  const supabaseService = getSupabaseAdminService();
  const pointRepo = new PointTransactionRepository(supabaseService);
  
  // 使用ポイントを返還
  await pointRepo.refundPointsForCancellation({
    customerId: reservation.customer_id,
    reservationId: reservation._id,
    refundPoints: detail.use_points,
    tenantId: reservation.tenant_id,
    orgId: reservation.org_id,
  });
  
  // 予定されていたポイント付与をキャンセル
  await pointRepo.cancelPendingPointAward(reservation._id);
}

async function handleStockRestore(detail: ReservationDetailData) {
  if (!detail?._id) return;
  
  // 在庫復元処理を実行
  await fetchMutation(
    api.option.mutation.restoreStockForCancelledReservation,
    { reservationDetailId: detail._id as Id<"reservation_detail"> }
  );
}

async function handlePaymentRefund(reservation: ReservationData, detail: ReservationDetailData) {
  // クレジットカード決済でない場合はスキップ
  if (detail?.payment_method !== 'credit_card' || 
      !reservation.stripe_checkout_session_id ||
      !detail.total_price) {
    return;
  }
  
  // Stripe返金処理
  const result = await stripeService.createRefund({
    checkoutSessionId: reservation.stripe_checkout_session_id,
    amount: detail.total_price, // 全額返金
    reason: 'requested_by_customer',
    metadata: {
      reservation_id: reservation._id,
      cancelled_at: new Date().toISOString(),
    },
  });

  if (!result.success) {
    throw new Error(`Stripe refund failed: ${result.error}`);
  }
}

async function sendCancellationNotification(params: {
  reservation: ReservationData;
  reservationDetail: ReservationDetailData;
  customerEmail?: string;
  lineUserId?: string;
}) {
  const { reservation, reservationDetail, lineUserId } = params;

  // 組織情報を取得
  const organization = await fetchQuery(api.organization.query.findByOrgId, {
    org_id: reservation.org_id as Id<"organization">
  });

  if (!organization) return;

  // API設定を取得（LINE token用）
  const apiConfig = await fetchQuery(api.organization.api_config.query.findByTenantAndOrg, {
    tenant_id: reservation.tenant_id as Id<"tenant">,
    org_id: reservation.org_id as Id<"organization">
  });

  const notificationPromises = [];

  // メール送信 メール送信はコスト削減の為、コメントアウト
  // if (customerEmail) {
  //   notificationPromises.push(
  //     sendReservationCancellationEmail({
  //       to: customerEmail,
  //       customerName,
  //       reservationDate: reservation.date,
  //       reservationTime: new Date(reservation.start_time_unix).toLocaleTimeString('ja-JP', {
  //         hour: '2-digit',
  //         minute: '2-digit'
  //       }),
  //       staffName: reservation.staff_name,
  //       salonName: organization.org_name,
  //       refundAmount: reservationDetail.use_points || 0,
  //       refundMethod: reservationDetail.payment_method === 'credit_card' ? 'credit_card' : 'points',
  //     })
  //   );
  // }

  // LINE送信
  if (lineUserId && apiConfig?.line_access_token) {
    const lineService = new LineService();
    const flexMessage = {
      type: 'flex' as const,
      altText: '予約キャンセルのお知らせ',
      contents: {
        type: 'bubble' as const,
        body: {
          type: 'box' as const,
          layout: 'vertical' as const,
          contents: [
            {
              type: 'text' as const,
              text: '予約がキャンセルされました',
              weight: 'bold' as const,
              size: 'xl' as const,
              color: '#FF0000',
            },
            {
              type: 'text' as const,
              text: `予約日時: ${reservation.date} ${new Date(reservation.start_time_unix).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`,
              margin: 'md' as const,
            },
            {
              type: 'text' as const,
              text: `担当: ${reservation.staff_name}`,
            },
            {
              type: 'text' as const,
              text: reservationDetail.payment_method === 'credit_card' 
                ? '返金処理を行います（3-5営業日）' 
                : (reservationDetail.use_points && reservationDetail.use_points > 0)
                  ? `${reservationDetail.use_points}ポイントを返還しました` 
                  : '',
              color: '#666666',
              size: 'sm' as const,
              margin: 'md' as const,
            },
          ]
        }
      }
    };

    notificationPromises.push(
      lineService.sendFlexMessage(
        lineUserId,
        [flexMessage],
        apiConfig.line_access_token
      )
    );
  }

  // 通知送信（エラーはログのみ）
  const results = await Promise.allSettled(notificationPromises);
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`Notification failed [${index}]:`, result.reason);
    }
  });
}