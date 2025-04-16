import SalonService from './SalonService';
import SubscriptionService from './SubscriptionService';
import CouponService from './CouponService';
import PointService from './PointService';
import OptionService from './OptionService';

export const salonService = SalonService.getInstance();
export const subscriptionService = SubscriptionService.getInstance();
export const couponService = CouponService.getInstance();
export const pointService = PointService.getInstance();
export const optionService = OptionService.getInstance();
