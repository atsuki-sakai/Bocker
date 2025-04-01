import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { CONVEX_ERROR_CODES } from '../constants';
import { removeEmptyFields, trashRecord, KillRecord, authCheck } from '../helpers';
import { validateSalonConfig } from '../validators';

export const add = mutation({
  args: {
    salonId: v.id('salon'),
    salonName: v.optional(v.string()), // サロン名
    email: v.optional(v.string()), // サロンのメールアドレス
    phone: v.optional(v.string()), // サロンの電話番号
    postalCode: v.optional(v.string()), // サロンの郵便番号
    address: v.optional(v.string()), // サロンの住所
    reservationRules: v.optional(v.string()), // サロンの予約ルール
    imgPath: v.optional(v.string()), // サロンの画像ファイルID
    description: v.optional(v.string()), // サロンの説明
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateSalonConfig(args);
    const salon = await ctx.db.get(args.salonId);
    if (!salon || salon.isArchive) {
      console.error('AddSalonConfig: 指定されたサロンが見つかりません', { ...args });
      throw new ConvexError({
        message: '指定されたサロンが見つかりません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonId: args.salonId,
        },
      });
    }
    const salonConfig = await ctx.db.get(args.salonId);
    if (salonConfig) {
      console.error('AddSalonConfig: サロンの設定が既に存在します', { ...args });
      throw new ConvexError({
        message: 'サロンの設定が既に存在します',
        code: CONVEX_ERROR_CODES.DUPLICATE_RECORD,
        severity: 'low',
        status: 400,
        context: {
          salonId: args.salonId,
        },
      });
    }

    const salonConfigId = await ctx.db.insert('salon_config', {
      ...args,
      isArchive: false,
    });

    return salonConfigId;
  },
});

export const get = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const salonConfig = await ctx.db
      .query('salon_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .first();
    return salonConfig;
  },
});

export const update = mutation({
  args: {
    salonId: v.id('salon'),
    salonName: v.optional(v.string()), // サロン名
    email: v.optional(v.string()), // サロンのメールアドレス
    phone: v.optional(v.string()), // サロンの電話番号
    postalCode: v.optional(v.string()), // サロンの郵便番号
    address: v.optional(v.string()), // サロンの住所
    reservationRules: v.optional(v.string()), // サロンの予約ルール
    imgFilePath: v.optional(v.string()), // サロンの画像ファイルID
    description: v.optional(v.string()), // サロンの説明
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateSalonConfig(args);
    const salonConfig = await ctx.db.get(args.salonId);
    if (!salonConfig || salonConfig.isArchive) {
      console.error('UpdateSalonConfig: サロンの設定が見つかりません', { ...args });
      throw new ConvexError({
        message: 'サロンの設定が見つかりません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonId: args.salonId,
        },
      });
    }
    const updateData = removeEmptyFields({ ...args });
    await ctx.db.patch(salonConfig._id, {
      ...updateData,
    });
    return true;
  },
});

export const upsert = mutation({
  args: {
    salonId: v.id('salon'),
    salonName: v.optional(v.string()), // サロン名
    email: v.optional(v.string()), // サロンのメールアドレス
    phone: v.optional(v.string()), // サロンの電話番号
    postalCode: v.optional(v.string()), // サロンの郵便番号
    address: v.optional(v.string()), // サロンの住所
    reservationRules: v.optional(v.string()), // サロンの予約ルール
    imgPath: v.optional(v.string()), // サロンの画像ファイルID
    description: v.optional(v.string()), // サロンの説明
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateSalonConfig(args);
    const existingSalonConfig = await ctx.db
      .query('salon_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId))
      .first();

    if (existingSalonConfig && !existingSalonConfig.isArchive) {
      return await ctx.db.patch(existingSalonConfig._id, {
        ...removeEmptyFields({ ...args }),
      });
    } else {
      return await ctx.db.insert('salon_config', {
        ...args,
        isArchive: false,
      });
    }
  },
});

export const trash = mutation({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const salongConfig = await ctx.db
      .query('salon_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId))
      .first();
    if (!salongConfig) {
      console.error('TrashSalonConfig: サロンの設定が見つかりません', { ...args });
      throw new ConvexError({
        message: 'サロンの設定が見つかりません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonId: args.salonId,
        },
      });
    }
    return await trashRecord(ctx, salongConfig._id);
  },
});

export const kill = mutation({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await KillRecord(ctx, args.salonId);
  },
});
