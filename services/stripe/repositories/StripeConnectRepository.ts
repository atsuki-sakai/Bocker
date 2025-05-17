'use node';
import Stripe from 'stripe';
import { api } from '@/convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { Id } from '@/convex/_generated/dataModel';
import { StripeResult } from '@/services/stripe/types';
import { throwConvexError, handleErrorToMsg } from '@/lib/error';
import { Doc } from '@/convex/_generated/dataModel';

/**
 * Stripe Connect APIを扱うリポジトリクラス
 */
export class StripeConnectRepository {
  private static instance: StripeConnectRepository | null = null;
  private convex: ConvexHttpClient;
  private isDevelopment: boolean;

  private constructor(private stripe: Stripe) {
    // Convexクライアントの初期化
    this.convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

    // 開発環境かどうか
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  public static getInstance(stripe: Stripe): StripeConnectRepository {
    if (!StripeConnectRepository.instance) {
      StripeConnectRepository.instance = new StripeConnectRepository(stripe);
    }
    return StripeConnectRepository.instance;
  }
  /**
   * アカウントのステータスを判定するためのヘルパーメソッド
   */
  private determineAccountStatus(account: Stripe.Account): string {
    if (account.details_submitted) {
      if (account.charges_enabled && account.payouts_enabled) {
        return 'active';
      } else if (account.charges_enabled) {
        return 'restricted';
      } else {
        return 'incomplete';
      }
    } else {
      return 'pending';
    }
  }

  /**
   * アカウント更新イベントを処理
   */
  async handleAccountUpdatedEvent(account: Stripe.Account): Promise<{ success: boolean }> {
    const accountId = account.id;

    // アカウントIDからサロンを検索
    const salons = await this.convex.query(api.salon.core.query.findSalonByConnectId, {
      accountId: accountId,
    });

    if (!salons || salons.length === 0) {
      throw new Error(`No salon found for Connect account ${accountId}`);
    }

    const salon = salons[0]; // 最初のサロンを使用

    // ステータスを判定
    const status = this.determineAccountStatus(account);

    // ステータスを更新
    await this.convex.mutation(api.salon.core.mutation.updateConnectStatus, {
      salonId: salon._id,
      accountId: accountId,
      status,
    });

    return { success: true };
  }

  /**
   * checkout.session.completed イベントを処理
   */
  async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<{ success: boolean }> {
    try {
      const reservationId = session.client_reference_id as Id<'reservation'> | undefined;
      const stripeConnectId = session.metadata?.stripeConnectId as string | undefined;
      const salonId = session.metadata?.salonId as Id<'salon'> | undefined;

      if (!reservationId || !stripeConnectId || !salonId) {
        console.error('必要なメタデータが不足しています。', { reservationId, stripeConnectId, salonId });
        // 失敗として扱うが、エラーは投げずにStripeに200を返すことで再試行を防ぐ
        return { success: false };
      }
      
      // ここでConvexのミューテーションを呼び出し、予約ステータスを更新する
      // 例: reservation.paymentCompleted
      await this.convex.mutation(api.reservation.mutation.updateReservationPaymentStatus, {
        reservationId,
        paymentStatus: 'paid', // 仮のステータス。スキーマに合わせてください。
        stripeCheckoutSessionId: session.id,
      });

      return { success: true };
    } catch (error) {
      console.error('checkout.session.completedの処理中にエラー:', error);
      // 失敗として扱うが、エラーは投げずにStripeに200を返すことで再試行を防ぐ
      return { success: false };
    }
  }

  /**
   * Webhookイベントを処理
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<{ success: boolean; message?: string }> {
    try {
      switch (event.type) {
        case 'account.updated':
          return await this.handleAccountUpdatedEvent(event.data.object as Stripe.Account);
        case 'checkout.session.completed':
          return await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        default:
          return { success: true, message: `未処理のイベントタイプ: ${event.type}` };
      }
    } catch (error) {
      throw throwConvexError({
        message: 'Webhookイベントの処理に失敗しました',
        status: 500,
        code: 'INTERNAL_ERROR',
        title: 'Webhookイベントの処理に失敗しました',
        callFunc: 'StripeConnectRepository.handleWebhookEvent',
        severity: 'low',
        details: { event, error: error instanceof Error ? error.message : '不明なエラー' },
      });
    }
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
    try {
      // Stripeからアカウント情報を取得
      const account = await this.stripe.accounts.retrieve(accountId);

      // ステータスを判定
      const status = this.determineAccountStatus(account);

      // Convexにステータスを保存
      await this.convex.mutation(api.salon.core.mutation.updateConnectStatus, {
        salonId,
        accountId,
        status,
      });

      return {
        success: true,
        data: {
          status,
          details: {
            details_submitted: account.details_submitted,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            requirements: {
              currently_due: account.requirements?.currently_due || [],
              errors: account.requirements?.errors || [],
            },
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: handleErrorToMsg(error),
      };
    }
  }

  /**
   * Stripeアカウント連携用のアカウントリンクを生成
   */
  async createConnectAccountLink(
    salonId: Id<'salon'>
  ): Promise<StripeResult<{ account: Stripe.Account; accountLink: Stripe.AccountLink }>> {
    try {
      // 既存のアカウントを検索
      const existingAccount = await this.convex.query(
        api.salon.core.query.getConnectAccountDetails,
        {
          salonId,
        }
      );

      // 既存のアカウントがあれば削除
      if (existingAccount && existingAccount.accountId) {
        try {
          // Stripeアカウントを削除
          await this.stripe.accounts.del(existingAccount.accountId);
        } catch (deleteError) {
          //削除に失敗しても続行する
        }
      }

      // Stripe Connect アカウントを作成/
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: 'JP',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          mcc: '7230', // Beauty salon & barber shops
          url: `${process.env.NEXT_PUBLIC_DEVELOP_URL || 'http://localhost:3000'}`,
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'monthly',
              monthly_anchor: 25,
            },
            statement_descriptor: 'BOCKER PAYMENT',
          },
        },
        metadata: {
          salonId,
        },
      })

      // Convexに接続情報を保存
      await this.convex.mutation(api.salon.core.mutation.createConnectAccount, {
        salonId,
        accountId: account.id,
        status: 'pending',
      });

      // アカウント連携用のリンクを生成
      const accountLink = await this.stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.NEXT_PUBLIC_DEPLOY_URL || 'http://localhost:3000'}/dashboard/setting?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_DEPLOY_URL || 'http://localhost:3000'}/dashboard/setting?success=true`,
        type: 'account_onboarding',
      });

      return { success: true, data: { account, accountLink } };
    } catch (error) {
      return {
        success: false,
        error: handleErrorToMsg(error),
      };
    }
  }

  /**
   * Stripe Expressダッシュボードへのログインリンクを生成
   */
  async createDashboardLoginLink(
    accountId: string
  ): Promise<StripeResult<{ url: string; isOnboarding?: boolean }>> {
    try {
      // アカウントの詳細情報を取得して状態を確認
      const account = await this.stripe.accounts.retrieve(accountId);

      // オンボーディングが完了しているかを確認
      const isOnboardingComplete = account.details_submitted;

      if (!isOnboardingComplete) {
        // オンボーディングが完了していない場合、アカウントリンク（オンボーディング用）を生成
        const accountLink = await this.stripe.accountLinks.create({
          account: accountId,
          refresh_url: `${process.env.NEXT_PUBLIC_DEPLOY_URL || 'http://localhost:3000'}/dashboard/setting?refresh=true`,
          return_url: `${process.env.NEXT_PUBLIC_DEPLOY_URL || 'http://localhost:3000'}/dashboard/setting?success=true`,
          type: 'account_onboarding',
        });

        return {
          success: true,
          data: {
            url: accountLink.url,
            isOnboarding: true,
          },
        };
      }

      // オンボーディングが完了している場合は、ダッシュボードログインリンクを生成
      const loginLink = await this.stripe.accounts.createLoginLink(accountId);
      return { success: true, data: { url: loginLink.url, isOnboarding: false } };
    } catch (error) {
      let errorMessage: string;

      if (error instanceof Stripe.errors.StripeError) {
        if (error.code === 'account_invalid') {
          errorMessage = 'このアカウントは現在利用できません。Stripeの設定を完了してください。';
        } else {
          errorMessage = handleErrorToMsg(error);
        }
      } else {
        errorMessage = handleErrorToMsg(error);
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Stripe Checkoutセッションを作成
   */
  async createCheckoutSession(params: {
    stripeConnectId: string; // 支払いを受け取るStripe ConnectアカウントID
    salonId: Id<'salon'>;
    reservationId: Id<'reservation'>;
    lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<StripeResult<{ sessionId: string; url: string | null }>> {
    const {
      stripeConnectId,
      salonId,
      reservationId,
      lineItems,
      customerEmail,
      successUrl,
      cancelUrl,
      metadata,
    } = params;

    try {
      const sessionCreateParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: customerEmail,
        client_reference_id: reservationId,
        payment_intent_data: {
          application_fee_amount: Math.floor(lineItems.reduce((sum, item) => sum + (item.price_data?.unit_amount_decimal ? parseFloat(item.price_data.unit_amount_decimal) : item.price_data?.unit_amount || 0),0) * 0.04) + 40,
          transfer_data: {
            destination: stripeConnectId,
          },
        },
        metadata: {
          ...metadata,
          reservationId: reservationId,
          stripeConnectId: stripeConnectId,
          salonId: salonId,
        },
      };
      
      const session = await this.stripe.checkout.sessions.create(sessionCreateParams);

      if (!session.url) {
        throw new Error('CheckoutセッションURLが取得できませんでした。');
      }

      return {
        success: true,
        data: { sessionId: session.id, url: session.url },
      };
    } catch (error) {
      return {
        success: false,
        error: handleErrorToMsg(error),
      };
    }
  }
}
