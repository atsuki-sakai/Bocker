import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { validateStaffConfig } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
//スタッフIDからスタッフ設定を取得
export const findByStaffId = query({
  args: {
    staffId: v.id('staff'),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaffConfig(args);
    return await ctx.db
      .query('staff_config')
      .withIndex('by_staff_id', (q) =>
        q.eq('staffId', args.staffId).eq('isArchive', args.includeArchive || false)
      )
      .first();
  },
});
