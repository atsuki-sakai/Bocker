import { Id } from '@/convex/_generated/dataModel';
import { BaseRepository } from '../BaseRepository';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';
import { MutationCtx, QueryCtx } from '@/convex/_generated/server';
import { CreateCouponConfigInput, UpdateCouponConfigInput } from '@/services/convex/types/coupon';
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
      const err = new ConvexCustomError(
        'low',
        '指定されたクーポン設定が存在しません',
        'NOT_FOUND',
        404,
        {
          ...args,
        }
      );
      throw err;
    }

    return await this.update(ctx, id, args);
  }
}
