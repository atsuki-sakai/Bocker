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
 * トライアル中のサブスクリプション用手動プレビュー生成
 * @param stripe Stripeインスタンス
 * @param newPriceId 新しい価格ID
 * @param customerId Stripe顧客ID
 * @param subscriptionId サブスクリプションID
 * @returns 手動生成したInvoiceプレビュー
 */
async function createTrialPreview(
  stripe: Stripe,
  newPriceId: string,
  customerId: string,
  subscriptionId: string
) {
  // 新しい価格情報を取得
  const price = await stripe.prices.retrieve(newPriceId);
  
  if (!price || !price.unit_amount) {
    throw new ConvexError({
      statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
      severity: ERROR_SEVERITY.ERROR,
      callFunc: 'createTrialPreview',
      message: '価格情報の取得に失敗しました',
      code: 'PRICE_NOT_FOUND',
      status: 400,
      details: { priceId: newPriceId },
    });
  }

  // 顧客情報を取得（税金計算などで必要な場合）
  const customer = await stripe.customers.retrieve(customerId);
  
  if (!customer || customer.deleted) {
    throw new ConvexError({
      statusCode: ERROR_STATUS_CODE.NOT_FOUND,
      severity: ERROR_SEVERITY.ERROR,
      callFunc: 'createTrialPreview',
      message: '顧客情報の取得に失敗しました',
      code: 'CUSTOMER_NOT_FOUND',
      status: 404,
      details: { customerId },
    });
  }

  // 現在のサブスクリプション情報を取得
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  // トライアル終了日を取得
  const trialEnd = subscription.trial_end || Math.floor(Date.now() / 1000);
  
  // 手動でInvoiceプレビューオブジェクトを作成
  // Stripe Invoiceオブジェクトの必要最小限の構造を模倣
  const manualPreview = {
    // 基本情報
    id: `preview_${Date.now()}`, // 仮のID
    object: 'invoice' as const,
    account_country: 'JP',
    account_name: null,
    account_tax_ids: null,
    amount_due: price.unit_amount,
    amount_paid: 0,
    amount_remaining: price.unit_amount,
    amount_shipping: 0,
    application: null,
    application_fee_amount: null,
    attempt_count: 0,
    attempted: false,
    auto_advance: true,
    automatic_tax: {
      enabled: false,
      liability: null,
      status: null,
    },
    billing_reason: 'subscription_update',
    charge: null,
    collection_method: 'charge_automatically',
    created: Math.floor(Date.now() / 1000),
    currency: price.currency,
    customer: customerId,
    customer_address: null,
    customer_email: (customer as any).email || null,
    customer_name: (customer as any).name || null,
    customer_phone: null,
    customer_shipping: null,
    customer_tax_exempt: 'none' as const,
    customer_tax_ids: [],
    default_payment_method: null,
    default_source: null,
    default_tax_rates: [],
    description: null,
    discount: null,
    discounts: [],
    due_date: null,
    effective_at: trialEnd,
    ending_balance: null,
    footer: null,
    from_invoice: null,
    hosted_invoice_url: null,
    invoice_pdf: null,
    issuer: {
      type: 'self' as const,
    },
    last_finalization_error: null,
    latest_revision: null,
    lines: {
      object: 'list' as const,
      data: [
        {
          id: `il_preview_${Date.now()}`,
          object: 'line_item' as const,
          amount: price.unit_amount,
          amount_excluding_tax: price.unit_amount,
          currency: price.currency,
          description: price.nickname || 'サブスクリプション',
          discount_amounts: [],
          discountable: true,
          discounts: [],
          invoice: null,
          livemode: false,
          metadata: {},
          period: {
            end: trialEnd + (price.recurring?.interval === 'year' ? 365 * 24 * 60 * 60 : 30 * 24 * 60 * 60),
            start: trialEnd,
          },
          plan: null,
          price: {
            id: price.id,
            object: 'price' as const,
            active: price.active,
            billing_scheme: price.billing_scheme,
            created: price.created,
            currency: price.currency,
            custom_unit_amount: null,
            livemode: price.livemode,
            lookup_key: price.lookup_key,
            metadata: price.metadata,
            nickname: price.nickname,
            product: price.product,
            recurring: price.recurring,
            tax_behavior: price.tax_behavior,
            tiers_mode: price.tiers_mode,
            transform_quantity: price.transform_quantity,
            type: price.type,
            unit_amount: price.unit_amount,
            unit_amount_decimal: price.unit_amount_decimal,
          },
          proration: false,
          proration_details: null,
          quantity: 1,
          subscription: subscriptionId,
          subscription_item: subscription.items.data[0]?.id,
          tax_amounts: [],
          tax_rates: [],
          type: 'subscription' as const,
          unit_amount_excluding_tax: price.unit_amount_decimal,
        },
      ],
      has_more: false,
      url: `/v1/invoices/preview/lines`,
    },
    livemode: false,
    metadata: {},
    next_payment_attempt: trialEnd,
    number: null,
    on_behalf_of: null,
    paid: false,
    paid_out_of_band: false,
    payment_intent: null,
    payment_settings: {
      default_mandate: null,
      payment_method_options: null,
      payment_method_types: null,
    },
    period_end: trialEnd,
    period_start: Math.floor(Date.now() / 1000),
    post_payment_credit_notes_amount: 0,
    pre_payment_credit_notes_amount: 0,
    quote: null,
    receipt_number: null,
    rendering: null,
    rendering_options: null,
    shipping_cost: null,
    shipping_details: null,
    starting_balance: 0,
    statement_descriptor: null,
    status: 'draft' as const,
    status_transitions: {
      finalized_at: null,
      marked_uncollectible_at: null,
      paid_at: null,
      voided_at: null,
    },
    subscription: subscriptionId,
    subscription_details: {
      metadata: {},
    },
    subscription_proration_date: null,
    subtotal: price.unit_amount,
    subtotal_excluding_tax: price.unit_amount,
    tax: 0,
    test_clock: null,
    total: price.unit_amount,
    total_discount_amounts: [],
    total_excluding_tax: price.unit_amount,
    total_tax_amounts: [],
    transfer_data: null,
    webhooks_delivered_at: null,
  };

  return manualPreview;
}

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

      // サブスクリプション状態をチェック
      if (subscription.status !== 'active' && subscription.status !== 'trialing') {
        throw new ConvexError({
          statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'tenant.subscription.getSubscriptionUpdatePreview',
          message: `サブスクリプションが無効な状態です: ${subscription.status}`,
          code: 'SUBSCRIPTION_INVALID_STATUS',
          status: 400,
          details: { 
            ...args, 
            current_status: subscription.status 
          },
        });
      }

      const items = [
        { id: subscription.items.data[0].id, price: args.new_price_id },
      ];

      // 更新後の請求書プレビュー取得（トライアル中は手動生成）
      let upcomingInvoice;
      let isManualPreview = false;
      
      if (subscription.status === 'trialing') {
        // トライアル中: 手動プレビュー生成
        try {
          upcomingInvoice = await createTrialPreview(
            stripe,
            args.new_price_id,
            args.stripe_customer_id,
            args.subscription_id
          );
          isManualPreview = true;
        } catch (error) {
          // 手動プレビュー生成のエラーは再スロー
          throw error;
        }
      } else {
        // アクティブなサブスクリプション: Stripe APIからプレビュー取得
        try {
          upcomingInvoice = await stripe.invoices.retrieveUpcoming({
            customer: args.stripe_customer_id,
            subscription: args.subscription_id,
            subscription_items: items,
            subscription_proration_date: prorationDate,
          });
        } catch (stripeError: unknown) {
          // Stripeの特定エラーをキャッチ
          const errorMessage = stripeError instanceof Error ? stripeError.message : '不明なStripeエラー';
          
          if (errorMessage.includes('No upcoming invoices')) {
            throw new ConvexError({
              statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
              severity: ERROR_SEVERITY.ERROR,
              callFunc: 'tenant.subscription.getSubscriptionUpdatePreview',
              message: 'このサブスクリプションには今後の請求書がありません。サブスクリプションの状態を確認してください。',
              code: 'NO_UPCOMING_INVOICE',
              status: 400,
              details: { 
                ...args, 
                subscription_status: subscription.status,
                stripe_error: errorMessage 
              },
            });
          }
          
          // その他のStripeエラーは再スロー
          throw stripeError;
        }
      }

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
        isManualPreview, // 手動プレビューかどうかのフラグ
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
  handler: async (_ctx, args) => {
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