/**
 * サブスクリプションミューテーションAPI
 *
 * サブスクリプション関連のデータを更新するためのミューテーションエンドポイントを提供します。
 * サービス層を利用して、データアクセスとビジネスロジックを分離します。
 */

import { mutation } from '../../_generated/server';
import { v } from 'convex/values';
import {
  validateStringLength,
  validateNumberLength
} from '@/convex/utils/validations';
import { ConvexError } from 'convex/values';
import { archiveRecord, updateRecord, killRecord } from '@/convex/utils/helpers';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { checkAuth } from "@/convex/utils/auth";

import { billingPeriodType } from '@/convex/types';


export const syncSubscription = mutation({
  args: {
    subscription: v.object({
      tenant_id: v.id('tenant'),
      stripe_subscription_id: v.string(),
      stripe_customer_id: v.string(),
      status: v.string(),
      price_id: v.string(),
      current_period_end: v.number(),
      plan_name: v.string(),
      billing_period: billingPeriodType,
    }),
  },
  handler: async (ctx, args) => {

    validateStringLength(args.subscription.stripe_subscription_id, 'stripe_subscription_id');
    validateStringLength(args.subscription.stripe_customer_id, 'stripe_customer_id');
    validateStringLength(args.subscription.status, 'status');
    validateStringLength(args.subscription.price_id, 'price_id');
    validateNumberLength(args.subscription.current_period_end, 'current_period_end');
    validateStringLength(args.subscription.plan_name, 'plan_name');
    validateStringLength(args.subscription.billing_period, 'billing_period');

    // 関連するテナントを検索して更新
    const existingTenant = await ctx.db.query('tenant')
    .withIndex('by_stripe_customer_archive', q => 
      q.eq('stripe_customer_id', args.subscription.stripe_customer_id)
      .eq('is_archive', false)
    )
    .first();
    
    if (existingTenant) {
      // テナントのサブスクリプション情報も更新
      await ctx.db.patch(existingTenant._id, {
        subscription_id: args.subscription.stripe_subscription_id,
        subscription_status: args.subscription.status,
        price_id: args.subscription.price_id,
        plan_name: args.subscription.plan_name,
        billing_period: args.subscription.billing_period,
      });
    }

    return args.subscription;
  },
});

export const updateSubscription = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    stripe_subscription_id: v.string(),
    subscription_status: v.string(),
    stripe_customer_id: v.string(),
  },
  handler: async (ctx, args) => {
      validateStringLength(args.org_id, 'org_id');
      validateStringLength(args.stripe_customer_id, 'stripe_customer_id');
      validateStringLength(args.stripe_subscription_id, 'stripe_subscription_id');
      validateStringLength(args.subscription_status, 'subscription_status');

      const updateSubscription = await ctx.db.query('subscription')
      .withIndex('by_tenant_archive', q => 
        q.eq('tenant_id', args.tenant_id)
        .eq('is_archive', false)
      )
      .first();

      if (!updateSubscription) {
        throw new ConvexError({
          statusCode: ERROR_STATUS_CODE.NOT_FOUND,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'tenant.subscription.updateSubscription',
          message: 'サブスクリプションが見つかりません',
          code: 'NOT_FOUND',
          status: 404,
          details: {
            ...args,
          },
        });
      }

      await updateRecord(ctx, updateSubscription._id, {
        stripe_subscription_id: args.stripe_subscription_id,
        status: args.subscription_status,
      });

      return updateSubscription.stripe_subscription_id;
  },
});

/**
 * 支払い失敗
 */
export const paymentFailed = mutation({
  args: {
    tenant_id: v.id('tenant'),
    stripe_customer_id: v.string(),
    transaction_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateStringLength(args.stripe_customer_id, 'stripe_customer_id');
    // サブスクリプションを検索
    let subscription = await ctx.db.query('subscription').withIndex('by_tenant_stripe_customer_archive', q => 
      q.eq('tenant_id', args.tenant_id)
      .eq('stripe_customer_id', args.stripe_customer_id)
      .eq('is_archive', false)
    )
    .first();
    if (!subscription) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'tenant.subscription.paymentFailed',
        message: 'サブスクリプションが見つかりません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }
    // ステータスを更新
    const subscriptionResult = await ctx.db.patch(subscription._id, {
      status: 'payment_failed',
    });
    // 関連するテナントも更新
    const tenant = await ctx.db.query('tenant')
      .withIndex('by_stripe_customer_archive', q => 
        q.eq('stripe_customer_id', args.stripe_customer_id)
        .eq('is_archive', false)
      )
      .first();

    if (tenant) {
      await updateRecord(ctx, tenant._id, {
        subscription_status: 'payment_failed',
      });
    }

    return subscriptionResult;
  },
});

export const archive = mutation({
  args: {
    id: v.id('subscription'),
  },
  handler: async (ctx, args) => {
    return await archiveRecord(ctx, args.id);
  },
});

export const kill = mutation({
  args: {
    stripe_subscription_id: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    const subscription = await ctx.db.query('subscription').filter((q) => q.eq(q.field('stripe_subscription_id'), args.stripe_subscription_id))
    .first();

    if (!subscription) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'tenant.subscription.kill',
        message: 'サブスクリプションが見つかりません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }

    const tenant = await ctx.db
      .query('tenant')
      .withIndex('by_stripe_customer_archive')
      .filter((q) => q.eq(q.field('stripe_customer_id'), subscription.stripe_customer_id))
      .first();
    if (!tenant) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'tenant.subscription.kill',
        message: 'テナントが見つかりません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }

    await updateRecord(ctx, tenant._id, {
      subscription_status: 'canceled',
      billing_period: undefined,
      price_id: undefined,
      plan_name: undefined,
      subscription_id: undefined,
    });

    await killRecord(ctx, subscription._id);
  },
});
