import { BaseRepository } from '@/services/convex/repositories/BaseRepository';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { QueryCtx, MutationCtx } from '@/convex/_generated/server';
import { PointConfigInput } from '@/services/convex/types/point';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';

export class PointConfigRepository extends BaseRepository<'point_config'> {
  private static instance: PointConfigRepository | null = null;
  private constructor() {
    super('point_config');
  }

  public static getInstance(): PointConfigRepository {
    if (!PointConfigRepository.instance) {
      PointConfigRepository.instance = new PointConfigRepository();
    }
    return PointConfigRepository.instance;
  }

  async findBySalonId(ctx: QueryCtx, salonId: Id<'salon'>) {
    return await ctx.db
      .query('point_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', salonId).eq('isArchive', false))
      .first();
  }

  async upsert(
    ctx: MutationCtx,
    id: Id<'salon'>,
    data: PointConfigInput
  ): Promise<Id<'point_config'>> {
    if (!id) {
      const err = new ConvexCustomError('low', 'サロンIDが必要です', 'INVALID_ARGUMENT', 400, {
        ...data,
      });
      throw err;
    }

    const existing = await ctx.db
      .query('point_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', id))
      .first();

    if (existing) {
      await this.update(ctx, existing._id, data);
      return existing._id;
    } else {
      // salonIdが存在することを保証したデータを作成
      const createData = {
        ...data,
        salonId: id,
      };
      return await this.create(ctx, createData);
    }
  }
}
