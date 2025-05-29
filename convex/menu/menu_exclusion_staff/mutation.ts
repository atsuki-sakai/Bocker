import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { killRecord, archiveRecord, createRecord } from '@/convex/utils/helpers';
import { checkAuth } from '@/convex/utils/auth';
import { ConvexError } from 'convex/values';
import { ERROR_SEVERITY, ERROR_STATUS_CODE } from '@/lib/errors/constants';


export const create = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    menu_id: v.id('menu'),
    staff_id: v.id('staff'),
  },
  returns: v.boolean(),
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
    if (exclusionStaff) {
      console.log('exclusionStaff', exclusionStaff);
      return true;
    }
    await createRecord(ctx, 'menu_exclusion_staff', args);
    return true;
  },
});


export const upsert = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
    selected_menu_ids: v.array(v.id('menu')),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    // 1. 現在DBに保存されている除外メニューを取得
    const currentExclusionMenus = await ctx.db
      .query('menu_exclusion_staff')
      .withIndex('by_tenant_org_staff_menu_archive', (q) =>
        q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('staff_id', args.staff_id)
      )
      .collect();

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
        await killRecord(ctx, menuToRemove._id);
        removedIds.push(menuId);
      }
    }

    const addedIds = [];
    for (const menuId of menuIdsToAdd) {
      await createRecord(ctx, 'menu_exclusion_staff', {
        tenant_id: args.tenant_id,
        org_id: args.org_id,
        staff_id: args.staff_id,
        menu_id: menuId,
        is_archive: false,
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
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
    menu_id: v.id('menu'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    const menuExclusionStaff = await ctx.db
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
    if (!menuExclusionStaff || menuExclusionStaff.is_archive) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'menu.menu_exclusion_staff.archive',
        message: '指定されたメニュー除外スタッフが存在しません',
        code: 'NOT_FOUND',
        title: '指定されたメニュー除外スタッフが存在しません',
        details: {
          ...args,
        },
      });
    }
    return await archiveRecord(ctx, menuExclusionStaff._id);
  },
});

export const kill = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
    menu_id: v.id('menu'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    const menuExclusionStaff = await ctx.db
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
    if (!menuExclusionStaff || menuExclusionStaff.is_archive) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'menu.menu_exclusion_staff.kill',
        message: '指定されたメニュー除外スタッフが存在しません',
        code: 'NOT_FOUND',
        title: '指定されたメニュー除外スタッフが存在しません',
        details: {
          ...args,
        },
      });
    }
    return await killRecord(ctx, menuExclusionStaff._id);
  },
});
