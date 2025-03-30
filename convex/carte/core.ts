import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { CONVEX_ERROR_CODES } from '../constants';
import { removeEmptyFields, trashRecord, authCheck } from '../helpers';
import { validateCarte } from '../validators';

export const add = mutation({
  args: {
    salonId: v.id('salon'),
    customerId: v.id('customer'),
    skinType: v.optional(v.string()),
    hairType: v.optional(v.string()),
    allergyHistory: v.optional(v.string()),
    medicalHistory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 認証チェック
    authCheck(ctx);
    // 入力検証
    validateCarte(args);

    // 同じ顧客・サロンのカルテが存在しないか確認
    const existingCarte = await ctx.db
      .query('carte')
      .withIndex('by_salon_customer', (q) =>
        q.eq('salonId', args.salonId).eq('customerId', args.customerId).eq('isArchive', false)
      )
      .first();

    if (existingCarte) {
      console.error('AddCarte: 既に同じ顧客のカルテが存在します', {
        ...args,
      });
      throw new ConvexError({
        message: '既に同じ顧客のカルテが存在します',
        code: CONVEX_ERROR_CODES.DUPLICATE_RECORD,
        status: 400,
        severity: 'low',
        context: {
          carteId: existingCarte._id,
          customerId: args.customerId,
        },
      });
    }
    // データベースに挿入
    const newCarteId = await ctx.db.insert('carte', { ...args, isArchive: false });
    return newCarteId;
  },
});

export const get = query({
  args: {
    id: v.id('carte'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db.get(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id('carte'),
    skinType: v.optional(v.string()),
    hairType: v.optional(v.string()),
    allergyHistory: v.optional(v.string()),
    medicalHistory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 認証チェック
    authCheck(ctx);
    // 入力検証
    validateCarte(args);
    // カルテの存在確認
    const carte = await ctx.db.get(args.id);
    if (!carte || carte.isArchive) {
      console.error('UpdateCarte: カルテが見つかりません', { ...args });
      throw new ConvexError({
        message: 'カルテが見つかりません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          carteId: args.id,
          customerId: carte?.customerId,
        },
      });
    }

    // 空フィールドを削除
    const updateData = removeEmptyFields(args);

    // データベースを更新
    const updatedId = await ctx.db.patch(args.id, updateData);
    return updatedId;
  },
});

export const upsert = mutation({
  args: {
    id: v.id('carte'),
    salonId: v.id('salon'),
    customerId: v.id('customer'),
    skinType: v.optional(v.string()),
    hairType: v.optional(v.string()),
    allergyHistory: v.optional(v.string()),
    medicalHistory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateCarte(args);

    const existingCarte = await ctx.db
      .query('carte')
      .withIndex('by_salon_customer', (q) =>
        q.eq('salonId', args.salonId).eq('customerId', args.customerId).eq('isArchive', false)
      )
      .first();

    // IDが指定されていないか、指定されたレコードが存在しない場合は
    // 同じ顧客・サロンのカルテを検索
    if (existingCarte) {
      // 既存レコードがある場合は更新
      const updateData = removeEmptyFields(args);
      delete updateData.id;
      return await ctx.db.patch(existingCarte._id, updateData);
    } else {
      // 新規レコードを作成
      return await ctx.db.insert('carte', { ...args, isArchive: false });
    }
  },
});

export const trash = mutation({
  args: { id: v.id('carte') },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const carte = await ctx.db.get(args.id);
    if (!carte) {
      console.error('TrashCarte: 存在しないカルテの削除が試行されました', { ...args });
      throw new ConvexError({
        message: '存在しないカルテの削除が試行されました',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          carteId: args.id,
        },
      });
    }
    return trashRecord(ctx, args.id);
  },
});

export const kill = mutation({
  args: { id: v.id('carte') },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const carte = await ctx.db.get(args.id);
    if (!carte) {
      console.error('KillCarte: 存在しないカルテの完全削除が試行されました', { ...args });
      throw new ConvexError({
        message: '存在しないカルテの完全削除が試行されました',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          carteId: args.id,
        },
      });
    }

    // 関連するカルテ詳細も削除
    const carteDetails = await ctx.db
      .query('carte_detail')
      .withIndex('by_carte_id', (q) => q.eq('carteId', args.id))
      .collect();

    for (const detail of carteDetails) {
      await ctx.db.delete(detail._id);
    }

    // カルテ自体を削除
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const getCustomerCarte = query({
  args: {
    salonId: v.id('salon'),
    customerId: v.id('customer'),
  },
  handler: async (ctx, args) => {
    const carte = await ctx.db
      .query('carte')
      .withIndex('by_salon_customer', (q) =>
        q.eq('salonId', args.salonId).eq('customerId', args.customerId).eq('isArchive', false)
      )
      .first();
    return carte;
  },
});