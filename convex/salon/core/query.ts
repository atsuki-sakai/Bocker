/**
 * サロンクエリAPI
 *
 * サロン関連の情報を取得するためのクエリエンドポイントを提供します。
 * サービス層を利用して、データアクセスとビジネスロジックを分離します。
 */

import { v } from 'convex/values';
import { validateSalon, validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { salonService } from '@/services/convex/services';
import { throwConvexApiError } from '@/services/convex/shared/utils/error';
import { query } from '../../_generated/server';

export const get = query({
  args: {
    id: v.id('salon'),
  },
  handler: async (ctx, args) => {
    try {
      checkAuth(ctx);
      validateRequired(args.id, 'id');
      return await salonService.getSalon(ctx, args.id);
    } catch (error) {
      throwConvexApiError(error);
    }
  },
});

export const findByClerkId = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      checkAuth(ctx, true);
      validateSalon(args);
      return await salonService.findSalonByClerkId(ctx, args.clerkId);
    } catch (error) {
      throwConvexApiError(error);
    }
  },
});

export const getRelations = query({
  args: {
    id: v.id('salon'),
  },
  handler: async (ctx, args) => {
    try {
      checkAuth(ctx);
      validateRequired(args.id, 'id');
      return await salonService.getSalonRelations(ctx, args.id);
    } catch (error) {
      throwConvexApiError(error);
    }
  },
});

export const getConnectAccount = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateRequired(args.salonId, 'salonId');

    return await salonService.getConnectAccount(ctx, args.salonId);
  },
});

export const findSalonByConnectId = query({
  args: {
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateRequired(args.accountId, 'accountId');

    return await salonService.findSalonByConnectId(ctx, args.accountId);
  },
});

export const getConnectAccountDetails = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateRequired(args.salonId, 'salonId');

    return await salonService.getConnectAccountDetails(ctx, args.salonId);
  },
});
