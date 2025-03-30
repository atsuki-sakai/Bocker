import { action } from '../_generated/server';
import { v } from 'convex/values';
import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/lib/constants';
import { ConvexError } from 'convex/values';
import { CONVEX_ERROR_CODES } from '../constants';
import { authCheck } from '../helpers';
import { validateSubscriptionUpdate } from '../validators';

// サブスクリプションの変更のプレビューを取得
export const getSubscriptionUpdatePreview = action({
  args: {
    subscriptionId: v.string(),
    newPriceId: v.string(),
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateSubscriptionUpdate(args);

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: STRIPE_API_VERSION,
    });
    const { subscriptionId, newPriceId, customerId } = args;

    const prorationDate = Math.floor(Date.now() / 1000);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const items = [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ];

    if (!subscription) {
      console.error('サブスクリプションの取得に失敗しました', { ...args });
      throw new ConvexError({
        message: 'サブスクリプションの取得に失敗しました',
        code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
        severity: 'low',
        status: 400,
      });
    }

    // 更新前に請求書プレビューのみを取得
    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      customer: customerId,
      subscription: subscriptionId,
      subscription_items: items,
      subscription_proration_date: prorationDate,
    });

    if (!upcomingInvoice) {
      console.error('請求書プレビューの取得に失敗しました', { ...args });
      throw new ConvexError({
        message: '請求書プレビューの取得に失敗しました',
        code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
        severity: 'low',
        status: 400,
      });
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
    authCheck(ctx);
    validateSubscriptionUpdate(args);
    const { subscriptionId, items, prorationDate } = args;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: STRIPE_API_VERSION,
    });

    let updatedSubscription;
    try {
      // ユーザーが確認した後、実際にサブスクリプションを更新
      updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items,
        proration_date: prorationDate,
      });
    } catch (error) {
      console.error('サブスクリプションの変更に失敗しました', error, { ...args });
      throw new ConvexError({
        message: 'サブスクリプションの変更に失敗しました',
        code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
        severity: 'low',
        status: 400,
      });
    }

    const intervalMapping: Record<string, 'monthly' | 'yearly'> = {
      month: 'monthly',
      year: 'yearly',
    };

    let billingPeriod: 'monthly' | 'yearly' = 'monthly';

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

export const updateCustomerEmail = action({
  args: {
    customerId: v.string(),
    newEmail: v.string(),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);

    // Stripe クライアントの初期化
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: STRIPE_API_VERSION,
    });

    try {
      // 顧客のメールアドレスを更新
      const updatedCustomer = await stripe.customers.update(args.customerId, {
        email: args.newEmail,
      });

      return {
        success: true,
        customer: updatedCustomer,
      };
    } catch (error) {
      console.error('Stripe の顧客メールアドレス更新に失敗しました', error, { ...args });
      throw new ConvexError({
        message: 'Stripe の顧客メールアドレス更新に失敗しました',
        code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
        severity: 'low',
        status: 400,
      });
    }
  },
});
