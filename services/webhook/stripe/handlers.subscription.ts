import type Stripe from 'stripe';
import type { WebhookDependencies, EventProcessingResult, LogContext } from '../types';
import type { WebhookMetricsCollector } from '../metrics';
import * as Sentry from '@sentry/nextjs';
import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { priceIdToPlanInfo, convertIntervalToBillingPeriod } from '@/lib/utils';
import type { BillingPeriod, SubscriptionStatus } from '@/convex/types';
import { Id } from '@/convex/_generated/dataModel'
import { createTask, executeInParallel } from '../parallel';

// export async function handleCheckoutSessionCompleted(
  
//   /**
//    * Stripe の Subscription 初回契約確定の Webhook イベントを処理
//    * (checkout.session.completed)
//    *
//    * @param evt - Stripe イベントオブジェクト
//    * @param eventId - イベントID
//    * @param deps - Webhook の依存関係 (Stripe インスタンスなど)
//    * @param metrics - メトリクスコレクター
//    * @returns イベント処理結果 ('success', 'skipped', 'error')
//    */
//   evt: Stripe.CheckoutSessionCompletedEvent,
//   eventId: string, // eventId はログや将来的な拡張のために渡されますが、現在の指示では直接使用されません
//   deps: WebhookDependencies, // 依存性の注入
//   metrics: WebhookMetricsCollector // 詳細なメトリクス(処理がどれくらい時間がかかったか?)を収集するために渡されます
// ): Promise<EventProcessingResult> {
// // ------------------------------------------------------------
// // 以下、実装の主な流れ
// // 1. Stripe から必要な ID / ステータスを取得
// // 2. Convex に同期 (retry & await で冪等・確実に書き込み)
// // 3. メトリクス収集で監視基盤に反映
// // ------------------------------------------------------------

//   const context: LogContext = {
//     eventId,
//     eventType: 'checkout.session.completed',
//     stripeCustomerId: evt.data.object.customer as string,
//     stripeSubscriptionId: evt.data.object.subscription as string,
//   };
//   console.log(`👤 [${eventId}] CheckoutSessionCompleted処理開始: stripeCustomerId=${evt.data.object.customer}, stripeSubscriptionId=${evt.data.object.subscription}`, context);

//   try {
//     try {
//       const customerId = evt.data.object.customer as string;
//       const byReferral = evt.data.object.metadata?.referral_code as string | null;
//       // Stripe から最新のサブスクリプション詳細を取得し、プラン情報と請求間隔を判定
//       const subscription = await deps.stripe.subscriptions.retrieve(evt.data.object.subscription as string);
//       metrics.incrementApiCall("stripe");

//       let priceId;
//       let planInfo;
//       let billingPeriod;

//       // プライスIDの取得とプラン情報の判定
//       // subscription.items.data[0] 固定ではなく、アクティブな価格アイテムを検索
//       const activeItem = subscription.items.data.find(item => item.price.active);
    
//       if (activeItem) {
//         priceId = activeItem.price.id;
//         planInfo = priceIdToPlanInfo(priceId);
//         const interval = activeItem.price.recurring?.interval; // 'month' | 'year' | undefined
//         billingPeriod = interval ? convertIntervalToBillingPeriod(interval) : 'monthly';
//       } else {
//         // アクティブなアイテムが見つからない場合はエラーとして処理
//         console.error(`[${eventId}] アクティブなサブスクリプションアイテムが見つかりません。subscriptionId: ${subscription.id}`);
//         Sentry.captureMessage('アクティブなサブスクリプションアイテムが見つかりません', {
//           level: 'error',
//           tags: { ...context, operation: 'handleCheckoutSessionCompleted_active_item_not_found' },
//           extra: { subscriptionId: subscription.id }
//         });
//         return {
//           result: 'error',
//           errorMessage: 'アクティブなサブスクリプションのプライス情報が見つかりません',
//           metadata: {
//             action: 'checkout_session_completed',
//             stripeCustomerId: customerId,
//             stripeSubscriptionId: subscription.id,
//           }
//         };
//       }

//       if (!planInfo || !billingPeriod || !priceId) {
//         // プラン情報が不足している場合もエラーとして処理
//         console.error(`[${eventId}] プラン情報が不足しています。priceId: ${priceId}, planInfo: ${planInfo}, billingPeriod: ${billingPeriod}`);
//         Sentry.captureMessage('サブスクリプションのプラン情報が不足しています', {
//           level: 'error',
//           tags: { ...context, operation: 'handleCheckoutSessionCompleted_plan_info_missing' },
//           extra: { priceId, planInfo, billingPeriod }
//         });
//         return {
//           result: 'error',
//           errorMessage: 'サブスクリプションのプラン情報が不足しています',
//           metadata: {
//             action: 'checkout_session_completed',
//             stripeCustomerId: customerId,
//             stripeSubscriptionId: subscription.id,
//           }
//         };
//       }

//       // Convex 側にサブスクリプション情報を同期（冪等アップサート）
//       const tenant_id = evt.data.object.metadata?.tenant_id as Id<'tenant'>;
//       if (!tenant_id) {
//         // tenant_id がない場合は致命的なエラーとして Sentry に送信し、エラーを返す
//         console.error(`[${eventId}] Webhookのメタデータにtenant_idが含まれていません。`);
//         Sentry.captureMessage('Webhookのメタデータにtenant_idが含まれていません', {
//           level: 'error',
//           tags: { ...context, operation: 'handleCheckoutSessionCompleted_tenant_id_missing' },
//           extra: { metadata: evt.data.object.metadata }
//         });
//         return {
//           result: 'error',
//           errorMessage: '必要なtenant_idがメタデータに存在しません。',
//           metadata: {
//             action: 'checkout_session_completed',
//             stripeCustomerId: customerId,
//             stripeSubscriptionId: subscription.id,
//           }
//         };
//       }

//       try{
//         await deps.retry(() =>
//           fetchMutation(deps.convex.tenant.subscription.mutation.syncSubscription, {
//             subscription: {
//               tenant_id: tenant_id,
//               stripe_subscription_id: subscription.id,
//               stripe_customer_id: customerId,
//               status: subscription.status,
//               price_id: priceId, 
//               current_period_end: subscription.current_period_end,
//               plan_name: planInfo.name,
//               billing_period: billingPeriod as BillingPeriod
//             }
//           })
//         );
//         metrics.incrementApiCall("convex");

//         if(byReferral){
//           //紹介元のテナントの紹介テーブルを取得
//           const byTenantReferral = await deps.retry(() =>
//             fetchQuery(deps.convex.tenant.referral.query.findByReferralCode, {
//               referral_code: byReferral,
//             })
//           );
//           metrics.incrementApiCall("convex");

//           //紹介を受けたテナントを取得
//           const inviteTenantReferral = await deps.retry(() =>
//             fetchQuery(deps.convex.tenant.referral.query.findByTenantId, {
//               tenant_id: tenant_id,
//             })
//           );
//           metrics.incrementApiCall("convex");

//           const now = new Date();
//           // 最後に割引を適用した月（YYYY-MM形式、冪等性用）
//           const lastDiscountAppliedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

//           const updateReferralCountTasks = [
//             createTask('updateByTenantReferralCount_referrer', async () => { // タスク名をより具体的に
//               if(byTenantReferral){
//                 await deps.retry(() =>
//                   fetchMutation(deps.convex.tenant.referral.mutation.incrementReferralCount, {
//                     referral_id: byTenantReferral._id,
//                     idempotency_key: `${evt.id}_referrer`, // 冪等性キーを分離
//                     last_processed_event_id: evt.id, // 最後に処理したStripeイベントID（冪等性用）
//                     last_processed_key: `${evt.id}_referrer`, // 最後に処理した複合キー (event_id + role)
//                     last_discount_transaction_id: evt.data.object.id, // 最後の割引処理のトランザクションID（冪等性用）
//                     last_discount_applied_month: lastDiscountAppliedMonth, // 最後に割引を適用した月（YYYY-MM形式、冪等性用）
//                   })
//                 );
//                 metrics.incrementApiCall("convex");
//               }
//             }, true), // critical を true に設定
//             createTask('updateInviteTenantReferralCount_invitee', async () => { // タスク名をより具体的に
//               if(inviteTenantReferral){
//                 await deps.retry(() =>
//                   fetchMutation(deps.convex.tenant.referral.mutation.incrementReferralCount, {
//                     referral_id: inviteTenantReferral._id,
//                     idempotency_key: `${evt.id}_invitee`, // 冪等性キーを分離
//                     last_processed_event_id: evt.id, // 最後に処理したStripeイベントID（冪等性用）
//                     last_processed_key: `${evt.id}_invitee`, // 最後に処理した複合キー (event_id + role)
//                     last_discount_transaction_id: evt.data.object.id, // 最後の割引処理のトランザクションID（冪等性用）
//                     last_discount_applied_month: lastDiscountAppliedMonth, // 最後に割引を適用した月（YYYY-MM形式、冪等性用）
//                   })
//                 );
//                 metrics.incrementApiCall("convex");
//               }
//             }, true), // critical を true に設定
//           ];

//           await executeInParallel(updateReferralCountTasks, context);
//         }
//       } catch (error) {
//         // syncSubscription や紹介カウント更新中のエラーもSentryに送信
//         console.error(`[${eventId}] Convexへのデータ同期または紹介カウント更新中にエラー: `, error);
//         Sentry.captureException(error, {
//           level: 'error',
//           tags: { ...context, operation: 'handleCheckoutSessionCompleted_convex_sync_error' },
//           extra: { tenant_id, byReferral, customerId, subscriptionId: subscription.id }
//         });
//         return {
//           result: 'error',
//           errorMessage: error instanceof Error ? error.message : 'Convexへのデータ同期中に不明なエラーが発生しました',
//         };
//       }
//     } catch (error) {
//       console.error('サブスクリプションデータの更新に失敗しました:', error);
//       return {
//         result: 'error',
//         errorMessage: error instanceof Error ? error.message : '不明なエラー',
//       };
//     }
//     return {
//       result: 'success',
//       metadata: {
//         action: 'checkout_session_completed',
//         stripeCustomerId: evt.data.object.customer as string,
//         stripeSubscriptionId: evt.data.object.subscription as string,
//       }
//     };
//   } catch (error) {
//     console.error(`❌ [${eventId}] CheckoutSessionCompleted処理中に致命的なエラーが発生: stripeCustomerId=${evt.data.object.customer}, stripeSubscriptionId=${evt.data.object.subscription}`, { ...context, error });
//     Sentry.captureException(error, {
//       level: 'error',
//       tags: { ...context, operation: 'handleCheckoutSessionCompleted_main_catch' },
//     });
//     return {
//       result: 'error',
//       errorMessage: error instanceof Error ? error.message : '不明なエラー'
//     };
//   }
// }

export async function handleSubscriptionUpdated(
  /**
   * Stripe の Subscription 更新の Webhook イュウィエントを処理
   * (customer.subscription.updated)
   *
   * @param evt - Stripe イベントオブジェクト
   * @param eventId - イベントID
   * @param deps - Webhook の依存関係 (Stripe インスタンスなど)
   * @param metrics - メトリクスコレクター
   * @returns イベント処理結果 ('success', 'skipped', 'error')
   */
  evt: Stripe.CustomerSubscriptionUpdatedEvent,
  eventId: string,
  deps: WebhookDependencies,
  metrics: WebhookMetricsCollector
): Promise<EventProcessingResult> {
// ------------------------------------------------------------
// 以下、実装の主な流れ
// 1. Stripe から必要な ID / ステータスを取得
// 2. Convex に同期 (retry & await で冪等・確実に書き込み)
// 3. メトリクス収集で監視基盤に反映
// ------------------------------------------------------------
  
  const context: LogContext = {
    eventId,
    eventType: 'customer.subscription.updated',
    stripeCustomerId: evt.data.object.customer as string,
    stripeSubscriptionId: evt.data.object.id as string,
  };
  console.log(`👤 [${eventId}] CustomerSubscriptionUpdated処理開始: stripeCustomerId=${evt.data.object.customer}, stripeSubscriptionId=${evt.data.object.id}`, context);

  try {
    const tenant_id = evt.data.object.metadata?.tenant_id as Id<'tenant'>;
    await deps.retry(() =>
      fetchMutation(deps.convex.tenant.subscription.mutation.updateSubscription, {
        tenant_id: tenant_id,
        stripe_subscription_id: evt.data.object.id as string,
        stripe_customer_id: evt.data.object.customer as string,
        subscription_status: evt.data.object.status as SubscriptionStatus,
      })
    );
    metrics.incrementApiCall("convex");
    return {
      result: 'success',
      metadata: {
        action: 'customer_subscription_updated',
        stripeCustomerId: evt.data.object.customer as string,
        stripeSubscriptionId: evt.data.object.id as string,
      }
    };
  } catch (error) {
    console.error(`❌ [${eventId}] CustomerSubscriptionUpdated処理中に致命的なエラーが発生: stripeCustomerId=${evt.data.object.customer}, stripeSubscriptionId=${evt.data.object.id}`, { ...context, error });
    Sentry.captureException(error, {
      level: 'error',
      tags: { ...context, operation: 'handleCustomerSubscriptionUpdated_main_catch' },
    });
    return {
      result: 'error',
      errorMessage: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

export async function handleSubscriptionDeleted(
/**
 * Stripe の Subscription 削除の Webhook イュウィエントを処理
 * (customer.subscription.deleted)
 *
 * @param evt - Stripe イベントオブジェクト
 * @param eventId - イベントID
 * @param deps - Webhook の依存関係 (Stripe インスタンスなど)
 * @param metrics - メトリクスコレクター
 * @returns イベント処理結果 ('success', 'skipped', 'error')
 */
  evt: Stripe.CustomerSubscriptionDeletedEvent,
  eventId: string,
  deps: WebhookDependencies,
  metrics: WebhookMetricsCollector
): Promise<EventProcessingResult> {
// ------------------------------------------------------------
// 以下、実装の主な流れ
// 1. Stripe から必要な ID / ステータスを取得
// 2. Convex に同期 (retry & await で冪等・確実に書き込み)
// 3. メトリクス収集で監視基盤に反映
// ------------------------------------------------------------
  
  const context: LogContext = {
    eventId,
    eventType: 'customer.subscription.deleted',
    stripeCustomerId: evt.data.object.customer as string,
    stripeSubscriptionId: evt.data.object.id as string,
  };
  console.log(`👤 [${eventId}] CustomerSubscriptionDeleted処理開始: stripeCustomerId=${evt.data.object.customer}, stripeSubscriptionId=${evt.data.object.id}`, context);

  try {

    const subscription = await deps.retry(() =>
      fetchQuery(deps.convex.tenant.subscription.query.findByStripeCustomerId, {
        stripe_customer_id: evt.data.object.customer as string,
      })
    );
    metrics.incrementApiCall("convex");
    if (!subscription) {
      return {
        result: 'skipped',
        metadata: {
          action: 'customer_subscription_deleted',
          stripeCustomerId: evt.data.object.customer as string,
          stripeSubscriptionId: evt.data.object.id as string,
          errorMessage: 'サブスクリプションはすでに削除またはアーカイブされています',
        }
      };
    }
    await deps.retry(() =>
      fetchMutation(deps.convex.tenant.subscription.mutation.archive, {
        id: subscription._id
      })
    );
    metrics.incrementApiCall("convex");

    return {
      result: 'success',
      metadata: {
        action: 'customer_subscription_deleted',
        stripeCustomerId: evt.data.object.customer as string,
        stripeSubscriptionId: evt.data.object.id as string,
      }
    };
  } catch (error) {
    console.error(`❌ [${eventId}] CustomerSubscriptionDeleted処理中に致命的なエラーが発生: stripeCustomerId=${evt.data.object.customer}, stripeSubscriptionId=${evt.data.object.id}`, { ...context, error });
    Sentry.captureException(error, {
      level: 'error',
      tags: { ...context, operation: 'handleCustomerSubscriptionDeleted_main_catch' },
    });
    return {
      result: 'error',
      errorMessage: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

export async function handleInvoicePaymentSucceeded(
  evt: Stripe.InvoicePaymentSucceededEvent,
  /**
   * Stripe の Invoice 支払い成功の Webhook イベントを処理
   * (invoice.payment_succeeded)
   *
   * @param evt - Stripe イベントオブジェクト
   * @param eventId - イベントID
   * @param deps - Webhook の依存関係 (Stripe インスタンスなど)
   * @param metrics - メトリクスコレクター
   * @returns イベント処理結果 ('success', 'skipped', 'error')
   */
  eventId: string,
  deps: WebhookDependencies,
  metrics: WebhookMetricsCollector
): Promise<EventProcessingResult> {
// ------------------------------------------------------------
// 以下、実装の主な流れ
// 1. Stripe から必要な ID / ステータスを取得
// 2. Convex に同期 (retry & await で冪等・確実に書き込み)
// 3. メトリクス収集で監視基盤に反映
// ------------------------------------------------------------
  
  const context: LogContext = {
    eventId,
    eventType: 'invoice.payment_succeeded',
    stripeCustomerId: evt.data.object.customer as string,
    stripeSubscriptionId: evt.data.object.subscription as string,
  };
  console.log(`👤 [${eventId}] InvoicePaymentSucceeded処理開始: stripeCustomerId=${evt.data.object.customer}, stripeSubscriptionId=${evt.data.object.subscription}`, context);

  try {
    const subscriptionId = evt.data.object.subscription as string;
    // 最新のサブスクリプションステータスを取得
    const subscription = await deps.stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionStatus = subscription.status;
    metrics.incrementApiCall("stripe");

      if (subscriptionId && subscriptionStatus) {
        // tenant_id をメタデータから取得。存在しない場合はエラー処理。
        const tenant_id = evt.data.object.metadata?.tenant_id as Id<'tenant'> ?? subscription.metadata?.tenant_id as Id<'tenant'>; 
        if (!tenant_id) {
            console.error(`[${eventId}] Webhook (invoice.payment_succeeded) のメタデータにtenant_idが含まれていません。subscriptionId: ${subscriptionId}`);
            Sentry.captureMessage('Webhook (invoice.payment_succeeded) のメタデータにtenant_idが含まれていません', {
                level: 'error',
                tags: { ...context, operation: 'handleInvoicePaymentSucceeded_tenant_id_missing' },
                extra: { metadata: evt.data.object.metadata, subscription_metadata: subscription.metadata }
            });
            return {
                result: 'error',
                errorMessage: '必要なtenant_idがメタデータに存在しません。',
                metadata: {
                    action: 'invoice_payment_succeeded',
                    stripeCustomerId: evt.data.object.customer as string,
                    stripeSubscriptionId: subscriptionId,
                }
            };
        }

        try {
          await deps.retry(() =>
            fetchMutation(deps.convex.tenant.subscription.mutation.updateSubscription, {
              tenant_id: tenant_id, // 取得した tenant_id を使用
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: evt.data.object.customer as string,
              subscription_status: subscriptionStatus,
            })
          );
          metrics.incrementApiCall("convex");
        } catch (error) {
          console.error(`請求書 ${evt.data.object.id} のサブスクリプション取得に失敗しました:`, error);
          Sentry.captureException(error, {
            level: 'error',
            tags: {
              function: 'handleWebhookEvent_invoice_payment_succeeded',
            },
          });
          throw error;
        }
      }
    return {
      result: 'success',
      metadata: {
        action: 'invoice_payment_succeeded',
        stripeCustomerId: evt.data.object.customer as string,
        stripeSubscriptionId: evt.data.object.subscription as string,
      }
    };
  } catch (error) {
    console.error(`❌ [${eventId}] InvoicePaymentSucceeded処理中に致命的なエラーが発生: stripeCustomerId=${evt.data.object.customer}, stripeSubscriptionId=${evt.data.object.subscription}`, { ...context, error });
    Sentry.captureException(error, {
      level: 'error',
      tags: { ...context, operation: 'handleInvoicePaymentSucceeded_main_catch' },
    });
    return {
      result: 'error',
      errorMessage: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

export async function handleInvoicePaymentFailed(
/**
 * Stripe の Invoice 支払い失敗の Webhook イベントを処理
 * (invoice.payment_failed)
 *
 * @param evt - Stripe イベントオブジェクト
 * @param eventId - イベントID
 * @param deps - Webhook の依存関係 (Stripe インスタンスなど)
 * @param metrics - メトリクスコレクター
 * @returns イベント処理結果 ('success', 'skipped', 'error')
 */
  evt: Stripe.InvoicePaymentFailedEvent,
  eventId: string,
  deps: WebhookDependencies,
  metrics: WebhookMetricsCollector
): Promise<EventProcessingResult> {
// ------------------------------------------------------------
// 以下、実装の主な流れ
// 1. Stripe から必要な ID / ステータスを取得
// 2. Convex に同期 (retry & await で冪等・確実に書き込み)
// 3. メトリクス収集で監視基盤に反映
// ------------------------------------------------------------
  
  const context: LogContext = {
    eventId,
    eventType: 'invoice.payment_failed',
    stripeCustomerId: evt.data.object.customer as string,
    stripeSubscriptionId: evt.data.object.subscription as string,
  };
  console.log(`👤 [${eventId}] InvoicePaymentFailed処理開始: stripeCustomerId=${evt.data.object.customer}, stripeSubscriptionId=${evt.data.object.subscription}`, context);

  try {
    const subscriptionId = evt.data.object.subscription as string;
    // 失敗時も最新ステータスを確認して Convex に反映
    const subscription = await deps.stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionStatus = subscription.status;
    metrics.incrementApiCall("stripe");
    if (subscriptionId) {
      // tenant_id をメタデータから取得。存在しない場合はエラー処理。
      const tenant_id = evt.data.object.metadata?.tenant_id as Id<'tenant'> ?? subscription.metadata?.tenant_id as Id<'tenant'>;
      if (!tenant_id) {
        console.error(`[${eventId}] Webhook (invoice.payment_failed) のメタデータにtenant_idが含まれていません。subscriptionId: ${subscriptionId}`);
        Sentry.captureMessage('Webhook (invoice.payment_failed) のメタデータにtenant_idが含まれていません', {
            level: 'error',
            tags: { ...context, operation: 'handleInvoicePaymentFailed_tenant_id_missing' },
            extra: { metadata: evt.data.object.metadata, subscription_metadata: subscription.metadata }
        });
        return {
            result: 'error',
            errorMessage: '必要なtenant_idがメタデータに存在しません。',
            metadata: {
                action: 'invoice_payment_failed',
                stripeCustomerId: evt.data.object.customer as string,
                stripeSubscriptionId: subscriptionId,
            }
        };
      }
      await deps.retry(() =>
        fetchMutation(deps.convex.tenant.subscription.mutation.updateSubscription, {
          tenant_id: tenant_id, // 取得した tenant_id を使用
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: evt.data.object.customer as string,
          subscription_status: subscriptionStatus,
        })
      );
      metrics.incrementApiCall("convex");
    }
    return {
      result: 'success',
      metadata: {
        action: 'invoice_payment_failed',
        stripeCustomerId: evt.data.object.customer as string,
        stripeSubscriptionId: evt.data.object.subscription as string,
      }
    };
  } catch (error) {
    console.error(`❌ [${eventId}] InvoicePaymentFailed処理中に致命的なエラーが発生: stripeCustomerId=${evt.data.object.customer}, stripeSubscriptionId=${evt.data.object.subscription}`, { ...context, error });
    Sentry.captureException(error, {
      level: 'error',
      tags: { ...context, operation: 'handleInvoicePaymentFailed_main_catch' },
    });
    return {
      result: 'error',
      errorMessage: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}