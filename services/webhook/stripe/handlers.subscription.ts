
import type Stripe from 'stripe';
import type { WebhookDependencies, EventProcessingResult, LogContext } from '../types';
import type { WebhookMetricsCollector } from '../metrics';
import * as Sentry from '@sentry/nextjs';
import { fetchAction, fetchMutation, fetchQuery } from 'convex/nextjs';
import type { SubscriptionStatus } from '@/convex/types';
import { Id } from '@/convex/_generated/dataModel'

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
        price_id: evt.data.object.items.data[0].price.id as string,
        plan_name: evt.data.object.items.data[0].plan.nickname as string,
        billing_period: evt.data.object.items.data[0].plan.interval as 'month' | 'year',
        current_period_end: evt.data.object.current_period_end,
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

    const customer = await deps.stripe.customers.retrieve(
      evt.data.object.customer as string
    ) as Stripe.Customer;
    metrics.incrementApiCall("stripe");


    // --- リファラルボーナス処理 (初回請求のみ) -------------------------
    // NOTE: 初回の invoice （billing_reason === 'subscription_create'）のみを対象とします。
    // Convex 側では invoice_id をユニークキーとして冪等性を担保してください。
    const isFirstInvoice = evt.data.object.billing_reason === 'subscription_create';
    // tenant_id をメタデータから取得。存在しない場合はエラー処理。
    const tenant_id = customer.metadata?.tenant_id as Id<'tenant'> | null;
    console.log("metadata: ", customer.metadata)
    if (isFirstInvoice) {
      // Stripe Customer から referral_code を取得
      const customer = await deps.stripe.customers.retrieve(
        evt.data.object.customer as string
      ) as Stripe.Customer;
      const referralCode = customer.metadata.referral_code as string | null;
      metrics.incrementApiCall("stripe");

      // 未入力の場合は null になる想定
      if (referralCode && tenant_id) {
        try {
          await deps.retry(() =>
            fetchAction(
              deps.convex.tenant.referral.action.applyReferralBonus,
              {
                referral_code: referralCode,
                subscriber_tenant_id: tenant_id,
                invoice_id: evt.data.object.id,
              }
            )
          );
          metrics.incrementApiCall("convex");
        } catch (bonusErr) {
          // ボーナス処理失敗 → ログのみ、Subscription 更新は継続
          console.error(`[${eventId}] applyReferralBonus failed`, bonusErr);
          Sentry.captureException(bonusErr, {
            level: 'warning',
            tags: { ...context, operation: 'applyReferralBonus' },
          });
        }
      }
    }
    // --------------------------------------------------------------

    if (subscriptionId && subscriptionStatus) {
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

        // 1.サブスクリプションを取得するstripeのcustomer.idを元に一致するsubscriptionテーブルを取得
        let subscription = await deps.retry(() =>
          fetchQuery(deps.convex.tenant.subscription.query.findByStripeCustomerId, {
            stripe_customer_id: evt.data.object.customer as string,
          })
        );
        metrics.incrementApiCall("convex");
        await deps.retry(() =>
          fetchMutation(deps.convex.tenant.subscription.mutation.upsertSubscription, {
            tenant_id: tenant_id, // 取得した tenant_id を使用
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: evt.data.object.customer as string,
            status: subscriptionStatus,
            price_id: evt.data.object.lines.data[0].price?.id as string,
            plan_name: evt.data.object.lines.data[0].description as string,
            billing_period: evt.data.object.lines.data[0].plan?.interval as 'month' | 'year',
            current_period_end: evt.data.object.lines.data[0].period?.end as number,
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
          price_id: subscription.items.data[0].price.id as string,
          plan_name: subscription.items.data[0].plan.nickname as string,
          billing_period: subscription.items.data[0].plan.interval,
          current_period_end: subscription.current_period_end,
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