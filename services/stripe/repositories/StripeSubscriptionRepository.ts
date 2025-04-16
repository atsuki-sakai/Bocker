import Stripe from 'stripe';
import { api } from '@/convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { StripeResult } from '@/services/stripe/types';
import { normalizeSubscriptionStatus, priceIdToPlanInfo } from '@/lib/utils';
import { StripeError } from '@/services/convex/shared/utils/error';
import { fetchQuery } from 'convex/nextjs';
import * as Sentry from '@sentry/nextjs';
import { STRIPE_API_VERSION } from '@/lib/constants';
import { fetchMutation } from 'convex/nextjs';

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
    Sentry.captureException(error, {
      level: 'error',
      tags: {
        function: operation,
      },
    });
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
    return intervalMapping[interval] || 'monthly';
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

      const actualPriceId = priceId || '';
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
   * Stripe顧客を取得
   */
  async getStripeCustomer(customerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
    const customer = await this.stripe.customers.retrieve(customerId);
    if (!customer) {
      throw new StripeError('high', 'Stripe顧客が見つかりません', 'NOT_FOUND', 404, {
        customerId,
      });
    }
    return customer;
  }

  /**
   * Webhookイベントを処理
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<{ success: boolean; message?: string }> {
    console.log(`Processing Stripe subscription event: ${event.type}`);

    try {
      switch (event.type) {
        case 'customer.subscription.created':
          const customerId = event?.data?.object.customer;
          const inviteSubscriptionId = event?.data?.object.id;
          if (customerId) {
            try {
              // 新規ユーザーのStripe顧客情報を取得して紹介コードを抽出
              const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
                apiVersion: STRIPE_API_VERSION,
              });
              const customer = await stripe.customers.retrieve(customerId as string);

              // 削除されていない顧客からreferralCodeを取得
              const referralCode = !customer.deleted ? customer.metadata?.referralCode : undefined;

              // 招待されたユーザーのサブスクリプション情報
              console.log('新規ユーザーのサブスクリプションID:', inviteSubscriptionId);
              console.log('紹介コード:', referralCode);

              const referral = await fetchQuery(api.salon.referral.query.getByReferralCode, {
                referralCode: referralCode as string,
              });
              const inviteSalon = await fetchQuery(api.salon.core.query.findByStripeCustomerId, {
                stripeCustomerId: customerId as string,
              });
              if (!inviteSalon) {
                console.log('招待されたユーザーのサロン情報が見つかりません');
                return { success: true, message: '招待されたユーザーのサロン情報が見つかりません' };
              }
              const inviteReferral = await fetchQuery(api.salon.referral.query.findBySalonId, {
                salonId: inviteSalon._id,
              });

              if (!inviteReferral) {
                console.log('紹介コードがありません - 通常のサブスクリプション作成');
                return { success: true, message: '紹介コードがありません' };
              }

              if (referral) {
                await fetchMutation(api.salon.referral.mutation.incrementReferralCount, {
                  referralId: inviteReferral._id,
                });
              } else {
                console.log('紹介コードがありません - 通常のサブスクリプション作成');
              }
            } catch (error) {
              console.error('紹介情報の取得に失敗しました:', error);
              Sentry.captureException(error, {
                level: 'error',
                tags: {
                  function: 'getReferralInfo',
                },
              });
            }
          }

          const subscription = event.data.object as Stripe.Subscription;
          const priceId = subscription.items.data[0].plan.id;
          const result = await this.syncSubscription(subscription, priceId);
          return { success: result.success, message: result.error };

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
              Sentry.captureException(error, {
                level: 'error',
                tags: {
                  function: 'handleWebhookEvent_invoice_payment_succeeded',
                },
              });
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
              Sentry.captureException(error, {
                level: 'error',
                tags: {
                  function: 'handleWebhookEvent_invoice_payment_failed',
                },
              });
              throw error;
            }
          }
          return { success: true, message: 'サブスクリプションIDなし' };
        }

        default:
          return { success: true, message: `未対応のStripeイベントタイプ: ${event.type}` };
      }
    } catch (error) {
      const err = new StripeError(
        'high',
        'Webhookイベントの処理に失敗しました',
        'INTERNAL_ERROR',
        500,
        {
          event,
        }
      );
      Sentry.captureException(error, {
        level: 'error',
        tags: {
          function: 'handleWebhookEvent',
        },
      });
      throw err;
    }
  }

  /**
   * サブスクリプションに割引を適用する
   * @param subscriptionId 割引を適用するサブスクリプションID
   * @param discountAmount 割引額（単位：円）
   * @returns 割引適用結果
   */
  async applyDiscount(
    subscriptionId: string,
    discountAmount: number
  ): Promise<
    StripeResult<{
      success: boolean;
      verificationResult: { before: number; after: number; discountApplied: boolean };
    }>
  > {
    try {
      // 割引額を円からStripeの最小単位（銭）に変換
      const subscriptionBefore = await this.stripe.subscriptions.retrieve(subscriptionId);
      const amountBefore = subscriptionBefore.items.data[0]?.plan.amount || 0;

      // 割引額を円からStripeの最小単位（銭）に変換
      const amountInSmallestUnit = discountAmount * 100;

      // 一意のクーポンコードを生成
      const couponId = `referral_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // クーポンを作成
      const coupon = await this.stripe.coupons.create({
        name: '紹介プログラム割引',
        amount_off: amountInSmallestUnit,
        currency: 'jpy',
        duration: 'forever',
        id: couponId,
      });

      // サブスクリプションに作成したクーポンを適用
      await this.stripe.subscriptions.update(subscriptionId, {
        coupon: coupon.id,
      });

      // 3. 割引適用後のサブスクリプション情報を再取得
      const subscriptionAfter = await this.stripe.subscriptions.retrieve(subscriptionId);
      const amountAfter = subscriptionAfter.items.data[0]?.plan.amount || 0;
      const discountInfoAfter = subscriptionAfter.discount;

      // 4. 割引が正しく適用されたか検証
      const isDiscountApplied = !!discountInfoAfter && discountInfoAfter.coupon.id === couponId;

      // 次回請求額の検証
      const nextInvoice = await this.stripe.invoices.retrieveUpcoming({
        customer:
          typeof subscriptionAfter.customer === 'string'
            ? subscriptionAfter.customer
            : subscriptionAfter.customer.id,
      });

      // 検証結果をログに記録
      console.log(`サブスクリプション ${subscriptionId} の割引検証:`, {
        適用前金額: amountBefore / 100,
        適用後金額: amountAfter / 100,
        割引情報: discountInfoAfter,
        次回請求額: nextInvoice.amount_due / 100,
        割引適用成功: isDiscountApplied,
      });

      // クーポンを削除しない（重要）

      return {
        success: true,
        data: {
          success: true,
          verificationResult: {
            before: amountBefore / 100,
            after: amountAfter / 100,
            discountApplied: isDiscountApplied,
          },
        },
      };
    } catch (error) {
      console.error(`サブスクリプション ${subscriptionId} への割引適用に失敗しました:`, error);
      Sentry.captureException(error, {
        level: 'error',
        tags: {
          function: 'applyDiscount',
        },
      });
      return {
        success: false,
        error: this.handleError(error, 'applyDiscount'),
      };
    }
  }
}
