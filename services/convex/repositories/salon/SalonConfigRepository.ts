import { BaseRepository } from '@/services/convex/repositories/BaseRepository';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { QueryCtx, MutationCtx } from '@/convex/_generated/server';
import { SalonConfigInput } from '@/services/convex/types/salon';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';
/**
 * サロン基本設定リポジトリクラス
 * サロンの基本設定データの操作を提供します
 */
export class SalonConfigRepository extends BaseRepository<'salon_config'> {
  private static instance: SalonConfigRepository | null = null;
  private constructor() {
    super('salon_config');
  }
  public static getInstance(): SalonConfigRepository {
    if (!SalonConfigRepository.instance) {
      SalonConfigRepository.instance = new SalonConfigRepository();
    }
    return SalonConfigRepository.instance;
  }

  async findBySalonId(ctx: QueryCtx, salonId: Id<'salon'>): Promise<Doc<'salon_config'> | null> {
    return await ctx.db
      .query('salon_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', salonId).eq('isArchive', false))
      .first();
  }

  async upsert(ctx: MutationCtx, data: SalonConfigInput): Promise<Id<'salon_config'>> {
    const salonConfig = await ctx.db
      .query('salon_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', data.salonId).eq('isArchive', false))
      .first();

    if (salonConfig) {
      return await this.update(ctx, salonConfig._id, data);
    } else {
      return await this.create(ctx, {
        ...data,
        salonId: data.salonId,
        isArchive: false,
      });
    }
  }
}
