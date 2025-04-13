import { mutation, query } from './../_generated/server';
import { v } from 'convex/values';
import { killRecord, archiveRecord } from '@/services/convex/shared/utils/helper';
import {
  validatePointExclusionMenu,
  validateRequired,
} from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';

export const add = mutation({
  args: {
    salonId: v.id('salon'),
    pointConfigId: v.id('point_config'),
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
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
      throw new ConvexCustomError(
        'low',
        '指定されたポイント基本設定除外メニューはすでに存在します',
        'DUPLICATE_RECORD',
        400,
        {
          ...args,
        }
      );
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
    checkAuth(ctx);
    validatePointExclusionMenu(args);
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
    checkAuth(ctx);
    validatePointExclusionMenu(args);

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
    checkAuth(ctx);
    validatePointExclusionMenu(args);
    const exclusionMenus = await ctx.db
      .query('point_exclusion_menu')
      .withIndex('by_salon_point_config_id', (q) =>
        q.eq('salonId', args.salonId).eq('pointConfigId', args.pointConfigId).eq('isArchive', false)
      )
      .collect();
    return exclusionMenus.map((item) => item.menuId);
  },
});

export const archive = mutation({
  args: {
    id: v.id('point_exclusion_menu'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.id, 'id');
    return await archiveRecord(ctx, args.id);
  },
});

export const kill = mutation({
  args: {
    id: v.id('point_exclusion_menu'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.id, 'id');
    return await killRecord(ctx, args.id);
  },
});
