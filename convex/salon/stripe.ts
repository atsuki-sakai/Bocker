import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { CONVEX_ERROR_CODES } from '../constants';
import { authCheck } from '../helpers';
import { Id } from '../_generated/dataModel';

// Stripe Connectアカウント情報の取得
export const getConnectAccount = query({
  args: {
    salonId: v.string(),
  },
  handler: async (ctx, args) => {
    // 認証チェック
    // authCheck(ctx);

    // サロンIDチェック
    if (!args.salonId) {
      throw new ConvexError({
        message: 'サロンIDが指定されていません',
        code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
        severity: 'low',
        status: 400,
      });
    }

    // サロン取得
    const salon = await ctx.db
      .query('salon')
      .filter((q) => q.eq(q.field('_id'), args.salonId))
      .first();

    if (!salon) {
      throw new ConvexError({
        message: 'サロンが見つかりません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
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
    salonId: v.string(),
    accountId: v.string(),
    status: v.string(),
    createdAt: v.string(),
  },
  handler: async (ctx, args) => {
    // 認証チェック
    // authCheck(ctx);

    // サロンIDチェック
    if (!args.salonId) {
      throw new ConvexError({
        message: 'サロンIDが指定されていません',
        code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
        severity: 'low',
        status: 400,
      });
    }

    // サロン取得
    const salon = await ctx.db
      .query('salon')
      .filter((q) => q.eq(q.field('_id'), args.salonId))
      .first();

    if (!salon) {
      throw new ConvexError({
        message: 'サロンが見つかりません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
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
    salonId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    // 認証チェック
    // authCheck(ctx);

    // サロン取得
    const salon = await ctx.db
      .query('salon')
      .filter((q) => q.eq(q.field('_id'), args.salonId))
      .first();

    if (!salon) {
      throw new ConvexError({
        message: 'サロンが見つかりません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
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
    // 認証チェックをスキップ（Webhookからの呼び出し対応）

    if (!args.accountId) {
      throw new ConvexError({
        message: 'アカウントIDが指定されていません',
        code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
        severity: 'low',
        status: 400,
      });
    }

    // Stripe ConnectIDに紐づくサロンを検索
    const salons = await ctx.db
      .query('salon')
      .filter((q) => q.eq(q.field('stripeConnectId'), args.accountId))
      .collect();

    return salons;
  },
});

// Stripe Connect アカウントの詳細情報を取得
export const getConnectAccountDetails = query({
  args: {
    salonId: v.string(),
  },
  handler: async (ctx, args) => {
    // 認証チェック
    // authCheck(ctx);

    // サロンIDチェック
    if (!args.salonId) {
      throw new ConvexError({
        message: 'サロンIDが指定されていません',
        code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
        severity: 'low',
        status: 400,
      });
    }

    // サロン取得
    const salon = await ctx.db
      .query('salon')
      .filter((q) => q.eq(q.field('_id'), args.salonId))
      .first();

    if (!salon) {
      throw new ConvexError({
        message: 'サロンが見つかりません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
      });
    }

    return {
      accountId: salon.stripeConnectId || null,
      status: salon.stripeConnectStatus || 'not_connected',
      createdAt: salon.stripeConnectCreatedAt || null,
    };
  },
});
