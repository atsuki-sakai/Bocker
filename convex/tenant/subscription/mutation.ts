/**
 * サブスクリプションミューテーションAPI
 *
 * サブスクリプション関連のデータを更新するためのミューテーションエンドポイントを提供します。
 * サービス層を利用して、データアクセスとビジネスロジックを分離します。
 */

import { mutation } from '../../_generated/server';
import { v } from 'convex/values';
import {
  validateStringLength
} from '@/convex/utils/validations';
import { ConvexError } from 'convex/values';
import { archiveRecord, updateRecord, killRecord } from '@/convex/utils/helpers';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { checkAuth } from "@/convex/utils/auth";
import { createRecord } from '@/convex/utils/helpers';
import { billingPeriodType, subscriptionStatusType } from '@/convex/types';

export const create = mutation({
  args: {
    tenant_id: v.id('tenant'),
    stripe_subscription_id: v.string(),
    stripe_customer_id: v.string(),
    status: subscriptionStatusType,
    price_id: v.string(),
    plan_name: v.string(),
    billing_period: billingPeriodType,
    current_period_end: v.number(),
  },
  handler: async (ctx, args) => {
    return await createRecord(ctx,"subscription", args);
  },
});

export const syncSubscription = mutation({
  args: {
    subscription: v.object({
      tenant_id: v.id('tenant'),
      stripe_subscription_id: v.string(),
      stripe_customer_id: v.string(),
      status: subscriptionStatusType,
      price_id: v.string(),
      current_period_end: v.number(),
      plan_name: v.string(),
      billing_period: billingPeriodType,
    }),
  },
  handler: async (ctx, args) => {
    // バリデーション処理
    validateStringLength(args.subscription.stripe_subscription_id, 'stripe_subscription_id');
    validateStringLength(args.subscription.stripe_customer_id, 'stripe_customer_id');
    validateStringLength(args.subscription.status, 'status');
    validateStringLength(args.subscription.price_id, 'price_id');
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
    stripe_subscription_id: v.string(),
    subscription_status: subscriptionStatusType,
    stripe_customer_id: v.string(),
    price_id: v.string(),
    plan_name: v.string(),
    billing_period: billingPeriodType,
    current_period_end: v.number(),
  },
  handler: async (ctx, args) => {
      validateStringLength(args.stripe_customer_id, 'stripe_customer_id');
      validateStringLength(args.stripe_subscription_id, 'stripe_subscription_id');
      
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
 * 支払い失敗（冪等性対応版）
 */
export const paymentFailed = mutation({
  args: {
    tenant_id: v.id('tenant'),
    stripe_customer_id: v.string(),
    status: subscriptionStatusType,
    transaction_id: v.optional(v.string()),
    price_id: v.string(),
    plan_name: v.string(),
    billing_period: billingPeriodType,
    current_period_end: v.number(),
    cancel_at: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    validateStringLength(args.stripe_customer_id, 'stripe_customer_id');
    
    // サブスクリプションを検索
    let subscription = await ctx.db.query('subscription').withIndex('by_stripe_customer_archive', q => 
      q.eq('stripe_customer_id', args.stripe_customer_id)
      .eq('is_archive', false)
    ).first();

    // 冪等性対応: サブスクリプションが見つからない場合もエラーではなく成功として扱う
    if (!subscription) {
      console.log(`支払い失敗処理: サブスクリプションが見つかりません（冪等性により成功扱い）: ${args.stripe_customer_id}`);
      return { 
        success: true, 
        alreadyProcessed: true,
        message: 'サブスクリプションが既に削除済みまたは存在しません' 
      };
    }

    // 既に支払い失敗状態の場合は冪等性により何もしない
    if (subscription.status !== 'active') {
      console.log(`支払い失敗処理: 既に支払い失敗状態です（冪等性により成功扱い）: ${subscription.stripe_subscription_id}`);
      return { 
        success: true, 
        alreadyProcessed: true,
        message: '既に支払い失敗状態です' 
      };
    }

    // ステータスを更新
    const subscriptionResult = await ctx.db.patch(subscription._id, {
      status: args.status,
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
        subscription_status: args.status,
      });
    }

    return { 
      success: true, 
      alreadyProcessed: false,
      result: subscriptionResult 
    };
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

/**
 * サブスクリプション削除（冪等性対応版）
 */
export const kill = mutation({
  args: {
    stripe_subscription_id: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    
    const subscription = await ctx.db.query('subscription')
      .filter((q) => q.eq(q.field('stripe_subscription_id'), args.stripe_subscription_id))
      .first();

    // 冪等性対応: サブスクリプションが見つからない場合もエラーではなく成功として扱う
    if (!subscription) {
      console.log(`kill処理: サブスクリプションが見つかりません（冪等性により成功扱い）: ${args.stripe_subscription_id}`);
      return { 
        success: true, 
        alreadyProcessed: true,
        message: 'サブスクリプションが既に削除済みまたは存在しません' 
      };
    }

    const tenant = await ctx.db
      .query('tenant')
      .withIndex('by_stripe_customer_archive')
      .filter((q) => q.eq(q.field('stripe_customer_id'), subscription.stripe_customer_id))
      .first();

    // 冪等性対応: テナントが見つからない場合もエラーではなく成功として扱う  
    if (!tenant) {
      console.log(`kill処理: テナントが見つかりません（冪等性により成功扱い）: ${subscription.stripe_customer_id}`);
      return { 
        success: true, 
        alreadyProcessed: true,
        message: 'テナントが既に削除済みまたは存在しません' 
      };
    }

    // テナント情報を更新
    await updateRecord(ctx, tenant._id, {
      subscription_status: 'canceled',
      billing_period: undefined,
      price_id: undefined,
      plan_name: undefined,
      subscription_id: undefined,
    });

    // サブスクリプションを削除
    await killRecord(ctx, subscription._id);

    return { 
      success: true, 
      alreadyProcessed: false,
      message: 'サブスクリプション削除が完了しました' 
    };
  },
});
