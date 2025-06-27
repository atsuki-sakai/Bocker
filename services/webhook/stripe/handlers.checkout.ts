import type Stripe from 'stripe';
import type { WebhookMetricsCollector } from '@/services/webhook/metrics';
import type { LogContext, EventProcessingResult, WebhookDependencies } from '../types';
import * as Sentry from '@sentry/nextjs';
import { api } from '@/convex/_generated/api';
import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { Id } from '@/convex/_generated/dataModel';
import { PointTransactionRepository } from '@/services/supabase/repositories/point';
import { CustomerRepository } from '@/services/supabase/repositories/customer';
import { CouponTransactionRepository } from '@/services/supabase/repositories/coupon';
import { createClient } from '@supabase/supabase-js';
import { LineService } from '@/services/line/LineService';
import { SupabaseService } from '@/services/supabase/SupabaseService';
import { sendReservationConfirmationEmail } from '@/lib/email_templates/reservation_email';
import { getEnv } from '@/lib/env-config';

/**
 * Stripe Checkout Session完了時のWebhookイベントを処理
 * (checkout.session.completed)
 * 
 * このハンドラーは以下の処理を行います：
 * 1. 予約ステータスを'pending'から'confirmed'に更新
 * 2. payment_statusを'pending'から'completed'に更新
 * 3. 顧客への確認通知（メール/LINE）送信
 * 4. ポイント付与キューの作成
 * 
 * @param evt - Stripe イベントオブジェクト
 * @param eventId - イベントID
 * @param deps - Webhook の依存関係 (Stripe インスタンスなど)
 * @param metrics - メトリクスコレクター
 * @returns イベント処理結果 ('success', 'skipped', 'error')
 */
export async function handleCheckoutSessionCompleted(
  evt: Stripe.CheckoutSessionCompletedEvent,
  eventId: string,
  deps: WebhookDependencies,
  metrics: WebhookMetricsCollector
): Promise<EventProcessingResult> {
  
  const context: LogContext = {
    eventId,
    eventType: 'checkout.session.completed',
  };
  
  console.log(`💳 [${eventId}] CheckoutSessionCompleted処理開始: sessionId=${evt.data.object.id}`, context);
  
  try {
    const session = evt.data.object;
    
    // メタデータから予約情報を取得（snake_caseとcamelCase両方をサポート）
    const metadata = session.metadata;
    const reservationId = metadata?.reservationId || metadata?.reservation_id;
    const tenantId = metadata?.tenantId || metadata?.tenant_id;
    const orgId = metadata?.orgId || metadata?.org_id;
    
    if (!reservationId || !tenantId || !orgId) {
      console.warn(`⚠️ [${eventId}] 必要なメタデータが不足しています`, { ...context, metadata });
      return {
        result: 'skipped',
        metadata: {
          action: 'checkout_session_completed',
          reason: 'missing_metadata',
          sessionId: session.id,
        }
      };
    }
    
    // const customerId = session.customer || metadata?.customerId || metadata?.customer_id; // Stripeのcustomerフィールドを優先
    
    // 1. Payment Intent IDを取得
    const paymentIntentId = typeof session.payment_intent === 'string' 
      ? session.payment_intent 
      : session.payment_intent?.id;

    // 2. 決済確認処理（ポイント使用・在庫確定含む）
    await deps.retry(() =>
      fetchMutation(api.reservation.payment.confirmPayment, {
        reservation_id: reservationId as Id<"reservation">,
        stripe_payment_intent_id: paymentIntentId,
      })
    );
    metrics.incrementApiCall('convex');
    
    // 3. 予約詳細情報を取得（通知送信用）
    const reservationWithDetail = await deps.retry(() =>
      fetchQuery(api.reservation.query.getWithDetailById, {
        id: reservationId as Id<"reservation">
      })
    );
    metrics.incrementApiCall('convex');
    
    if (!reservationWithDetail || !reservationWithDetail.reservation || !reservationWithDetail.reservationDetail) {
      throw new Error(`予約情報が見つかりません: ${reservationId}`);
    }
    
    const reservation = reservationWithDetail.reservation;
    const reservationDetail = reservationWithDetail.reservationDetail;
    
    // 3. 顧客情報を取得
    const supabase = createClient(
      getEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getEnv('SUPABASE_SERVICE_ROLE_KEY')
    );
    
    const supabaseService = new SupabaseService(supabase);
    const customerRepo = new CustomerRepository(supabaseService);
    
    // 予約情報から顧客IDを取得（予約にはcustomer_idが保存されている）
    const customerUid = reservation.customer_id;
    if (!customerUid) {
      throw new Error(`予約に顧客IDが設定されていません: ${reservationId}`);
    }
    
    const customerResult = await customerRepo.getCompleteCustomerData(customerUid, tenantId, orgId);
    
    if (!customerResult.customer) {
      throw new Error(`顧客情報の取得に失敗しました: ${customerUid}`);
    }
    
    const customer = customerResult.customer;
    
    // 4. ポイント使用処理（決済成功後に実行）
    if (reservationDetail && reservationDetail.use_points && reservationDetail.use_points > 0) {
      const pointTransactionRepo = new PointTransactionRepository(supabaseService);
      
      // ポイント使用履歴を作成
      await pointTransactionRepo.create({
        tenant_id: tenantId,
        org_id: orgId,
        reservation_id: reservationId,
        customer_id: customerUid,
        points: -reservationDetail.use_points, // マイナス値で使用を表現
        transaction_type: 'used',
        transaction_date_unix: Date.now(),
        description: `予約での使用 (予約ID: ${reservationId})`,
      });
      
      // 顧客のポイント残高を更新
      await customerRepo.updateCustomerPoints(
        tenantId,
        orgId,
        customerUid,
        -reservationDetail.use_points,
        new Date().getTime() * 1000
      );
      
      console.log(`💎 [${eventId}] ポイント使用完了: ${reservationDetail.use_points}pt`, context);
    }
    
    // 組織情報とAPI設定を取得（通知用）
    const [organization, apiConfig] = await Promise.all([
      deps.retry(() =>
      fetchQuery(api.organization.config.query.findByTenantAndOrg, {
        tenant_id: tenantId as Id<"tenant">,
        org_id: orgId as Id<"organization">
      })
    ),
      deps.retry(() =>
        fetchQuery(api.organization.api_config.query.findByTenantAndOrg, {
          tenant_id: tenantId as Id<"tenant">,
          org_id: orgId as Id<"organization">
        })
      )
    ]);
    
    // 5. クーポン使用履歴を作成
    console.log(`💳 [${eventId}] Checking coupon transaction creation:`, {
      hasCouponId: !!reservationDetail.coupon_id,
      couponId: reservationDetail.coupon_id,
      couponDiscount: reservationDetail.coupon_discount,
      customerUid,
    });
    
    if (reservationDetail.coupon_id && reservationDetail.coupon_discount && reservationDetail.coupon_discount > 0) {
      const couponTransactionRepo = new CouponTransactionRepository(supabaseService);
      
      try {
        const couponTransaction = await couponTransactionRepo.create({
          tenant_id: tenantId,
          org_id: orgId,
          coupon_id: reservationDetail.coupon_id,
          customer_id: customerUid,
          reservation_id: reservationId,
          transaction_date_unix: Date.now(),
          discount_amount: reservationDetail.coupon_discount,
        });
        
        console.log(`🎟️ [${eventId}] クーポン使用履歴作成完了:`, {
          couponId: reservationDetail.coupon_id,
          discount: reservationDetail.coupon_discount,
          transactionId: couponTransaction.id,
        }, context);
      } catch (error) {
        console.error(`⚠️ [${eventId}] クーポン使用履歴作成失敗:`, error);
        // クーポン履歴の作成失敗は処理を継続
      }
    } else {
      console.log(`ℹ️ [${eventId}] Skipping coupon transaction - no coupon used or zero discount`);
    }
    
    // 6. 通知送信（並列処理）
    const notificationResults = await Promise.allSettled([
      // メール送信（LINE IDがない場合のみ）
      !customer.line_id && customer.email ? sendReservationConfirmationEmail({
        to: customer.email,
        orgName: organization?.org.org_name || '',
        orgAddress: organization?.config?.address || '',
        orgPhone: organization?.config?.phone || '',
        customerName: reservation.customer_name,
        reservationDate: reservation.date,
        reservationTime: new Date(reservation.start_time_unix).toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        staffName: reservation.staff_name,
        menus: reservationDetail.menus || [],
        options: reservationDetail.options || [],
        totalPrice: reservationDetail.total_price || 0,
        paymentMethod: 'credit_card',
      }) : Promise.resolve(),
      
      // LINE送信（LINE IDがある場合のみ）
      customer.line_id ? (async () => {
        const lineService = new LineService();
        const flexMessage = {
          type: 'flex' as const,
          altText: '予約確認',
          contents: {
            type: 'bubble' as const,
            body: {
              type: 'box' as const,
              layout: 'vertical' as const,
              contents: [
                {
                  type: 'text' as const,
                  text: '予約が確定しました',
                  weight: 'bold' as const,
                  size: 'xl' as const,
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
                  text: `合計金額: ¥${(reservationDetail.total_price || 0).toLocaleString()}`,
                },
              ]
            }
          }
        };
        
        if (apiConfig?.line_access_token) {
          await lineService.sendFlexMessage(
            customer.line_id!,
            [flexMessage],
            apiConfig.line_access_token
          );
        }
      })() : Promise.resolve(),

      // サロンへのLINE通知（弊社チャンネル経由）
      apiConfig?.org_line_id ? (async () => {
        const { createSalonReservationNotification } = await import('@/services/line/message_template/salon_reservation_notification');
        
        // 環境変数から弊社のLINEチャンネルアクセストークンを取得
        const companyLineAccessToken = process.env.COMPANY_LINE_CHANNEL_ACCESS_TOKEN;
        
        if (!companyLineAccessToken) {
          console.warn('弊社LINEチャンネルのアクセストークンが設定されていません');
          return;
        }

        const lineService = new LineService();
        const salonFlexMessage = createSalonReservationNotification({
          organization: organization?.org,
          reservation: {
            _id: reservation._id,
            customer_name: reservation.customer_name,
            staff_name: reservation.staff_name,
            date: reservation.date,
            start_time_unix: reservation.start_time_unix,
            end_time_unix: reservation.end_time_unix,
            status: reservation.status,
            payment_status: reservation.payment_status,
          },
          reservationDetail: {
            total_price: reservationDetail.total_price,
            payment_method: reservationDetail.payment_method,
            menus: reservationDetail.menus,
            options: reservationDetail.options,
            extra_charge: reservationDetail.extra_charge,
            coupon_discount: reservationDetail.coupon_discount,
            use_points: reservationDetail.use_points,
          },
          customer: {
            phone: customer.phone || undefined,
            email: customer.email || undefined,
            line_id: customer.line_id || undefined,
          },
          paymentMethod: 'credit_card',
        });

        await lineService.sendFlexMessage(
          apiConfig.org_line_id!,
          [salonFlexMessage],
          companyLineAccessToken
        );
      })() : Promise.resolve(),
    ]);
    
    // 通知エラーはログのみ（処理は続行）
    notificationResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        const notificationType = index === 0 ? 'email' : index === 1 ? 'customer_line' : 'salon_line';
        console.error(`通知送信失敗 [${notificationType}]:`, result.reason);
        Sentry.captureException(result.reason, {
          tags: { ...context, notification_type: notificationType }
        });
      }
    });
    
    // FIXME: これは予約が完了した時に行うべき
    // 7. ポイント付与予約（30日後）
    // const pointTaskQueueRepo = new PointTaskQueueRepository(supabaseService);
    
    // // ポイント設定を取得
    // const pointConfig = await deps.retry(() =>
    //   fetchQuery(api.point.query.findByTenantAndOrg, {
    //     tenant_id: tenantId as Id<"tenant">,
    //     org_id: orgId as Id<"organization">,
    //   })
    // );
    
    // if (pointConfig?.is_active) {
    //   const earnPoints = pointConfig.is_fixed_point 
    //     ? pointConfig.fixed_point || 0
    //     : Math.floor((reservationDetail.total_price || 0) * (pointConfig.point_rate || 0) / 100);
      
    //   if (earnPoints > 0) {
    //     await pointTaskQueueRepo.create({
    //       tenant_id: tenantId,
    //       org_id: orgId,
    //       customer_id: customerUid,
    //       reservation_id: reservationId,
    //       points: earnPoints,
    //       scheduled_for_unix: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30日後
    //       status: 'pending'
    //     });
    //   }
    // }
    
    console.log(`✅ [${eventId}] CheckoutSessionCompleted処理完了: reservationId=${reservationId}`, context);
    
    return {
      result: 'success',
      metadata: {
        action: 'checkout_session_completed',
        reservationId: reservationId,
        customerId: customerUid,
        sessionId: session.id,
      }
    };
    
  } catch (error) {
    console.error(`❌ [${eventId}] CheckoutSessionCompleted処理中にエラーが発生:`, { ...context, error });
    Sentry.captureException(error, {
      level: 'error',
      tags: { ...context, operation: 'handleCheckoutSessionCompleted' },
    });
    return {
      result: 'error',
      errorMessage: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

/**
 * Payment Intent失敗時のWebhookイベントを処理
 * (payment_intent.payment_failed)
 * 
 * このハンドラーは以下の処理を行います：
 * 1. 関連する予約をキャンセル
 * 2. 在庫の仮押さえを解放
 * 3. 顧客への失敗通知（オプション）
 * 
 * @param evt - Stripe イベントオブジェクト
 * @param eventId - イベントID
 * @param deps - Webhook の依存関係 (Stripe インスタンスなど)
 * @param metrics - メトリクスコレクター
 * @returns イベント処理結果 ('success', 'skipped', 'error')
 */
export async function handlePaymentIntentFailed(
  evt: Stripe.PaymentIntentPaymentFailedEvent,
  eventId: string,
  deps: WebhookDependencies,
  metrics: WebhookMetricsCollector
): Promise<EventProcessingResult> {
  
  const context: LogContext = {
    eventId,
    eventType: 'payment_intent.payment_failed',
  };
  
  console.log(`⚠️ [${eventId}] PaymentIntentFailed処理開始: paymentIntentId=${evt.data.object.id}`, context);
  
  try {
    const paymentIntent = evt.data.object;
    
    // メタデータから予約情報を取得
    const metadata = paymentIntent.metadata;
    if (!metadata?.reservationId || !metadata?.tenantId || !metadata?.orgId) {
      console.warn(`⚠️ [${eventId}] 必要なメタデータが不足しています（サロン予約以外の決済の可能性）`, { ...context, metadata });
      return {
        result: 'skipped',
        metadata: {
          action: 'payment_intent_failed',
          reason: 'missing_metadata_not_salon_reservation',
          paymentIntentId: paymentIntent.id,
        }
      };
    }
    
    const { reservationId } = metadata;
    
    // 1. 予約情報を取得
    const reservation = await deps.retry(() =>
      fetchQuery(api.reservation.query.getById, {
        id: reservationId as Id<"reservation">
      })
    );
    metrics.incrementApiCall('convex');
    
    if (!reservation) {
      throw new Error(`予約が見つかりません: ${reservationId}`);
    }
    
    // 既にキャンセルされている場合はスキップ
    if (reservation.status === 'cancelled' || reservation.status === 'refunded') {
      console.log(`ℹ️ [${eventId}] 予約は既にキャンセル済みです: ${reservationId}`, context);
      return {
        result: 'skipped',
        metadata: {
          action: 'payment_intent_failed',
          reason: 'already_cancelled',
          reservationId,
        }
      };
    }
    
    // 2. 予約をキャンセル（在庫復元も含む）
    await deps.retry(() =>
      fetchMutation(api.reservation.mutation.cancelReservation, {
        reservationId: reservationId as Id<"reservation">,
        cancelledBy: 'system',
        cancelReason: '決済失敗',
        skipValidation: true,
      })
    );
    metrics.incrementApiCall('convex');
    
    console.log(`✅ [${eventId}] PaymentIntentFailed処理完了: reservationId=${reservationId}`, context);
    
    return {
      result: 'success',
      metadata: {
        action: 'payment_intent_failed',
        reservationId: reservationId,
        paymentIntentId: paymentIntent.id,
        failureReason: paymentIntent.last_payment_error?.message,
      }
    };
    
  } catch (error) {
    console.error(`❌ [${eventId}] PaymentIntentFailed処理中にエラーが発生:`, { ...context, error });
    Sentry.captureException(error, {
      level: 'error',
      tags: { ...context, operation: 'handlePaymentIntentFailed' },
    });
    return {
      result: 'error',
      errorMessage: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

/**
 * Checkout Session期限切れ時のWebhookイベントを処理
 * (checkout.session.expired)
 * 
 * このハンドラーは以下の処理を行います：
 * 1. 関連する予約をキャンセル
 * 2. 在庫の仮押さえを解放
 * 3. 顧客への期限切れ通知（オプション）
 * 
 * @param evt - Stripe イベントオブジェクト
 * @param eventId - イベントID
 * @param deps - Webhook の依存関係 (Stripe インスタンスなど)
 * @param metrics - メトリクスコレクター
 * @returns イベント処理結果 ('success', 'skipped', 'error')
 */
export async function handleCheckoutSessionExpired(
  evt: Stripe.CheckoutSessionExpiredEvent,
  eventId: string,
  deps: WebhookDependencies,
  metrics: WebhookMetricsCollector
): Promise<EventProcessingResult> {
  
  const context: LogContext = {
    eventId,
    eventType: 'checkout.session.expired',
  };
  
  console.log(`⏰ [${eventId}] CheckoutSessionExpired処理開始: sessionId=${evt.data.object.id}`, context);
  
  try {
    const session = evt.data.object;
    
    // メタデータから予約情報を取得
    const metadata = session.metadata;
    if (!metadata?.reservationId || !metadata?.tenantId || !metadata?.orgId) {
      console.warn(`⚠️ [${eventId}] 必要なメタデータが不足しています（サロン予約以外の決済の可能性）`, { ...context, metadata });
      return {
        result: 'skipped',
        metadata: {
          action: 'checkout_session_expired',
          reason: 'missing_metadata_not_salon_reservation',
          sessionId: session.id,
        }
      };
    }
    
    const { reservationId } = metadata;
    
    // 1. 予約情報を取得
    const reservation = await deps.retry(() =>
      fetchQuery(api.reservation.query.getById, {
        id: reservationId as Id<"reservation">
      })
    );
    metrics.incrementApiCall('convex');
    
    if (!reservation) {
      throw new Error(`予約が見つかりません: ${reservationId}`);
    }
    
    // 既にキャンセルまたは予約受付されている場合はスキップ
    if (reservation.status === 'cancelled' || reservation.status === 'refunded' || reservation.status === 'confirmed') {
      console.log(`ℹ️ [${eventId}] 予約は既に処理済みです: ${reservationId} (status: ${reservation.status})`, context);
      return {
        result: 'skipped',
        metadata: {
          action: 'checkout_session_expired',
          reason: 'already_processed',
          reservationId,
          currentStatus: reservation.status,
        }
      };
    }
    
    // 2. 予約をキャンセル（在庫復元も含む）
    await deps.retry(() =>
      fetchMutation(api.reservation.mutation.cancelReservation, {
        reservationId: reservationId as Id<"reservation">,
        cancelledBy: 'system',
        cancelReason: '決済タイムアウト',
        skipValidation: true,
      })
    );
    metrics.incrementApiCall('convex');
    
    console.log(`✅ [${eventId}] CheckoutSessionExpired処理完了: reservationId=${reservationId}`, context);
    
    return {
      result: 'success',
      metadata: {
        action: 'checkout_session_expired',
        reservationId: reservationId,
        sessionId: session.id,
        expiredAt: new Date(session.expires_at * 1000).toISOString(),
      }
    };
    
  } catch (error) {
    console.error(`❌ [${eventId}] CheckoutSessionExpired処理中にエラーが発生:`, { ...context, error });
    Sentry.captureException(error, {
      level: 'error',
      tags: { ...context, operation: 'handleCheckoutSessionExpired' },
    });
    return {
      result: 'error',
      errorMessage: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}