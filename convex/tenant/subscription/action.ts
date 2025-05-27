"use node"

/**
 * サブスクリプションアクションAPI
 *
 * Stripe連携に関する各種アクションエンドポイントを提供します。
 * Convexのactionとして定義し、ビジネスロジックを分離して実装しています。
 */

import { action } from '../../_generated/server';
import { v } from 'convex/values';
import { api } from '../../_generated/api';
import {
  validateStringLength
} from '@/convex/utils/validations';
import { Stripe } from 'stripe';
import { STRIPE_API_VERSION } from '@/services/stripe/constants';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { BASE_URL, PLAN_TRIAL_DAYS } from '@/lib/constants';
import { BillingPeriod } from '@/convex/types';
import { checkAllowedUrl, getPlanNameFromPriceId } from '@/lib/utils';

/**
 * 1. サブスクリプション用Checkout Sessionを作成
 *    - Stripe Checkoutを利用し、サブスクリプション購入フローを生成
 *    - WebhookでSubscriptionのConvexレコード作成
 */
export const createSubscriptionSession = action({
  args: {
    tenant_id: v.id('tenant'),          // テナントID
    org_id: v.id('organization'),                 // 組織ID
    user_id: v.string(),               // ユーザーID（クライアント参照用）
    stripe_customer_id: v.string(),    // Stripe顧客ID
    price_id: v.string(),              // Stripeの価格ID
    trial_days: v.optional(v.number()),// 任意：トライアル日数
  },
  handler: async (ctx, args) => {
    // パラメータ検証
    validateStringLength(args.user_id, 'user_id');
    validateStringLength(args.stripe_customer_id, 'stripe_customer_id');
    validateStringLength(args.price_id, 'price_id');

    // トライアル日数の範囲チェック
    if (args.trial_days && (args.trial_days < 0 || args.trial_days > PLAN_TRIAL_DAYS)) {
      
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'tenant.subscription.createSubscriptionSession',
        message: 'トライアル期間が不正です',
        code: 'UNPROCESSABLE_ENTITY',
        status: 400,
        details: { ...args },
      });
    }

    // 成功・キャンセル時のリダイレクトURL設定
    const successUrl = `${BASE_URL}/dashboard/subscription/success`;
    const cancelUrl = `${BASE_URL}/dashboard/subscription/cancel`;

    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: STRIPE_API_VERSION,
      });
      // Stripe Checkout Sessionを作成
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer: args.stripe_customer_id,
        line_items: [{ price: args.price_id, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: false,
        client_reference_id: args.user_id,
        metadata: {
          user_id: args.user_id,
          tenant_id: args.tenant_id,
        },
        ...(args.trial_days
          ? { subscription_data: { trial_period_days: args.trial_days } }
          : {}),
      });
      // クライアントにCheckout URLを返却
      return { checkoutUrl: session.url };
    } catch (error) {
      // Stripe APIエラー時にConvexErrorでラップ
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'tenant.subscription.createSubscriptionSession',
        message: 'サブスクリプションセッションの作成に失敗しました',
        code: 'INTERNAL_SERVER_ERROR',
        status: 500,
        details: {
          ...args,
          error: error instanceof Error ? error.message : '不明なエラー',
        },
      });
    }
  },
});

/**
 * 2. Stripe上の顧客情報を取得
 *    - ConvexのデータではなくStripe側の最新情報を返却
 */
export const getRealStripeCustomer = action({
  args: {
    stripe_customer_id: v.string(), // Stripe顧客ID
  },
  handler: async (ctx, args) => {
    validateStringLength(args.stripe_customer_id, 'stripe_customer_id');
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: STRIPE_API_VERSION,
      });
      // Stripe API経由で顧客を取得
      const stripeCustomer = await stripe.customers.retrieve(args.stripe_customer_id);
      if (!stripeCustomer) {
        // 顧客未存在時
        throw new ConvexError({
          statusCode: ERROR_STATUS_CODE.NOT_FOUND,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'tenant.subscription.getRealStripeCustomer',
          message: 'Stripe顧客が見つかりません',
          code: 'NOT_FOUND',
          status: 404,
          details: { ...args },
        });
      }
      return stripeCustomer;
    } catch (error) {
      // Stripe API呼び出しエラー時
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'tenant.subscription.getRealStripeCustomer',
        message: 'Stripeの顧客を取得中にエラーが発生しました',
        code: 'INTERNAL_SERVER_ERROR',
        status: 500,
        details: {
          ...args,
          error: error instanceof Error ? error.message : '不明なエラー',
        },
      });
    }
  },
});

/**
 * 3. サブスクリプション更新プレビュー取得
 *    - プラン変更時の請求書プレビューと現在のステータス等を返却
 */
export const getSubscriptionUpdatePreview = action({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    subscription_id: v.string(),      // 既存サブスクリプションID
    new_price_id: v.string(),         // 新プランの価格ID
    stripe_customer_id: v.string(),   // Stripe顧客ID
  },
  handler: async (ctx, args) => {
    try {
      // パラメータ検証
      validateStringLength(args.stripe_customer_id, 'stripe_customer_id');
      validateStringLength(args.subscription_id, 'subscription_id');
      validateStringLength(args.new_price_id, 'new_price_id');

      // プロレーション（按分）日時をUnix秒で取得
      const prorationDate = Math.floor(Date.now() / 1000);
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: STRIPE_API_VERSION,
      });
      // 現行サブスクリプション取得
      const subscription = await stripe.subscriptions.retrieve(args.subscription_id);
      const items = [
        { id: subscription.items.data[0].id, price: args.new_price_id },
      ];

      if (!subscription) {
        throw new ConvexError({
          statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'tenant.subscription.getSubscriptionUpdatePreview',
          message: 'サブスクリプションの取得に失敗しました',
          code: 'UNPROCESSABLE_ENTITY',
          status: 400,
          details: { ...args },
        });
      }

      // 更新後の請求書プレビュー取得
      const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        customer: args.stripe_customer_id,
        subscription: args.subscription_id,
        subscription_items: items,
        subscription_proration_date: prorationDate,
      });

      if (!upcomingInvoice) {
        throw new ConvexError({
          statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'tenant.subscription.getSubscriptionUpdatePreview',
          message: '請求書プレビューの取得に失敗しました',
          code: 'UNPROCESSABLE_ENTITY',
          status: 400,
          details: { ...args },
        });
      }

      return {
        success: true,
        previewInvoice: upcomingInvoice,
        status: subscription.status,
        items,
        prorationDate,
      };
    } catch (error) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'tenant.subscription.getSubscriptionUpdatePreview',
        message: 'サブスクリプション更新プレビューの取得中にエラーが発生しました',
        code: 'INTERNAL_SERVER_ERROR',
        status: 500,
        details: {
          ...args,
          error: error instanceof Error ? error.message : '不明なエラー',
        },
      });
    }
  },
});

/**
 * 4. Billing Portalセッション作成
 *    - 顧客向け請求書ポータルへのアクセスURLを発行
 */
export const createBillingPortalSession = action({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    stripe_customer_id: v.string(),
    return_url: v.string(),            // ポータル終了後のリダイレクト先
  },
  handler: async (ctx, args) => {
    try {
      validateStringLength(args.stripe_customer_id, 'stripe_customer_id');
      validateStringLength(args.return_url, 'return_url');
      // 許可ドメインチェック
      checkAllowedUrl(args.return_url);

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: STRIPE_API_VERSION,
      });
      // Billing Portal Session作成
      const session = await stripe.billingPortal.sessions.create({
        customer: args.stripe_customer_id,
        return_url: args.return_url,
      });
      return { portalUrl: session.url };
    } catch (error) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'tenant.subscription.createBillingPortalSession',
        message: 'Billing Portalのセッションの作成中にエラーが発生しました',
        code: 'INTERNAL_SERVER_ERROR',
        status: 500,
        details: {
          ...args,
          error: error instanceof Error ? error.message : '不明なエラー',
        },
      });
    }
  },
});

/**
 * 5. サブスクリプション更新確定
 *    - プラン変更を確定し、実際にStripe上のサブスクリプションを更新
 *    - 更新後の課金周期（月額/年額）を判定して返却
 */
export const confirmSubscriptionUpdate = action({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    subscription_id: v.string(),
    new_price_id: v.string(),
    items: v.array(v.object({ id: v.string(), price: v.string() })),
    proration_date: v.number(),     // プロレーション日時
  },
  handler: async (ctx, args) => {
    try {
      validateStringLength(args.subscription_id, 'subscription_id');
      validateStringLength(args.new_price_id, 'new_price_id');

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: STRIPE_API_VERSION,
      });
      // Stripeサブスクリプションを更新
      const updatedSubscription = await stripe.subscriptions.update(
        args.subscription_id,
        {
          items: args.items,
          proration_date: args.proration_date,
          proration_behavior: 'create_prorations',
        }
      );

      // 更新後の課金周期を判定
      const intervalMapping: Record<string, BillingPeriod> = {
        month: 'month',
        year: 'year',
      };
      let billingPeriod: BillingPeriod = 'month';
      const recurring = updatedSubscription.items.data[0]?.price?.recurring;
      if (recurring?.interval) {
        billingPeriod = intervalMapping[recurring.interval] || 'month';
      }

      await ctx.runMutation(api.tenant.subscription.mutation.upsertSubscription, {
        stripe_subscription_id: updatedSubscription.id,
        price_id: updatedSubscription.items.data[0]?.price?.id,
        billing_period: billingPeriod,
        tenant_id: args.tenant_id,
        stripe_customer_id: updatedSubscription.customer as string,
        plan_name: getPlanNameFromPriceId(updatedSubscription.items.data[0]?.price?.id),
        current_period_start: updatedSubscription.current_period_start,
        current_period_end: updatedSubscription.current_period_end,
        status: updatedSubscription.status,
      })

      return {
        success: true,
        subscription: updatedSubscription,
        billingPeriod,
      };
    } catch (error) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'tenant.subscription.confirmSubscriptionUpdate',
        message: 'サブスクリプション更新の確定中にエラーが発生しました',
        code: 'INTERNAL_SERVER_ERROR',
        status: 500,
        details: {
          ...args,
          error: error instanceof Error ? error.message : '不明なエラー',
        },
      });
    }
  },
});