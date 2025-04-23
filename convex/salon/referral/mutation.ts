import { v } from 'convex/values';
import { mutation } from '@/convex/_generated/server';
import { throwConvexError } from '@/lib/error';
import { generateReferralCode } from '@/lib/utils';

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
      throw error;
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
      throw throwConvexError({
        message: '指定されたサロンの招待プログラムが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたサロンの招待プログラムが存在しません',
        callFunc: 'salon.referral.incrementReferralCount',
        severity: 'low',
        details: { ...args },
      });
    }

    await ctx.db.patch(args.referralId, {
      referralCount: referral.referralCount ? referral.referralCount + 1 : 1,
      totalReferralCount: referral.totalReferralCount ? referral.totalReferralCount + 1 : 1,
    });
  },
});
