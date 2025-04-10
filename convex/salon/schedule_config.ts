import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { removeEmptyFields, archiveRecord, KillRecord } from '../shared/utils/helper';
import { ConvexCustomError } from '../shared/utils/error';
import { checkAuth } from '../shared/utils/auth';
import { validateSalonScheduleConfig, validateRequired } from '../shared/utils/validation';
import { reservationIntervalMinutesType } from '../shared/types/common';
// サロンスケジュール設定の追加
export const add = mutation({
  args: {
    salonId: v.id('salon'),
    reservationLimitDays: v.optional(v.number()),
    availableCancelDays: v.optional(v.number()),
    reservationIntervalMinutes: v.optional(reservationIntervalMinutesType) || 0,
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalonScheduleConfig(args);
    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      throw new ConvexCustomError('low', '指定されたサロンが存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }
    return await ctx.db.insert('salon_schedule_config', {
      ...args,
      isArchive: false,
    });
  },
});

export const get = query({
  args: {
    scheduleConfigId: v.id('salon_schedule_config'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await ctx.db.get(args.scheduleConfigId);
  },
});

// サロンスケジュール設定の更新
export const update = mutation({
  args: {
    salonScheduleConfigId: v.id('salon_schedule_config'),
    reservationLimitDays: v.optional(v.number()),
    availableCancelDays: v.optional(v.number()),
    reservationIntervalMinutes: v.optional(reservationIntervalMinutesType) || 0,
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalonScheduleConfig(args);
    // サロンスケジュール設定の存在確認
    const salonScheduleConfig = await ctx.db.get(args.salonScheduleConfigId);
    if (!salonScheduleConfig || salonScheduleConfig.isArchive) {
      throw new ConvexCustomError(
        'low',
        '指定されたサロンスケジュール設定が存在しません',
        'NOT_FOUND',
        404,
        {
          ...args,
        }
      );
    }

    const updateData = removeEmptyFields(args);
    // salonScheduleConfigId はパッチ対象から削除する
    delete updateData.salonScheduleConfigId;

    return await ctx.db.patch(args.salonScheduleConfigId, updateData);
  },
});

// サロンスケジュール設定の削除
export const archive = mutation({
  args: {
    salonScheduleConfigId: v.id('salon_schedule_config'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonScheduleConfigId, 'salonScheduleConfigId');
    return await archiveRecord(ctx, args.salonScheduleConfigId);
  },
});

export const upsert = mutation({
  args: {
    salonScheduleConfigId: v.id('salon_schedule_config'),
    salonId: v.id('salon'),
    reservationLimitDays: v.optional(v.number()),
    availableCancelDays: v.optional(v.number()),
    reservationIntervalMinutes: v.optional(reservationIntervalMinutesType) || 0,
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalonScheduleConfig(args);
    const existingSalonScheduleConfig = await ctx.db.get(args.salonScheduleConfigId);

    if (!existingSalonScheduleConfig || existingSalonScheduleConfig.isArchive) {
      const updateData = removeEmptyFields(args);
      delete updateData.salonScheduleConfigId;

      return await ctx.db.insert('salon_schedule_config', {
        ...updateData,
        salonId: args.salonId,
        isArchive: false,
      });
    } else {
      const updateData = removeEmptyFields(args);
      delete updateData.salonScheduleConfigId;
      delete updateData.salonId;
      return await ctx.db.patch(existingSalonScheduleConfig._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    salonScheduleConfigId: v.id('salon_schedule_config'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonScheduleConfigId, 'salonScheduleConfigId');
    return await KillRecord(ctx, args.salonScheduleConfigId);
  },
});

// サロンIDからサロンスケジュール設定を取得
export const getBySalonId = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await ctx.db
      .query('salon_schedule_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .first();
  },
});