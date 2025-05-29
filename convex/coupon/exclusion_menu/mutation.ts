
import { v } from 'convex/values';
import { mutation } from '../../_generated/server';
import { createRecord, killRecord } from '@/convex/utils/helpers';

export const upsertExclusionMenu = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    coupon_id: v.id('coupon'),
    selected_menu_ids: v.array(v.id('menu')),
  },
  handler: async (ctx, args) => {
    const currentExclusionMenus = await ctx.db
      .query('coupon_exclusion_menu')
      .withIndex('by_tenant_org_coupon_menu_archive', (q) =>
        q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('coupon_id', args.coupon_id)
      ).collect();
    const currentMenuIds = new Set(currentExclusionMenus.map((item) => item.menu_id));
    const newMenuIds = new Set(args.selected_menu_ids);

    // 2. 削除すべきメニューを特定（DBにあるが新しいリストにない）
    const menuIdsToRemove = [...currentMenuIds].filter((id) => !newMenuIds.has(id));

    // 3. 追加すべきメニューを特定（新しいリストにあるがDBにない）
    const menuIdsToAdd = [...newMenuIds].filter((id) => !currentMenuIds.has(id));

    // 4. トランザクション内で削除と追加を実行
    const removedIds = [];
    for (const menuId of menuIdsToRemove) {
      const menuToRemove = currentExclusionMenus.find((item) => item.menu_id === menuId);
      if (menuToRemove) {
        await killRecord(ctx,menuToRemove._id);
        removedIds.push(menuId);
      }
    }

    const addedIds = [];
    for (const menuId of menuIdsToAdd) {
      await createRecord(ctx,'coupon_exclusion_menu', {
        tenant_id: args.tenant_id,
        org_id: args.org_id,
        coupon_id: args.coupon_id,
        menu_id: menuId
      });
      addedIds.push(menuId);
    }

    return {
      added: addedIds,
      removed: removedIds,
    };
  },
});
