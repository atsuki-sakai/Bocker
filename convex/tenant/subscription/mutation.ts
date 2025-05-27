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
import { archiveRecord, updateRecord, killRecord, createRecord } from '@/convex/utils/helpers';
import { checkAuth } from "@/convex/utils/auth";
import { billingPeriodType, subscriptionPlanNameType, subscriptionStatusType } from '@/convex/types';

export const upsertSubscription = mutation({
  args: {
    tenant_id: v.id('tenant'),
    stripe_subscription_id: v.string(),
    stripe_customer_id: v.string(),
    status: subscriptionStatusType,
    price_id: v.string(),
    plan_name: subscriptionPlanNameType,
    billing_period: billingPeriodType,
    current_period_start: v.number(),
    current_period_end: v.number(),
  },
  handler: async (ctx, args) => {
    
    validateStringLength(args.stripe_subscription_id, 'stripe_subscription_id');
    validateStringLength(args.stripe_customer_id, 'stripe_customer_id');
    validateStringLength(args.price_id, 'price_id');
    validateStringLength(args.plan_name, 'plan_name');

    // サブスクリプションが存在する場合は更新、存在しない場合は新規作成
    const existingSubscription = await ctx.db.query('subscription')
      .withIndex('by_stripe_subscription_archive', q =>
        q.eq('stripe_subscription_id', args.stripe_subscription_id)
        .eq('is_archive', false)
      )
      .first();
    if (existingSubscription) {
      return await updateRecord(ctx, existingSubscription._id, {
        ...args,
        current_period_start: args.current_period_start * 1000,
        current_period_end: args.current_period_end * 1000,
      });
    }else{
      return await createRecord(ctx,"subscription", {
        ...args,
        current_period_start: args.current_period_start * 1000,
        current_period_end: args.current_period_end * 1000,
      });
    }
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
    plan_name: subscriptionPlanNameType,
    billing_period: billingPeriodType,
    current_period_start: v.number(),
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
    const subscriptionResult = await ctx.db.patch(subscription._id, args);

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

    // サブスクリプションを削除
    await killRecord(ctx, subscription._id);

    return { 
      success: true, 
      alreadyProcessed: false,
      message: 'サブスクリプション削除が完了しました' 
    };
  },
});
