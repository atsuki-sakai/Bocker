/**
 * テナントクエリAPI
 *
 * テナント関連の情報を取得するためのクエリエンドポイントを提供します。
 * サービス層を利用して、データアクセスとビジネスロジックを分離します。
 */

import { v } from 'convex/values';
import { validateStringLength } from '@/convex/utils/validations';
import { query } from '../_generated/server';

export const findById = query({
  args: {
    id: v.id('tenant'),
  },
  handler: async (ctx, args) => {
      return await ctx.db.get(args.id);
  },
});

export const findByUserId = query({
  args: {
    user_id: v.string(),
  },
  handler: async (ctx, args) => {
    validateStringLength(args.user_id,'user_id');
    return await ctx.db.query('tenant')
      .withIndex('by_user_archive', q => 
        q.eq('user_id', args.user_id)
        .eq('is_archive', false)
      )
      .first();
  },
});

export const findByStripeCustomerId = query({
  args: {
    stripe_customer_id: v.string(),
  },
  handler: async (ctx, args) => {
    validateStringLength(args.stripe_customer_id,'stripe_customer_id');
    return await ctx.db.query('tenant')
      .withIndex('by_stripe_customer_archive', q => 
        q.eq('stripe_customer_id', args.stripe_customer_id)
        .eq('is_archive', false)
      )
      .first();
  },
});
