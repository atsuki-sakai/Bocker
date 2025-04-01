import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { removeEmptyFields, trashRecord, KillRecord, authCheck } from '../helpers';
import { paginationOptsValidator } from 'convex/server';
import { CONVEX_ERROR_CODES } from '../constants';
import { genderType } from '../types';
import { validateMenu } from '../validators';

// メニューの追加
export const add = mutation({
  args: {
    salonId: v.id('salon'),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
    salePrice: v.optional(v.number()),
    timeToMin: v.optional(v.number()),
    category: v.optional(v.string()),
    imgFilePath: v.optional(v.string()),
    description: v.optional(v.string()),
    couponIds: v.optional(v.array(v.id('coupon'))),
    targetGender: v.optional(genderType),
    availableStaffIds: v.optional(v.array(v.id('staff'))),
    tags: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateMenu(args);
    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      console.error('指定されたサロンが存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたサロンが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          salonId: args.salonId,
        },
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
    category: v.optional(v.string()),
    imgFilePath: v.optional(v.string()),
    description: v.optional(v.string()),
    couponIds: v.optional(v.array(v.id('coupon'))),
    targetGender: v.optional(genderType),
    availableStaffIds: v.optional(v.array(v.id('staff'))),
    tags: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateMenu(args);
    // メニューの存在確認
    const menu = await ctx.db.get(args.menuId);
    if (!menu || menu.isArchive) {
      console.error('指定されたメニューが存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたメニューが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          menuId: args.menuId,
        },
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
export const trash = mutation({
  args: {
    menuId: v.id('menu'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // メニューの存在確認
    const menu = await ctx.db.get(args.menuId);
    if (!menu) {
      console.error('指定されたメニューが存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたメニューが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          menuId: args.menuId,
        },
      });
    }

    await trashRecord(ctx, menu._id);
    return true;
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
    category: v.optional(v.string()),
    imgFilePath: v.optional(v.string()),
    description: v.optional(v.string()),
    couponIds: v.optional(v.array(v.id('coupon'))),
    targetGender: v.optional(genderType),
    availableStaffIds: v.optional(v.array(v.id('staff'))),
    tags: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
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
    authCheck(ctx);
    // メニューの存在確認
    const menu = await ctx.db.get(args.menuId);
    if (!menu) {
      console.error('指定されたメニューが存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたメニューが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          menuId: args.menuId,
        },
      });
    }

    await KillRecord(ctx, args.menuId);
  },
});

// サロンIDからメニュー一覧を取得
export const getBySalonId = query({
  args: {
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('menu')
      .withIndex('by_salon_id', (q) =>
        q.eq('salonId', args.salonId).eq('isActive', true).eq('isArchive', false)
      )
      .paginate(args.paginationOpts);
  },
});

// カテゴリでメニューを取得
export const getByCategory = query({
  args: {
    salonId: v.id('salon'),
    category: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('menu')
      .withIndex('by_salon_id_category', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('category', args.category)
          .eq('isActive', true)
          .eq('isArchive', false)
      )
      .paginate(args.paginationOpts);
  },
});

// 性別でメニューを取得
export const getByGender = query({
  args: {
    salonId: v.id('salon'),
    targetGender: genderType,
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('menu')
      .withIndex('by_salon_id_gender', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('targetGender', args.targetGender)
          .eq('isActive', true)
          .eq('isArchive', false)
      )
      .paginate(args.paginationOpts);
  },
});

// 名前でメニューを検索
export const searchByName = query({
  args: {
    searchText: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('menu')
      .withSearchIndex('search_by_name', (q) =>
        q.search('name', args.searchText).eq('isActive', true).eq('isArchive', false)
      )
      .paginate(args.paginationOpts);
  },
});