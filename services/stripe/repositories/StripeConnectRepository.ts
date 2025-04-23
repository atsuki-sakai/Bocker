import Stripe from 'stripe';
import { api } from '@/convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { Id } from '@/convex/_generated/dataModel';
import { StripeResult } from '@/services/stripe/types';
import { throwConvexError } from '@/lib/error';

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
   * Webhookイベントを処理
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<{ success: boolean; message?: string }> {
    try {
      switch (event.type) {
        case 'account.updated':
          return await this.handleAccountUpdatedEvent(event.data.object as Stripe.Account);

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
        error: this.handleError(error, 'アカウントステータスの確認に失敗しました'),
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
            statement_descriptor: 'BCKER PAYMENT',
          },
        },
        metadata: {
          salonId,
        },
      });

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
          errorMessage = this.handleError(error, 'ログインリンクの生成に失敗しました');
        }
      } else {
        errorMessage = this.handleError(error, 'Stripeのエラーが発生しました');
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
