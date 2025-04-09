// convex/salon.ts

import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { CONVEX_ERROR_CODES } from '../constants';
import { Doc } from '../_generated/dataModel';
import { removeEmptyFields, trashRecord, authCheck } from '../helpers';
import { validateSalon } from '../validators';

// FIXME: Webhookで使用するためのクエリを簡易的にskipしているので、セキュリティーに不安がある

export const add = mutation({
  args: {
    clerkId: v.string(),
    organizationId: v.optional(v.string()),
    email: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx, true);
    validateSalon(args);
    // 既存ユーザーの検索
    const existingSalon = await ctx.db
      .query('salon')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId).eq('isArchive', false))
      .first();

    if (existingSalon) {
      throw new ConvexError({
        message: '既に存在するClerk IDです',
        code: CONVEX_ERROR_CODES.DUPLICATE_RECORD,
        severity: 'low',
        status: 400,
        context: {
          clerkId: args.clerkId,
        },
      });
    }

    // 必須でないフィールドの検証
    const email = args.email || 'no-email';

    // 挿入するデータの準備

    const salonData: Partial<Doc<'salon'>> = {
      clerkId: args.clerkId,
      email: email,
    };

    validateSalon(salonData);
    // 任意フィールドを条件付きで追加
    if (args.stripeCustomerId) {
      salonData.stripeCustomerId = args.stripeCustomerId;
    }
    if (args.organizationId) {
      salonData.organizationId = args.organizationId;
    }
    salonData.isArchive = false;

    // データベースに挿入
    return await ctx.db.insert('salon', {
      ...salonData,
      isArchive: false,
    } as Doc<'salon'>);
  },
});

export const get = query({
  args: {
    id: v.id('salon'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
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
    authCheck(ctx, true);
    validateSalon(args);
    // サロンの存在確認
    const salon = await ctx.db.get(args.id);

    if (!salon || salon.isArchive) {
      throw new ConvexError({
        message: 'サロンが見つかりません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonId: args.id,
        },
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
    authCheck(ctx);
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

export const trash = mutation({
  args: { id: v.id('salon') },
  handler: async (ctx, args) => {
    authCheck(ctx, true);
    // より効率的なクエリでサロンを取得
    const salon = await ctx.db.get(args.id);
    if (!salon) {
      throw new ConvexError({
        message: '存在しないサロンの削除が試行されました',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonId: args.id,
        },
      });
    }
    return trashRecord(ctx, args.id);
  },
});

export const getClerkId = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    authCheck(ctx, true);
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
    authCheck(ctx);
    validateSalon(args);

    // 1. 顧客IDでサロンを検索
    let salon = await ctx.db
      .query('salon')
      .withIndex('by_stripe_customer_id', (q) => q.eq('stripeCustomerId', args.stripeCustomerId))
      .first();

    // 2. 顧客IDでサロンが見つからない場合
    if (!salon) {
      console.log(
        `Stripe顧客ID ${args.stripeCustomerId} でサロンが見つかりません。サブスクリプションIDで検索します。`
      );

      // 2.1. サブスクリプションIDからレコードを検索
      const subRecord = await ctx.db
        .query('subscription')
        .withIndex('by_subscription_id', (q) => q.eq('subscriptionId', args.subscriptionId))
        .first();

      if (!subRecord) {
        console.warn(`サブスクリプションが見つかりません (ID: ${args.subscriptionId})`);
        return null;
      }

      // 2.2. サブスクリプションから取得した顧客IDでサロンを再検索
      salon = await ctx.db
        .query('salon')
        .withIndex('by_stripe_customer_id', (q) =>
          q.eq('stripeCustomerId', subRecord.stripeCustomerId)
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
    authCheck(ctx);
    validateSalon(args);
    return await ctx.db
      .query('salon')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId).eq('isArchive', false))
      .first();
  },
});
