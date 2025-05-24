import { v } from 'convex/values';
import { mutation } from '@/convex/_generated/server';
import { generateReferralCode } from '@/lib/utils';
import { validateStringLength } from '@/convex/utils/validations';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { updateRecord, createRecord } from '@/convex/utils/helpers';

/**
 * テナント紹介プログラムミューテーションAPI
 * 
 * テナントの紹介プログラムを作成するためのミューテーションエンドポイントを提供します。
 * サービス層を利用して、データアクセスとビジネスロジックを分離します。
 */

export const create = mutation({
  args: {
    tenant_id: v.id('tenant')
  },
  handler: async (ctx, args) => {
    const referralCode = generateReferralCode();
    const tenantReferralId = await createRecord(ctx, 'tenant_referral', {
      tenant_id: args.tenant_id,
      referral_code: referralCode,
      referral_point: 0,
      total_referral_count: 0
    });
    return tenantReferralId;
  },
});

export const incrementReferralCount = mutation({
  args: {
    referral_id: v.id('tenant_referral'),
  },
  handler: async (ctx, args) => {
    const referral = await ctx.db.get(args.referral_id);
    if (!referral) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'tenant.referral.incrementReferralCount',
        message: '指定されたテナントの招待プログラムが存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }

    await updateRecord(ctx, args.referral_id, {
      referral_point: referral.referral_point ? referral.referral_point + 1 : 1,
      total_referral_count: referral.total_referral_count ? referral.total_referral_count + 1 : 1,
    });
  },
});

// テナントの紹介数を減らすためのAPI
export const decreaseBalanceReferralCount = mutation({
  args: {
    user_email: v.string(),
  },
  handler: async (ctx, args) => {
    validateStringLength(args.user_email, 'user_email');
    const tenant = await ctx.db
      .query('tenant')
      .withIndex('by_user_email_archive', (q) => q.eq('user_email', args.user_email).eq('is_archive', false))
      .first();
    if (!tenant) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'tenant.referral.decreaseBalanceReferralCount',
        message: 'テナントが見つかりません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }
    const referral = await ctx.db
      .query('tenant_referral')
      .withIndex('by_tenant_archive', (q) => q.eq('tenant_id', tenant._id).eq('is_archive', false))
      .first();
    if (!referral) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'tenant.referral.decreaseBalanceReferralCount',
        message: '招待プログラムが見つかりません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }
    await updateRecord(ctx, referral._id, {
      referral_point: referral.referral_point ? referral.referral_point - 1 : 0,
    });
    return true;
  },
});
