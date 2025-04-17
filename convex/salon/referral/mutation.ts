import { v } from 'convex/values';
import { mutation } from '@/convex/_generated/server';
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
        totalReferralCount: 0,
        isArchive: false,
      });
      return salonReferralId;
    } catch (error) {
      console.error('Referral作成エラー:', error);
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
      totalReferralCount: referral.totalReferralCount ? referral.totalReferralCount + 1 : 1,
    });
  },
});
