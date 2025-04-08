import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { CONVEX_ERROR_CODES } from '../constants';
import { removeEmptyFields, trashRecord, KillRecord, authCheck } from '../helpers';
import { paginationOptsValidator } from 'convex/server';
import { validateOption } from '../validators';
import { menuPaymentMethodType } from '../types';
// オプションメニューの追加
export const add = mutation({
  args: {
    salonId: v.id('salon'),
    name: v.string(), // オプションメニュー名
    unitPrice: v.number(), // 価格
    salePrice: v.optional(v.number()), // セール価格
    orderLimit: v.optional(v.number()), // 注文制限
    timeToMin: v.number(), // 時間(分)
    tags: v.optional(v.array(v.string())), // タグ
    description: v.optional(v.string()), // 説明
    isActive: v.optional(v.boolean()), // 有効/無効フラグ
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateOption(args);
    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon || salon.isArchive) {
      console.error('指定されたサロンが存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたサロンが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonId: args.salonId,
        },
      });
    }

    // isActiveが指定されていない場合はデフォルトでtrueに設定
    const optionData = {
      ...args,
      isActive: args.isActive === undefined ? true : args.isActive,
      isArchive: false,
    };

    const salonOptionId = await ctx.db.insert('salon_option', optionData);
    return salonOptionId;
  },
});

// オプションメニューの更新
export const update = mutation({
  args: {
    salonOptionId: v.id('salon_option'),
    name: v.optional(v.string()), // オプションメニュー名
    unitPrice: v.optional(v.number()), // 価格
    salePrice: v.optional(v.number()), // セール価格
    orderLimit: v.optional(v.number()), // 注文制限
    timeToMin: v.optional(v.number()), // 時間(分)
    tags: v.optional(v.array(v.string())), // タグ
    description: v.optional(v.string()), // 説明
    isActive: v.optional(v.boolean()), // 有効/無効フラグ
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateOption(args);
    // オプションメニューの存在確認
    const salonOption = await ctx.db.get(args.salonOptionId);
    if (!salonOption || salonOption.isArchive) {
      console.error('指定されたオプションメニューが存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたオプションメニューが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonOptionId: args.salonOptionId,
        },
      });
    }

    // 更新データの準備（空フィールドを削除）
    const updateData = removeEmptyFields(args);
    // salonOptionId はパッチ対象から削除する
    delete updateData.salonOptionId;

    const newSalonOptionId = await ctx.db.patch(args.salonOptionId, updateData);
    return newSalonOptionId;
  },
});

// オプションメニューの作成または更新
export const upsert = mutation({
  args: {
    salonId: v.id('salon'),
    salonOptionId: v.id('salon_option'),
    name: v.string(), // オプションメニュー名
    unitPrice: v.number(), // 価格
    salePrice: v.optional(v.number()), // セール価格
    orderLimit: v.optional(v.number()), // 注文制限
    timeToMin: v.number(), // 時間(分)
    tags: v.optional(v.array(v.string())), // タグ
    description: v.optional(v.string()), // 説明
    isActive: v.optional(v.boolean()), // 有効/無効フラグ
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateOption(args);
    // オプションメニューの存在確認
    const existingSalonOption = await ctx.db.get(args.salonOptionId);
    if (!existingSalonOption || existingSalonOption.isArchive) {
      // 更新データの準備（空フィールドを削除）
      const updateData = removeEmptyFields(args);
      delete updateData.salonOptionId;
      return await ctx.db.patch(args.salonOptionId, updateData);
    } else {
      // isActiveが未設定の場合はデフォルト値を設定
      return await ctx.db.insert('salon_option', {
        ...args,
        isActive: args.isActive === undefined ? true : args.isActive,
        isArchive: false,
      });
    }
  },
});

// オプションメニューの論理削除
export const trash = mutation({
  args: {
    salonOptionId: v.id('salon_option'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // オプションメニューの存在確認
    const salonOption = await ctx.db.get(args.salonOptionId);
    if (!salonOption) {
      console.error('指定されたオプションメニューが存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたオプションメニューが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonOptionId: args.salonOptionId,
        },
      });
    }
    // 論理削除の実装（isActiveをfalseに設定）
    await trashRecord(ctx, args.salonOptionId);
    return true;
  },
});

export const kill = mutation({
  args: {
    salonOptionId: v.id('salon_option'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // オプションメニューの存在確認
    const salonOption = await ctx.db.get(args.salonOptionId);
    if (!salonOption) {
      console.error('指定されたオプションメニューが存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたオプションメニューが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonOptionId: args.salonOptionId,
        },
      });
    }

    await KillRecord(ctx, args.salonOptionId);
    return true;
  },
});

export const get = query({
  args: {
    salonOptionId: v.id('salon_option'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db.get(args.salonOptionId);
  },
});

// サロンIDからオプションメニュー一覧を取得
export const getAllBySalonId = query({
  args: {
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('salon_option')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .order('desc')
      .paginate(args.paginationOpts);
  },
});

// オプションメニューを名前で検索
export const searchByName = query({
  args: {
    salonId: v.id('salon'),
    name: v.string(),
    paginationOpts: paginationOptsValidator,
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // searchIndexを使用して効率的に検索
    return await ctx.db
      .query('salon_option')
      .withIndex('by_salon_id_name', (q) =>
        q.eq('salonId', args.salonId).eq('name', args.name).eq('isArchive', false)
      )
      .order('desc')
      .paginate(args.paginationOpts);
  },
});
