import type Stripe from 'stripe';
import type { WebhookDependencies, EventProcessingResult, LogContext } from '../types';
import type { WebhookMetricsCollector } from '../metrics';
import * as Sentry from '@sentry/nextjs';
import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { priceIdToPlanInfo, convertIntervalToBillingPeriod } from '@/lib/utils';
import type { BillingPeriod, SubscriptionStatus } from '@/convex/types';
import { Id } from '@/convex/_generated/dataModel'


export async function handleCheckoutSessionCompleted(
  
  /**
   * Stripe の Subscription 初回契約確定の Webhook イベントを処理
   * (checkout.session.completed)
   *
   * @param evt - Stripe イベントオブジェクト
   * @param eventId - イベントID
   * @param deps - Webhook の依存関係 (Stripe インスタンスなど)
   * @param metrics - メトリクスコレクター
   * @returns イベント処理結果 ('success', 'skipped', 'error')
   */
  evt: Stripe.CheckoutSessionCompletedEvent,
  eventId: string, // eventId はログや将来的な拡張のために渡されますが、現在の指示では直接使用されません
  deps: WebhookDependencies, // 依存性の注入
  metrics: WebhookMetricsCollector // 詳細なメトリクス(処理がどれくらい時間がかかったか?)を収集するために渡されます
): Promise<EventProcessingResult> {
// ------------------------------------------------------------
// 以下、実装の主な流れ
// 1. Stripe から必要な ID / ステータスを取得
// 2. Convex に同期 (retry & await で冪等・確実に書き込み)
// 3. メトリクス収集で監視基盤に反映
// ------------------------------------------------------------

  const context: LogContext = {
    eventId,
    eventType: 'checkout.session.completed',
    stripeCustomerId: evt.data.object.customer as string,
    stripeSubscriptionId: evt.data.object.subscription as string,
  };
  console.log(`👤 [${eventId}] CheckoutSessionCompleted処理開始: stripeCustomerId=${evt.data.object.customer}, stripeSubscriptionId=${evt.data.object.subscription}`, context);

  try {
    try {
      const customerId = evt.data.object.customer as string;
      // Stripe から最新のサブスクリプション詳細を取得し、プラン情報と請求間隔を判定
      const subscription = await deps.stripe.subscriptions.retrieve(evt.data.object.subscription as string);
      metrics.incrementApiCall("stripe");

      let priceId;
      let planInfo;
      let billingPeriod;

      // プライスIDの取得
      if (subscription.items.data[0]) {
        // 取得したプライス ID を外側の変数に代入
        priceId = subscription.items.data[0].price.id;
        planInfo = priceIdToPlanInfo(priceId);
        billingPeriod = subscription.items.data[0]?.plan?.interval
          ? convertIntervalToBillingPeriod(subscription.items.data[0].plan.interval)
          : 'monthly';
      } else {
        return {
          result: 'skipped',
          metadata: {
            action: 'checkout_session_completed',
            stripeCustomerId: evt.data.object.customer as string,
            stripeSubscriptionId: evt.data.object.subscription as string,
            errorMessage: 'サブスクリプションのプライスIDが見つかりません',
          }
        };
      }

      if (!planInfo || !billingPeriod || !priceId) {
        return {
          result: 'skipped',
          metadata: {
            action: 'checkout_session_completed',
            stripeCustomerId: evt.data.object.customer as string,
            stripeSubscriptionId: evt.data.object.subscription as string,
          }
        };
      }

      // Convex 側にサブスクリプション情報を同期（冪等アップサート）
      try{
        const tenant_id = evt.data.object.metadata?.tenant_id as Id<'tenant'>;
        await deps.retry(() =>
          fetchMutation(deps.convex.tenant.subscription.mutation.syncSubscription, {
            subscription: {
              tenant_id: tenant_id,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: customerId,
              status: subscription.status,
              price_id: priceId,
              current_period_end: subscription.current_period_end,
              plan_name: planInfo.name,
              billing_period: billingPeriod as BillingPeriod
            }
          })
        );
        metrics.incrementApiCall("convex");
      } catch (error) {
        console.warn(`tenant_idの取得に失敗しました。デフォルト値を使用: ${subscription.id}`, error);
        return {
          result: 'error',
          errorMessage: error instanceof Error ? error.message : '不明なエラー',
        };
      }
    } catch (error) {
      console.error('サブスクリプションデータの更新に失敗しました:', error);
      return {
        result: 'error',
        errorMessage: error instanceof Error ? error.message : '不明なエラー',
      };
    }
    return {
      result: 'success',
      metadata: {
        action: 'checkout_session_completed',
        stripeCustomerId: evt.data.object.customer as string,
        stripeSubscriptionId: evt.data.object.subscription as string,
      }
    };
  } catch (error) {
    console.error(`❌ [${eventId}] CheckoutSessionCompleted処理中に致命的なエラーが発生: stripeCustomerId=${evt.data.object.customer}, stripeSubscriptionId=${evt.data.object.subscription}`, { ...context, error });
    Sentry.captureException(error, {
      level: 'error',
      tags: { ...context, operation: 'handleCheckoutSessionCompleted_main_catch' },
    });
    return {
      result: 'error',
      errorMessage: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

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
    const subscriptionStatus = await deps.stripe.subscriptions.retrieve(subscriptionId).then((subscription) => subscription.status);
    metrics.incrementApiCall("stripe");
      if (subscriptionId && subscriptionStatus) {
        try {
          const tenant_id = evt.data.object.metadata?.tenant_id as Id<'tenant'>;
          await deps.retry(() =>
            fetchMutation(deps.convex.tenant.subscription.mutation.updateSubscription, {
              tenant_id: tenant_id,
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
    const subscriptionStatus = await deps.stripe.subscriptions.retrieve(subscriptionId).then((subscription) => subscription.status);
    metrics.incrementApiCall("stripe");
    if (subscriptionId) {
      const tenant_id = evt.data.object.metadata?.tenant_id as Id<'tenant'>;
      await deps.retry(() =>
        fetchMutation(deps.convex.tenant.subscription.mutation.updateSubscription, {
          tenant_id: tenant_id,
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