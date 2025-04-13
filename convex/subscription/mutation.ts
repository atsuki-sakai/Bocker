/**
 * サブスクリプションミューテーションAPI
 *
 * サブスクリプション関連のデータを更新するためのミューテーションエンドポイントを提供します。
 * サービス層を利用して、データアクセスとビジネスロジックを分離します。
 */

import { mutation } from '../_generated/server';
import { v } from 'convex/values';
import {
  validateSubscription,
  validatePaymentFailed,
  validateRequired,
} from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { subscriptionService } from '@/services/convex/services';
import { throwConvexApiError } from '@/services/convex/shared/utils/error';
import { archiveRecord, killRecord } from '@/services/convex/shared/utils/helper';

export const syncSubscription = mutation({
  args: {
    subscription: v.object({
      subscriptionId: v.string(),
      stripeCustomerId: v.string(),
      status: v.string(),
      priceId: v.string(),
      currentPeriodEnd: v.number(),
      planName: v.string(),
      billingPeriod: v.union(v.literal('monthly'), v.literal('yearly')),
    }),
  },
  handler: async (ctx, args) => {
    try {
      validateSubscription(args.subscription);
      return await subscriptionService.syncSubscription(ctx, args.subscription);
    } catch (error) {
      throwConvexApiError(error);
    }
  },
});

export const paymentFailed = mutation({
  args: {
    subscriptionId: v.string(),
    stripeCustomerId: v.string(),
    transactionId: v.optional(v.string()),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      validatePaymentFailed(args);
      return await subscriptionService.paymentFailed(ctx, args);
    } catch (error) {
      throwConvexApiError(error);
    }
  },
});

export const archive = mutation({
  args: {
    id: v.id('subscription'),
  },
  handler: async (ctx, args) => {
    validateRequired(args.id, 'id');
    return await archiveRecord(ctx, args.id);
  },
});

export const kill = mutation({
  args: {
    id: v.id('subscription'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.id, 'id');
    return await killRecord(ctx, args.id);
  },
});
