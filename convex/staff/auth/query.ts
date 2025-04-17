import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';

// スタッフIDからスタッフ認証を取得
export const findByClerkIdByStaffId = query({
  args: {
    staffId: v.id('staff'),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.staffId, 'staffId');
    return await ctx.db
      .query('staff_auth')
      .withIndex('by_staff_id', (q) =>
        q.eq('staffId', args.staffId).eq('isArchive', args.includeArchive || false)
      )
      .first();
  },
});
