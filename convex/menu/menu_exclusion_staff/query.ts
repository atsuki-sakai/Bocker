import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '@/convex/utils/auth';

export const get = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
    menu_id: v.id('menu'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    const exclusionStaff = await ctx.db
      .query('menu_exclusion_staff')
      .withIndex('by_tenant_org_staff_menu_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('staff_id', args.staff_id)
          .eq('menu_id', args.menu_id)
          .eq('is_archive', false)
      )
      .first();
    return exclusionStaff;
  },
});

// メニュー対応可能スタッフの存在確認
export const isAvailableStaff = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    menu_id: v.id('menu'),
    staff_id: v.id('staff'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    const exclusionStaff = await ctx.db
      .query('menu_exclusion_staff')
      .withIndex('by_tenant_org_staff_menu_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('staff_id', args.staff_id)
          .eq('menu_id', args.menu_id)
          .eq('is_archive', false)
      )
      .first();

    return !!exclusionStaff;
  },
});

export const listBySalonAndStaffId = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    const exclusionMenus = await ctx.db
      .query('menu_exclusion_staff')
      .withIndex('by_tenant_org_staff_menu_archive', (q) =>
        q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('staff_id', args.staff_id)
      ).collect();

    const menus = await Promise.all(
      exclusionMenus.map(async (item) => {
        const menu = await ctx.db.get(item.menu_id);
        return {
          menu_id: item.menu_id,
          name: menu?.name,
        };
      })
    );

    return menus;
  },
});

export const getExclusionMenus = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    const exclusionStaff = await ctx.db
      .query('menu_exclusion_staff')
      .withIndex('by_tenant_org_staff_menu_archive', (q) =>
        q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('staff_id', args.staff_id)
      )
      .collect();

    if (exclusionStaff.length === 0) {
      return [];
    }
    const menus = await Promise.all(
      exclusionStaff.map(async (item) => {
        const menu = await ctx.db.get(item.menu_id);
        return {
          menu_id: item.menu_id,
          name: menu?.name,
        };
      })
    );
    return menus;
  },
});
