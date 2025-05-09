import { BaseRepository } from '../BaseRepository';
import { ConvexError } from 'convex/values';
import { MutationCtx, QueryCtx } from '@/convex/_generated/server';
import { killRecord } from '@/services/convex/shared/utils/helper';
import {
  CreateCouponInput,
  UpdateCouponInput,
  ListCouponInput,
  FindByCouponUidInput,
} from '@/services/convex/types/coupon';
import { Id } from '@/convex/_generated/dataModel';
export class CouponRepository extends BaseRepository<'coupon'> {
  private static instance: CouponRepository | null = null;
  constructor() {
    super('coupon');
  }

  public static getInstance(): CouponRepository {
    if (!CouponRepository.instance) {
      CouponRepository.instance = new CouponRepository();
    }
    return CouponRepository.instance;
  }

  async createCoupon(ctx: MutationCtx, args: CreateCouponInput) {
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      throw new ConvexError({
        message: '指定されたサロンが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたサロンが存在しません',
        details: { ...args },
      });
    }

    return await this.create(ctx, args);
  }

  async updateCoupon(ctx: MutationCtx, id: Id<'coupon'>, args: UpdateCouponInput) {
    const coupon = await ctx.db.get(id);
    if (!coupon || coupon.isArchive) {
      throw new ConvexError({
        message: '指定されたクーポンが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたクーポンが存在しません',
        details: { ...args },
      });
    }
    return await this.update(ctx, id, args);
  }

  async killRelatedTables(ctx: MutationCtx, id: Id<'coupon'>) {
    const coupon = await ctx.db.get(id);
    if (!coupon || coupon.isArchive) {
      throw new ConvexError({
        message: '指定されたクーポンが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたクーポンが存在しません',
        details: { id },
      });
    }
    const couponConfig = await ctx.db
      .query('coupon_config')
      .withIndex('by_coupon_id', (q) => q.eq('couponId', id))
      .first();
    if (!couponConfig || couponConfig.isArchive) {
      throw new ConvexError({
        message: '指定されたクーポン設定が存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたクーポン設定が存在しません',
        details: { id },
      });
    }
    await killRecord(ctx, id);
    await killRecord(ctx, couponConfig._id);

    return {
      deletedCouponId: id,
      deletedCouponConfigId: couponConfig._id,
    };
  }

  // サロンIDからクーポン一覧を取得
  async listBySalonId(ctx: QueryCtx, args: ListCouponInput) {
    return await ctx.db
      .query('coupon')
      .withIndex('by_salon_id', (q) =>
        q.eq('salonId', args.salonId).eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  }

  // サロンIDとクーポンUIDからクーポンを取得
  async findByCouponUid(ctx: QueryCtx, args: FindByCouponUidInput) {
    return await ctx.db
      .query('coupon')
      .withIndex('by_salon_coupon_uid_active', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('couponUid', args.couponUid)
          .eq('isActive', args.activeOnly || true)
          .eq('isArchive', false)
      )
      .first()
  }
}
