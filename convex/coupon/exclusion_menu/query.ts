import { checkAuth } from '../../../services/convex/shared/utils/auth';
import { validateCouponExclusionMenu } from '../../../services/convex/shared/utils/validation';
import { query } from '../../_generated/server';
import { v } from 'convex/values';
import { couponService } from '../../../services/convex/services';

export const list = query({
  args: {
    salonId: v.id('salon'),
    couponId: v.id('coupon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCouponExclusionMenu(args);
    return await couponService.listCouponExclusionMenu(ctx, args);
  },
});
