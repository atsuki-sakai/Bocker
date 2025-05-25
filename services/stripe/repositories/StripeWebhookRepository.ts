import { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { retryOperation } from '@/lib/utils';
import { StripeResult } from '@/services/stripe/types';
import { ConvexHttpClient } from 'convex/browser';
import { normalizeSubscriptionStatus, priceIdToPlanInfo } from '@/lib/utils';
import { BillingPeriod } from '@/convex/types';


import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';


export class StripeWebhookRepository {
    private static instance: StripeWebhookRepository | null = null;
    private convex: ConvexHttpClient;
    private isDevelopment: boolean;
  
    
    private constructor(private stripe: Stripe) {
      // Convexクライアントの初期化
      if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
        throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is not set.");
      }
      this.convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  
      // 開発環境かどうか
      this.isDevelopment = process.env.APP_ENV === 'development';
    }
    public static getInstance(stripe: Stripe): StripeWebhookRepository {
        if (!StripeWebhookRepository.instance) {
          StripeWebhookRepository.instance = new StripeWebhookRepository(stripe);
        }
        return StripeWebhookRepository.instance;
      }
    /**
     * サブスクリプションステータスの同期
     */
  async syncSubscription(
    tenant_id: Id<'tenant'>,
    subscription: Stripe.Subscription,
    priceId?: string
  ): Promise<StripeResult<{ stripe_subscription_id: string }>> {
    try {
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;

      const status = normalizeSubscriptionStatus(subscription);

      const actualPriceId = priceId || '';
      const planInfo = priceIdToPlanInfo(actualPriceId);

      let billingPeriod;
      try {
        billingPeriod = subscription.items.data[0]?.plan?.interval
          ? this.convertIntervalToBillingPeriod(subscription.items.data[0].plan.interval)
          : 'monthly';
      } catch (error) {
        // デフォルト値をセット
        billingPeriod = 'monthly';
        console.warn(
          `billingPeriodの変換に失敗しました。デフォルト値を使用: ${subscription.id}`,
          error
        );
      }
      await this.convex.mutation(api.tenant.subscription.mutation.syncSubscription, {
        subscription: {
          tenant_id: tenant_id,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          status: status === 'ERROR' ? '契約切れ' : status,
          price_id: actualPriceId,
          current_period_end: subscription.current_period_end,
          plan_name: planInfo.name,
          billing_period: billingPeriod as BillingPeriod
        }
      });

      return {
        success: true,
        data: {
          stripe_subscription_id: subscription.id,
        },
      };
    } catch (error) {
      console.error('サブスクリプションデータの更新に失敗しました:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }

  /**
   * サブスクリプション支払い失敗時の処理
   */
  async handlePaymentFailed(
    tenant_id: Id<'tenant'>,
    stripe_subscription_id: string,
    stripe_customer_id: string
  ): Promise<StripeResult<{ success: boolean }>> {
    try {
      const transactionId = `payment_failed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await this.convex.mutation(api.tenant.subscription.mutation.paymentFailed, {
        tenant_id: tenant_id,
        stripe_customer_id: stripe_customer_id,
        transaction_id: transactionId,
      });

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      console.error(`サブスクリプション ${stripe_subscription_id} の支払い失敗処理に失敗しました:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }

  /**
   * Webhookイベントを処理（冪等性対応版）
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<{ success: boolean; message?: string }> {
    console.log(`Processing Stripe subscription event: ${event.type} (ID: ${event.id})`);
    try {
      // 1. 冪等性チェック: 既に処理済みのイベントかどうか確認
      const processedCheck = await this.convex.mutation(api.webhook_events.mutation.checkProcessedEvent, {
        event_id: event.id,
      });

      if (processedCheck.isProcessed) {
        console.log(`イベント ${event.id} は既に処理済みです。スキップします。`);
        return { 
          success: true, 
          message: `イベント ${event.id} は既に処理済みです (結果: ${processedCheck.result})` 
        };
      }

      // 2. イベント処理開始を記録
      await this.convex.mutation(api.webhook_events.mutation.recordEvent, {
        event_id: event.id,
        event_type: event.type,
        processing_result: 'processing',
      });

      let processingResult = 'success';
      let errorMessage: string | undefined;

      try {
        switch (event.type) {
          case 'customer.subscription.created':
            const customer_id = event?.data?.object.customer;
            const inviteSubscriptionId = event?.data?.object.id;
            if (customer_id) {
              try {
                // 新規ユーザーのStripe顧客情報を取得して紹介コードを抽出
                const customer = await this.stripe.customers.retrieve(customer_id as string);

                // 削除されていない顧客からreferralCodeを取得
                const referralCode = !customer.deleted ? customer.metadata?.referralCode : undefined;

                // 招待されたユーザーのサブスクリプション情報
                console.log('新規ユーザーのサブスクリプションID:', inviteSubscriptionId);
                console.log('紹介コード:', referralCode);

                const referral = referralCode ? await this.convex.query(api.tenant.referral.query.findByReferralCode, {
                  referral_code: referralCode
                }) : undefined;

                const inviteTenant = await this.convex.query(api.tenant.query.findByStripeCustomerId, {
                  stripe_customer_id: customer_id as string,
                });
                if (!inviteTenant) {
                  console.log('招待されたユーザーのテナント情報が見つかりません');
                  return { success: true, message: '招待されたユーザーのテナント情報が見つかりません' };
                }
                const inviteReferral = await this.convex.query(api.tenant.referral.query.findByTenantId, {
                  tenant_id: inviteTenant._id,
                });

                if (!inviteReferral) {
                  console.log('紹介コードがありません - 通常のサブスクリプション作成');
                  return { success: true, message: '紹介コードがありません' };
                }

                if (referral) {
                  // 冪等性対応: イベントIDを渡して重複防止
                  await this.convex.mutation(api.tenant.referral.mutation.incrementReferralCount, {
                    referral_id: inviteReferral._id,
                    idempotency_key: event.id, // StripeイベントIDを冪等キーとして使用
                  });

                  if (referralCode) {
                    const referralBySalon = await retryOperation(() =>
                      this.convex.query(api.tenant.referral.query.findByReferralCode, {
                        referral_code: referralCode,
                      })
                    );
                    if (referralBySalon) {
                      // 冪等性対応: イベントIDを渡して重複防止
                      await retryOperation(() =>
                        this.convex.mutation(api.tenant.referral.mutation.incrementReferralCount, {
                          referral_id: referralBySalon._id,
                          idempotency_key: event.id, // StripeイベントIDを冪等キーとして使用
                        })
                      );
                    }
                  }
                } else {
                  console.log('紹介コードがありません - 通常のサブスクリプション作成');
                }
              } catch (error) {
                console.error('紹介情報の取得に失敗しました:', error);
                Sentry.captureException(error, {
                  level: 'error',
                  tags: {
                    function: 'getReferralInfo',
                  },
                });
              }
            }

            const subscription = event.data.object as Stripe.Subscription;
            const priceId = subscription.items.data[0].plan.id;
            const tenant = await this.convex.query(api.tenant.query.findByStripeCustomerId, {
              stripe_customer_id: customer_id as string,
            });
           
            if (!tenant) {
              console.log('テナント情報が見つかりません');
              return { success: true, message: 'テナント情報が見つかりません' };
            }
            const result = await this.syncSubscription(tenant._id, subscription, priceId);
            if (!result.success) {
              throw new Error(result.error || 'syncSubscription failed');
            }
            break;

          case 'customer.subscription.updated': {
            const subscriptionUpdated = event.data.object as Stripe.Subscription;
            const priceIdUpdated = subscriptionUpdated.items.data[0].plan.id;
            const customer_id = event?.data?.object.customer;
            const tenant = await this.convex.query(api.tenant.query.findByStripeCustomerId, {
              stripe_customer_id: customer_id as string,
            });
            if (!tenant) {
              console.log('テナント情報が見つかりません');
              return { success: true, message: 'テナント情報が見つかりません' };
            }
            const resultUpdated = await this.syncSubscription(tenant._id, subscriptionUpdated, priceIdUpdated);
            if (!resultUpdated.success) {
              throw new Error(resultUpdated.error || 'syncSubscription failed');
            }
            break;
          }

          case 'invoice.payment_succeeded': {
            const invoice = event.data.object as Stripe.Invoice;
            const subId =
              typeof invoice.subscription === 'string'
                ? invoice.subscription
                : invoice.subscription?.toString();

            if (subId) {
              try {
                const subscription = await this.stripe.subscriptions.retrieve(subId);
                const customer_id = event?.data?.object.customer;
                const tenant = await this.convex.query(api.tenant.query.findByStripeCustomerId, {
                  stripe_customer_id: customer_id as string,
                });
                if (!tenant) {
                  console.log('テナント情報が見つかりません');
                  return { success: true, message: 'テナント情報が見つかりません' };
                }
                const result = await this.syncSubscription(tenant._id, subscription);
                if (!result.success) {
                  throw new Error(result.error || 'syncSubscription failed');
                }
              } catch (error) {
                console.error(`請求書 ${invoice.id} のサブスクリプション取得に失敗しました:`, error);
                Sentry.captureException(error, {
                  level: 'error',
                  tags: {
                    function: 'handleWebhookEvent_invoice_payment_succeeded',
                  },
                });
                throw error;
              }
            }
            break;
          }

          case 'customer.subscription.deleted': {
            const canceledSub = event.data.object as Stripe.Subscription;
            await this.convex.mutation(api.tenant.subscription.mutation.kill, {
              stripe_subscription_id: canceledSub.id,
            });
            break;
          }

          case 'invoice.payment_failed': {
            const invoice = event.data.object as Stripe.Invoice;
            const subId =
              typeof invoice.subscription === 'string'
                ? invoice.subscription
                : invoice.subscription?.toString();

            if (subId) {
              try {
                // サブスクリプションの詳細を取得
                const subscription = await this.stripe.subscriptions.retrieve(subId);
                const customerId =
                  typeof subscription.customer === 'string'
                    ? subscription.customer
                    : subscription.customer.id;

                const tenant = await this.convex.query(api.tenant.query.findByStripeCustomerId, {
                  stripe_customer_id: customerId as string,
                });
                if (!tenant) {
                  console.log('テナント情報が見つかりません');
                  return { success: true, message: 'テナント情報が見つかりません' };
                }

                const result = await this.handlePaymentFailed(tenant._id, subId, customerId);
                if (!result.success) {
                  throw new Error(result.error || 'handlePaymentFailed failed');
                }
              } catch (error) {
                console.error(`サブスクリプション ${subId} の支払い失敗処理に失敗しました:`, error);
                Sentry.captureException(error, {
                  level: 'error',
                  tags: {
                    function: 'handleWebhookEvent_invoice_payment_failed',
                  },
                });
                throw error;
              }
            }
            break;
          }

          default:
            console.log(`未対応のStripeイベントタイプ: ${event.type}`);
            processingResult = 'skipped';
            break;
        }
      } catch (error) {
        processingResult = 'error';
        errorMessage = error instanceof Error ? error.message : '不明なエラー';
        console.error(`イベント ${event.id} の処理中にエラーが発生しました:`, error);
        throw error;
      } finally {
        // 3. 処理結果を記録
        await this.convex.mutation(api.webhook_events.mutation.updateEventResult, {
          event_id: event.id,
          processing_result: processingResult,
          error_message: errorMessage,
        });
      }

      return { success: true, message: `イベント ${event.id} の処理が完了しました` };

    } catch (error) {
      console.error(`Webhook event ${event.id} 処理で致命的エラー:`, error);
      
      // エラー時も記録を更新
      try {
        await this.convex.mutation(api.webhook_events.mutation.updateEventResult, {
          event_id: event.id,
          processing_result: 'error',
          error_message: error instanceof Error ? error.message : '不明なエラー',
        });
      } catch (recordError) {
        console.error('イベント結果の記録中にエラーが発生しました:', recordError);
      }

      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'tenant.subscription.handleWebhookEvent',
        message: 'Webhookイベントの処理に失敗しました',
        code: 'INTERNAL_SERVER_ERROR',
        status: 500,
        details: {
          eventId: event.id,
          eventType: event.type,
          error: error instanceof Error ? error.message : '不明なエラー',
        },
      });
    }
  }

    /**
   * Stripeの課金期間("month"/"year")をConvexスキーマ形式("monthly"/"yearly")に変換
   */
    private convertIntervalToBillingPeriod(interval: string): string {
        const intervalMapping: Record<string, string> = {
          month: 'monthly',
          year: 'yearly',
        };
        return intervalMapping[interval] || 'monthly';
      }
    }