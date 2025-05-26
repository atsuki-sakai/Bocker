
/**
 * テナントミューテーションAPI
 *
 * テナント関連のデータを更新するためのミューテーションエンドポイントを提供します。
 * サービス層を利用して、データアクセスとビジネスロジックを分離します。
 * 組織の操作はここでは行わない
 */

import { mutation } from '../_generated/server';
import { v } from 'convex/values';
import { validateStringLength } from '@/convex/utils/validations'; 
import { billingPeriodType, subscriptionStatusType } from '@/convex/types';
import { archiveRecord, createRecord, updateRecord } from '@/convex/utils/helpers';

export const create = mutation({
  args: {
    user_id: v.string(), // ClerkのユーザーID
    user_email: v.string(), // Clerkのユーザーのメールアドレス
    stripe_customer_id: v.optional(v.string()), // Stripe顧客ID
    subscription_id: v.optional(v.string()), // 現在のサブスクリプションID
    subscription_status: v.optional(subscriptionStatusType), // サブスクリプション状態
    plan_name: v.optional(v.string()), // プラン名 ("lite", "pro")
    price_id: v.optional(v.string()), // 購読プランID (Price ID)
    billing_period: v.optional(billingPeriodType), // 課金期間 (月額 or 年額)
  },
  handler: async (ctx, args) => {
      validateStringLength(args.user_id,'user_id');
      validateStringLength(args.user_email,'user_email');
      validateStringLength(args.stripe_customer_id,'stripe_customer_id');
      validateStringLength(args.subscription_id,'subscription_id');
      validateStringLength(args.subscription_status,'subscription_status');
      validateStringLength(args.plan_name,'plan_name');
      validateStringLength(args.price_id,'price_id');

      return await createRecord(ctx, 'tenant', {
        ...args,
      });
   
  },
});

export const upsert = mutation({
  args: {
    user_id: v.string(),
    user_email: v.string(),
    stripe_customer_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
      validateStringLength(args.user_id,'user_id');
      validateStringLength(args.user_email,'user_email');
      validateStringLength(args.stripe_customer_id,'stripe_customer_id');
      const existing = await ctx.db.query('tenant')
      .withIndex('by_user_archive', q => 
        q.eq('user_id', args.user_id)
         .eq('is_archive', false)
      )
      .first();

      if (!existing) {
        // 新規作成
        return await createRecord(ctx, 'tenant', args);
      } else {
        // 更新
        return await updateRecord(ctx, existing._id, args);
      }
    }
  },
);

export const archive = mutation({
  args: {
    tenant_id: v.id('tenant'),
  },
  handler: async (ctx, args) => {
      await archiveRecord(ctx,args.tenant_id);
  },
});


