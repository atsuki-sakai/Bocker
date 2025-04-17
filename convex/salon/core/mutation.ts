/**
 * サロンミューテーションAPI
 *
 * サロン関連のデータを更新するためのミューテーションエンドポイントを提供します。
 * サービス層を利用して、データアクセスとビジネスロジックを分離します。
 */

import { mutation } from '../../_generated/server';
import { v } from 'convex/values';
import { validateSalon, validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { salonService } from '@/services/convex/services';
import { ConvexCustomError, throwConvexApiError } from '@/services/convex/shared/utils/error';

export const create = mutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      checkAuth(ctx, true);
      validateSalon(args);

      return await salonService.createSalon(ctx, args);
    } catch (error) {
      throwConvexApiError(error);
    }
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
    try {
      // 1. 認証チェック
      checkAuth(ctx);

      // 2. バリデーション
      validateSalon(args);
      validateRequired(args.id, 'id');

      // 3. サービス層に処理委譲
      return await salonService.updateSalon(ctx, args.id, args);
    } catch (error) {
      // エラーハンドリング
      throwConvexApiError(error);
    }
  },
});

export const upsert = mutation({
  args: {
    id: v.id('salon'),
    clerkId: v.optional(v.string()),
    email: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      checkAuth(ctx);
      validateSalon(args);

      const salon = await ctx.db.get(args.id);

      if (!salon || salon.isArchive) {
        // 新規作成
        return await salonService.createSalon(ctx, {
          ...args,
          clerkId: args.clerkId ?? '',
        });
      } else {
        // 更新
        return await salonService.updateSalon(ctx, args.id, {
          ...args,
        });
      }
    } catch (error) {
      // エラーハンドリング
      throwConvexApiError(error);
    }
  },
});

export const archive = mutation({
  args: {
    id: v.id('salon'),
  },
  handler: async (ctx, args) => {
    try {
      checkAuth(ctx);
      validateRequired(args.id, 'id');

      return await salonService.archiveSalonRelations(ctx, args.id);
    } catch (error) {
      throwConvexApiError(error);
    }
  },
});

export const updateSubscription = mutation({
  args: {
    subscriptionId: v.string(),
    subscriptionStatus: v.string(),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      checkAuth(ctx);
      validateSalon(args);

      const result = await salonService.updateSubscriptionByCustomerId(
        ctx,
        args.stripeCustomerId,
        args.subscriptionId,
        args.subscriptionStatus
      );

      if (!result) {
        const err = new ConvexCustomError(
          'medium',
          'サブスクリプション更新対象のサロンが見つかりません',
          'NOT_FOUND',
          404,
          {
            stripeCustomerId: args.stripeCustomerId,
            subscriptionId: args.subscriptionId,
          }
        );
        throw err;
      }

      return result;
    } catch (error) {
      throwConvexApiError(error);
    }
  },
});

export const createConnectAccount = mutation({
  args: {
    salonId: v.id('salon'),
    accountId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateRequired(args.salonId, 'salonId');
    validateRequired(args.accountId, 'accountId');
    validateRequired(args.status, 'status');

    return await salonService.createConnectAccount(ctx, args);
  },
});

export const updateConnectStatus = mutation({
  args: {
    salonId: v.id('salon'),
    status: v.string(),
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateRequired(args.salonId, 'salonId');
    validateRequired(args.status, 'status');
    validateRequired(args.accountId, 'accountId');

    return await salonService.updateStripeConnectStatus(ctx, args);
  },
});

export const findSalonByConnectId = mutation({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateRequired(args.accountId, 'accountId');

    return await salonService.findSalonByConnectId(ctx, args.accountId);
  },
});

export const getConnectAccountDetails = mutation({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateRequired(args.salonId, 'salonId');

    return await salonService.getConnectAccountDetails(ctx, args.salonId);
  },
});
