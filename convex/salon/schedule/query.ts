import { query } from '../../_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { validateSalonScheduleConfig } from '@/services/convex/shared/utils/validation';
import { salonService } from '@/services/convex/services';

export const findBySalonId = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalonScheduleConfig(args);
    return await salonService.findScheduleConfigBySalonId(ctx, args.salonId);
  },
});
