'use node';

import Stripe from 'stripe';
import { ConvexHttpClient } from 'convex/browser';
import { StripeResult } from '@/services/stripe/types';
import * as Sentry from '@sentry/nextjs';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
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
