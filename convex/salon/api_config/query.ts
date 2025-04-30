import { query } from '../../_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { validateSalonApiConfig } from '@/services/convex/shared/utils/validation';
import { salonService } from '@/services/convex/services';

export const getLiffId = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)
    validateSalonApiConfig(args)

    const apiConfig = await salonService.findApiConfigBySalonId(ctx, args.salonId)
    if (!apiConfig) {
      return null
    }

    return apiConfig.liffId
  },
})

export const findBySalonId = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalonApiConfig(args);
    return await salonService.findApiConfigBySalonId(ctx, args.salonId);
  },
});
