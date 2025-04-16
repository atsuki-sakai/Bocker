import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';

export const get = query({
  args: {
    id: v.id('carte_detail'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.id, 'id');
    return await ctx.db.get(args.id);
  },
});
