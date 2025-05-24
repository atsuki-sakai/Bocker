'use node';
import Stripe from 'stripe';
import { api } from '@/convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { Id } from '@/convex/_generated/dataModel';
import { StripeResult } from '@/services/stripe/types';
import { SystemError } from '@/lib/errors/custom_errors';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { BASE_URL } from '@/lib/constants';

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

    // Stripe ConnectアカウントIDから組織を検索
    const organization = await this.convex.query(api.organization.query.findOrganizationByStripeConnectId, {
      stripe_connect_id: accountId,
    });

    if (!organization) {
      throw new SystemError(
        '組織が見つかりません',
        {
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'StripeConnectRepository.handleAccountUpdatedEvent',
        message: '組織が見つかりません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          stripe_connect_id: accountId,
        },
      });
    }

    // ステータスを判定
    const status = this.determineAccountStatus(account);

    // ステータスを更新
    await this.convex.mutation(api.organization.mutation.updateConnectStatus, {
      tenant_id: organization.tenant_id,
      org_id: organization.org_id,
      stripe_connect_id: accountId,
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
      const orgId = session.metadata?.orgId as string | undefined;

      if (!reservationId || !stripeConnectId || !orgId) {
        console.error('必要なメタデータが不足しています。', { reservationId, stripeConnectId, orgId });
        // 失敗として扱うが、エラーは投げずにStripeに200を返すことで再試行を防ぐ
        return { success: false };
      }
      
      // ここでConvexのミューテーションを呼び出し、予約ステータスを更新する
      // 例: reservation.paymentCompleted
      await this.convex.mutation(api.reservation.mutation.updateReservationPaymentStatus, {
        reservation_id: reservationId,
        payment_status: 'paid', // 仮のステータス。スキーマに合わせてください。
        stripe_checkout_session_id: session.id,
      });

      return { success: true };
    } catch (error) {
      console.error('checkout.session.completedの処理中にエラー:', error);
      // 失敗として扱うが、エラーは投げずにStripeに200を返すことで再試行を防ぐ
      return { success: false };
    }
  }

  /**
   * Webhookイベントを処理（冪等性対応版）
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<{ success: boolean; message?: string }> {
    console.log(`Processing Stripe Connect event: ${event.type} (ID: ${event.id})`);

    try {
      // 🆕 1. 冪等性チェック: 既に処理済みのイベントかどうか確認
      const processedCheck = await this.convex.mutation(api.webhook_events.mutation.checkProcessedEvent, {
        event_id: event.id,
      });

      if (processedCheck.isProcessed) {
        console.log(`Connect イベント ${event.id} は既に処理済みです。スキップします。`);
        return { 
          success: true, 
          message: `イベント ${event.id} は既に処理済みです (結果: ${processedCheck.result})` 
        };
      }

      // 🆕 2. イベント処理開始を記録
      await this.convex.mutation(api.webhook_events.mutation.recordEvent, {
        event_id: event.id,
        event_type: event.type,
        processing_result: 'processing',
      });

      let processingResult = 'success';
      let errorMessage: string | undefined;

      try {
        switch (event.type) {
          case 'account.updated':
            await this.handleAccountUpdatedEvent(event.data.object as Stripe.Account);
            break;
          case 'checkout.session.completed':
            await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
            break;
          default:
            processingResult = 'skipped';
            console.log(`未処理のイベントタイプ: ${event.type}`);
            break;
        }
      } catch (error) {
        processingResult = 'error';
        errorMessage = error instanceof Error ? error.message : '不明なエラー';
        console.error(`Connect イベント ${event.id} の処理中にエラーが発生しました:`, error);
        throw error;
      } finally {
        // 🆕 3. 処理結果を記録
        await this.convex.mutation(api.webhook_events.mutation.updateEventResult, {
          event_id: event.id,
          processing_result: processingResult,
          error_message: errorMessage,
        });
      }

      return { 
        success: true, 
        message: `Connect イベント ${event.id} の処理が完了しました` 
      };

    } catch (error) {
      console.error(`Connect Webhook event ${event.id} 処理で致命的エラー:`, error);
      
      // エラー時も記録を更新
      try {
        await this.convex.mutation(api.webhook_events.mutation.updateEventResult, {
          event_id: event.id,
          processing_result: 'error',
          error_message: error instanceof Error ? error.message : '不明なエラー',
        });
      } catch (recordError) {
        console.error('Connect イベント結果の記録中にエラーが発生しました:', recordError);
      }

      throw new SystemError(
        'Connect Webhookイベントの処理に失敗しました',
        {
          statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'StripeConnectRepository.handleWebhookEvent',
          message: 'Connect Webhookイベントの処理に失敗しました',
          code: 'INTERNAL_SERVER_ERROR',
          status: 500,
          details: {
            eventId: event.id,
            eventType: event.type,
            error: error instanceof Error ? error.message : '不明なエラー',
          },
        }
      );
    }
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
    try {
      // Stripeからアカウント情報を取得
      const account = await this.stripe.accounts.retrieve(stripe_connect_id);

      // ステータスを判定
      const status = this.determineAccountStatus(account);

      // Convexにステータスを保存
      await this.convex.mutation(api.organization.mutation.updateConnectStatus, {
        tenant_id,
        org_id,
        stripe_connect_id,
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
        error: error instanceof Error ? error.message : '不明なエラー',
      }
    }
  }

  /**
   * Stripeアカウント連携用のアカウントリンクを生成
   */
  async createConnectAccountLink(
    tenant_id: Id<'tenant'>,
    org_id: string,
  ): Promise<StripeResult<{ account: Stripe.Account; accountLink: Stripe.AccountLink }>> {
    try {
      // 既存のアカウントを検索
      const existingOrganization = await this.convex.query(
        api.organization.query.findByTenantAndOrg,
        {
          tenant_id,
          org_id,
        }
      );

      // 既存のアカウントがあれば削除
      if (existingOrganization && existingOrganization.stripe_connect_id) {
        try {
          // Stripeアカウントを削除
          await this.stripe.accounts.del(existingOrganization.stripe_connect_id);
        } catch (deleteError) {
          throw new SystemError(
            'Stripeアカウントの削除に失敗しました。既存のアカウントがある場合は削除してください。',
            {
            statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
            severity: ERROR_SEVERITY.ERROR,
            callFunc: 'StripeConnectRepository.createConnectAccountLink',
            message: 'Stripeアカウントの削除に失敗しました。既存のアカウントがある場合は削除してください。',
            code: 'INTERNAL_SERVER_ERROR',
            status: 500,
            details: {
              error: deleteError instanceof Error ? deleteError.message : '不明なエラー',
            },
          });
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
          url: `${BASE_URL}`,
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
          tenant_id: tenant_id,
          org_id: org_id,
        },
      })

      // Convexに接続情報を保存
      await this.convex.mutation(api.organization.mutation.createConnectAccount, {
        tenant_id: tenant_id,
        org_id: org_id,
        user_id: '',
        org_name: '',
        org_email: '',
        stripe_connect_id: account.id,
        status: 'pending',
      });

      // アカウント連携用のリンクを生成
      console.log('StripeConnectRepository.createConnectAccountLink: Using DEPLOY_URL ->', process.env.NEXT_PUBLIC_DEPLOY_URL);
      console.log('StripeConnectRepository.createConnectAccountLink: accountLinks.create params ->', {
        account: account.id,
        refresh_url: `${process.env.NEXT_PUBLIC_DEPLOY_URL || 'http://localhost:3000'}/dashboard/setting?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_DEPLOY_URL || 'http://localhost:3000'}/dashboard/setting?success=true`,
        type: 'account_onboarding',
      });
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
        error: error instanceof Error ? error.message : '不明なエラー',
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
          refresh_url: `${BASE_URL}/dashboard/setting?refresh=true`,
          return_url: `${BASE_URL}/dashboard/setting?success=true`,
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
          errorMessage = error instanceof Error ? error.message : '不明なエラー';
        }
      } else {
        errorMessage = error instanceof Error ? error.message : '不明なエラー';
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
    stripe_connect_id: string; // 支払いを受け取るStripe ConnectアカウントID
    tenant_id: Id<'tenant'>;
    org_id: string;
    reservation_id: Id<'reservation'>;
    line_items: Stripe.Checkout.SessionCreateParams.LineItem[];
    customer_email?: string;
    success_url: string;
    cancel_url: string;
    metadata?: Record<string, string>;
  }): Promise<StripeResult<{ sessionId: string; url: string | null }>> {
    const {
      stripe_connect_id,
      tenant_id,
      org_id,
      reservation_id,
      line_items,
      customer_email,
      success_url,
      cancel_url,
      metadata,
    } = params;

    try {
      const default_fee_amount = 40;// 40円固定
      const percentage_fee = 0.04;// 4%
      const fee_amount = Math.floor(line_items.reduce((sum, item) => sum + (item.price_data?.unit_amount_decimal ? parseFloat(item.price_data.unit_amount_decimal) : item.price_data?.unit_amount || 0),0) * percentage_fee) + default_fee_amount;
      const sessionCreateParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        line_items: line_items,
        mode: 'payment',
        success_url: success_url,
        cancel_url: cancel_url,
        customer_email: customer_email,
        client_reference_id: reservation_id,
        payment_intent_data: {
          application_fee_amount: fee_amount,
          transfer_data: {
            destination: stripe_connect_id,
          },
        },
        metadata: {
          ...metadata,
          reservation_id: reservation_id,
          stripe_connect_id: stripe_connect_id,
          tenant_id: tenant_id,
          org_id: org_id,
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
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }
}
