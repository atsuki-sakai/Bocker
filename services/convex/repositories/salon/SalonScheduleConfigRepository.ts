import { BaseRepository } from '@/services/convex/repositories/BaseRepository';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { QueryCtx, MutationCtx } from '@/convex/_generated/server';
import { SalonScheduleConfigInput } from '@/services/convex/types/salon';
import { throwConvexError } from '@/lib/error';
/**
 * サロンスケジュール設定リポジトリクラス
 * サロンのスケジュール設定データの操作を提供します
 */
export class SalonScheduleConfigRepository extends BaseRepository<'salon_schedule_config'> {
  private static instance: SalonScheduleConfigRepository | null = null;
  private constructor() {
    super('salon_schedule_config');
  }
  public static getInstance(): SalonScheduleConfigRepository {
    if (!SalonScheduleConfigRepository.instance) {
      SalonScheduleConfigRepository.instance = new SalonScheduleConfigRepository();
    }
    return SalonScheduleConfigRepository.instance;
  }

  async findBySalonId(
    ctx: QueryCtx,
    salonId: Id<'salon'>
  ): Promise<Doc<'salon_schedule_config'> | null> {
    return await ctx.db
      .query('salon_schedule_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', salonId).eq('isArchive', false))
      .first();
  }

  async upsert(
    ctx: MutationCtx,
    data: SalonScheduleConfigInput
  ): Promise<Id<'salon_schedule_config'>> {
    if (!data.salonId) {
      throw throwConvexError({
        message: 'サロンIDが必要です',
        status: 400,
        code: 'INVALID_ARGUMENT',
        title: '必須項目が不足しています',
        callFunc: 'salonScheduleConfigRepository.upsert',
        severity: 'low',
        details: {
          ...data,
        },
      });
    }

    const existing = await this.findBySalonId(ctx, data.salonId);

    if (existing) {
      await this.update(ctx, existing._id, data);
      return existing._id;
    } else {
      // salonIdが存在することを保証したデータを作成
      const createData = {
        ...data,
        salonId: data.salonId, // 前のチェックでnullやundefinedでないことは確認済み
      };
      return await this.create(ctx, createData);
    }
  }
}
