// convex/salon.ts

import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { removeEmptyFields, archiveRecord } from '../shared/utils/helper';
import { validateSalon, validateRequired } from '../shared/utils/validation';
import { ConvexCustomError } from '../shared/utils/error';
import { checkAuth } from '../shared/utils/auth';

export const add = mutation({
  args: {
    clerkId: v.string(),
    organizationId: v.optional(v.string()),
    email: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalon(args);
    // 既存ユーザーの検索
    const existingSalon = await ctx.db
      .query('salon')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .first();

    if (existingSalon) {
      throw new ConvexCustomError('low', '既に存在するClerk IDです', 'DUPLICATE_RECORD', 400, {
        clerkId: args.clerkId,
      });
    }
    // データベースに挿入
    return await ctx.db.insert('salon', {
      ...args,
      isArchive: false,
    });
  },
});

export const get = query({
  args: {
    id: v.id('salon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.id, 'id');
    return await ctx.db.get(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id('salon'),
    clerkId: v.optional(v.string()),
    email: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalon(args);
    // サロンの存在確認
    const salon = await ctx.db.get(args.id);

    if (!salon || salon.isArchive) {
      throw new ConvexCustomError('low', 'サロンが見つかりません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    // 更新前にデータの正当性チェック
    if (
      args.stripeCustomerId &&
      salon.stripeCustomerId &&
      args.stripeCustomerId !== salon.stripeCustomerId
    ) {
      console.warn(
        `Stripe顧客ID変更の試み: ${args.id}, ` +
          `現在: ${salon.stripeCustomerId}, 新規: ${args.stripeCustomerId}`
      );
      // 変更は許可するが警告としてログに残す
    }
    const updateData = removeEmptyFields({ ...args });
    delete updateData.id;
    delete updateData.clerkId;
    return await ctx.db.patch(args.id, updateData);
  },
});

export const upsert = mutation({
  args: {
    id: v.id('salon'),
    clerkId: v.string(),
    email: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalon(args);
    const salon = await ctx.db.get(args.id);
    if (!salon || salon.isArchive) {
      return await ctx.db.insert('salon', {
        clerkId: args.clerkId,
        email: args.email,
        stripeCustomerId: args.stripeCustomerId,
        isArchive: false,
      });
    } else {
      const updateData = removeEmptyFields({ ...args });
      delete updateData.id;
      delete updateData.clerkId;
      return await ctx.db.patch(args.id, updateData);
    }
  },
});

export const archive = mutation({
  args: { id: v.id('salon') },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.id, 'id');

    return await archiveRecord(ctx, args.id);
  },
});

export const getClerkId = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalon(args);
    // 指定されたClerk IDを持つサロンを検索
    return await ctx.db
      .query('salon')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId).eq('isArchive', false))
      .first();
  },
});

// salonのサブスクリプション情報を更新する
export const updateSubscription = mutation({
  args: {
    subscriptionId: v.string(),
    subscriptionStatus: v.string(),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalon(args);

    // 1. 顧客IDでサロンを検索
    let salon = await ctx.db
      .query('salon')
      .withIndex('by_stripe_customer_id', (q) =>
        q.eq('stripeCustomerId', args.stripeCustomerId).eq('isArchive', false)
      )
      .first();

    // 2. 顧客IDでサロンが見つからない場合
    if (!salon) {
      console.log(
        `Stripe顧客ID ${args.stripeCustomerId} でサロンが見つかりません。サブスクリプションIDで検索します。`
      );

      // 2.1. サブスクリプションIDからレコードを検索
      const subRecord = await ctx.db
        .query('subscription')
        .withIndex('by_subscription_id', (q) =>
          q.eq('subscriptionId', args.subscriptionId).eq('isArchive', false)
        )
        .first();

      if (!subRecord) {
        console.warn(`サブスクリプションが見つかりません (ID: ${args.subscriptionId})`);
        return null;
      }

      // 2.2. サブスクリプションから取得した顧客IDでサロンを再検索
      salon = await ctx.db
        .query('salon')
        .withIndex('by_stripe_customer_id', (q) =>
          q.eq('stripeCustomerId', subRecord.stripeCustomerId).eq('isArchive', false)
        )
        .first();

      if (!salon) {
        console.warn(
          `サブスクリプションレコードから取得したStripe顧客ID ${subRecord.stripeCustomerId} でサロンが見つかりません`
        );
        return null;
      }
    }
    // サブスクリプションの情報を更新して返す
    return await ctx.db.patch(salon._id, {
      subscriptionId: args.subscriptionId,
      subscriptionStatus: args.subscriptionStatus,
    });
  },
});

// サロンのサブスクリプションステータスを取得する
export const subscriptionStatus = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalon(args);
    return await ctx.db
      .query('salon')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId).eq('isArchive', false))
      .first();
  },
});
