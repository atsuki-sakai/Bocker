import { mutation, query } from './../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { KillRecord, trashRecord, authCheck, removeEmptyFields } from './../helpers';
import { CONVEX_ERROR_CODES } from './../constants';
import { validateCouponExclusionMenu } from './../validators';

export const add = mutation({
  args: {
    salonId: v.id('salon'),
    couponId: v.id('coupon'),
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateCouponExclusionMenu(args);
    const couponExclusionMenu = await ctx.db
      .query('coupon_exclusion_menu')
      .withIndex('by_salon_coupon_id_menu_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('couponId', args.couponId)
          .eq('menuId', args.menuId)
          .eq('isArchive', false)
      )
      .first();
    if (couponExclusionMenu) {
      console.error('AddCouponExclusionMenu: 指定されたクーポン除外メニューはすでに存在します', {
        ...args,
      });
      throw new ConvexError({
        message: '指定されたクーポン除外メニューはすでに存在します',
        code: CONVEX_ERROR_CODES.DUPLICATE_RECORD,
        status: 400,
        severity: 'low',
        context: {
          couponId: args.couponId,
        },
      });
    }
    const couponExclusionMenuId = await ctx.db.insert('coupon_exclusion_menu', {
      ...args,
      isArchive: false,
    });
    return couponExclusionMenuId;
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
    const exclusionMenu = await ctx.db
      .query('coupon_exclusion_menu')
      .withIndex('by_salon_coupon_id_menu_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('couponId', args.couponId)
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
    couponId: v.id('coupon'),
    selectedMenuIds: v.array(v.id('menu')),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);

    // 1. 現在DBに保存されている除外メニューを取得
    const currentExclusionMenus = await ctx.db
      .query('coupon_exclusion_menu')
      .withIndex('by_salon_coupon_id', (q) =>
        q.eq('salonId', args.salonId).eq('couponId', args.couponId).eq('isArchive', false)
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
      await ctx.db.insert('coupon_exclusion_menu', {
        salonId: args.salonId,
        couponId: args.couponId,
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

export const trash = mutation({
  args: {
    salonId: v.id('salon'),
    couponId: v.id('coupon'),
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const couponExclusionMenu = await ctx.db
      .query('coupon_exclusion_menu')
      .withIndex('by_salon_coupon_id_menu_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('couponId', args.couponId)
          .eq('menuId', args.menuId)
          .eq('isArchive', false)
      )
      .first();
    if (!couponExclusionMenu || couponExclusionMenu.isArchive) {
      console.error('TrashCouponExclusionMenu: 指定されたクーポン除外メニューが存在しません', {
        ...args,
      });
      throw new ConvexError({
        message: '指定されたクーポン除外メニューが存在しません',
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
    return await trashRecord(ctx, couponExclusionMenu._id);
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
    const couponExclusionMenu = await ctx.db
      .query('coupon_exclusion_menu')
      .withIndex('by_salon_coupon_id_menu_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('couponId', args.couponId)
          .eq('menuId', args.menuId)
          .eq('isArchive', false)
      )
      .first();
    if (!couponExclusionMenu || couponExclusionMenu.isArchive) {
      console.error('KillCouponExclusionMenu: 指定されたクーポン除外メニューが存在しません', {
        ...args,
      });
      throw new ConvexError({
        message: '指定されたクーポン除外メニューが存在しません',
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
    return await KillRecord(ctx, couponExclusionMenu._id);
  },
});

// クーポン除外メニューの存在確認
export const getExclusionMenus = query({
  args: {
    salonId: v.id('salon'),
    couponId: v.id('coupon'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const exclusionMenu = await ctx.db
      .query('coupon_exclusion_menu')
      .withIndex('by_salon_coupon_id', (q) =>
        q.eq('salonId', args.salonId).eq('couponId', args.couponId).eq('isArchive', false)
      )
      .collect();

    return exclusionMenu;
  },
});

// クーポン除外メニューの存在確認
export const isExclusionMenu = query({
  args: {
    salonId: v.id('salon'),
    couponId: v.id('coupon'),
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const exclusionMenu = await ctx.db
      .query('coupon_exclusion_menu')
      .withIndex('by_salon_coupon_id_menu_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('couponId', args.couponId)
          .eq('menuId', args.menuId)
          .eq('isArchive', false)
      )
      .first();
    return !!exclusionMenu;
  },
});
