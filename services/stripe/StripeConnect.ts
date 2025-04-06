import Stripe from 'stripe';
import { api } from '@/convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { STRIPE_API_VERSION } from '@/lib/constants';

// 共通の戻り値の型定義
type StripeResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export class StripeConnect {
  private stripe: Stripe;
  private convex: ConvexHttpClient;
  private isDevelopment: boolean;

  constructor() {
    // Stripeインスタンスの初期化
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: STRIPE_API_VERSION,
    });

    // Convexクライアントの初期化
    this.convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

    // 開発環境かどうか
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * 共通のエラーハンドリング処理
   */
  private handleError(error: unknown, operation: string): string {
    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
    console.error(`Error during ${operation}:`, error);
    return errorMessage;
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
   * Webhook署名を検証してイベントを構築
   */
  async verifyWebhookSignature(
    body: string,
    signature: string | null,
    webhookSecret: string | null
  ): Promise<Stripe.Event> {
    if (!signature || !webhookSecret) {
      if (this.isDevelopment) {
        console.warn('⚠️ 開発環境で署名検証をスキップします');
        return JSON.parse(body) as Stripe.Event;
      }
      throw new Error('Webhook署名またはシークレットがありません');
    }

    return this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
  }

  /**
   * アカウント更新イベントを処理
   */
  async handleAccountUpdatedEvent(account: Stripe.Account): Promise<{ success: boolean }> {
    const accountId = account.id;

    console.log(
      `Account ${accountId} updated. details_submitted: ${account.details_submitted}, charges_enabled: ${account.charges_enabled}, payouts_enabled: ${account.payouts_enabled}`
    );

    // アカウントIDからサロンを検索
    const salons = await this.convex.query(api.salon.stripe.findSalonByConnectId, {
      accountId: accountId,
    });

    if (!salons || salons.length === 0) {
      throw new Error(`No salon found for Connect account ${accountId}`);
    }

    const salon = salons[0]; // 最初のサロンを使用

    // ステータスを判定
    const status = this.determineAccountStatus(account);

    console.log(`Updating salon ${salon._id} Connect status to ${status}`);

    // ステータスを更新
    await this.convex.mutation(api.salon.stripe.updateConnectStatus, {
      salonId: salon._id,
      status,
    });

    return { success: true };
  }

  /**
   * Webhookイベントを処理
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<{ success: boolean; message?: string }> {
    console.log(`Processing Stripe event: ${event.type}`);

    try {
      switch (event.type) {
        case 'account.updated':
          return await this.handleAccountUpdatedEvent(event.data.object as Stripe.Account);

        // 今後他のイベントタイプの処理を追加
        default:
          return { success: true, message: `Unhandled event type: ${event.type}` };
      }
    } catch (error) {
      console.error(`Error processing ${event.type} event:`, error);
      throw error;
    }
  }

  /**
   * 手動でアカウントステータスを確認・更新
   */
  async checkAndUpdateAccountStatus(
    salonId: string,
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

      // 詳細なアカウント状態をログ出力
      console.log('Account details:', {
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: {
          currently_due: account.requirements?.currently_due,
          disabled_reason: account.requirements?.disabled_reason,
          errors: account.requirements?.errors,
        },
      });

      // ステータスを判定
      const status = this.determineAccountStatus(account);

      // Convexにステータスを保存
      await this.convex.mutation(api.salon.stripe.updateConnectStatus, {
        salonId,
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
        error: this.handleError(error, 'checking account status'),
      };
    }
  }

  /**
   * Stripeアカウント連携用のアカウントリンクを生成
   */
  async createConnectAccountLink(
    salonId: string
  ): Promise<StripeResult<{ account: Stripe.Account; accountLink: Stripe.AccountLink }>> {
    try {
      console.log(`Creating Connect account for salon: ${salonId}`);

      // 既存のアカウントを検索
      const existingAccount = await this.convex.query(api.salon.stripe.getConnectAccountDetails, {
        salonId,
      });

      // 既存のアカウントがあれば削除
      if (existingAccount && existingAccount.accountId) {
        console.log(
          `Found existing account ${existingAccount.accountId} for salon ${salonId}, deleting...`
        );
        try {
          // Stripeアカウントを削除
          await this.stripe.accounts.del(existingAccount.accountId);
          console.log(`Deleted Stripe Connect account: ${existingAccount.accountId}`);
          console.log(`Removed Connect account from database for salon: ${salonId}`);
        } catch (deleteError) {
          console.error(
            `Error deleting Connect account ${existingAccount.accountId}:`,
            deleteError
          );
          // 削除に失敗しても続行する（新しいアカウントの作成を試みる）
        }
      }

      // Stripe Connect アカウントを作成
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
            statement_descriptor: 'BCKER PAYMENT',
          },
        },
        metadata: {
          salonId,
        },
      });

      console.log(`Created Connect account: ${account.id}`);

      // Convexに接続情報を保存
      await this.convex.mutation(api.salon.stripe.createConnectAccount, {
        salonId,
        accountId: account.id,
        status: 'pending',
        createdAt: new Date().toISOString(),
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
        error: this.handleError(error, 'creating Connect account'),
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

      console.log(
        `Account ${accountId} onboarding status: ${isOnboardingComplete ? 'completed' : 'incomplete'}`
      );

      if (!isOnboardingComplete) {
        // オンボーディングが完了していない場合、アカウントリンク（オンボーディング用）を生成
        const accountLink = await this.stripe.accountLinks.create({
          account: accountId,
          refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard/setting?refresh=true`,
          return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard/setting?success=true`,
          type: 'account_onboarding',
        });

        console.log('Onboarding link generated for incomplete account');

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
      console.log('Login link generated successfully');

      return { success: true, data: { url: loginLink.url, isOnboarding: false } };
    } catch (error) {
      let errorMessage: string;

      if (error instanceof Stripe.errors.StripeError) {
        if (error.code === 'account_invalid') {
          errorMessage = 'このアカウントは現在利用できません。Stripeの設定を完了してください。';
        } else {
          errorMessage = this.handleError(error, 'generating login link');
        }
      } else {
        errorMessage = this.handleError(error, 'generating login link');
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

// シングルトンインスタンス
export const stripeConnect = new StripeConnect();
