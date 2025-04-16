import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { validateRequired } from '@/services/convex/shared/utils/validation';
import { validateCarte } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';

export const get = query({
  args: {
    id: v.id('carte'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.id, 'id');
    return await ctx.db.get(args.id);
  },
});

export const getCustomerCarte = query({
  args: {
    salonId: v.id('salon'),
    customerId: v.id('customer'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCarte(args);
    const carte = await ctx.db
      .query('carte')
      .withIndex('by_salon_customer', (q) =>
        q.eq('salonId', args.salonId).eq('customerId', args.customerId).eq('isArchive', false)
      )
      .first();
    return carte;
  },
});
