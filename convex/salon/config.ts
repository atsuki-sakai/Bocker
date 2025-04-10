import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { removeEmptyFields, archiveRecord, KillRecord } from '../shared/utils/helper';
import { validateSalonConfig, validateRequired } from '../shared/utils/validation';
import { ConvexCustomError } from '../shared/utils/error';
import { checkAuth } from '../shared/utils/auth';

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
    checkAuth(ctx);
    validateSalonConfig(args);
    const salon = await ctx.db.get(args.salonId);
    if (!salon || salon.isArchive) {
      throw new ConvexCustomError('low', '指定されたサロンが見つかりません', 'NOT_FOUND', 404, {
        ...args,
      });
    }
    const salonConfig = await ctx.db.get(args.salonId);
    if (salonConfig) {
      throw new ConvexCustomError('low', 'サロンの設定が既に存在します', 'DUPLICATE_RECORD', 400, {
        ...args,
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
    checkAuth(ctx);
    validateRequired(args.salonId, 'salonId');
    const salonConfig = await ctx.db
      .query('salon_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId))
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
    checkAuth(ctx);
    validateSalonConfig(args);
    const salonConfig = await ctx.db.get(args.salonId);
    if (!salonConfig || salonConfig.isArchive) {
      throw new ConvexCustomError('low', 'サロンの設定が見つかりません', 'NOT_FOUND', 404, {
        ...args,
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
    checkAuth(ctx);
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

export const archive = mutation({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonId, 'salonId');
    const salongConfig = await ctx.db
      .query('salon_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId))
      .first();
    if (!salongConfig) {
      throw new ConvexCustomError('low', 'サロンの設定が見つかりません', 'NOT_FOUND', 404, {
        ...args,
      });
    }
    return await archiveRecord(ctx, salongConfig._id);
  },
});

export const kill = mutation({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonId, 'salonId');
    return await KillRecord(ctx, args.salonId);
  },
});
