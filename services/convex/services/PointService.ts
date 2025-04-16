import {
  PointConfigRepository,
  PointExclusionMenuRepository,
} from '@/services/convex/repositories/point';
import { MutationCtx, QueryCtx } from '@/convex/_generated/server';
import { PointConfigInput } from '@/services/convex/types/point';
import { Id } from '@/convex/_generated/dataModel';

class PointService {
  private static instance: PointService | null = null;

  private constructor(
    private pointConfigRepository: PointConfigRepository,
    private pointExclusionMenuRepository: PointExclusionMenuRepository
  ) {}

  public static getInstance(): PointService {
    if (!PointService.instance) {
      PointService.instance = new PointService(
        PointConfigRepository.getInstance(),
        PointExclusionMenuRepository.getInstance()
      );
    }
    return PointService.instance;
  }

  async findBySalonId(ctx: QueryCtx, salonId: Id<'salon'>) {
    return await this.pointConfigRepository.findBySalonId(ctx, salonId);
  }

  async upsertPointConfig(ctx: MutationCtx, salonId: Id<'salon'>, data: PointConfigInput) {
    return await this.pointConfigRepository.upsert(ctx, salonId, data);
  }

  async upsertExclusionMenu(
    ctx: MutationCtx,
    salonId: Id<'salon'>,
    pointConfigId: Id<'point_config'>,
    selectedMenuIds: Id<'menu'>[]
  ) {
    return await this.pointExclusionMenuRepository.upsert(
      ctx,
      salonId,
      pointConfigId,
      selectedMenuIds
    );
  }

  async listExclusionMenu(ctx: QueryCtx, salonId: Id<'salon'>, pointConfigId: Id<'point_config'>) {
    return await this.pointExclusionMenuRepository.listBySalonIdAndPointConfigId(
      ctx,
      salonId,
      pointConfigId
    );
  }
}

export default PointService;
