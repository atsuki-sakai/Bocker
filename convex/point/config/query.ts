import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { pointService } from '@/services/convex/services';

export const findBySalonId = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    validateRequired(args.salonId, 'salonId');
    checkAuth(ctx);
    return await pointService.findBySalonId(ctx, args.salonId);
  },
});
