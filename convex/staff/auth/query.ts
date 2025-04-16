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

// 組織IDからスタッフ認証を取得
export const findByClerkId = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    const staff = await ctx.db
      .query('staff')
      .withIndex('by_clerk_id', (q) =>
        q.eq('clerkId', args.clerkId).eq('isActive', true).eq('isArchive', false)
      )
      .first();

    if (!staff) {
      return null;
    }

    const staffAuth = await ctx.db
      .query('staff_auth')
      .withIndex('by_staff_id', (q) => q.eq('staffId', staff._id))
      .first();

    return staffAuth;
  },
});
