import { BaseRepository } from '@/services/convex/repositories/BaseRepository';
import { Id } from '@/convex/_generated/dataModel';
import { QueryCtx, MutationCtx } from '@/convex/_generated/server';

export class PointExclusionMenuRepository extends BaseRepository<'point_exclusion_menu'> {
  private static instance: PointExclusionMenuRepository | null = null;
  private constructor() {
    super('point_exclusion_menu');
  }

  public static getInstance(): PointExclusionMenuRepository {
    if (!PointExclusionMenuRepository.instance) {
      PointExclusionMenuRepository.instance = new PointExclusionMenuRepository();
    }
    return PointExclusionMenuRepository.instance;
  }

  async listBySalonIdAndPointConfigId(
    ctx: QueryCtx,
    salonId: Id<'salon'>,
    pointConfigId: Id<'point_config'>
  ) {
    const exclusionMenus = await ctx.db
      .query('point_exclusion_menu')
      .withIndex('by_salon_point_config_id', (q) =>
        q.eq('salonId', salonId).eq('pointConfigId', pointConfigId).eq('isArchive', false)
      )
      .collect();
    return exclusionMenus.map((item) => item.menuId) ?? []
  }

  async upsert(
    ctx: MutationCtx,
    salonId: Id<'salon'>,
    pointConfigId: Id<'point_config'>,
    selectedMenuIds: Id<'menu'>[]
  ) {
    // 1. 現在DBに保存されている除外メニューを取得
    const currentExclusionMenus = await ctx.db
      .query('point_exclusion_menu')
      .withIndex('by_salon_point_config_id', (q) =>
        q.eq('salonId', salonId).eq('pointConfigId', pointConfigId).eq('isArchive', false)
      )
      .collect();

    const currentMenuIds = new Set(currentExclusionMenus.map((item) => item.menuId));
    const newMenuIds = new Set(selectedMenuIds);

    // 2. 削除すべきメニューを特定（DBにあるが新しいリストにない）
    const menuIdsToRemove = [...currentMenuIds].filter((id) => !newMenuIds.has(id));

    // 3. 追加すべきメニューを特定（新しいリストにあるがDBにない）
    const menuIdsToAdd = [...newMenuIds].filter((id) => !currentMenuIds.has(id));

    // 4. トランザクション内で削除と追加を実行
    const removedIds = [];
    for (const menuId of menuIdsToRemove) {
      const menuToRemove = currentExclusionMenus.find((item) => item.menuId === menuId);
      if (menuToRemove) {
        await ctx.db.delete(menuToRemove._id);
        removedIds.push(menuId);
      }
    }

    const addedIds = [];
    for (const menuId of menuIdsToAdd) {
      await ctx.db.insert('point_exclusion_menu', {
        salonId: salonId,
        pointConfigId: pointConfigId,
        menuId: menuId,
        isArchive: false,
      });
      addedIds.push(menuId);
    }

    return {
      added: addedIds,
      removed: removedIds,
    };
  }
}
