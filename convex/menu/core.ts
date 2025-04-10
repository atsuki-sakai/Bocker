import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { removeEmptyFields, KillRecord, archiveRecord } from '../shared/utils/helper';
import { paginationOptsValidator } from 'convex/server';
import { validateMenu, validateRequired } from '../shared/utils/validation';
import { checkAuth } from '../shared/utils/auth';
import { ConvexCustomError } from '../shared/utils/error';
import { genderType, targetType, menuPaymentMethodType } from '../shared/types/common';

// メニューの追加
export const add = mutation({
  args: {
    salonId: v.id('salon'),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
    salePrice: v.optional(v.number()),
    timeToMin: v.optional(v.number()),
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
      throw new ConvexCustomError('low', '指定されたサロンが存在しません', 'NOT_FOUND', 404, {
        ...args,
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
    price: v.optional(v.number()),
    salePrice: v.optional(v.number()),
    timeToMin: v.optional(v.number()),
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
      throw new ConvexCustomError('low', '指定されたメニューが存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    const updateData = removeEmptyFields(args);
    // menuId はパッチ対象から削除する
    delete updateData.menuId;

    const newMenuId = await ctx.db.patch(args.menuId, updateData);
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
    price: v.optional(v.number()),
    salePrice: v.optional(v.number()),
    timeToMin: v.optional(v.number()),
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
      const updateData = removeEmptyFields(args);
      delete updateData.menuId;
      delete updateData.salonId;
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
    await KillRecord(ctx, args.menuId);
  },
});

// メニューIDからメニューを取得
export const get = query({
  args: {
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.menuId, 'menuId');
    return await ctx.db.get(args.menuId);
  },
});

// サロンIDからメニュー一覧を取得
export const getAllBySalonId = query({
  args: {
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    activeOnly: v.optional(v.boolean()),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateMenu(args);
    return await ctx.db
      .query('menu')
      .withIndex('by_salon_id', (q) =>
        q.eq('salonId', args.salonId).eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// タイプでメニューを取得
export const getByType = query({
  args: {
    salonId: v.id('salon'),
    targetType: targetType,
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    activeOnly: v.optional(v.boolean()),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateMenu(args);
    return await ctx.db
      .query('menu')
      .withIndex('by_salon_id_type', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('targetType', args.targetType)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// 性別でメニューを取得
export const getByGender = query({
  args: {
    salonId: v.id('salon'),
    targetGender: genderType,
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    activeOnly: v.optional(v.boolean()),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateMenu(args);
    return await ctx.db
      .query('menu')
      .withIndex('by_salon_id_gender', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('targetGender', args.targetGender)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});
