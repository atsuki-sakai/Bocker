import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { removeEmptyFields, trashRecord, KillRecord, authCheck } from '../helpers';
import { CONVEX_ERROR_CODES } from '../constants';
import { validateSalonApiConfig } from '../validators';

// サロンAPI設定の追加
export const add = mutation({
  args: {
    salonId: v.id('salon'),
    lineAccessToken: v.optional(v.string()),
    lineChannelSecret: v.optional(v.string()),
    liffId: v.optional(v.string()),
    destinationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      console.error('AddSalonApiConfig: 指定されたサロンが存在しません', { ...args });
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
    const salonApiConfigId = await ctx.db.insert('salon_api_config', {
      ...args,
      isArchive: false,
    });
    return salonApiConfigId;
  },
});

export const get = query({
  args: {
    salonApiConfigId: v.id('salon_api_config'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db.get(args.salonApiConfigId);
  },
});

// サロンAPI設定の更新
export const update = mutation({
  args: {
    salonApiConfigId: v.id('salon_api_config'),
    lineAccessToken: v.optional(v.string()),
    lineChannelSecret: v.optional(v.string()),
    liffId: v.optional(v.string()),
    destinationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateSalonApiConfig(args);
    // サロンAPI設定の存在確認
    const salonApiConfig = await ctx.db.get(args.salonApiConfigId);
    if (!salonApiConfig || salonApiConfig.isArchive) {
      console.error('UpdateSalonApiConfig: 指定されたサロンAPI設定が存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたサロンAPI設定が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonApiConfigId: args.salonApiConfigId,
        },
      });
    }

    const updateData = removeEmptyFields(args);
    // salonApiConfigId はパッチ対象から削除する
    delete updateData.salonApiConfigId;

    return await ctx.db.patch(args.salonApiConfigId, updateData);
  },
});

// サロンAPI設定の削除
export const trash = mutation({
  args: {
    salonApiConfigId: v.id('salon_api_config'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // サロンAPI設定の存在確認
    const salonApiConfig = await ctx.db.get(args.salonApiConfigId);
    if (!salonApiConfig) {
      console.error('TrashSalonApiConfig: 指定されたサロンAPI設定が存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたサロンAPI設定が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonApiConfigId: args.salonApiConfigId,
        },
      });
    }

    return await trashRecord(ctx, salonApiConfig._id);
  },
});

export const upsert = mutation({
  args: {
    salonApiConfigId: v.id('salon_api_config'),
    salonId: v.id('salon'),
    lineAccessToken: v.optional(v.string()),
    lineChannelSecret: v.optional(v.string()),
    liffId: v.optional(v.string()),
    destinationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateSalonApiConfig(args);
    const existingSalonApiConfig = await ctx.db.get(args.salonApiConfigId);

    if (!existingSalonApiConfig || existingSalonApiConfig.isArchive) {
      return await ctx.db.insert('salon_api_config', {
        ...args,
        isArchive: false,
      });
    } else {
      const updateData = removeEmptyFields(args, true);
      delete updateData.salonApiConfigId;
      return await ctx.db.patch(existingSalonApiConfig._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    salonApiConfigId: v.id('salon_api_config'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const salonApiConfig = await ctx.db.get(args.salonApiConfigId);
    if (!salonApiConfig) {
      console.error('KillSalonApiConfig: 指定されたサロンAPI設定が存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたサロンAPI設定が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonApiConfigId: args.salonApiConfigId,
        },
      });
    }
    return await KillRecord(ctx, args.salonApiConfigId);
  },
});

// サロンIDからサロンAPI設定を取得
export const getBySalonId = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('salon_api_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .first();
  },
});