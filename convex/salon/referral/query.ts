import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';

export const findReferralCodeByCustomerId = query({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const salon = await ctx.db
      .query('salon')
      .withIndex('by_stripe_customer_id', (q) =>
        q.eq('stripeCustomerId', args.stripeCustomerId).eq('isArchive', false)
      )
      .first();

    if (!salon) {
      const salonError = new ConvexCustomError(
        'low',
        '指定されたStripe顧客IDに対応するサロンが存在しません',
        'NOT_FOUND',
        404,
        { ...args }
      );
      throw salonError;
    }

    const referral = await ctx.db
      .query('salon_referral')
      .withIndex('by_salon_id', (q) => q.eq('salonId', salon._id).eq('isArchive', false))
      .first();

    if (!referral) {
      const referralError = new ConvexCustomError(
        'low',
        '指定されたサロンの招待プログラムが存在しません',
        'NOT_FOUND',
        404,
        { ...args }
      );
      throw referralError;
    }

    return referral;
  },
});

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

export const getEmailsByReferralCount = query({
  args: {
    tierCount: v.number(),
  },
  handler: async (ctx, args) => {
    const batchSize = 100; // Process in smaller batches
    let allSalonEmails: string[] = [];
    let cursor = null;
    let hasMore = true;

    // Process in batches using pagination
    while (hasMore) {
      const batch = await ctx.db
        .query('salon_referral')
        .filter((q) => q.gte(q.field('referralCount'), args.tierCount))
        .paginate({ cursor, numItems: batchSize });

      // Fetch all salons in one batch
      const salons = await Promise.all(batch.page.map((referral) => ctx.db.get(referral.salonId)));

      // Extract emails, ensuring they are all strings (no undefined values)
      const emails = salons
        .filter(
          (salon): salon is NonNullable<typeof salon> => salon !== null && salon !== undefined
        )
        .map((salon) => salon.email)
        .filter((email): email is string => email !== undefined && email !== null);

      // Add emails to the result array
      allSalonEmails = [...allSalonEmails, ...emails];

      // Check if we need to continue
      hasMore = !batch.isDone;
      cursor = batch.continueCursor;

      // Safety check to avoid hitting read limits
      if (allSalonEmails.length > 500) break;
    }

    return [
      {
        tier: args.tierCount,
      },
      allSalonEmails,
    ];
  },
});

