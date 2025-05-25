
'use node';

import Stripe from 'stripe';
import { STRIPE_API_VERSION } from './constants';
import {
  StripeConnectRepository,
  StripeSubscriptionRepository,
  StripeWebhookRepository,
} from '@/services/stripe/repositories';
import { Id } from '@/convex/_generated/dataModel';
import { StripeResult } from '@/services/stripe/types';
import { SystemError } from '@/lib/errors/custom_errors';
import { ERROR_SEVERITY, ERROR_STATUS_CODE } from '@/lib/errors/constants';

/**
 * Stripeサービスクラス
 *
 * このクラスはStripe関連の操作を統合的に扱うサービス層です。
 * Connect APIとSubscription APIのリポジトリを内部で保持し、
 * 外部からのリクエストに対して適切なリポジトリメソッドを呼び出します。
 */
class StripeService {
  private static instance: StripeService | null = null;
  private stripe: Stripe;
  private connectRepo: StripeConnectRepository;
  private subscriptionRepo: StripeSubscriptionRepository;
  private webhookRepo: StripeWebhookRepository;

  private constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new SystemError(
        'Stripeの秘密鍵が設定されていません',
        {
          statusCode: ERROR_STATUS_CODE.UNAUTHORIZED,
          severity: ERROR_SEVERITY.WARNING,
          title: 'Stripeの秘密鍵が設定されていません',
          callFunc: 'StripeService.getInstance',
          details: {
            stripeSecretKey: process.env.STRIPE_SECRET_KEY,
          },
        },
        'STRIPE_ERROR - NOT_FOUND'
      );
    }

    // Stripeインスタンスの初期化
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: STRIPE_API_VERSION,
    });

    // リポジトリの初期化
    this.connectRepo = StripeConnectRepository.getInstance(this.stripe);
    this.subscriptionRepo = StripeSubscriptionRepository.getInstance(this.stripe);
    this.webhookRepo = StripeWebhookRepository.getInstance(this.stripe);
  }

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  // Connect API 関連メソッド

  /**
   * Webhookリクエストの署名を検証し、Stripe.Eventを返すヘルパーメソッド
   */
  public async processStripeWebhookRequest(
    req: Request,
    webhookSecret?: string
  ): Promise<{ event?: Stripe.Event; error?: string }> {
    const sig = req.headers.get('stripe-signature');
    if (!sig || !webhookSecret) {
      return {
        error: 'Stripeの署名が設定されていません',
      };
    }

    try {
      // 生のボディ文字列を取得（署名検証に使用）
      const body = await req.text();
      const event = await this.verifyWebhookSignature(body, sig, webhookSecret);
      return { event };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      return { error: `Webhook Error: ${errMsg}` };
    }
  }

  /**
   * Webhook署名を検証してイベントを構築
   */
  async verifyWebhookSignature(
    body: string,
    signature: string | null,
    webhookSecret: string | null
  ): Promise<Stripe.Event> {
    if (!signature || !webhookSecret) {
      if (process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
        console.warn('⚠️ 開発環境で署名検証をスキップします');
        return JSON.parse(body) as Stripe.Event;
      } else {
        throw new SystemError(
          'Webhook署名またはシークレットがありません',
          {
            statusCode: ERROR_STATUS_CODE.UNAUTHORIZED,
            severity: ERROR_SEVERITY.WARNING,
            title: 'Webhook署名またはシークレットがありません',
            callFunc: 'StripeService.verifyWebhookSignature',
            details: { signature, webhookSecret },
          },
          'STRIPE_ERROR - NOT_FOUND'
        )
      }
    }

    return this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
  }

  /**
   * Webhookイベントを処理
   */
  async handleConnectWebhookEvent(
    event: Stripe.Event
  ): Promise<{ success: boolean; message?: string }> {
    return await this.connectRepo.handleWebhookEvent(event);
  }

  /**
   * 手動でアカウントステータスを確認・更新
   */
  async checkAndUpdateAccountStatus(
    tenant_id: Id<'tenant'>,
    org_id: string,
    stripe_connect_id: string
  ): Promise<
    StripeResult<{
      status: string;
      details: {
        details_submitted: boolean;
        charges_enabled: boolean;
        payouts_enabled: boolean;
        requirements: {
          currently_due: any[];
          errors: any[];
        };
      };
    }>
  > {
    return await this.connectRepo.checkAndUpdateAccountStatus(tenant_id, org_id, stripe_connect_id);
  }

  /**
   * Stripeアカウント連携用のアカウントリンクを生成
   */
  async createConnectAccountLink(
    tenant_id: Id<'tenant'>,
    org_id: string
  ): Promise<StripeResult<{ account: Stripe.Account; accountLink: Stripe.AccountLink }>> {
    return await this.connectRepo.createConnectAccountLink(tenant_id, org_id);
  }

  /**
   * Stripe Expressダッシュボードへのログインリンクを生成
   */
  async createDashboardLoginLink(
    stripe_connect_id: string
  ): Promise<StripeResult<{ url: string; isOnboarding?: boolean }>> {
    return await this.connectRepo.createDashboardLoginLink(stripe_connect_id);
  }

  /**
   * Stripe Checkoutセッションを作成
   */
  async createCheckoutSession(params: {
    stripe_connect_id: string;
    tenant_id: Id<'tenant'>;
    org_id: string;
    reservation_id: Id<'reservation'>;
    line_items: Stripe.Checkout.SessionCreateParams.LineItem[];
    customer_email?: string;
    success_url: string;
    cancel_url: string;
    metadata?: Record<string, string>;
  }): Promise<StripeResult<{ sessionId: string; url: string | null }>> {
    return await this.connectRepo.createCheckoutSession(params);
  }

  // Subscription API 関連メソッド

  /**
   * サブスクリプションWebhookイベントを処理
   */
  async handleSubscriptionWebhookEvent(
    event: Stripe.Event
  ): Promise<{ success: boolean; message?: string }> {
    return await this.webhookRepo.handleWebhookEvent(event);
  }

  /**
   * サブスクリプション支払い失敗時の処理
   */
  async handlePaymentFailed(
    tenant_id: Id<'tenant'>,
    stripe_subscription_id: string,
    stripe_customer_id: string
  ): Promise<StripeResult<{ success: boolean }>> {
    return await this.webhookRepo.handlePaymentFailed(tenant_id, stripe_subscription_id, stripe_customer_id);
  }

  /**
   * サブスクリプションに割引を適用する
   * @param subscriptionId 割引を適用するサブスクリプションID
   * @param discountAmount 割引額（単位：円）
   * @returns 割引適用結果
   */
  async applyDiscount(
    tenant_id: Id<'tenant'>,
    stripe_subscription_id: string,
    discount_amount: number
  ): Promise<StripeResult<{ success: boolean }>> {
    return await this.subscriptionRepo.applyDiscount(stripe_subscription_id, discount_amount);
  }
}

// シングルトンインスタンスをエクスポート
export const stripeService = StripeService.getInstance();
