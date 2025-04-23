/**
 * サブスクリプションクエリAPI
 *
 * サブスクリプション関連の情報を取得するためのクエリエンドポイントを提供します。
 * サービス層を利用して、データアクセスとビジネスロジックを分離します。
 */

import { v } from 'convex/values';
import { validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { subscriptionService } from '@/services/convex/services';
import { query } from '../_generated/server';

/**
 * サブスクリプションが存在するかどうかを確認
 */
export const isSubscribed = query({
  args: {
    salonId: v.id('salon'),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      checkAuth(ctx);
      validateRequired(args.salonId, 'salonId');
      return await subscriptionService.isSubscribed(ctx, args.salonId, args.includeArchive);
    } catch (error) {
      throw error;
    }
  },
});

/**
 * Stripe顧客IDでサブスクリプションを検索
 */
export const findByStripeCustomerId = query({
  args: {
    stripeCustomerId: v.string(),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      checkAuth(ctx, true);
      validateRequired(args.stripeCustomerId, 'stripeCustomerId');
      return await subscriptionService.findByStripeCustomerId(
        ctx,
        args.stripeCustomerId,
        args.includeArchive || false
      );
    } catch (error) {
      throw error;
    }
  },
});

export const getByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const salon = await ctx.db
      .query('salon')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first();
    if (!salon) {
      throw new Error('Salon not found');
    }

    if (!salon.stripeCustomerId) {
      throw new Error('Stripe customer ID not found');
    }
    const subscription = await ctx.db
      .query('subscription')
      .withIndex('by_stripe_customer_id', (q) => q.eq('stripeCustomerId', salon.stripeCustomerId!))
      .first();
    return subscription;
  },
});