import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '../shared/utils/auth';
import { ConvexCustomError } from '../shared/utils/error';
import { validateRequired } from '../shared/utils/validation';
// Stripe Connectアカウント情報の取得
export const getConnectAccount = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateRequired(args.salonId, 'salonId');
    const salon = await ctx.db.get(args.salonId);

    if (!salon) {
      throw new ConvexCustomError('low', 'サロンが見つかりません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    // Stripe Connect情報を返す
    return {
      accountId: salon.stripeConnectId || null,
      status: salon.stripeConnectStatus || 'not_connected',
    };
  },
});

// Stripe Connectアカウント情報の作成/更新
export const createConnectAccount = mutation({
  args: {
    salonId: v.id('salon'),
    accountId: v.string(),
    status: v.string(),
    createdAt: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateRequired(args.salonId, 'salonId');
    // サロンIDチェック
    if (!args.salonId) {
      throw new ConvexCustomError('low', 'サロンIDが指定されていません', 'INVALID_ARGUMENT', 400, {
        ...args,
      });
    }

    // サロン取得
    const salon = await ctx.db.get(args.salonId);

    if (!salon) {
      throw new ConvexCustomError('low', 'サロンが見つかりません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    // StripeConnect情報をサロンに保存
    return await ctx.db.patch(salon._id, {
      stripeConnectId: args.accountId,
      stripeConnectStatus: args.status,
      stripeConnectCreatedAt: args.createdAt,
    });
  },
});

// Stripe Connectアカウント状態の更新
export const updateConnectStatus = mutation({
  args: {
    salonId: v.id('salon'),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateRequired(args.salonId, 'salonId');
    const salon = await ctx.db.get(args.salonId);

    if (!salon) {
      throw new ConvexCustomError('low', 'サロンが見つかりません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    // ステータスを更新
    return await ctx.db.patch(salon._id, {
      stripeConnectStatus: args.status,
    });
  },
});

// Stripe Connect アカウントIDからサロンを検索
export const findSalonByConnectId = query({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateRequired(args.accountId, 'accountId');

    if (!args.accountId) {
      throw new ConvexCustomError(
        'low',
        'StripeConnectアカウントIDが指定されていません',
        'INVALID_ARGUMENT',
        400,
        {
          ...args,
        }
      );
    }

    // Stripe ConnectIDに紐づくサロンを検索
    const salons = await ctx.db
      .query('salon')
      .withIndex('by_stripe_connect_id', (q) => q.eq('stripeConnectId', args.accountId))
      .collect();

    return salons;
  },
});

// Stripe Connect アカウントの詳細情報を取得
export const getConnectAccountDetails = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    validateRequired(args.salonId, 'salonId');
    checkAuth(ctx, true);

    // サロン取得
    const salon = await ctx.db.get(args.salonId);

    if (!salon) {
      throw new ConvexCustomError('low', 'サロンが見つかりません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    return {
      accountId: salon.stripeConnectId || null,
      status: salon.stripeConnectStatus || 'not_connected',
      createdAt: salon.stripeConnectCreatedAt || null,
    };
  },
});
