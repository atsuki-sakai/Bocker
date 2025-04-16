import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { killRecord, archiveRecord } from '@/services/convex/shared/utils/helper';
import { validateMenuExclusionStaff } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';

export const create = mutation({
  args: {
    salonId: v.id('salon'),
    menuId: v.id('menu'),
    staffId: v.id('staff'),
    staffName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateMenuExclusionStaff(args);
    const exclusionStaff = await ctx.db
      .query('menu_exclusion_staff')
      .withIndex('by_salon_menu_staff', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('menuId', args.menuId)
          .eq('staffId', args.staffId)
          .eq('isArchive', false)
      )
      .first();
    if (exclusionStaff) {
      const err = new ConvexCustomError(
        'low',
        '指定されたメニュー除外スタッフはすでに存在します',
        'DUPLICATE_RECORD',
        400,
        {
          ...args,
        }
      );
      throw err;
    }
    const menuExclusionStaffId = await ctx.db.insert('menu_exclusion_staff', {
      ...args,
      isArchive: false,
    });
    return menuExclusionStaffId;
  },
});

export const upsert = mutation({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
    selectedMenuIds: v.array(v.id('menu')),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateMenuExclusionStaff(args);

    // 1. 現在DBに保存されている除外メニューを取得
    const currentExclusionMenus = await ctx.db
      .query('menu_exclusion_staff')
      .withIndex('by_salon_staff_id', (q) =>
        q.eq('salonId', args.salonId).eq('staffId', args.staffId).eq('isArchive', false)
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
      await ctx.db.insert('menu_exclusion_staff', {
        salonId: args.salonId,
        staffId: args.staffId,
        menuId: menuId,
        isArchive: false,
      });
      addedIds.push(menuId);
    }

    return {
      added: addedIds,
      removed: removedIds,
    };
  },
});

export const archive = mutation({
  args: {
    salonId: v.id('salon'),
    menuId: v.id('menu'),
    staffId: v.id('staff'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateMenuExclusionStaff(args);
    const menuExclusionStaff = await ctx.db
      .query('menu_exclusion_staff')
      .withIndex('by_salon_menu_staff', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('menuId', args.menuId)
          .eq('staffId', args.staffId)
          .eq('isArchive', false)
      )
      .first();
    if (!menuExclusionStaff || menuExclusionStaff.isArchive) {
      const err = new ConvexCustomError(
        'low',
        '指定されたメニュー除外スタッフが存在しません',
        'NOT_FOUND',
        404,
        {
          ...args,
        }
      );
      throw err;
    }
    return await archiveRecord(ctx, menuExclusionStaff._id);
  },
});

export const kill = mutation({
  args: {
    salonId: v.id('salon'),
    menuId: v.id('menu'),
    staffId: v.id('staff'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateMenuExclusionStaff(args);
    const menuExclusionStaff = await ctx.db
      .query('menu_exclusion_staff')
      .withIndex('by_salon_menu_staff', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('menuId', args.menuId)
          .eq('staffId', args.staffId)
          .eq('isArchive', false)
      )
      .first();
    if (!menuExclusionStaff || menuExclusionStaff.isArchive) {
      const err = new ConvexCustomError(
        'low',
        '指定されたメニュー除外スタッフが存在しません',
        'NOT_FOUND',
        404,
        { ...args }
      );
      throw err;
    }
    return await killRecord(ctx, menuExclusionStaff._id);
  },
});
