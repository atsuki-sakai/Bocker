import { BaseRepository } from '../BaseRepository';
import { MutationCtx, QueryCtx } from '@/convex/_generated/server';
import {
  ListCouponExclusionMenuInput,
  UpsertCouponExclusionMenuInput,
} from '@/services/convex/types/coupon';
export class CouponExclusionMenuRepository extends BaseRepository<'coupon_exclusion_menu'> {
  private static instance: CouponExclusionMenuRepository | null = null;
  constructor() {
    super('coupon_exclusion_menu');
  }

  public static getInstance(): CouponExclusionMenuRepository {
    if (!CouponExclusionMenuRepository.instance) {
      CouponExclusionMenuRepository.instance = new CouponExclusionMenuRepository();
    }
    return CouponExclusionMenuRepository.instance;
  }

  // クーポン除外メニューの存在確認
  async listBySalonId(ctx: QueryCtx, args: ListCouponExclusionMenuInput) {
    const exclusionMenu = await ctx.db
      .query('coupon_exclusion_menu')
      .withIndex('by_salon_coupon_id', (q) =>
        q.eq('salonId', args.salonId).eq('couponId', args.couponId).eq('isArchive', false)
      )
      .collect();

    return exclusionMenu;
  }

  async upsert(ctx: MutationCtx, args: UpsertCouponExclusionMenuInput) {
    const currentExclusionMenus = await ctx.db
      .query('coupon_exclusion_menu')
      .withIndex('by_salon_coupon_id', (q) =>
        q.eq('salonId', args.salonId).eq('couponId', args.couponId).eq('isArchive', false)
      )
      .collect();

    const currentMenuIds = new Set(currentExclusionMenus.map((item) => item.menuId));
    const newMenuIds = new Set(args.selectedMenuIds);

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
      await ctx.db.insert('coupon_exclusion_menu', {
        salonId: args.salonId,
        couponId: args.couponId,
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
