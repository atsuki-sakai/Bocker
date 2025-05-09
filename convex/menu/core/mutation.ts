import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { killRecord, archiveRecord, excludeFields } from '@/services/convex/shared/utils/helper';
import { validateMenu, validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { throwConvexError } from '@/lib/error';
import {
  genderType,
  targetType,
  menuPaymentMethodType,
  menuCategoryType,
} from '@/services/convex/shared/types/common';

// メニューの追加
export const create = mutation({
  args: {
    salonId: v.id('salon'),
    name: v.optional(v.string()),
    category: v.optional(menuCategoryType),
    unitPrice: v.optional(v.number()),
    salePrice: v.optional(v.number()),
    timeToMin: v.optional(v.number()),
    ensureTimeToMin: v.optional(v.number()),
    imgPath: v.optional(v.string()),
    description: v.optional(v.string()),
    targetGender: v.optional(genderType),
    targetType: v.optional(targetType),
    tags: v.optional(v.array(v.string())),
    paymentMethod: v.optional(menuPaymentMethodType),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateMenu(args);
    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      throw throwConvexError({
        message: '指定されたサロンが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたサロンが存在しません',
        callFunc: 'menu.core.create',
        severity: 'low',
        details: { ...args },
      });
    }

    const menuId = await ctx.db.insert('menu', {
      ...args,
      isArchive: false,
    });
    return menuId;
  },
});

// メニュー情報の更新
export const update = mutation({
  args: {
    menuId: v.id('menu'),
    name: v.optional(v.string()),
    category: v.optional(menuCategoryType),
    unitPrice: v.optional(v.number()),
    salePrice: v.optional(v.number()),
    timeToMin: v.optional(v.number()),
    ensureTimeToMin: v.optional(v.number()),
    imgPath: v.optional(v.string()),
    description: v.optional(v.string()),
    targetGender: v.optional(genderType),
    targetType: v.optional(targetType),
    tags: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
    paymentMethod: v.optional(menuPaymentMethodType),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateMenu(args);
    // メニューの存在確認
    const menu = await ctx.db.get(args.menuId);
    if (!menu || menu.isArchive) {
      throw throwConvexError({
        message: '指定されたメニューが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたメニューが存在しません',
        callFunc: 'menu.core.update',
        severity: 'low',
        details: { ...args },
      });
    }

    const newMenuId = await ctx.db.patch(args.menuId, {
      ...args,
      isArchive: false,
    })
    return newMenuId;
  },
});

// メニューの削除
export const archive = mutation({
  args: {
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.menuId, 'menuId');
    return await archiveRecord(ctx, args.menuId);
  },
});

export const upsert = mutation({
  args: {
    menuId: v.id('menu'),
    salonId: v.id('salon'),
    name: v.optional(v.string()),
    category: v.optional(menuCategoryType),
    unitPrice: v.optional(v.number()),
    salePrice: v.optional(v.number()),
    timeToMin: v.optional(v.number()),
    ensureTimeToMin: v.optional(v.number()),
    imgPath: v.optional(v.string()),
    description: v.optional(v.string()),
    targetGender: v.optional(genderType),
    targetType: v.optional(targetType),
    tags: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateMenu(args);
    // メニューの存在確認
    const existingMenu = await ctx.db.get(args.menuId);

    if (!existingMenu || existingMenu.isArchive) {
      return await ctx.db.insert('menu', {
        ...args,
        salonId: args.salonId,
        isArchive: false,
      });
    } else {
      const updateData = excludeFields(args, ['menuId', 'salonId']);
      return await ctx.db.patch(existingMenu._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.menuId, 'menuId');
    await killRecord(ctx, args.menuId);
  },
});
