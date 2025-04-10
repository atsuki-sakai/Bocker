import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { removeEmptyFields, archiveRecord, KillRecord } from '../shared/utils/helper';
import { validateSalonApiConfig, validateRequired } from '../shared/utils/validation';
import { checkAuth } from '../shared/utils/auth';
import { ConvexCustomError } from '../shared/utils/error';

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
    checkAuth(ctx);
    validateSalonApiConfig(args);
    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      throw new ConvexCustomError('low', '指定されたサロンが存在しません', 'NOT_FOUND', 404, {
        ...args,
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
    checkAuth(ctx);
    validateRequired(args.salonApiConfigId, 'salonApiConfigId');
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
    checkAuth(ctx);
    validateSalonApiConfig(args);
    // サロンAPI設定の存在確認
    const salonApiConfig = await ctx.db.get(args.salonApiConfigId);
    if (!salonApiConfig || salonApiConfig.isArchive) {
      throw new ConvexCustomError(
        'low',
        '指定されたサロンAPI設定が存在しません',
        'NOT_FOUND',
        404,
        {
          ...args,
        }
      );
    }

    const updateData = removeEmptyFields(args);
    // salonApiConfigId はパッチ対象から削除する
    delete updateData.salonApiConfigId;

    return await ctx.db.patch(args.salonApiConfigId, updateData);
  },
});

// サロンAPI設定の削除
export const archive = mutation({
  args: {
    salonApiConfigId: v.id('salon_api_config'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonApiConfigId, 'salonApiConfigId');

    return await archiveRecord(ctx, args.salonApiConfigId);
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
    checkAuth(ctx);
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
      delete updateData.salonId;
      return await ctx.db.patch(existingSalonApiConfig._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    salonApiConfigId: v.id('salon_api_config'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonApiConfigId, 'salonApiConfigId');
    return await KillRecord(ctx, args.salonApiConfigId);
  },
});

// サロンIDからサロンAPI設定を取得
export const getBySalonId = query({
  args: {
    salonId: v.id('salon'),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalonApiConfig(args);
    return await ctx.db
      .query('salon_api_config')
      .withIndex('by_salon_id', (q) =>
        q.eq('salonId', args.salonId).eq('isArchive', args.includeArchive || false)
      )
      .first();
  },
});