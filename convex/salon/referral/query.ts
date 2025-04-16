import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';

export const getByReferralCode = query({
  args: {
    referralCode: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('salon_referral')
      .withIndex('by_referral_code', (q) =>
        q.eq('referralCode', args.referralCode).eq('isArchive', false)
      )
      .first();
  },
});

export const findBySalonId = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('salon_referral')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .first();
  },
});
