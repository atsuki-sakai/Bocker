'use node';

import Stripe from 'stripe';
import { StripeResult } from '@/services/stripe/types';
import * as Sentry from '@sentry/nextjs';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { SystemError } from '@/lib/errors/custom_errors';
import { randomUUID } from 'crypto';

/**
 * Stripe Subscription APIを扱うリポジトリクラス
 * 
 * 【改善点】
 * - シングルトンパターンを削除し、依存性注入パターンに変更
 * - 不要なConvexクライアントを削除
 * - エラーハンドリングを統一
 * - セキュリティを強化
 * - 型安全性を向上
 */
export class StripeSubscriptionRepository {
  private readonly isDevelopment: boolean;

  constructor(private readonly stripe: Stripe) {
    // 開発環境の判定
    this.isDevelopment = process.env.NODE_ENV === 'development';
    
    // Stripeインスタンスの検証
    if (!stripe) {
      throw new SystemError(
        'Stripeインスタンスが提供されていません',
        {
          statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
          severity: ERROR_SEVERITY.ERROR,
          title: 'Stripe初期化エラー',
          callFunc: 'StripeSubscriptionRepository.constructor',
          details: {},
        },
        'STRIPE_INITIALIZATION_ERROR'
      );
    }
  }

  /**
   * Stripe顧客を安全に取得
   * 
   * @param customerId - 顧客ID
   * @returns Stripe顧客オブジェクト
   * @throws SystemError 顧客が見つからない場合
   */
  async getStripeCustomer(customerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
    try {
      // 入力値の検証
      if (!customerId || typeof customerId !== 'string') {
        throw new SystemError(
          '無効な顧客IDが提供されました',
          {
            statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
            severity: ERROR_SEVERITY.WARNING,
            title: '顧客ID検証エラー',
            callFunc: 'StripeSubscriptionRepository.getStripeCustomer',
            details: { customerId },
          },
          'INVALID_CUSTOMER_ID'
        );
      }

      const customer = await this.stripe.customers.retrieve(customerId);
      
      if (!customer || customer.deleted) {
        throw new SystemError(
          '指定された顧客が見つかりません',
          {
            statusCode: ERROR_STATUS_CODE.NOT_FOUND,
            severity: ERROR_SEVERITY.WARNING,
            title: '顧客取得エラー',
            callFunc: 'StripeSubscriptionRepository.getStripeCustomer',
            details: { 
              customerId,
              stripeErrorCode: customer === null ? 'resource_missing' : undefined 
            },
          },
          'CUSTOMER_NOT_FOUND'
        );
      }

      return customer;
    } catch (error: any) {
      // Stripeエラーの場合は適切にラップ
      if (error instanceof Stripe.errors.StripeError) {
        throw new SystemError(
          `Stripe顧客取得エラー: ${error.message}`,
          {
            statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
            severity: ERROR_SEVERITY.ERROR,
            title: 'Stripe API エラー',
            callFunc: 'StripeSubscriptionRepository.getStripeCustomer',
            details: { 
              customerId,
              stripeErrorType: error.type,
              stripeErrorCode: error.code
            },
          },
          'STRIPE_API_ERROR'
        );
      }
      
      // 既にSystemErrorの場合はそのまま再スロー
      if (error instanceof SystemError) {
        throw error;
      }
      
      // その他のエラー
      throw new SystemError(
        '顧客取得中に予期しないエラーが発生しました',
        {
          statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
          severity: ERROR_SEVERITY.ERROR,
          title: '予期しないエラー',
          callFunc: 'StripeSubscriptionRepository.getStripeCustomer',
          details: { customerId },
        },
        'UNEXPECTED_ERROR'
      );
    }
  }

  /**
   * サブスクリプションに割引を適用する
   * 
   * @param stripeSubscriptionId - 割引を適用するサブスクリプションID
   * @param discountAmount - 割引額（単位：円、正の整数）
   * @returns 割引適用結果
   */
  async applyDiscount(
    stripeSubscriptionId: string,
    discountAmount: number
  ): Promise<
    StripeResult<{
      verificationResult: { 
        before: number; 
        after: number; 
        discountApplied: boolean;
        couponId: string;
      };
    }>
  > {
    try {
      // 入力値の詳細な検証
      const validationResult = this.validateDiscountInput(stripeSubscriptionId, discountAmount);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.error,
        };
      }

      // 1. 割引適用前のサブスクリプション情報を取得
      const subscriptionBefore = await this.getSubscriptionSafely(stripeSubscriptionId);
      const amountBefore = subscriptionBefore.items.data[0]?.price?.unit_amount || 0;

      // 既に割引が適用されている場合はスキップ
      if (subscriptionBefore.discount) {
        console.log(
          `[applyDiscount] 既存クーポンが存在するためスキップ: sub=${stripeSubscriptionId}, coupon=${subscriptionBefore.discount.coupon.id}`
        );
        return {
          success: true,
          data: {
            verificationResult: {
              before: amountBefore / 100,
              after: amountBefore / 100,
              discountApplied: false,
              couponId: subscriptionBefore.discount.coupon.id,
            },
          },
        };
      }

      // 2. 一意のクーポンIDを生成（セキュアな方法）
      const couponId = this.generateSecureCouponId();

      // 3. 割引額を円からStripeの最小単位（銭）に変換
      const amountInSmallestUnit = Math.round(discountAmount * 100);

      // 4. クーポンを作成
      const coupon = await this.createDiscountCoupon(couponId, amountInSmallestUnit);

      // 5. サブスクリプションにクーポンを適用
      await this.stripe.subscriptions.update(stripeSubscriptionId, {
        coupon: coupon.id,
      });

      // 6. 割引適用後の検証
      const verificationResult = await this.verifyDiscountApplication(
        stripeSubscriptionId,
        couponId,
        amountBefore
      );

      // 7. セキュアなログ記録（機密情報を除外）
      this.logDiscountApplication(stripeSubscriptionId, verificationResult, this.isDevelopment);

      return {
        success: true,
        data: {
          verificationResult: {
            ...verificationResult,
            couponId,
          },
        },
      };
    } catch (error) {
      // エラーログ記録（Sentry）
      Sentry.captureException(error, {
        level: 'error',
        tags: {
          function: 'applyDiscount',
          subscriptionId: stripeSubscriptionId,
        },
        extra: {
          discountAmount,
        },
      });

      // エラーレスポンスの生成
      const errorMessage = this.generateUserFriendlyErrorMessage(error);
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 割引適用の入力値を検証
   */
  private validateDiscountInput(
    subscriptionId: string, 
    discountAmount: number
  ): { isValid: boolean; error?: string } {
    // サブスクリプションIDの検証
    if (!subscriptionId || typeof subscriptionId !== 'string' || subscriptionId.trim().length === 0) {
      return {
        isValid: false,
        error: '有効なサブスクリプションIDを指定してください',
      };
    }

    // Stripeサブスクリプションの形式チェック
    if (!subscriptionId.startsWith('sub_')) {
      return {
        isValid: false,
        error: '無効なサブスクリプションID形式です',
      };
    }

    // 割引額の検証
    if (typeof discountAmount !== 'number' || !Number.isFinite(discountAmount)) {
      return {
        isValid: false,
        error: '割引額は有効な数値である必要があります',
      };
    }

    if (discountAmount <= 0) {
      return {
        isValid: false,
        error: '割引額は正の値である必要があります',
      };
    }

    if (discountAmount > 1000000) { // 100万円の上限
      return {
        isValid: false,
        error: '割引額が上限を超えています',
      };
    }

    // 小数点以下の検証（円単位のみ許可）
    if (!Number.isInteger(discountAmount)) {
      return {
        isValid: false,
        error: '割引額は整数（円単位）で指定してください',
      };
    }

    return { isValid: true };
  }

  /**
   * サブスクリプションを安全に取得
   */
  private async getSubscriptionSafely(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      
      if (!subscription) {
        throw new SystemError(
          'サブスクリプションが見つかりません',
          {
            statusCode: ERROR_STATUS_CODE.NOT_FOUND,
            severity: ERROR_SEVERITY.WARNING,
            title: 'サブスクリプション取得エラー',
            callFunc: 'StripeSubscriptionRepository.getSubscriptionSafely',
            details: { 
              subscriptionId,
              stripeErrorCode: 'resource_missing'
            },
          },
          'SUBSCRIPTION_NOT_FOUND'
        );
      }

      return subscription;
    } catch (error: any) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new SystemError(
          `サブスクリプション取得エラー: ${error.message}`,
          {
            statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
            severity: ERROR_SEVERITY.ERROR,
            title: 'Stripe API エラー',
            callFunc: 'StripeSubscriptionRepository.getSubscriptionSafely',
            details: { 
              subscriptionId,
              stripeErrorType: error.type,
              stripeErrorCode: error.code
            },
          },
          'STRIPE_API_ERROR'
        );
      }
      throw error;
    }
  }

  /**
   * セキュアなクーポンIDを生成
   */
  private generateSecureCouponId(): string {
    // 128bit UUID から "-" を除去して先頭24桁を使用
    return `referral_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
  }

  /**
   * 割引クーポンを作成
   */
  private async createDiscountCoupon(
    couponId: string, 
    amountInSmallestUnit: number
  ): Promise<Stripe.Coupon> {
    return await this.stripe.coupons.create({
      name: '紹介プログラム割引',
      amount_off: amountInSmallestUnit,
      currency: 'jpy',
      duration: 'forever',
      id: couponId,
      metadata: {
        type: 'referral_discount',
        created_by: 'system',
        created_at: new Date().toISOString(),
      },
    });
  }

  /**
   * 割引適用を検証
   */
  private async verifyDiscountApplication(
    subscriptionId: string,
    couponId: string,
    amountBefore: number // 最小通貨単位（例: 銭）
  ): Promise<{ before: number; after: number; discountApplied: boolean }> {
    // 割引適用後のサブスクリプション情報を取得
    const subscriptionAfter = await this.getSubscriptionSafely(subscriptionId);
    const discountInfo = subscriptionAfter.discount;
    const isDiscountApplied = !!discountInfo && discountInfo.coupon.id === couponId;

    // 割引後金額を計算（最小通貨単位）
    let calculatedAmountAfterInSmallestUnit = amountBefore;
    if (discountInfo?.coupon.amount_off) {
      // amount_off は最小通貨単位
      calculatedAmountAfterInSmallestUnit = amountBefore - discountInfo.coupon.amount_off;
    } else if (discountInfo?.coupon.percent_off) {
      calculatedAmountAfterInSmallestUnit = Math.round(
        amountBefore * (1 - discountInfo.coupon.percent_off / 100)
      );
    }

    return {
      before: amountBefore / 100, // 円に変換
      after: calculatedAmountAfterInSmallestUnit / 100, // 円に変換
      discountApplied: isDiscountApplied,
    };
  }

  /**
   * セキュアなログ記録（機密情報を除外）
   */
  private logDiscountApplication(
    subscriptionId: string,
    verificationResult: { before: number; after: number; discountApplied: boolean },
    isDevelopment: boolean
  ): void {
    if (isDevelopment) {
      // 開発環境でのみ詳細ログを出力
      console.log(`割引適用検証完了:`, {
        subscriptionId: subscriptionId.substring(0, 8) + '***', // 部分的にマスク
        適用前金額: verificationResult.before,
        適用後金額: verificationResult.after,
        割引適用成功: verificationResult.discountApplied,
        timestamp: new Date().toISOString(),
      });
    }

    // 本番環境では最小限のログのみ
    console.log(`割引適用完了: ${verificationResult.discountApplied ? '成功' : '失敗'}`);
  }

  /**
   * ユーザーフレンドリーなエラーメッセージを生成
   */
  private generateUserFriendlyErrorMessage(error: unknown): string {
    if (error instanceof SystemError) {
      return error.message;
    }

    if (error instanceof Stripe.errors.StripeError) {
      switch (error.type) {
        case 'StripeCardError':
          return 'カード情報に問題があります。別のカードをお試しください。';
        case 'StripeRateLimitError':
          return 'リクエストが集中しています。しばらく待ってから再度お試しください。';
        case 'StripeInvalidRequestError':
          return '無効なリクエストです。入力内容をご確認ください。';
        case 'StripeAPIError':
          return '決済サービスで一時的な問題が発生しています。しばらく待ってから再度お試しください。';
        case 'StripeConnectionError':
          return 'ネットワーク接続に問題があります。インターネット接続をご確認ください。';
        case 'StripeAuthenticationError':
          return 'システムエラーが発生しました。管理者にお問い合わせください。';
        default:
          return '決済処理中にエラーが発生しました。しばらく待ってから再度お試しください。';
      }
    }

    return '予期しないエラーが発生しました。管理者にお問い合わせください。';
  }

}