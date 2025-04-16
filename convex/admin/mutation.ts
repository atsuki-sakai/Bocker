import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { Id } from '@/convex/_generated/dataModel';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { validateRequired } from '@/services/convex/shared/utils/validation';

// サロンの紹介数を減らすためのAPI
export const decreaseBalanceReferralCount = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateRequired(args.email, 'email');
    const salon = await ctx.db
      .query('salon')
      .withIndex('by_email', (q) => q.eq('email', args.email).eq('isArchive', false))
      .first();
    if (!salon) {
      throw new Error('Salon not found');
    }

    const referral = await ctx.db
      .query('salon_referral')
      .withIndex('by_salon_id', (q) =>
        q.eq('salonId', salon?._id as Id<'salon'>).eq('isArchive', false)
      )
      .first();
    if (!referral) {
      throw new Error('Referral not found');
    }

    await ctx.db.patch(referral._id, {
      referralCount: referral.referralCount ? referral.referralCount - 1 : 0,
      updatedAt: Date.now(),
    });

    return true;
  },
});

// サロンの紹介数を０にするためのAPI
export const resetReferralCount = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);

    const salon = await ctx.db
      .query('salon')
      .withIndex('by_email', (q) => q.eq('email', args.email).eq('isArchive', false))
      .first();
    if (!salon) {
      throw new Error('Salon not found');
    }

    const referral = await ctx.db
      .query('salon_referral')
      .withIndex('by_salon_id', (q) =>
        q.eq('salonId', salon?._id as Id<'salon'>).eq('isArchive', false)
      )
      .first();
    if (!referral) {
      throw new Error('Referral not found');
    }

    await ctx.db.patch(referral._id, {
      referralCount: 0,
    });

    return true;
  },
});

// 紹介数を指定して更新するためのAPI
export const balanceReferralCount = mutation({
  args: {
    email: v.string(),
    newReferralCount: v.number(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    const salon = await ctx.db
      .query('salon')
      .withIndex('by_email', (q) => q.eq('email', args.email).eq('isArchive', false))
      .first();
    if (!salon) {
      throw new Error('Salon not found');
    }

    const referral = await ctx.db
      .query('salon_referral')
      .withIndex('by_salon_id', (q) =>
        q.eq('salonId', salon?._id as Id<'salon'>).eq('isArchive', false)
      )
      .first();
    if (!referral) {
      throw new Error('Referral not found');
    }

    await ctx.db.patch(referral._id, {
      referralCount: args.newReferralCount,
      updatedAt: Date.now(),
    });

    return true;
  },
});
