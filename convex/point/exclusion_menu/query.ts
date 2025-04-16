import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { validatePointExclusionMenu } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { pointService } from '@/services/convex/services';

export const list = query({
  args: {
    salonId: v.id('salon'),
    pointConfigId: v.id('point_config'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validatePointExclusionMenu(args);
    const exclusionMenus = await pointService.listExclusionMenu(
      ctx,
      args.salonId,
      args.pointConfigId
    );
    return exclusionMenus;
  },
});
