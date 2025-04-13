import { mutation, query } from './../_generated/server';
import { v } from 'convex/values';
import {
  killRecord,
  archiveRecord,
  removeEmptyFields,
} from '../../services/convex/shared/utils/helper';
import {
  validateCouponExclusionMenu,
  validateRequired,
} from '../../services/convex/shared/utils/validation';
import { ConvexCustomError } from '../../services/convex/shared/utils/error';
import { checkAuth } from '../../services/convex/shared/utils/auth';
export const add = mutation({
  args: {
    salonId: v.id('salon'),
    couponId: v.id('coupon'),
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
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
      throw new ConvexCustomError(
        'low',
        '指定されたクーポン除外メニューはすでに存在します',
        'DUPLICATE_RECORD',
        400,
        {
          ...args,
        }
      );
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
    checkAuth(ctx);
    validateCouponExclusionMenu(args);
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
    checkAuth(ctx);
    validateCouponExclusionMenu(args);

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

export const archive = mutation({
  args: {
    salonId: v.id('salon'),
    couponId: v.id('coupon'),
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
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
    if (!couponExclusionMenu || couponExclusionMenu.isArchive) {
      throw new ConvexCustomError(
        'low',
        '指定されたクーポン除外メニューが存在しません',
        'NOT_FOUND',
        404,
        {
          ...args,
        }
      );
    }
    return await archiveRecord(ctx, couponExclusionMenu._id);
  },
});

export const kill = mutation({
  args: {
    salonId: v.id('salon'),
    couponId: v.id('coupon'),
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
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
    if (!couponExclusionMenu || couponExclusionMenu.isArchive) {
      throw new ConvexCustomError(
        'low',
        '指定されたクーポン除外メニューが存在しません',
        'NOT_FOUND',
        404,
        {
          ...args,
        }
      );
    }
    return await killRecord(ctx, couponExclusionMenu._id);
  },
});

// クーポン除外メニューの存在確認
export const getExclusionMenus = query({
  args: {
    salonId: v.id('salon'),
    couponId: v.id('coupon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCouponExclusionMenu(args);
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
    checkAuth(ctx);
    validateCouponExclusionMenu(args);
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
