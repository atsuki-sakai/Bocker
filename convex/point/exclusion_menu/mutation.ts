import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { killRecord, archiveRecord } from '@/services/convex/shared/utils/helper';
import {
  validatePointExclusionMenu,
  validateRequired,
} from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { pointService } from '@/services/convex/services';

export const upsert = mutation({
  args: {
    salonId: v.id('salon'),
    pointConfigId: v.id('point_config'),
    selectedMenuIds: v.array(v.id('menu')),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validatePointExclusionMenu(args);
    await pointService.upsertExclusionMenu(
      ctx,
      args.salonId,
      args.pointConfigId,
      args.selectedMenuIds
    );
  },
});
