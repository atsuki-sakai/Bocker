import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import {
  handleConvexApiError,
  removeEmptyFields,
  trashRecord,
  KillRecord,
  authCheck,
} from '../helpers';
import { CONVEX_ERROR_CODES } from '../constants';
import { validateSalonScheduleConfig } from '../validators';

// サロンスケジュール設定の追加
export const add = mutation({
  args: {
    salonId: v.id('salon'),
    reservationLimitDays: v.optional(v.number()),
    availableCancelDays: v.optional(v.number()),
    reservationIntervalMinutes: v.optional(
      v.union(v.literal(5), v.literal(10), v.literal(15), v.literal(20), v.literal(30))
    ),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateSalonScheduleConfig(args);
    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      console.error('AddSalonScheduleConfig: 指定されたサロンが存在しません', { ...args });
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
    const salonScheduleConfigId = await ctx.db.insert('salon_schedule_config', {
      ...args,
      isArchive: false,
    });
    return salonScheduleConfigId;
  },
});

export const get = query({
  args: {
    scheduleConfigId: v.id('salon_schedule_config'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db.get(args.scheduleConfigId);
  },
});

// サロンスケジュール設定の更新
export const update = mutation({
  args: {
    salonScheduleConfigId: v.id('salon_schedule_config'),
    reservationLimitDays: v.optional(v.number()),
    availableCancelDays: v.optional(v.number()),
    reservationIntervalMinutes: v.optional(
      v.union(v.literal(5), v.literal(10), v.literal(15), v.literal(20), v.literal(30))
    ),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateSalonScheduleConfig(args);
    // サロンスケジュール設定の存在確認
    const salonScheduleConfig = await ctx.db.get(args.salonScheduleConfigId);
    if (!salonScheduleConfig || salonScheduleConfig.isArchive) {
      console.error('UpdateSalonScheduleConfig: 指定されたサロンスケジュール設定が存在しません', {
        ...args,
      });
      throw new ConvexError({
        message: '指定されたサロンスケジュール設定が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonScheduleConfigId: args.salonScheduleConfigId,
        },
      });
    }

    const updateData = removeEmptyFields(args);
    // salonScheduleConfigId はパッチ対象から削除する
    delete updateData.salonScheduleConfigId;

    return await ctx.db.patch(args.salonScheduleConfigId, updateData);
  },
});

// サロンスケジュール設定の削除
export const trash = mutation({
  args: {
    salonScheduleConfigId: v.id('salon_schedule_config'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // サロンスケジュール設定の存在確認
    const salonScheduleConfig = await ctx.db.get(args.salonScheduleConfigId);
    if (!salonScheduleConfig) {
      console.error('TrashSalonScheduleConfig: 指定されたサロンスケジュール設定が存在しません', {
        ...args,
      });
      throw new ConvexError({
        message: '指定されたサロンスケジュール設定が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonScheduleConfigId: args.salonScheduleConfigId,
        },
      });
    }

    return await trashRecord(ctx, salonScheduleConfig._id);
  },
});

export const upsert = mutation({
  args: {
    salonScheduleConfigId: v.id('salon_schedule_config'),
    salonId: v.id('salon'),
    reservationLimitDays: v.optional(v.number()),
    availableCancelDays: v.optional(v.number()),
    reservationIntervalMinutes: v.optional(
      v.union(v.literal(5), v.literal(10), v.literal(15), v.literal(20), v.literal(30))
    ),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
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
      return await ctx.db.patch(existingSalonScheduleConfig._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    salonScheduleConfigId: v.id('salon_schedule_config'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await KillRecord(ctx, args.salonScheduleConfigId);
  },
});

// サロンIDからサロンスケジュール設定を取得
export const getBySalonId = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('salon_schedule_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .first();
  },
});