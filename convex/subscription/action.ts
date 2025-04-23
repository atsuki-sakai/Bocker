/**
 * サブスクリプションアクションAPI
 *
 * サブスクリプション関連のStripe連携などの外部APIを使用するアクションエンドポイントを提供します。
 * サービス層を利用して、ビジネスロジックを分離します。
 */

import { action } from '../_generated/server';
import { v } from 'convex/values';
import {
  validateSubscription,
  validateSubscriptionUpdatePreview,
  validateSubscriptionBillingPortalSession,
  validateConfirmSubscriptionUpdate,
  validateRequired,
} from '@/services/convex/shared/utils/validation';
import { subscriptionService } from '@/services/convex/services';

export const createSubscriptionSession = action({
  args: {
    clerkUserId: v.string(),
    stripeCustomerId: v.string(),
    priceId: v.string(),
    trialDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      validateSubscription(args);
      return await subscriptionService.createSubscriptionSession(ctx, args);
    } catch (error) {
      throw error;
    }
  },
});

export const getStripeCustomer = action({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      validateRequired(args.stripeCustomerId, 'stripeCustomerId');
      return await subscriptionService.getStripeCustomer(ctx, args.stripeCustomerId);
    } catch (error) {
      throw error;
    }
  },
});
export const getSubscriptionUpdatePreview = action({
  args: {
    subscriptionId: v.string(),
    newPriceId: v.string(),
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      validateSubscriptionUpdatePreview(args);
      return await subscriptionService.getSubscriptionUpdatePreview(ctx, args);
    } catch (error) {
      throw error;
    }
  },
});

export const createBillingPortalSession = action({
  args: {
    stripeCustomerId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      validateSubscriptionBillingPortalSession(args);
      return await subscriptionService.createBillingPortalSession(ctx, args);
    } catch (error) {
      throw error;
    }
  },
});

export const confirmSubscriptionUpdate = action({
  args: {
    subscriptionId: v.string(),
    newPriceId: v.string(),
    items: v.array(v.object({ id: v.string(), price: v.string() })),
    prorationDate: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      validateConfirmSubscriptionUpdate(args);
      return await subscriptionService.confirmSubscriptionUpdate(ctx, args);
    } catch (error) {
      throw error;
    }
  },
});
