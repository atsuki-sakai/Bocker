import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { validateCustomerPoints } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';

// サロンと顧客IDから顧客ポイントを取得
export const findBySalonAndCustomerId = query({
  args: {
    salonId: v.id('salon'),
    customerId: v.id('customer'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCustomerPoints(args);
    return await ctx.db
      .query('customer_points')
      .withIndex('by_salon_customer_archive', (q) =>
        q.eq('salonId', args.salonId).eq('customerId', args.customerId).eq('isArchive', false)
      )
      .first();
  },
});
