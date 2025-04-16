import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { validateMenuExclusionStaff } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';

export const get = query({
  args: {
    salonId: v.id('salon'),
    menuId: v.id('menu'),
    staffId: v.id('staff'),
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
    return exclusionStaff;
  },
});

// メニュー対応可能スタッフの存在確認
export const isAvailableStaff = query({
  args: {
    salonId: v.id('salon'),
    menuId: v.id('menu'),
    staffId: v.id('staff'),
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

    return !!exclusionStaff;
  },
});

export const listBySalonAndStaffId = query({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateMenuExclusionStaff(args);
    const exclusionMenus = await ctx.db
      .query('menu_exclusion_staff')
      .withIndex('by_salon_staff_id', (q) =>
        q.eq('salonId', args.salonId).eq('staffId', args.staffId).eq('isArchive', false)
      )
      .collect();

    const menus = await Promise.all(
      exclusionMenus.map(async (item) => {
        const menu = await ctx.db.get(item.menuId);
        return {
          menuId: item.menuId,
          name: menu?.name,
        };
      })
    );

    return menus;
  },
});

export const getExclusionMenus = query({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateMenuExclusionStaff(args);
    const exclusionStaff = await ctx.db
      .query('menu_exclusion_staff')
      .withIndex('by_salon_staff_id', (q) =>
        q.eq('salonId', args.salonId).eq('staffId', args.staffId).eq('isArchive', false)
      )
      .collect();

    if (exclusionStaff.length === 0) {
      return [];
    }
    const menus = await Promise.all(
      exclusionStaff.map(async (item) => {
        const menu = await ctx.db.get(item.menuId);
        return {
          menuId: item.menuId,
          name: menu?.name,
        };
      })
    );
    return menus;
  },
});
