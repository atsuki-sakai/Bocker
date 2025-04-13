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
import { throwConvexApiError } from '@/services/convex/shared/utils/error';
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
      throwConvexApiError(error);
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
      throwConvexApiError(error);
    }
  },
});
