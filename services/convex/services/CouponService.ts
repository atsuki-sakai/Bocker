import {
  CouponRepository,
  CouponConfigRepository,
  CouponExclusionMenuRepository,
} from '@/services/convex/repositories/coupon';
import { MutationCtx, QueryCtx } from '@/convex/_generated/server';
import {
  CreateCouponInput,
  UpdateCouponInput,
  ListCouponInput,
  FindByCouponUidInput,
  CreateCouponConfigInput,
  UpdateCouponConfigInput,
  ListCouponExclusionMenuInput,
  UpsertCouponExclusionMenuInput,
  UpdateCouponRelatedTablesInput,
  CreateCouponRelatedTablesInput,
} from '@/services/convex/types/coupon';
import { Id } from '@/convex/_generated/dataModel';

class CouponService {
  private static instance: CouponService | null = null;

  private constructor(
    private couponRepository: CouponRepository,
    private couponConfigRepository: CouponConfigRepository,
    private couponExclusionMenuRepository: CouponExclusionMenuRepository
  ) {}

  public static getInstance(): CouponService {
    if (!CouponService.instance) {
      CouponService.instance = new CouponService(
        CouponRepository.getInstance(),
        CouponConfigRepository.getInstance(),
        CouponExclusionMenuRepository.getInstance()
      );
    }
    return CouponService.instance;
  }


  async findCouponComplete(ctx: QueryCtx, data: Id<'coupon'>, salonId: Id<'salon'>) {
    const [coupon, couponConfig, couponExclusionMenus] = await Promise.all([
      this.couponRepository.find(ctx, data),
      this.couponConfigRepository.findByCouponId(ctx, data),
      this.couponExclusionMenuRepository.listBySalonId(ctx, {
        salonId: salonId,
        couponId: data,
      }),
    ]);
    return {
      coupon,
      couponConfig,
      couponExclusionMenus,
    };
  }

  async updateCouponRelatedTables(ctx: MutationCtx, data: UpdateCouponRelatedTablesInput) {
    const [couponId, couponConfigId, couponExclusionMenus] = await Promise.all([
      this.couponRepository.updateCoupon(ctx, data.couponId, {
        couponUid: data.couponUid,
        name: data.name,
        discountType: data.discountType,
        percentageDiscountValue: data.percentageDiscountValue,
        fixedDiscountValue: data.fixedDiscountValue,
        isActive: data.isActive,
      }),
      this.couponConfigRepository.updateCouponConfig(ctx, data.couponConfigId, {
        startDateUnix: data.startDateUnix,
        endDateUnix: data.endDateUnix,
        maxUseCount: data.maxUseCount,
        numberOfUse: data.numberOfUse,
      }),
      this.couponExclusionMenuRepository.upsert(ctx, {
        salonId: data.salonId,
        couponId: data.couponId,
        selectedMenuIds: data.selectedMenuIds ?? [],
      }),
    ]);

    return {
      couponId,
      couponConfigId,
      couponExclusionMenus,
    };
  }

  async create(ctx: MutationCtx, data: CreateCouponInput) {
    return await this.couponRepository.createCoupon(ctx, data);
  }

  async createCouponRelatedTables(ctx: MutationCtx, data: CreateCouponRelatedTablesInput) {
    const couponId = await this.couponRepository.createCoupon(ctx, {
      salonId: data.salonId,
      couponUid: data.couponUid,
      name: data.name,
      discountType: data.discountType,
      percentageDiscountValue: data.percentageDiscountValue,
      fixedDiscountValue: data.fixedDiscountValue,
      isActive: data.isActive,
    });
    const couponConfigId = await this.couponConfigRepository.createCouponConfig(ctx, {
      salonId: data.salonId,
      couponId: couponId,
      startDateUnix: data.startDateUnix,
      endDateUnix: data.endDateUnix,
      maxUseCount: data.maxUseCount,
      numberOfUse: data.numberOfUse,
    });
    const couponExclusionMenus = await this.couponExclusionMenuRepository.upsert(ctx, {
      salonId: data.salonId,
      couponId: couponId,
      selectedMenuIds: data.selectedMenuIds ?? [],
    });
    return {
      couponId,
      couponConfigId,
      couponExclusionMenus,
    };
  }

  async update(ctx: MutationCtx, id: Id<'coupon'>, data: UpdateCouponInput) {
    return await this.couponRepository.updateCoupon(ctx, id, data);
  }

  async killRelatedTables(ctx: MutationCtx, id: Id<'coupon'>) {
    return await this.couponRepository.killRelatedTables(ctx, id);
  }

  async list(ctx: QueryCtx, data: ListCouponInput) {
    return await this.couponRepository.listBySalonId(ctx, data);
  }

  async findByCouponUid(ctx: QueryCtx, data: FindByCouponUidInput) {
    return await this.couponRepository.findByCouponUid(ctx, data);
  }

  async findByCouponId(ctx: QueryCtx, data: Id<'coupon'>) {
    return await this.couponConfigRepository.findByCouponId(ctx, data);
  }

  async createCouponConfig(ctx: MutationCtx, data: CreateCouponConfigInput) {
    return await this.couponConfigRepository.createCouponConfig(ctx, data);
  }

  async updateCouponConfig(
    ctx: MutationCtx,
    id: Id<'coupon_config'>,
    data: UpdateCouponConfigInput
  ) {
    return await this.couponConfigRepository.updateCouponConfig(ctx, id, data);
  }

  async listCouponExclusionMenu(ctx: QueryCtx, data: ListCouponExclusionMenuInput) {
    return await this.couponExclusionMenuRepository.listBySalonId(ctx, data);
  }

  async upsertCouponExclusionMenu(ctx: MutationCtx, data: UpsertCouponExclusionMenuInput) {
    return await this.couponExclusionMenuRepository.upsert(ctx, data);
  }
}

export default CouponService;
