import { mutation, query } from './../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { KillRecord, trashRecord, authCheck } from './../helpers';
import { CONVEX_ERROR_CODES } from './../constants';
import { validatePointExclusionMenu } from './../validators';

export const add = mutation({
  args: {
    salonId: v.id('salon'),
    pointConfigId: v.id('point_config'),
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validatePointExclusionMenu(args);
    const pointExclusionMenu = await ctx.db
      .query('point_exclusion_menu')
      .withIndex('by_salon_point_config_menu', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('pointConfigId', args.pointConfigId)
          .eq('menuId', args.menuId)
          .eq('isArchive', false)
      )
      .first();
    if (pointExclusionMenu) {
      console.error(
        'AddPointExclusionMenu: 指定されたポイント基本設定除外メニューはすでに存在します',
        { ...args }
      );
      throw new ConvexError({
        message: '指定されたポイント基本設定除外メニューはすでに存在します',
        code: CONVEX_ERROR_CODES.DUPLICATE_RECORD,
        status: 400,
        severity: 'low',
        context: {
          pointConfigId: args.pointConfigId,
        },
      });
    }
    const pointExclusionMenuId = await ctx.db.insert('point_exclusion_menu', {
      ...args,
      isArchive: false,
    });
    return pointExclusionMenuId;
  },
});

export const get = query({
  args: {
    salonId: v.id('salon'),
    pointConfigId: v.id('point_config'),
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const exclusionMenu = await ctx.db
      .query('point_exclusion_menu')
      .withIndex('by_salon_point_config_menu', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('pointConfigId', args.pointConfigId)
          .eq('menuId', args.menuId)
          .eq('isArchive', false)
      )
      .first();
    return exclusionMenu;
  },
});

export const upsert = mutation({
  args: {
    salonId: v.id('salon'),
    pointConfigId: v.id('point_config'),
    selectedMenuIds: v.array(v.id('menu')),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);

    // 1. 現在DBに保存されている除外メニューを取得
    const currentExclusionMenus = await ctx.db
      .query('point_exclusion_menu')
      .withIndex('by_salon_point_config_id', (q) =>
        q.eq('salonId', args.salonId).eq('pointConfigId', args.pointConfigId).eq('isArchive', false)
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
      await ctx.db.insert('point_exclusion_menu', {
        salonId: args.salonId,
        pointConfigId: args.pointConfigId,
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

export const list = query({
  args: {
    salonId: v.id('salon'),
    pointConfigId: v.id('point_config'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const exclusionMenus = await ctx.db
      .query('point_exclusion_menu')
      .withIndex('by_salon_point_config_id', (q) =>
        q.eq('salonId', args.salonId).eq('pointConfigId', args.pointConfigId).eq('isArchive', false)
      )
      .collect();
    return exclusionMenus.map((item) => item.menuId);
  },
});

export const trash = mutation({
  args: {
    salonId: v.id('salon'),
    pointConfigId: v.id('point_config'),
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const pointExclusionMenu = await ctx.db
      .query('point_exclusion_menu')
      .withIndex('by_salon_point_config_menu', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('pointConfigId', args.pointConfigId)
          .eq('menuId', args.menuId)
          .eq('isArchive', false)
      )
      .first();
    if (!pointExclusionMenu || pointExclusionMenu.isArchive) {
      console.error(
        'TrashPointExclusionMenu: 指定されたポイント基本設定除外メニューが存在しません',
        {
          ...args,
        }
      );
      throw new ConvexError({
        message: '指定されたポイント基本設定除外メニューが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          salonId: args.salonId,
          pointConfigId: args.pointConfigId,
          menuId: args.menuId,
        },
      });
    }
    return await trashRecord(ctx, pointExclusionMenu._id);
  },
});

export const kill = mutation({
  args: {
    salonId: v.id('salon'),
    pointConfigId: v.id('point_config'),
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const pointExclusionMenu = await ctx.db
      .query('point_exclusion_menu')
      .withIndex('by_salon_point_config_menu', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('pointConfigId', args.pointConfigId)
          .eq('menuId', args.menuId)
          .eq('isArchive', false)
      )
      .first();
    if (!pointExclusionMenu || pointExclusionMenu.isArchive) {
      console.error(
        'KillPointExclusionMenu: 指定されたポイント基本設定除外メニューが存在しません',
        {
          ...args,
        }
      );
      throw new ConvexError({
        message: '指定されたポイント基本設定除外メニューが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          salonId: args.salonId,
          pointConfigId: args.pointConfigId,
          menuId: args.menuId,
        },
      });
    }
    return await KillRecord(ctx, pointExclusionMenu._id);
  },
});
