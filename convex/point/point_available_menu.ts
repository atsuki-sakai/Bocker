import { mutation, query } from './../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { KillRecord, trashRecord, authCheck } from './../helpers';
import { CONVEX_ERROR_CODES } from './../constants';
import { validatePointConfigAvailableMenu } from './../validators';
import { paginationOptsValidator } from 'convex/server';

export const add = mutation({
  args: {
    salonId: v.id('salon'),
    pointConfigId: v.id('point_config'),
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validatePointConfigAvailableMenu(args);
    const pointConfigAvailableMenu = await ctx.db
      .query('point_config_available_menu')
      .withIndex('by_salon_point_config_menu', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('pointConfigId', args.pointConfigId)
          .eq('menuId', args.menuId)
          .eq('isArchive', false)
      )
      .first();
    if (pointConfigAvailableMenu) {
      console.error(
        'AddPointConfigAvailableMenu: 指定されたポイント基本設定利用可能メニューはすでに存在します',
        { ...args }
      );
      throw new ConvexError({
        message: '指定されたポイント基本設定利用可能メニューはすでに存在します',
        code: CONVEX_ERROR_CODES.DUPLICATE_RECORD,
        status: 400,
        severity: 'low',
        context: {
          pointConfigId: args.pointConfigId,
        },
      });
    }
    const pointConfigAvailableMenuId = await ctx.db.insert('point_config_available_menu', {
      ...args,
      isArchive: false,
    });
    return pointConfigAvailableMenuId;
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
    const availableMenu = await ctx.db
      .query('point_config_available_menu')
      .withIndex('by_salon_point_config_menu', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('pointConfigId', args.pointConfigId)
          .eq('menuId', args.menuId)
          .eq('isArchive', false)
      )
      .first();
    return availableMenu;
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
    const pointConfigAvailableMenu = await ctx.db
      .query('point_config_available_menu')
      .withIndex('by_salon_point_config_menu', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('pointConfigId', args.pointConfigId)
          .eq('menuId', args.menuId)
          .eq('isArchive', false)
      )
      .first();
    if (!pointConfigAvailableMenu || pointConfigAvailableMenu.isArchive) {
      console.error(
        'TrashPointConfigAvailableMenu: 指定されたポイント基本設定利用可能メニューが存在しません',
        {
          ...args,
        }
      );
      throw new ConvexError({
        message: '指定されたポイント基本設定利用可能メニューが存在しません',
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
    return await trashRecord(ctx, pointConfigAvailableMenu._id);
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
    const pointConfigAvailableMenu = await ctx.db
      .query('point_config_available_menu')
      .withIndex('by_salon_point_config_menu', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('pointConfigId', args.pointConfigId)
          .eq('menuId', args.menuId)
          .eq('isArchive', false)
      )
      .first();
    if (!pointConfigAvailableMenu || pointConfigAvailableMenu.isArchive) {
      console.error(
        'KillPointConfigAvailableMenu: 指定されたポイント基本設定利用可能メニューが存在しません',
        {
          ...args,
        }
      );
      throw new ConvexError({
        message: '指定されたポイント基本設定利用可能メニューが存在しません',
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
    return await KillRecord(ctx, pointConfigAvailableMenu._id);
  },
});

// ポイント基本設定利用可能メニューの存在確認
export const isAvailableMenu = query({
  args: {
    salonId: v.id('salon'),
    pointConfigId: v.id('point_config'),
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const availableMenu = await ctx.db
      .query('point_config_available_menu')
      .withIndex('by_salon_point_config_menu', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('pointConfigId', args.pointConfigId)
          .eq('menuId', args.menuId)
          .eq('isArchive', false)
      )
      .first();

    return !!availableMenu;
  },
});

export const getByPointConfigAvailableMenus = query({
  args: {
    salonId: v.id('salon'),
    pointConfigId: v.id('point_config'),
    menuId: v.id('menu'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);

    return await ctx.db
      .query('point_config_available_menu')
      .withIndex('by_salon_point_config_menu', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('pointConfigId', args.pointConfigId)
          .eq('menuId', args.menuId)
          .eq('isArchive', false)
      )
      .paginate(args.paginationOpts);
  },
});
