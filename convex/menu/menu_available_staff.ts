import { mutation, query } from './../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { KillRecord, trashRecord, authCheck } from './../helpers';
import { CONVEX_ERROR_CODES } from './../constants';
import { validateMenuExclusionStaff } from './../validators';

export const add = mutation({
  args: {
    salonId: v.id('salon'),
    menuId: v.id('menu'),
    staffId: v.id('staff'),
    staffName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
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
      console.error('AddMenuExclusionStaff: 指定されたメニュー除外スタッフはすでに存在します', {
        ...args,
      });
      throw new ConvexError({
        message: '指定されたメニュー除外スタッフはすでに存在します',
        code: CONVEX_ERROR_CODES.DUPLICATE_RECORD,
        status: 400,
        severity: 'low',
        context: {
          menuId: args.menuId,
          staffId: args.staffId,
        },
      });
    }
    const menuExclusionStaffId = await ctx.db.insert('menu_exclusion_staff', {
      ...args,
      isArchive: false,
    });
    return menuExclusionStaffId;
  },
});

export const get = query({
  args: {
    salonId: v.id('salon'),
    menuId: v.id('menu'),
    staffId: v.id('staff'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
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

export const trash = mutation({
  args: {
    salonId: v.id('salon'),
    menuId: v.id('menu'),
    staffId: v.id('staff'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
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
      console.error('TrashMenuExclusionStaff: 指定されたメニュー除外スタッフが存在しません', {
        ...args,
      });
      throw new ConvexError({
        message: '指定されたメニュー除外スタッフが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          salonId: args.salonId,
          menuId: args.menuId,
          staffId: args.staffId,
        },
      });
    }
    return await trashRecord(ctx, menuExclusionStaff._id);
  },
});

export const kill = mutation({
  args: {
    salonId: v.id('salon'),
    menuId: v.id('menu'),
    staffId: v.id('staff'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
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
      console.error('KillMenuExclusionStaff: 指定されたメニュー除外スタッフが存在しません', {
        ...args,
      });
      throw new ConvexError({
        message: '指定されたメニュー除外スタッフが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          salonId: args.salonId,
          menuId: args.menuId,
          staffId: args.staffId,
        },
      });
    }
    return await KillRecord(ctx, menuExclusionStaff._id);
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
    authCheck(ctx);
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
