import { BaseRepository } from '@/services/convex/repositories/BaseRepository';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { QueryCtx, MutationCtx } from '@/convex/_generated/server';
import { SalonApiConfigInput } from '@/services/convex/types/salon';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';
/**
 * サロンAPI設定リポジトリクラス
 * サロンのAPI設定データの操作を提供します
 */
export class SalonApiConfigRepository extends BaseRepository<'salon_api_config'> {
  private static instance: SalonApiConfigRepository | null = null;
  private constructor() {
    super('salon_api_config');
  }
  public static getInstance(): SalonApiConfigRepository {
    if (!SalonApiConfigRepository.instance) {
      SalonApiConfigRepository.instance = new SalonApiConfigRepository();
    }
    return SalonApiConfigRepository.instance;
  }

  async findBySalonId(
    ctx: QueryCtx,
    salonId: Id<'salon'>
  ): Promise<Doc<'salon_api_config'> | null> {
    return await ctx.db
      .query('salon_api_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', salonId).eq('isArchive', false))
      .first();
  }

  async upsert(ctx: MutationCtx, data: SalonApiConfigInput): Promise<Id<'salon_api_config'>> {
    if (!data.salonId) {
      const err = new ConvexCustomError('low', 'サロンIDが必要です', 'INVALID_ARGUMENT', 400, {
        ...data,
      });
      throw err;
    }

    const existing = await this.findBySalonId(ctx, data.salonId);

    if (existing) {
      await this.update(ctx, existing._id, data);
      return existing._id;
    } else {
      return await this.create(ctx, {
        ...data,
        isArchive: false,
        salonId: data.salonId,
      });
    }
  }
}
