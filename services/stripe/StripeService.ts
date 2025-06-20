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
import { getEnv } from '@/lib/env-config'

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
    if (!getEnv('STRIPE_SECRET_KEY')) {
      throw new SystemError(
        'Stripeの秘密鍵が設定されていません',
        {
          statusCode: ERROR_STATUS_CODE.UNAUTHORIZED,
          severity: ERROR_SEVERITY.WARNING,
          title: 'Stripeの秘密鍵が設定されていません',
          callFunc: 'StripeService.getInstance',
          details: {
            stripeSecretKey: getEnv('STRIPE_SECRET_KEY'),
          },
        },
        'STRIPE_ERROR - NOT_FOUND'
      );
    }

    // Stripeインスタンスの初期化
    this.stripe = new Stripe(getEnv('STRIPE_SECRET_KEY'), {
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
   * @param stripe_account_id - Stripe Connect アカウントID
   * @returns アカウントステータスと詳細情報
   * @throws SystemError Stripe APIエラーの場合
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
   * @param tenant_id - テナントID
   * @param org_id - 組織ID
   * @returns Stripeアカウントとアカウントリンク
   * @throws SystemError アカウント作成に失敗した場合
   */
  async createConnectAccountLink(
    tenant_id: Id<'tenant'>,
    org_id: Id<'organization'>
  ): Promise<StripeResult<{ account: Stripe.Account; accountLink: Stripe.AccountLink }>> {
    return await this.connectRepo.createConnectAccountLink(tenant_id, org_id);
  }

  /**
   * Stripe決済の返金を作成
   * @param params - 返金パラメータ
   * @returns 返金結果
   * @throws SystemError Stripe APIエラーの場合
   */
  async createRefund(params: {
    checkoutSessionId?: string; // Checkout Session IDから返金する場合
    payment_intent_id?: string; // Payment Intent IDから直接返金する場合
    amount?: number; // 部分返金の場合は金額を指定
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    metadata?: Record<string, string>;
  }): Promise<StripeResult<Stripe.Refund>> {
    try {
      let paymentIntentId = params.payment_intent_id;

      // Checkout Session IDが提供された場合、Payment Intent IDを取得
      if (params.checkoutSessionId && !paymentIntentId) {
        const session = await this.stripe.checkout.sessions.retrieve(params.checkoutSessionId);
        if (!session.payment_intent || typeof session.payment_intent !== 'string') {
          return {
            success: false,
            error: 'Payment Intent not found in Checkout Session',
          };
        }
        paymentIntentId = session.payment_intent;
      }

      if (!paymentIntentId) {
        return {
          success: false,
          error: 'Either checkoutSessionId or payment_intent_id must be provided',
        };
      }

      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: params.amount,
        reason: params.reason || 'requested_by_customer',
        metadata: params.metadata,
      });

      return {
        success: true,
        data: refund,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Stripe refund creation failed:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Stripe Expressダッシュボードへのログインリンクを生成
   * @param stripe_account_id - Stripe Connect アカウントID
   * @returns ダッシュボードURL（オンボーディング中の場合はisOnboarding: true）
   * @throws SystemError リンク生成に失敗した場合
   */
  async createConnectAccountDashboardLink(
    stripe_account_id: string
  ): Promise<StripeResult<{ url: string; isOnboarding?: boolean }>> {
    return await this.connectRepo.createConnectAccountDashboardLink(stripe_account_id);
  }

  /**
   * Stripe Checkoutセッションを作成
   * @param params - チェックアウトセッション作成パラメータ
   * @param params.stripe_account_id - Stripe Connect アカウントID
   * @param params.tenant_id - テナントID
   * @param params.org_id - 組織ID
   * @param params.reservation_id - 予約ID
   * @param params.line_items - 購入アイテムリスト
   * @param params.customer_email - 顧客のメールアドレス（オプション）
   * @param params.success_url - 決済成功時のリダイレクトURL
   * @param params.cancel_url - 決済キャンセル時のリダイレクトURL
   * @param params.metadata - カスタムメタデータ（オプション）
   * @returns チェックアウトセッションIDとURL
   * @throws SystemError セッション作成に失敗した場合
   */
  async createCheckoutSession(params: {
    stripe_account_id: string;
    tenant_id: Id<'tenant'>;
    org_id: Id<'organization'>;
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
