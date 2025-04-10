import { action } from '../_generated/server';
import { v } from 'convex/values';
import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/lib/constants';
import { StripeError } from '../shared/utils/error';
import { validateSubscriptionUpdate } from '../shared/utils/validation';
import type { BillingPeriod } from '../shared/types/common';

// サブスクリプションの変更のプレビューを取得
export const getSubscriptionUpdatePreview = action({
  args: {
    subscriptionId: v.string(),
    newPriceId: v.string(),
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    validateSubscriptionUpdate(args);
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new StripeError(
        'critical',
        'Stripeの秘密鍵が設定されていません',
        'INVALID_ARGUMENT',
        400,
        {
          ...args,
        }
      );
    }
    if (!STRIPE_API_VERSION) {
      throw new StripeError(
        'critical',
        'StripeのAPIバージョンが設定されていません',
        'INVALID_ARGUMENT',
        400,
        {
          ...args,
        }
      );
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: STRIPE_API_VERSION!,
    });
    // プロラーション日を取得
    const prorationDate = Math.floor(Date.now() / 1000);
    const subscription = await stripe.subscriptions.retrieve(args.subscriptionId);
    const items = [
      {
        id: subscription.items.data[0].id,
        price: args.newPriceId,
      },
    ];

    if (!subscription) {
      throw new StripeError(
        'low',
        'サブスクリプションの取得に失敗しました',
        'INVALID_ARGUMENT',
        400,
        {
          ...args,
        }
      );
    }

    // 更新前に請求書プレビューのみを取得
    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      customer: args.customerId,
      subscription: args.subscriptionId,
      subscription_items: items,
      subscription_proration_date: prorationDate,
    });

    if (!upcomingInvoice) {
      throw new StripeError(
        'low',
        '請求書プレビューの取得に失敗しました',
        'INVALID_ARGUMENT',
        400,
        {
          ...args,
        }
      );
    }
    return {
      success: true,
      previewInvoice: upcomingInvoice,
      status: subscription.status,
      items,
      prorationDate,
    };
  },
});

// サブスクリプションの変更を実行
export const confirmSubscriptionUpdate = action({
  args: {
    subscriptionId: v.string(),
    newPriceId: v.string(),
    items: v.array(v.object({ id: v.string(), price: v.string() })),
    prorationDate: v.number(),
  },
  handler: async (ctx, args) => {
    validateSubscriptionUpdate(args);
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new StripeError(
        'critical',
        'Stripeの秘密鍵が設定されていません',
        'INVALID_ARGUMENT',
        400,
        {
          ...args,
        }
      );
    }
    if (!STRIPE_API_VERSION) {
      throw new StripeError(
        'critical',
        'StripeのAPIバージョンが設定されていません',
        'INVALID_ARGUMENT',
        400,
        {
          ...args,
        }
      );
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: STRIPE_API_VERSION!,
    });

    let updatedSubscription;
    try {
      // ユーザーが確認した後、実際にサブスクリプションを更新
      updatedSubscription = await stripe.subscriptions.update(args.subscriptionId, {
        items: args.items,
        proration_date: args.prorationDate,
      });
    } catch (error) {
      throw new StripeError(
        'low',
        'サブスクリプションの変更に失敗しました',
        'INVALID_ARGUMENT',
        400,
        {
          ...args,
        }
      );
    }

    const intervalMapping: Record<string, BillingPeriod> = {
      month: 'monthly',
      year: 'yearly',
    };

    let billingPeriod: BillingPeriod = 'monthly';

    if (
      updatedSubscription.items.data &&
      updatedSubscription.items.data[0] &&
      updatedSubscription.items.data[0].plan &&
      updatedSubscription.items.data[0].plan.interval
    ) {
      const interval = updatedSubscription.items.data[0].plan.interval;
      billingPeriod = intervalMapping[interval] || 'monthly';
    }

    return {
      success: true,
      subscription: updatedSubscription,
      billingPeriod,
    };
  },
});
