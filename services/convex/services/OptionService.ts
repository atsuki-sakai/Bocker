import { OptionRepository } from './../repositories/option/OptionRepository';
import {
  OptionCreateInput,
  ListBySalonIdInput,
  OptionKillInput,
  OptionUpdateInput,
} from './../types/option';
import { MutationCtx, QueryCtx } from '@/convex/_generated/server';
import { Id } from '@/convex/_generated/dataModel';

class OptionService {
  private static instance: OptionService | null = null;

  private constructor(private optionRepository: OptionRepository) {}

  public static getInstance(): OptionService {
    if (!OptionService.instance) {
      OptionService.instance = new OptionService(OptionRepository.getInstance());
    }
    return OptionService.instance;
  }

  public async getOption(ctx: QueryCtx, id: Id<'salon_option'>) {
    return await this.optionRepository.getOption(ctx, id);
  }

  public async updateOption(ctx: MutationCtx, id: Id<'salon_option'>, args: OptionUpdateInput) {
    return await this.optionRepository.updateOption(ctx, id, args);
  }

  public async createOption(ctx: MutationCtx, args: OptionCreateInput) {
    return await this.optionRepository.create(ctx, args);
  }

  public async listBySalonId(ctx: QueryCtx, args: ListBySalonIdInput) {
    return await this.optionRepository.listBySalonId(ctx, args);
  }

  public async killOption(ctx: MutationCtx, args: OptionKillInput) {
    return await this.optionRepository.kill(ctx, args);
  }
}

export default OptionService;
