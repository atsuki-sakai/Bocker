'use node';
import Stripe from 'stripe';
import { api } from '@/convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { StripeResult } from '@/services/stripe/types';
import { normalizeSubscriptionStatus, priceIdToPlanInfo } from '@/lib/utils';
import * as Sentry from '@sentry/nextjs';
import { retryOperation } from '@/lib/utils';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { BillingPeriod } from '@/convex/types';
import { Id } from '@/convex/_generated/dataModel';

/**
 * Stripe Subscription APIを扱うリポジトリクラス
 */
export class StripeSubscriptionRepository {
  private static instance: StripeSubscriptionRepository | null = null;
  private convex: ConvexHttpClient;
  private isDevelopment: boolean;

  private constructor(private stripe: Stripe) {
    // Convexクライアントの初期化
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is not set.");
    }
    this.convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    // 開発環境かどうか
    this.isDevelopment = process.env.APP_ENV === 'development';
  }

  public static getInstance(stripe: Stripe): StripeSubscriptionRepository {
    if (!StripeSubscriptionRepository.instance) {
      StripeSubscriptionRepository.instance = new StripeSubscriptionRepository(stripe);
    }
    return StripeSubscriptionRepository.instance;
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
    tenant_id: Id<'tenant'>,
    subscription: Stripe.Subscription,
    priceId?: string
  ): Promise<StripeResult<{ stripe_subscription_id: string }>> {
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
      await this.convex.mutation(api.tenant.subscription.mutation.syncSubscription, {
        subscription: {
          tenant_id: tenant_id,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          status: status === 'ERROR' ? '契約切れ' : status,
          price_id: actualPriceId,
          current_period_end: subscription.current_period_end,
          plan_name: planInfo.name,
          billing_period: billingPeriod as BillingPeriod
        }
      });

      return {
        success: true,
        data: {
          stripe_subscription_id: subscription.id,
        },
      };
    } catch (error) {
      console.error('サブスクリプションデータの更新に失敗しました:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }

  /**
   * サブスクリプション支払い失敗時の処理
   */
  async handlePaymentFailed(
    tenant_id: Id<'tenant'>,
    stripe_subscription_id: string,
    stripe_customer_id: string
  ): Promise<StripeResult<{ success: boolean }>> {
    try {
      const transactionId = `payment_failed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await this.convex.mutation(api.tenant.subscription.mutation.paymentFailed, {
        tenant_id: tenant_id,
        stripe_customer_id: stripe_customer_id,
        transaction_id: transactionId,
      });

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      console.error(`サブスクリプション ${stripe_subscription_id} の支払い失敗処理に失敗しました:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }

  /**
   * Stripe顧客を取得
   */
  async getStripeCustomer(customer_id: string): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
    const customer = await this.stripe.customers.retrieve(customer_id);
    if (!customer) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'tenant.subscription.handlePaymentFailed',
        message: 'サブスクリプションの支払い失敗処理に失敗しました',
        code: 'INTERNAL_SERVER_ERROR',
        status: 500,
        details: {
          customer_id: customer_id,
        },
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
          const customer_id = event?.data?.object.customer;
          const inviteSubscriptionId = event?.data?.object.id;
          if (customer_id) {
            try {
              // 新規ユーザーのStripe顧客情報を取得して紹介コードを抽出
              const customer = await this.stripe.customers.retrieve(customer_id as string);

              // 削除されていない顧客からreferralCodeを取得
              const referralCode = !customer.deleted ? customer.metadata?.referralCode : undefined;

              // 招待されたユーザーのサブスクリプション情報
              console.log('新規ユーザーのサブスクリプションID:', inviteSubscriptionId);
              console.log('紹介コード:', referralCode);

              const referral = await this.convex.query(api.tenant.referral.query.findByReferralCode, {
                referral_code: referralCode as string,
              });
              const inviteTenant = await this.convex.query(api.tenant.query.findByStripeCustomerId, {
                stripe_customer_id: customer_id as string,
              });
              if (!inviteTenant) {
                console.log('招待されたユーザーのテナント情報が見つかりません');
                return { success: true, message: '招待されたユーザーのテナント情報が見つかりません' };
              }
              const inviteReferral = await this.convex.query(api.tenant.referral.query.findByTenantId, {
                tenant_id: inviteTenant._id,
              });

              if (!inviteReferral) {
                console.log('紹介コードがありません - 通常のサブスクリプション作成');
                return { success: true, message: '紹介コードがありません' };
              }

              if (referral) {
                await this.convex.mutation(api.tenant.referral.mutation.incrementReferralCount, {
                  referral_id: inviteReferral._id,
                });

                if (referralCode) {
                  const referralBySalon = await retryOperation(() =>
                    this.convex.query(api.tenant.referral.query.findByReferralCode, {
                      referral_code: referralCode,
                    })
                  );
                  if (referralBySalon) {
                    await retryOperation(() =>
                      this.convex.mutation(api.tenant.referral.mutation.incrementReferralCount, {
                        referral_id: referralBySalon._id,
                      })
                    );
                  }
                }
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
          const tenant = await this.convex.query(api.tenant.query.findByStripeCustomerId, {
            stripe_customer_id: customer_id as string,
          });
         
          if (!tenant) {
            console.log('テナント情報が見つかりません');
            return { success: true, message: 'テナント情報が見つかりません' };
          }
          const result = await this.syncSubscription(tenant._id, subscription, priceId);
          return { success: result.success, message: result.error };

        case 'customer.subscription.updated': {
          const subscriptionUpdated = event.data.object as Stripe.Subscription;
          const priceIdUpdated = subscriptionUpdated.items.data[0].plan.id;
          const customer_id = event?.data?.object.customer;
          const tenant = await this.convex.query(api.tenant.query.findByStripeCustomerId, {
            stripe_customer_id: customer_id as string,
          });
          if (!tenant) {
            console.log('テナント情報が見つかりません');
            return { success: true, message: 'テナント情報が見つかりません' };
          }
          const resultUpdated = await this.syncSubscription(tenant._id, subscriptionUpdated, priceIdUpdated);
          return { success: resultUpdated.success, message: resultUpdated.error };
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
              const customer_id = event?.data?.object.customer;
              const tenant = await this.convex.query(api.tenant.query.findByStripeCustomerId, {
                stripe_customer_id: customer_id as string,
              });
              if (!tenant) {
                console.log('テナント情報が見つかりません');
                return { success: true, message: 'テナント情報が見つかりません' };
              }
              const result = await this.syncSubscription(tenant._id, subscription);
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
          await this.convex.mutation(api.tenant.subscription.mutation.kill, {
            stripe_subscription_id: canceledSub.id,
          });
          return { success: true, message: 'サブスクリプションIDなし' };
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

              const tenant = await this.convex.query(api.tenant.query.findByStripeCustomerId, {
                stripe_customer_id: customerId as string,
              });
              if (!tenant) {
                console.log('テナント情報が見つかりません');
                return { success: true, message: 'テナント情報が見つかりません' };
              }

              const result = await this.handlePaymentFailed(tenant._id, subId, customerId);
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
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'tenant.subscription.handleWebhookEvent',
        message: 'Webhookイベントの処理に失敗しました',
        code: 'INTERNAL_SERVER_ERROR',
        status: 500,
        details: {
          error: error instanceof Error ? error.message : '不明なエラー',
        },
      });
    }
  }

  /**
   * サブスクリプションに割引を適用する
   * @param subscriptionId 割引を適用するサブスクリプションID
   * @param discountAmount 割引額（単位：円）
   * @returns 割引適用結果
   */
  async applyDiscount(
    stripe_subscription_id: string,
    discount_amount: number
  ): Promise<
    StripeResult<{
      success: boolean;
      verificationResult: { before: number; after: number; discountApplied: boolean };
    }>
  > {
    try {
      // 割引額を円からStripeの最小単位（銭）に変換
      const subscriptionBefore = await this.stripe.subscriptions.retrieve(stripe_subscription_id);
      const amountBefore = subscriptionBefore.items.data[0]?.plan.amount || 0;

      // 割引額を円からStripeの最小単位（銭）に変換
      const amountInSmallestUnit = discount_amount * 100;

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
      await this.stripe.subscriptions.update(stripe_subscription_id, {
        coupon: coupon.id,
      });

      // 3. 割引適用後のサブスクリプション情報を再取得
      const subscriptionAfter = await this.stripe.subscriptions.retrieve(stripe_subscription_id);
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
      console.log(`サブスクリプション ${stripe_subscription_id} の割引検証:`, {
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
      console.error(`サブスクリプション ${stripe_subscription_id} への割引適用に失敗しました:`, error);
      Sentry.captureException(error, {
        level: 'error',
        tags: {
          function: 'applyDiscount',
        },
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }
}
