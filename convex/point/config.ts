import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import {
  removeEmptyFields,
  archiveRecord,
  killRecord,
} from '@/services/convex/shared/utils/helper';
import { validatePointConfig, validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';

export const add = mutation({
  args: {
    salonId: v.id('salon'),
    isFixedPoint: v.optional(v.boolean()), // 固定ポイントかどうか
    pointRate: v.optional(v.number()), // ポイント付与率  利用金額に対しての付与率 (例: 0.1なら10%)
    fixedPoint: v.optional(v.number()), // 固定ポイント (例: 100円につき1ポイント)
    pointExpirationDays: v.optional(v.number()), // ポイントの有効期限(日)
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validatePointConfig(args);
    const salon = await ctx.db.get(args.salonId);
    if (!salon || salon.isArchive) {
      throw new ConvexCustomError('low', '指定されたサロンが存在しません', 'NOT_FOUND', 404, {
        ...args,
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
    validateRequired(args.salonId, 'salonId');
    checkAuth(ctx);
    return await ctx.db
      .query('point_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .first();
  },
});

export const update = mutation({
  args: {
    salonId: v.id('salon'),
    isFixedPoint: v.optional(v.boolean()), // 固定ポイントかどうか
    pointRate: v.optional(v.number()), // ポイント付与率  利用金額に対しての付与率 (例: 0.1なら10%)
    fixedPoint: v.optional(v.number()), // 固定ポイント (例: 100円につき1ポイント)
    pointExpirationDays: v.optional(v.number()), // ポイントの有効期限(日)
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validatePointConfig(args);
    const salonMenuPointConfig = await ctx.db
      .query('point_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .first();
    if (!salonMenuPointConfig) {
      throw new ConvexCustomError(
        'low',
        '指定されたサロンのポイント設定が見つかりません',
        'NOT_FOUND',
        404,
        {
          ...args,
        }
      );
    }

    const updateData = removeEmptyFields({ ...args });

    await ctx.db.patch(salonMenuPointConfig._id, {
      ...updateData,
    });
    return true;
  },
});

export const upsert = mutation({
  args: {
    salonId: v.id('salon'),
    isFixedPoint: v.optional(v.boolean()), // 固定ポイントかどうか
    pointRate: v.optional(v.number()), // ポイント付与率  利用金額に対しての付与率 (例: 0.1なら10%)
    fixedPoint: v.optional(v.number()), // 固定ポイント (例: 100円につき1ポイント)
    pointExpirationDays: v.optional(v.number()), // ポイントの有効期限(日)
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validatePointConfig(args);

    const existingConfig = await ctx.db
      .query('point_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .first();

    if (existingConfig) {
      const updateData = removeEmptyFields(args);
      delete updateData.salonId;
      await ctx.db.patch(existingConfig._id, updateData);
      return existingConfig._id;
    } else {
      return await ctx.db.insert('point_config', {
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
    validateRequired(args.salonId, 'salonId');
    checkAuth(ctx);
    return await archiveRecord(ctx, args.salonId);
  },
});

export const kill = mutation({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    validateRequired(args.salonId, 'salonId');
    checkAuth(ctx);
    return await killRecord(ctx, args.salonId);
  },
});
