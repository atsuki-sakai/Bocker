import { query } from '../../_generated/server';
import { v } from 'convex/values';
import { validateCouponConfig } from '../../../services/convex/shared/utils/validation';
import { checkAuth } from '../../../services/convex/shared/utils/auth';
import { couponService } from '../../../services/convex/services';

export const findByCouponId = query({
  args: {
    couponId: v.id('coupon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCouponConfig(args);
    return await couponService.findByCouponId(ctx, args.couponId);
  },
});
