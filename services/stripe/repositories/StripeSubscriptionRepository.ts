import Stripe from 'stripe';
import { api } from '@/convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { StripeResult } from '@/services/stripe/types';
import { normalizeSubscriptionStatus, priceIdToPlanInfo } from '@/lib/utils';
import { StripeError } from '@/services/convex/shared/utils/error';
/**
 * Stripe Subscription APIを扱うリポジトリクラス
 */
export class StripeSubscriptionRepository {
  private static instance: StripeSubscriptionRepository | null = null;
  private convex: ConvexHttpClient;
  private isDevelopment: boolean;

  private constructor(private stripe: Stripe) {
    // Convexクライアントの初期化
    this.convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

    // 開発環境かどうか
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  public static getInstance(stripe: Stripe): StripeSubscriptionRepository {
    if (!StripeSubscriptionRepository.instance) {
      StripeSubscriptionRepository.instance = new StripeSubscriptionRepository(stripe);
    }
    return StripeSubscriptionRepository.instance;
  }

  /**
   * 共通のエラーハンドリング処理
   */
  private handleError(error: unknown, operation: string): string {
    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
    console.error(`Error during ${operation}:`, error);
    return errorMessage;
  }

  /**
   * Stripeの課金期間("month"/"year")をConvexスキーマ形式("monthly"/"yearly")に変換
   */
  private convertIntervalToBillingPeriod(interval: string): string {
    const intervalMapping: Record<string, string> = {
      month: 'monthly',
      year: 'yearly',
    };
    return intervalMapping[interval] || 'monthly'; // デフォルトはmonthly
  }

  /**
   * サブスクリプションステータスの同期
   */
  async syncSubscription(
    subscription: Stripe.Subscription,
    priceId?: string
  ): Promise<StripeResult<{ subscriptionId: string }>> {
    try {
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;

      const status = normalizeSubscriptionStatus(subscription);

      const actualPriceId = priceId || subscription.items.data[0]?.price?.id || '';
      const planInfo = priceIdToPlanInfo(actualPriceId);

      let billingPeriod;
      try {
        billingPeriod = subscription.items.data[0]?.plan?.interval
          ? this.convertIntervalToBillingPeriod(subscription.items.data[0].plan.interval)
          : 'monthly';
      } catch (error) {
        // デフォルト値をセット
        billingPeriod = 'monthly';
        console.warn(
          `billingPeriodの変換に失敗しました。デフォルト値を使用: ${subscription.id}`,
          error
        );
      }

      await this.convex.mutation(api.subscription.mutation.syncSubscription, {
        subscription: {
          subscriptionId: subscription.id,
          stripeCustomerId: customerId,
          status: status,
          priceId: actualPriceId,
          currentPeriodEnd: subscription.current_period_end,
          planName: planInfo.name,
          billingPeriod: billingPeriod as 'monthly' | 'yearly',
        },
      });

      return {
        success: true,
        data: {
          subscriptionId: subscription.id,
        },
      };
    } catch (error) {
      console.error('サブスクリプションデータの更新に失敗しました:', error);
      return {
        success: false,
        error: this.handleError(error, 'syncSubscription'),
      };
    }
  }

  /**
   * サブスクリプション支払い失敗時の処理
   */
  async handlePaymentFailed(
    subscriptionId: string,
    stripeCustomerId: string
  ): Promise<StripeResult<{ success: boolean }>> {
    try {
      const transactionId = `payment_failed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await this.convex.mutation(api.subscription.mutation.paymentFailed, {
        subscriptionId,
        stripeCustomerId,
        transactionId,
      });

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      console.error(`サブスクリプション ${subscriptionId} の支払い失敗処理に失敗しました:`, error);
      return {
        success: false,
        error: this.handleError(error, 'handlePaymentFailed'),
      };
    }
  }

  /**
   * Webhookイベントを処理
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<{ success: boolean; message?: string }> {
    console.log(`Processing Stripe subscription event: ${event.type}`);

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const priceId = subscription.items.data[0].plan.id;
          const result = await this.syncSubscription(subscription, priceId);
          return { success: result.success, message: result.error };
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const subId =
            typeof invoice.subscription === 'string'
              ? invoice.subscription
              : invoice.subscription?.toString();

          if (subId) {
            try {
              const subscription = await this.stripe.subscriptions.retrieve(subId);
              const result = await this.syncSubscription(subscription);
              return { success: result.success, message: result.error };
            } catch (error) {
              console.error(`請求書 ${invoice.id} のサブスクリプション取得に失敗しました:`, error);
              throw error;
            }
          }
          return { success: true, message: 'サブスクリプションIDなし' };
        }

        case 'customer.subscription.deleted': {
          const canceledSub = event.data.object as Stripe.Subscription;
          const result = await this.syncSubscription(canceledSub);
          return { success: result.success, message: result.error };
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subId =
            typeof invoice.subscription === 'string'
              ? invoice.subscription
              : invoice.subscription?.toString();

          if (subId) {
            try {
              // サブスクリプションの詳細を取得
              const subscription = await this.stripe.subscriptions.retrieve(subId);
              const customerId =
                typeof subscription.customer === 'string'
                  ? subscription.customer
                  : subscription.customer.id;

              const result = await this.handlePaymentFailed(subId, customerId);
              return { success: result.success, message: result.error };
            } catch (error) {
              console.error(`サブスクリプション ${subId} の支払い失敗処理に失敗しました:`, error);
              throw error;
            }
          }
          return { success: true, message: 'サブスクリプションIDなし' };
        }

        default:
          return { success: true, message: `未対応のStripeイベントタイプ: ${event.type}` };
      }
    } catch (error) {
      throw new StripeError('high', 'Webhookイベントの処理に失敗しました', 'INTERNAL_ERROR', 500, {
        event,
      });
    }
  }
}
