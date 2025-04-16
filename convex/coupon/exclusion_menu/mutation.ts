import { checkAuth } from '../../../services/convex/shared/utils/auth';
import { validateCouponExclusionMenu } from '../../../services/convex/shared/utils/validation';
import { v } from 'convex/values';
import { couponService } from '../../../services/convex/services';
import { mutation } from '../../_generated/server';

export const upsert = mutation({
  args: {
    salonId: v.id('salon'),
    couponId: v.id('coupon'),
    selectedMenuIds: v.array(v.id('menu')),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCouponExclusionMenu(args);
    return await couponService.upsertCouponExclusionMenu(ctx, args);
  },
});
