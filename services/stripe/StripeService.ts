import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/lib/constants';
import { StripeError } from '@/services/convex/shared/utils/error';
import {
  StripeConnectRepository,
  StripeSubscriptionRepository,
} from '@/services/stripe/repositories';
import { Id } from '@/convex/_generated/dataModel';
import { StripeResult } from '@/services/stripe/types';

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
      throw new StripeError('high', 'Stripeの秘密鍵が設定されていません', 'NOT_FOUND', 404, {
        stripeSecretKey: process.env.STRIPE_SECRET_KEY,
      });
    }

    // Stripeインスタンスの初期化
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: STRIPE_API_VERSION,
    });

    // リポジトリの初期化
    this.connectRepo = StripeConnectRepository.getInstance(this.stripe);
    this.subscriptionRepo = StripeSubscriptionRepository.getInstance(this.stripe);
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
        throw new StripeError(
          'high',
          'Webhook署名またはシークレットがありません',
          'NOT_FOUND',
          404,
          {
            signature,
            webhookSecret,
          }
        );
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
    salonId: Id<'salon'>,
    accountId: string
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
    return await this.connectRepo.checkAndUpdateAccountStatus(salonId, accountId);
  }

  /**
   * Stripeアカウント連携用のアカウントリンクを生成
   */
  async createConnectAccountLink(
    salonId: Id<'salon'>
  ): Promise<StripeResult<{ account: Stripe.Account; accountLink: Stripe.AccountLink }>> {
    return await this.connectRepo.createConnectAccountLink(salonId);
  }

  /**
   * Stripe Expressダッシュボードへのログインリンクを生成
   */
  async createDashboardLoginLink(
    accountId: string
  ): Promise<StripeResult<{ url: string; isOnboarding?: boolean }>> {
    return await this.connectRepo.createDashboardLoginLink(accountId);
  }

  // Subscription API 関連メソッド

  /**
   * サブスクリプションWebhookイベントを処理
   */
  async handleSubscriptionWebhookEvent(
    event: Stripe.Event
  ): Promise<{ success: boolean; message?: string }> {
    return await this.subscriptionRepo.handleWebhookEvent(event);
  }

  /**
   * サブスクリプション支払い失敗時の処理
   */
  async handlePaymentFailed(
    subscriptionId: string,
    stripeCustomerId: string
  ): Promise<StripeResult<{ success: boolean }>> {
    return await this.subscriptionRepo.handlePaymentFailed(subscriptionId, stripeCustomerId);
  }
}

// シングルトンインスタンスをエクスポート
export const stripeService = StripeService.getInstance();
