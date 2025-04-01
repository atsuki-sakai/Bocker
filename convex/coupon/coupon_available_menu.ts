import { mutation, query } from './../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { KillRecord, trashRecord, authCheck } from './../helpers';
import { CONVEX_ERROR_CODES } from './../constants';
import { validateCouponAvailableMenu } from './../validators';

export const add = mutation({
  args: {
    salonId: v.id('salon'),
    couponId: v.id('coupon'),
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateCouponAvailableMenu(args);
    const couponAvailableMenu = await ctx.db
      .query('coupon_available_menu')
      .withIndex('by_salon_coupon_id_menu_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('couponId', args.couponId)
          .eq('menuId', args.menuId)
          .eq('isArchive', false)
      )
      .first();
    if (couponAvailableMenu) {
      console.error(
        'AddCouponAvailableMenu: 指定されたクーポン利用可能メニューはすでに存在します',
        { ...args }
      );
      throw new ConvexError({
        message: '指定されたクーポン利用可能メニューはすでに存在します',
        code: CONVEX_ERROR_CODES.DUPLICATE_RECORD,
        status: 400,
        severity: 'low',
        context: {
          couponId: args.couponId,
        },
      });
    }
    const couponAvailableMenuId = await ctx.db.insert('coupon_available_menu', {
      ...args,
      isArchive: false,
    });
    return couponAvailableMenuId;
  },
});

export const get = query({
  args: {
    salonId: v.id('salon'),
    couponId: v.id('coupon'),
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const availableMenu = await ctx.db
      .query('coupon_available_menu')
      .withIndex('by_salon_coupon_id_menu_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('couponId', args.couponId)
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
    couponId: v.id('coupon'),
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const couponAvailableMenu = await ctx.db
      .query('coupon_available_menu')
      .withIndex('by_salon_coupon_id_menu_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('couponId', args.couponId)
          .eq('menuId', args.menuId)
          .eq('isArchive', false)
      )
      .first();
    if (!couponAvailableMenu || couponAvailableMenu.isArchive) {
      console.error('TrashCouponAvailableMenu: 指定されたクーポン利用可能メニューが存在しません', {
        ...args,
      });
      throw new ConvexError({
        message: '指定されたクーポン利用可能メニューが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          salonId: args.salonId,
          couponId: args.couponId,
          menuId: args.menuId,
        },
      });
    }
    return await trashRecord(ctx, couponAvailableMenu._id);
  },
});

export const kill = mutation({
  args: {
    salonId: v.id('salon'),
    couponId: v.id('coupon'),
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const couponAvailableMenu = await ctx.db
      .query('coupon_available_menu')
      .withIndex('by_salon_coupon_id_menu_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('couponId', args.couponId)
          .eq('menuId', args.menuId)
          .eq('isArchive', false)
      )
      .first();
    if (!couponAvailableMenu || couponAvailableMenu.isArchive) {
      console.error('KillCouponAvailableMenu: 指定されたクーポン利用可能メニューが存在しません', {
        ...args,
      });
      throw new ConvexError({
        message: '指定されたクーポン利用可能メニューが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          salonId: args.salonId,
          couponId: args.couponId,
          menuId: args.menuId,
        },
      });
    }
    return await KillRecord(ctx, couponAvailableMenu._id);
  },
});

// クーポン利用可能メニューの存在確認
export const isAvailableMenu = query({
  args: {
    salonId: v.id('salon'),
    couponId: v.id('coupon'),
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const availableMenu = await ctx.db
      .query('coupon_available_menu')
      .withIndex('by_salon_coupon_id_menu_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('couponId', args.couponId)
          .eq('menuId', args.menuId)
          .eq('isArchive', false)
      )
      .first();

    return !!availableMenu;
  },
});
