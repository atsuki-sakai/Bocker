import { Id } from '@/convex/_generated/dataModel';
import { BaseRepository } from '../BaseRepository';
import { MutationCtx, QueryCtx } from '@/convex/_generated/server';
import { CreateCouponConfigInput, UpdateCouponConfigInput } from '@/services/convex/types/coupon';
import { throwConvexError } from '@/lib/error';
export class CouponConfigRepository extends BaseRepository<'coupon_config'> {
  private static instance: CouponConfigRepository | null = null;
  constructor() {
    super('coupon_config');
  }

  public static getInstance(): CouponConfigRepository {
    if (!CouponConfigRepository.instance) {
      CouponConfigRepository.instance = new CouponConfigRepository();
    }
    return CouponConfigRepository.instance;
  }
  async findByCouponId(ctx: QueryCtx, args: Id<'coupon'>) {
    return await ctx.db
      .query('coupon_config')
      .withIndex('by_coupon_id', (q) => q.eq('couponId', args))
      .first();
  }
  async createCouponConfig(ctx: MutationCtx, args: CreateCouponConfigInput) {
    return await this.create(ctx, args);
  }

  async updateCouponConfig(
    ctx: MutationCtx,
    id: Id<'coupon_config'>,
    args: UpdateCouponConfigInput
  ) {
    const couponConfig = await ctx.db.get(id);
    if (!couponConfig || couponConfig.isArchive) {
      throw throwConvexError({
        message: '指定されたクーポン設定が存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたクーポン設定が存在しません',
        callFunc: 'CouponConfigRepository.updateCouponConfig',
        severity: 'low',
        details: { ...args },
      });
    }

    return await this.update(ctx, id, args);
  }
}
