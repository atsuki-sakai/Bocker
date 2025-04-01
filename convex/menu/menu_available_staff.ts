import { mutation, query } from './../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { KillRecord, trashRecord, authCheck } from './../helpers';
import { CONVEX_ERROR_CODES } from './../constants';
import { validateMenuAvailableStaff } from './../validators';

export const add = mutation({
  args: {
    salonId: v.id('salon'),
    menuId: v.id('menu'),
    staffId: v.id('staff'),
    staffName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateMenuAvailableStaff(args);
    const availableStaff = await ctx.db
      .query('menu_available_staff')
      .withIndex('by_salon_menu_staff', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('menuId', args.menuId)
          .eq('staffId', args.staffId)
          .eq('isArchive', false)
      )
      .first();
    if (availableStaff) {
      console.error('AddMenuAvailableStaff: 指定されたメニュー利用可能スタッフはすでに存在します', {
        ...args,
      });
      throw new ConvexError({
        message: '指定されたメニュー利用可能スタッフはすでに存在します',
        code: CONVEX_ERROR_CODES.DUPLICATE_RECORD,
        status: 400,
        severity: 'low',
        context: {
          menuId: args.menuId,
          staffId: args.staffId,
        },
      });
    }
    const menuAvailableStaffId = await ctx.db.insert('menu_available_staff', {
      ...args,
      isArchive: false,
    });
    return menuAvailableStaffId;
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
    const availableStaff = await ctx.db
      .query('menu_available_staff')
      .withIndex('by_salon_menu_staff', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('menuId', args.menuId)
          .eq('staffId', args.staffId)
          .eq('isArchive', false)
      )
      .first();
    return availableStaff;
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
    const menuAvailableStaff = await ctx.db
      .query('menu_available_staff')
      .withIndex('by_salon_menu_staff', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('menuId', args.menuId)
          .eq('staffId', args.staffId)
          .eq('isArchive', false)
      )
      .first();
    if (!menuAvailableStaff || menuAvailableStaff.isArchive) {
      console.error('TrashMenuAvailableStaff: 指定されたメニュー利用可能スタッフが存在しません', {
        ...args,
      });
      throw new ConvexError({
        message: '指定されたメニュー利用可能スタッフが存在しません',
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
    return await trashRecord(ctx, menuAvailableStaff._id);
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
    const menuAvailableStaff = await ctx.db
      .query('menu_available_staff')
      .withIndex('by_salon_menu_staff', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('menuId', args.menuId)
          .eq('staffId', args.staffId)
          .eq('isArchive', false)
      )
      .first();
    if (!menuAvailableStaff || menuAvailableStaff.isArchive) {
      console.error('KillMenuAvailableStaff: 指定されたメニュー利用可能スタッフが存在しません', {
        ...args,
      });
      throw new ConvexError({
        message: '指定されたメニュー利用可能スタッフが存在しません',
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
    return await KillRecord(ctx, menuAvailableStaff._id);
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
    const availableStaff = await ctx.db
      .query('menu_available_staff')
      .withIndex('by_salon_menu_staff', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('menuId', args.menuId)
          .eq('staffId', args.staffId)
          .eq('isArchive', false)
      )
      .first();

    return !!availableStaff;
  },
});
