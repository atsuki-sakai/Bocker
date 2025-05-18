/**
 * サブスクリプションサービス
 *
 * このモジュールはサブスクリプション関連のビジネスロジックを実装します。
 * Stripeとの連携や、サロンとサブスクリプションの整合性維持などを担当します。
 */

import { MutationCtx, QueryCtx, ActionCtx } from '@/convex/_generated/server';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { SubscriptionRepository } from '@/services/convex/repositories/subscription';
import { SalonRepository } from '@/services/convex/repositories/salon';
import {
  SubscriptionSyncInput,
  SubscriptionPaymentFailedInput,
  SubscriptionSessionInput,
  SubscriptionUpdatePreviewInput,
  SubscriptionConfirmSubscriptionUpdateInput,
  SubscriptionBillingPortalSessionInput,
} from '@/services/convex/types/subscription';
import { throwConvexError } from '@/lib/error';
import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/lib/constants';
import { BillingPeriod } from '@/services/convex/shared/types/common';

/**
 * サブスクリプションサービスクラス
 * サブスクリプション関連の処理を実装します
 */
class SubscriptionService {
  private static instance: SubscriptionService | null = null;

  private constructor(
    private subscriptionRepo: SubscriptionRepository,
    private salonRepo: SalonRepository
  ) {}

  public static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService(
        SubscriptionRepository.getInstance(),
        SalonRepository.getInstance()
      );
    }
    return SubscriptionService.instance;
  }

  /**
   * サブスクリプションの同期
   */
  async syncSubscription(
    ctx: MutationCtx,
    data: SubscriptionSyncInput
  ): Promise<Id<'subscription'>> {
    try {
      // サブスクリプションを同期
      const subscriptionResult = await this.subscriptionRepo.syncSubscription(ctx, data);

      // 関連するサロンを検索して更新
      const existingSalon = await this.salonRepo.findByStripeCustomerId(ctx, data.stripeCustomerId);
      if (existingSalon) {
        // サロンのサブスクリプション情報も更新
        await ctx.db.patch(existingSalon._id, {
          subscriptionId: data.subscriptionId,
          subscriptionStatus: data.status,
          priceId: data.priceId,
          planName: data.planName,
          billingPeriod: data.billingPeriod,
        });
      }

      return subscriptionResult;
    } catch (error) {
      throw throwConvexError({
        message: 'サブスクリプションの同期中にエラーが発生しました',
        status: 500,
        code: 'INTERNAL_ERROR',
        title: 'サブスクリプションの同期中にエラーが発生しました',
        callFunc: 'SubscriptionService.syncSubscription',
        severity: 'low',
        details: { ...data },
      });
    }
  }

  async findByStripeCustomerId(
    ctx: QueryCtx,
    stripeCustomerId: string,
    includeArchive: boolean = false
  ): Promise<Doc<'subscription'> | null> {
    return await this.subscriptionRepo.findByStripeCustomerId(
      ctx,
      stripeCustomerId,
      includeArchive
    );
  }

  /**
   * 支払い失敗時の処理
   */
  async paymentFailed(
    ctx: MutationCtx,
    data: SubscriptionPaymentFailedInput
  ): Promise<Id<'subscription'> | null> {
    try {
      // サブスクリプションの状態を更新
      const subscriptionResult = await this.subscriptionRepo.handlePaymentFailed(ctx, data);

      // 関連するサロンも更新
      const salon = await this.salonRepo.findByStripeCustomerId(ctx, data.stripeCustomerId);

      if (salon) {
        await ctx.db.patch(salon._id, {
          subscriptionStatus: 'payment_failed',
        });
      }

      return subscriptionResult;
    } catch (error) {
      throw throwConvexError({
        message: '支払い失敗の処理中にエラーが発生しました',
        status: 500,
        code: 'INTERNAL_ERROR',
        title: '支払い失敗の処理中にエラーが発生しました',
        callFunc: 'SubscriptionService.paymentFailed',
        severity: 'low',
        details: { ...data },
      });
    }
  }

  /**
   * サブスクリプションが有効かどうかチェック
   */
  async isSubscribed(
    ctx: QueryCtx,
    salonId: Id<'salon'>,
    includeArchive: boolean = false
  ): Promise<boolean> {
    try {
      return await this.subscriptionRepo.isSubscribed(ctx, salonId);
    } catch (error) {
      throw throwConvexError({
        message: 'サブスクリプション状態の確認中にエラーが発生しました',
        status: 500,
        code: 'INTERNAL_ERROR',
        title: 'サブスクリプション状態の確認中にエラーが発生しました',
        callFunc: 'SubscriptionService.isSubscribed',
        severity: 'low',
        details: { salonId, error: error instanceof Error ? error.message : '不明なエラー' },
      });
    }
  }

  /**
   * Stripeセッションの作成
   */
  async createSubscriptionSession(
    ctx: ActionCtx,
    data: SubscriptionSessionInput
  ): Promise<{ checkoutUrl: string | null }> {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw throwConvexError({
          message: 'Stripeの秘密鍵が設定されていません',
          status: 400,
          code: 'INVALID_ARGUMENT',
          title: 'Stripeの秘密鍵が設定されていません',
          callFunc: 'SubscriptionService.createSubscriptionSession',
          severity: 'low',
          details: { ...data },
        });
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: STRIPE_API_VERSION,
      });

      if (data.trialDays && (data.trialDays < 0 || data.trialDays > 31)) {
        throw throwConvexError({
          message: '試用期間は0以上31日以内で入力してください',
          status: 400,
          code: 'INVALID_ARGUMENT',
          title: '試用期間は0以上31日以内で入力してください',
          callFunc: 'SubscriptionService.createSubscriptionSession',
          severity: 'low',
          details: { trialDays: data.trialDays },
        });
      }

      // 環境変数が設定されていない場合のデフォルト値を追加
      const baseUrl =
        process.env.NEXT_PUBLIC_NODE_ENV === 'development'
          ? process.env.NEXT_PUBLIC_DEVELOP_URL || 'http://localhost:3000'
          : process.env.NEXT_PUBLIC_DEPLOY_URL || 'https://bocker.jp'

      const successUrl = `${baseUrl}/dashboard/subscription/success`;
      const cancelUrl = `${baseUrl}/dashboard/subscription/cancel`;

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer: data.stripeCustomerId,
        line_items: [{ price: data.priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: false,
        client_reference_id: data.clerkUserId,
        metadata: {
          clerkUserId: data.clerkUserId,
        },
        ...(data.trialDays ? { subscription_data: { trial_period_days: data.trialDays } } : {}),
      });

      return { checkoutUrl: session.url };
    } catch (error) {
      throw throwConvexError({
        message: 'サブスクリプションセッションの作成中にエラーが発生しました',
        status: 500,
        code: 'INTERNAL_ERROR',
        title: 'サブスクリプションセッションの作成中にエラーが発生しました',
        callFunc: 'SubscriptionService.createSubscriptionSession',
        severity: 'low',
        details: {
          data: { ...data, error: error instanceof Error ? error.message : '不明なエラー' },
        },
      });
    }
  }

  /**
   * Billing Portalのセッションを作成
   */
  async createBillingPortalSession(
    ctx: ActionCtx,
    data: SubscriptionBillingPortalSessionInput
  ): Promise<{ portalUrl: string | null }> {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw throwConvexError({
          message: 'Stripeの秘密鍵が設定されていません',
          status: 400,
          code: 'INVALID_ARGUMENT',
          title: 'Stripeの秘密鍵が設定されていません',
          callFunc: 'SubscriptionService.createBillingPortalSession',
          severity: 'low',
          details: { ...data },
        });
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: STRIPE_API_VERSION,
      });
      const session = await stripe.billingPortal.sessions.create({
        customer: data.stripeCustomerId,
        return_url: data.returnUrl,
      });
      return { portalUrl: session.url };
    } catch (error) {
      throw throwConvexError({
        message: 'Billing Portalのセッションの作成中にエラーが発生しました',
        status: 500,
        code: 'INTERNAL_ERROR',
        title: 'Billing Portalのセッションの作成中にエラーが発生しました',
        callFunc: 'SubscriptionService.createBillingPortalSession',
        severity: 'low',
        details: {
          data: { ...data, error: error instanceof Error ? error.message : '不明なエラー' },
        },
      });
    }
  }

  /**
   * サブスクリプション変更のプレビュー取得
   */
  async getSubscriptionUpdatePreview(ctx: ActionCtx, data: SubscriptionUpdatePreviewInput) {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw throwConvexError({
          message: 'Stripeの秘密鍵が設定されていません',
          status: 400,
          code: 'INVALID_ARGUMENT',
          title: 'Stripeの秘密鍵が設定されていません',
          callFunc: 'SubscriptionService.getSubscriptionUpdatePreview',
          severity: 'low',
          details: { ...data },
        });
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: STRIPE_API_VERSION,
      });

      // プロラーション日を取得
      const prorationDate = Math.floor(Date.now() / 1000);
      const subscription = await stripe.subscriptions.retrieve(data.subscriptionId);
      const items = [
        {
          id: subscription.items.data[0].id,
          price: data.newPriceId,
        },
      ];

      if (!subscription) {
        throw throwConvexError({
          message: 'サブスクリプションの取得に失敗しました',
          status: 400,
          code: 'INVALID_ARGUMENT',
          title: 'サブスクリプションの取得に失敗しました',
          callFunc: 'SubscriptionService.getSubscriptionUpdatePreview',
          severity: 'low',
          details: { ...data },
        });
      }

      // 更新前に請求書プレビューのみを取得
      const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        customer: data.customerId,
        subscription: data.subscriptionId,
        subscription_items: items,
        subscription_proration_date: prorationDate,
      });

      if (!upcomingInvoice) {
        throw throwConvexError({
          message: '請求書プレビューの取得に失敗しました',
          status: 400,
          code: 'INVALID_ARGUMENT',
          title: '請求書プレビューの取得に失敗しました',
          callFunc: 'SubscriptionService.getSubscriptionUpdatePreview',
          severity: 'low',
          details: { ...data },
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
      throw throwConvexError({
        message: 'サブスクリプション更新プレビューの取得中にエラーが発生しました',
        status: 500,
        code: 'INTERNAL_ERROR',
        title: 'サブスクリプション更新プレビューの取得中にエラーが発生しました',
        callFunc: 'SubscriptionService.getSubscriptionUpdatePreview',
        severity: 'low',
        details: { ...data },
      });
    }
  }

  /**
   * サブスクリプション変更の確定
   */
  async confirmSubscriptionUpdate(
    ctx: ActionCtx,
    data: SubscriptionConfirmSubscriptionUpdateInput
  ) {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw throwConvexError({
          message: 'Stripeの秘密鍵が設定されていません',
          status: 400,
          code: 'INVALID_ARGUMENT',
          title: 'Stripeの秘密鍵が設定されていません',
          callFunc: 'SubscriptionService.confirmSubscriptionUpdate',
          severity: 'low',
          details: { ...data },
        });
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: STRIPE_API_VERSION,
      });

      // ユーザーが確認した後、実際にサブスクリプションを更新
      const updatedSubscription = await stripe.subscriptions.update(data.subscriptionId, {
        items: data.items,
        proration_date: data.prorationDate,
      });

      const intervalMapping: Record<string, BillingPeriod> = {
        month: 'monthly',
        year: 'yearly',
      };

      let billingPeriod: BillingPeriod = 'monthly';

      if (
        updatedSubscription.items.data &&
        updatedSubscription.items.data[0] &&
        updatedSubscription.items.data[0].plan &&
        updatedSubscription.items.data[0].plan.interval
      ) {
        const interval = updatedSubscription.items.data[0].plan.interval;
        billingPeriod = intervalMapping[interval] || 'monthly';
      }

      return {
        success: true,
        subscription: updatedSubscription,
        billingPeriod,
      };
    } catch (error) {
      throw throwConvexError({
        message: 'サブスクリプション更新の確定中にエラーが発生しました',
        status: 500,
        code: 'INTERNAL_ERROR',
        title: 'サブスクリプション更新の確定中にエラーが発生しました',
        callFunc: 'SubscriptionService.confirmSubscriptionUpdate',
        severity: 'low',
        details: { ...data },
      });
    }
  }

  async getStripeCustomer(ctx: ActionCtx, stripeCustomerId: string) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: STRIPE_API_VERSION,
      });
      const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);
      if (!stripeCustomer) {
        throw throwConvexError({
          message: 'Stripe顧客の取得に失敗しました',
          status: 400,
          code: 'INVALID_ARGUMENT',
          title: 'Stripe顧客の取得に失敗しました',
          callFunc: 'SubscriptionService.getStripeCustomer',
          severity: 'low',
          details: { stripeCustomerId },
        });
      }

      return stripeCustomer;
    } catch (error) {
      throw throwConvexError({
        message: 'Stripe顧客の取得中にエラーが発生しました',
        status: 500,
        code: 'INTERNAL_ERROR',
        title: 'Stripe顧客の取得中にエラーが発生しました',
        callFunc: 'SubscriptionService.getStripeCustomer',
        severity: 'low',
        details: {
          stripeCustomerId,
          error: error instanceof Error ? error.message : '不明なエラー',
        },
      });
    }
  }
}

export default SubscriptionService;
