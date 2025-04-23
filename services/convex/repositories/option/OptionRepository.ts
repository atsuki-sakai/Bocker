import { BaseRepository } from '../BaseRepository';
import { QueryCtx, MutationCtx } from '@/convex/_generated/server';
import { Id } from '@/convex/_generated/dataModel';
import {
  ListBySalonIdInput,
  OptionKillInput,
  OptionCreateInput,
  OptionUpdateInput,
} from '@/services/convex/types/option';
import { throwConvexError } from '@/lib/error';

export class OptionRepository extends BaseRepository<'salon_option'> {
  private static instance: OptionRepository;
  constructor() {
    super('salon_option');
  }

  public static getInstance(): OptionRepository {
    if (!OptionRepository.instance) {
      OptionRepository.instance = new OptionRepository();
    }
    return OptionRepository.instance;
  }

  public async getOption(ctx: QueryCtx, id: Id<'salon_option'>) {
    return await this.get(ctx, id);
  }

  public async updateOption(ctx: MutationCtx, id: Id<'salon_option'>, args: OptionUpdateInput) {
    return await this.update(ctx, id, args);
  }

  public static async createOption(ctx: MutationCtx, args: OptionCreateInput) {
    const salon = await ctx.db.get(args.salonId);
    if (!salon || salon.isArchive) {
      throw throwConvexError({
        message: '指定されたサロンが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたサロンが存在しません',
        callFunc: 'OptionRepository.createOption',
        severity: 'low',
        details: { ...args },
      });
    }

    // isActiveが指定されていない場合はデフォルトでtrueに設定
    const optionData = {
      ...args,
      isActive: args.isActive === undefined ? true : args.isActive,
      isArchive: false,
    };

    return await ctx.db.insert('salon_option', optionData);
  }

  public async kill(ctx: MutationCtx, args: OptionKillInput) {
    await this.kill(ctx, args);
    return true;
  }

  async listBySalonId(ctx: QueryCtx, args: ListBySalonIdInput) {
    return await ctx.db
      .query('salon_option')
      .withIndex('by_salon_id', (q) =>
        q.eq('salonId', args.salonId).eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  }
}
