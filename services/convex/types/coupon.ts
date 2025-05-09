import { Id } from '@/convex/_generated/dataModel';
import { CouponDiscountType } from '@/services/convex/shared/types/common';
import { PaginationOptions } from 'convex/server';

// COUPON
export type CreateCouponInput = {
  salonId: Id<'salon'>;
  couponUid?: string;
  name?: string;
  discountType?: CouponDiscountType;
  percentageDiscountValue?: number;
  fixedDiscountValue?: number;
  isActive?: boolean;
};

export type UpdateCouponInput = {
  couponUid?: string;
  name?: string;
  discountType?: CouponDiscountType;
  percentageDiscountValue?: number;
  fixedDiscountValue?: number;
  isActive?: boolean;
};

export type UpdateCouponRelatedTablesInput = {
  couponId: Id<'coupon'>;
  couponConfigId: Id<'coupon_config'>;
  salonId: Id<'salon'>;
  couponUid?: string;
  name?: string;
  discountType?: CouponDiscountType;
  percentageDiscountValue?: number;
  fixedDiscountValue?: number;
  isActive?: boolean;
  startDate_unix?: number;
  endDate_unix?: number;
  maxUseCount?: number;
  numberOfUse?: number;
  selectedMenuIds?: Id<'menu'>[];
};

export type CreateCouponRelatedTablesInput = Omit<
  UpdateCouponRelatedTablesInput,
  'couponId' | 'couponConfigId'
>;

export type ListCouponInput = {
  salonId: Id<'salon'>;
  paginationOpts: PaginationOptions;
  includeArchive?: boolean;
  sort?: 'asc' | 'desc';
};

// COUPON CONFIG
export type FindByCouponUidInput = {
  salonId: Id<'salon'>
  couponUid: string
  activeOnly?: boolean
}

export type CreateCouponConfigInput = {
  salonId: Id<'salon'>;
  couponId: Id<'coupon'>;
  startDate_unix?: number;
  endDate_unix?: number;
  maxUseCount?: number;
  numberOfUse?: number;
};

export type UpdateCouponConfigInput = {
  startDate_unix?: number;
  endDate_unix?: number;
  maxUseCount?: number;
  numberOfUse?: number;
};

// EXCLUSION MENU
export type ListCouponExclusionMenuInput = {
  salonId: Id<'salon'>;
  couponId: Id<'coupon'>;
};

export type UpsertCouponExclusionMenuInput = {
  salonId: Id<'salon'>;
  couponId: Id<'coupon'>;
  selectedMenuIds: Id<'menu'>[];
};
