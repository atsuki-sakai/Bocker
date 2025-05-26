'use node';

import Stripe from 'stripe';
import { STRIPE_API_VERSION } from './constants';
import {
  StripeConnectRepository,
  StripeSubscriptionRepository,
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

    // リポジトリの初期化（依存性注入パターン）
    this.connectRepo = StripeConnectRepository.getInstance(this.stripe);
    this.subscriptionRepo = new StripeSubscriptionRepository(this.stripe);
  }

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  /**
   * 手動でアカウントステータスを確認・更新
   */
  async checkAndUpdateConnectAccountStatus(
    stripe_account_id: string
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
    return await this.connectRepo.checkAndUpdateConnectAccountStatus(stripe_account_id);
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
  async createConnectAccountDashboardLink(
    stripe_account_id: string
  ): Promise<StripeResult<{ url: string; isOnboarding?: boolean }>> {
    return await this.connectRepo.createConnectAccountDashboardLink(stripe_account_id);
  }

  /**
   * Stripe Checkoutセッションを作成
   */
  async createCheckoutSession(params: {
    stripe_account_id: string;
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

  /**
   * サブスクリプションに割引を適用する
   * @param subscriptionId 割引を適用するサブスクリプションID
   * @param discountAmount 割引額（単位：円）
   * @returns 割引適用結果
   */
  async applyDiscount(
    stripe_subscription_id: string,
    discount_amount: number
  ): Promise<StripeResult<{ verificationResult: { before: number; after: number; discountApplied: boolean; couponId: string } }>> {
    return await this.subscriptionRepo.applyDiscount(stripe_subscription_id, discount_amount);
  }

}

// シングルトンインスタンスをエクスポート
export const stripeService = StripeService.getInstance();
