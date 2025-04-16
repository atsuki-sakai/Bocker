import { v } from 'convex/values';
import { mutation, query } from '@/convex/_generated/server';
import { throwConvexApiError } from '@/services/convex/shared/utils/error';
import { generateReferralCode } from '@/lib/utils';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';
export const create = mutation({
  args: {
    salonId: v.id('salon'),
    referralBySalon: v.optional(v.id('salon')),
  },
  handler: async (ctx, args) => {
    try {
      const referralCode = generateReferralCode();
      const salonReferralId = await ctx.db.insert('salon_referral', {
        salonId: args.salonId,
        referralCode: referralCode,
        referralCount: 0,
        referralBySalon: args.referralBySalon,
        isArchive: false,
      });
      return salonReferralId;
    } catch (error) {
      console.error('Referral作成エラー:', error);
      throwConvexApiError(error);
    }
  },
});

export const updateReferralBySalon = mutation({
  args: {
    inviteSalonId: v.id('salon'),
    referralCode: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // 招待コードにマッチするサロンのリファラルを取得
      const referralSalon = await ctx.db
        .query('salon_referral')
        .withIndex('by_referral_code', (q) => q.eq('referralCode', args.referralCode))
        .first();

      if (!referralSalon) {
        const reffrralError = new ConvexCustomError(
          'low',
          '指定された招待コードに対応するサロンが存在しません',
          'NOT_FOUND',
          404,
          { ...args }
        );
        throw reffrralError;
      }
      await ctx.db.patch(referralSalon._id, {
        referralCount: referralSalon.referralCount ? referralSalon.referralCount + 1 : 1,
      });
      const inviteSalon = await ctx.db
        .query('salon_referral')
        .withIndex('by_salon_id', (q) => q.eq('salonId', args.inviteSalonId))
        .first();
      if (!inviteSalon) {
        const reffrralError = new ConvexCustomError(
          'low',
          '指定された招待コードに対応するサロンが存在しません',
          'NOT_FOUND',
          404,
          { ...args }
        );
        throw reffrralError;
      }
      await ctx.db.patch(inviteSalon._id, {
        referralBySalon: referralSalon.salonId,
      });
    } catch (error) {
      console.error('Referral更新エラー:', error);
      throwConvexApiError(error);
    }
  },
});

export const incrementReferralCount = mutation({
  args: {
    referralId: v.id('salon_referral'),
  },
  handler: async (ctx, args) => {
    const referral = await ctx.db.get(args.referralId);
    if (!referral) {
      const reffrralError = new ConvexCustomError(
        'medium',
        '指定されたサロンの招待プログラムが存在しません',
        'NOT_FOUND',
        404,
        { ...args }
      );
      throw reffrralError;
    }

    await ctx.db.patch(args.referralId, {
      referralCount: referral.referralCount ? referral.referralCount + 1 : 1,
    });
  },
});
