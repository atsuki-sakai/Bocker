import { BaseRepository } from '@/services/convex/repositories/BaseRepository';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { QueryCtx, MutationCtx } from '@/convex/_generated/server';
import {
  SubscriptionSyncInput,
  SubscriptionPaymentFailedInput,
} from '@/services/convex/types/subscription';
import { throwConvexError } from '@/lib/error';

export class SubscriptionRepository extends BaseRepository<'subscription'> {
  private static instance: SubscriptionRepository | null = null;

  private constructor() {
    super('subscription');
  }

  public static getInstance(): SubscriptionRepository {
    if (!SubscriptionRepository.instance) {
      SubscriptionRepository.instance = new SubscriptionRepository();
    }
    return SubscriptionRepository.instance;
  }

  /**
   * サブスクリプションIDで検索
   */
  async findBySubscriptionId(
    ctx: QueryCtx,
    subscriptionId: string,
    includeArchive: boolean = false
  ): Promise<Doc<'subscription'> | null> {
    return await ctx.db
      .query('subscription')
      .withIndex('by_subscription_id', (q) =>
        q.eq('subscriptionId', subscriptionId).eq('isArchive', includeArchive)
      )
      .first();
  }

  /**
   * Stripe顧客IDで検索
   */
  async findByStripeCustomerId(
    ctx: QueryCtx,
    stripeCustomerId: string,
    includeArchive: boolean = false
  ): Promise<Doc<'subscription'> | null> {
    return await ctx.db
      .query('subscription')
      .withIndex('by_stripe_customer_id', (q) =>
        q.eq('stripeCustomerId', stripeCustomerId).eq('isArchive', includeArchive)
      )
      .first();
  }

  /**
   * サブスクリプションの同期
   */
  async syncSubscription(
    ctx: MutationCtx,
    data: SubscriptionSyncInput
  ): Promise<Id<'subscription'>> {
    try {
      // 既存のサブスクリプションを検索
      const existingSubscription = await ctx.db
        .query('subscription')
        .withIndex('by_subscription_id', (q) =>
          q.eq('subscriptionId', data.subscriptionId).eq('isArchive', false)
        )
        .first();

      if (existingSubscription) {
        // 既存のサブスクリプションを更新
        const {
          subscriptionId,
          stripeCustomerId,
          status,
          priceId,
          currentPeriodEnd,
          planName,
          billingPeriod,
        } = data;
        await ctx.db.patch(existingSubscription._id, {
          subscriptionId,
          stripeCustomerId,
          status,
          priceId,
          currentPeriodEnd,
          planName,
          billingPeriod,
        });
        return existingSubscription._id;
      } else {
        // 新規サブスクリプション作成
        return await ctx.db.insert('subscription', {
          ...data,
          isArchive: false,
        });
      }
    } catch (error) {
      throw throwConvexError({
        message: 'サブスクリプションの同期に失敗しました',
        status: 500,
        code: 'INTERNAL_ERROR',
        title: 'サブスクリプションの同期に失敗しました',
        callFunc: 'syncSubscription',
        severity: 'high',
        details: {
          subscriptionId: data.subscriptionId,
          error: error instanceof Error ? error.message : '不明なエラー',
        },
      });
    }
  }

  /**
   * 支払い失敗時の処理
   */
  async handlePaymentFailed(
    ctx: MutationCtx,
    data: SubscriptionPaymentFailedInput
  ): Promise<Id<'subscription'> | null> {
    try {
      // サブスクリプションを検索
      let subscription = await this.findBySubscriptionId(
        ctx,
        data.subscriptionId,
        data.includeArchive || false
      );

      // 見つからなかった場合は顧客IDで検索
      if (!subscription) {
        subscription = await this.findByStripeCustomerId(
          ctx,
          data.stripeCustomerId,
          data.includeArchive || false
        );
      }

      if (!subscription) {
        throw throwConvexError({
          message: 'サブスクリプションが見つかりません',
          status: 404,
          code: 'NOT_FOUND',
          title: 'サブスクリプションが見つかりません',
          callFunc: 'handlePaymentFailed',
          severity: 'high',
          details: {
            subscriptionId: data.subscriptionId,
            stripeCustomerId: data.stripeCustomerId,
          },
        });
      }

      // ステータスを更新
      await ctx.db.patch(subscription._id, {
        status: 'payment_failed',
      });
      return subscription._id;
    } catch (error) {
      throw throwConvexError({
        message: 'Stripeのサブスクリプション支払い失敗の処理中にエラーが発生しました',
        status: 500,
        code: 'INTERNAL_ERROR',
        title: '支払い失敗の処理中にエラーが発生しました',
        callFunc: 'handlePaymentFailed',
        severity: 'high',
        details: {
          data: {
            subscriptionId: data.subscriptionId,
            stripeCustomerId: data.stripeCustomerId,
          },
          error: error instanceof Error ? error.message : '不明なエラー',
        },
      });
    }
  }

  /**
   * サブスクリプションチェック（salon.subscriptionStatusが有効かどうか）
   */
  async isSubscribed(ctx: QueryCtx, salonId: Id<'salon'>): Promise<boolean> {
    const salon = await ctx.db.get(salonId);

    if (!salon || salon.isArchive === true) {
      return false;
    }

    // 有効なサブスクリプションステータスをチェック
    const validStatuses = ['active', 'trialing'];
    return validStatuses.includes(salon.subscriptionStatus || '');
  }
}
