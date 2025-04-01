import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { CONVEX_ERROR_CODES } from '../constants';
import {
  handleConvexApiError,
  removeEmptyFields,
  trashRecord,
  KillRecord,
  authCheck,
} from '../helpers';
import { validatePointConfig } from '../validators';

export const add = mutation({
  args: {
    salonId: v.id('salon'),
    menuIds: v.optional(v.array(v.id('menu'))), // 適応されるメニューID
    isFixedPoint: v.optional(v.boolean()), // 固定ポイントかどうか
    pointRate: v.optional(v.number()), // ポイント付与率  利用金額に対しての付与率 (例: 0.1なら10%)
    fixedPoint: v.optional(v.number()), // 固定ポイント (例: 100円につき1ポイント)
    pointExpirationDays: v.optional(v.number()), // ポイントの有効期限(日)
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validatePointConfig(args);
    const salon = await ctx.db.get(args.salonId);
    if (!salon || salon.isArchive) {
      console.error('AddPointConfig: 指定されたサロンが存在しません', { ...args });
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

    const salonMenuPointConfigId = await ctx.db.insert('point_config', {
      ...args,
      isArchive: false,
    });
    return salonMenuPointConfigId;
  },
});

export const get = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
      return await ctx.db
        .query('point_config')
        .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
        .first();
  },
});

export const update = mutation({
  args: {
    salonId: v.id('salon'),
    menuIds: v.optional(v.array(v.id('menu'))), // 適応されるメニューID
    isFixedPoint: v.optional(v.boolean()), // 固定ポイントかどうか
    pointRate: v.optional(v.number()), // ポイント付与率  利用金額に対しての付与率 (例: 0.1なら10%)
    fixedPoint: v.optional(v.number()), // 固定ポイント (例: 100円につき1ポイント)
    pointExpirationDays: v.optional(v.number()), // ポイントの有効期限(日)
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validatePointConfig(args);
    const salonMenuPointConfig = await ctx.db
      .query('point_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .first();
    if (!salonMenuPointConfig) {
      console.error('UpdatePointConfig: 指定されたサロンのポイント設定が見つかりません', {
        ...args,
      });
      throw new ConvexError({
        message: '指定されたサロンのポイント設定が見つかりません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonId: args.salonId,
        },
      });
    }

    const updateData = removeEmptyFields({ ...args });

    // 更新前のデータと新しいデータをマージして検証
    const mergedData = { ...salonMenuPointConfig, ...updateData };
    validatePointConfig(mergedData);

    await ctx.db.patch(salonMenuPointConfig._id, {
      ...updateData,
    });
    return true;
  },
});

export const upsert = mutation({
  args: {
    salonId: v.id('salon'),
    menuIds: v.optional(v.array(v.id('menu'))), // 適応されるメニューID
    isFixedPoint: v.optional(v.boolean()), // 固定ポイントかどうか
    pointRate: v.optional(v.number()), // ポイント付与率  利用金額に対しての付与率 (例: 0.1なら10%)
    fixedPoint: v.optional(v.number()), // 固定ポイント (例: 100円につき1ポイント)
    pointExpirationDays: v.optional(v.number()), // ポイントの有効期限(日)
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validatePointConfig(args);

    const existingConfig = await ctx.db
      .query('point_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .first();

    if (existingConfig) {
      const updateData = removeEmptyFields(args);
      delete updateData.salonId;
      return await ctx.db.patch(existingConfig._id, updateData);
    } else {
      return await ctx.db.insert('point_config', {
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
    // まず対象のドキュメントを検索
    const salonMenuPointConfig = await ctx.db
      .query('point_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId))
      .first();

    if (!salonMenuPointConfig) {
      console.error('TrashPointConfig: 指定されたサロンのポイント設定が見つかりません', {
        ...args,
      });
      throw new ConvexError({
        message: '指定されたサロンのポイント設定が見つかりません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonId: args.salonId,
        },
      });
    }
    await trashRecord(ctx, salonMenuPointConfig._id);
    return true;
  },
});

export const kill = mutation({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const salonMenuPointConfig = await ctx.db
      .query('point_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId))
      .first();
    if (!salonMenuPointConfig) {
      console.error('KillPointConfig: 指定されたサロンのポイント設定が見つかりません', { ...args });
      throw new ConvexError({
        message: '指定されたサロンのポイント設定が見つかりません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonId: args.salonId,
        },
      });
    }
    await KillRecord(ctx, args.salonId);
    return true;
  },
});
