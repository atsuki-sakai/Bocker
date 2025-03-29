import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "../helpers";
import { ERROR_CODES } from "../errors";
import { Doc } from "../_generated/dataModel";
import { MAX_AVAILABLE_CANCEL_DAYS } from "../../lib/constants";

// サロンスケジュール設定のバリデーション
export function validateSalonScheduleConfig(args: Partial<Doc<'salon_schedule_config'>>) {
  if (args.reservationLimitDays && args.reservationLimitDays < 0) {
    throw new ConvexError({
      message: '予約可能日数は0以上で入力してください',
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }
  if (args.availableCancelDays && args.availableCancelDays < 0) {
    throw new ConvexError({
      message: 'キャンセル可能日数は0以上で入力してください',
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }
  if (args.availableCancelDays && args.availableCancelDays > MAX_AVAILABLE_CANCEL_DAYS) {
    throw new ConvexError({
      message: `キャンセル可能日数は${MAX_AVAILABLE_CANCEL_DAYS}日以内で入力してください`,
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }
}

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
    try {
      // サロンの存在確認
      const salon = await ctx.db.get(args.salonId);
      if (!salon) {
        console.error('指定されたサロンが存在しません', args.salonId);
        throw new ConvexError({
          message: '指定されたサロンが存在しません',
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      validateSalonScheduleConfig(args);
      const salonScheduleConfigId = await ctx.db.insert('salon_schedule_config', {
        ...args,
        isArchive: false,
      });
      return salonScheduleConfigId;
    } catch (error) {
      handleConvexApiError(
        'サロンスケジュール設定の追加に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

export const get = query({
  args: {
    scheduleConfigId: v.id('salon_schedule_config'),
  },
  handler: async (ctx, args) => {
    try {
      const salonScheduleConfig = await ctx.db.get(args.scheduleConfigId);
      return salonScheduleConfig;
    } catch (error) {
      handleConvexApiError(
        'サロンスケジュール設定の取得に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
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
    try {
      // サロンスケジュール設定の存在確認
      const salonScheduleConfig = await ctx.db.get(args.salonScheduleConfigId);
      if (!salonScheduleConfig || salonScheduleConfig.isArchive) {
        throw new ConvexError({
          message: '指定されたサロンスケジュール設定が存在しません',
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // salonScheduleConfigId はパッチ対象から削除する
      delete updateData.salonScheduleConfigId;

      validateSalonScheduleConfig(updateData);

      const newSalonScheduleConfigId = await ctx.db.patch(args.salonScheduleConfigId, updateData);
      return newSalonScheduleConfigId;
    } catch (error) {
      handleConvexApiError(
        'サロンスケジュール設定の更新に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

// サロンスケジュール設定の削除
export const trash = mutation({
  args: {
    salonScheduleConfigId: v.id('salon_schedule_config'),
  },
  handler: async (ctx, args) => {
    try {
      // サロンスケジュール設定の存在確認
      const salonScheduleConfig = await ctx.db.get(args.salonScheduleConfigId);
      if (!salonScheduleConfig) {
        throw new ConvexError({
          message: '指定されたサロンスケジュール設定が存在しません',
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      await trashRecord(ctx, salonScheduleConfig._id);
      return true;
    } catch (error) {
      handleConvexApiError(
        'サロンスケジュール設定のアーカイブに失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
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
    try {
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
    } catch (error) {
      handleConvexApiError(
        'サロンスケジュール設定の追加/更新に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

export const kill = mutation({
  args: {
    salonScheduleConfigId: v.id("salon_schedule_config"),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.salonScheduleConfigId);
    } catch (error) {
      handleConvexApiError("サロンスケジュール設定の削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// サロンIDからサロンスケジュール設定を取得
export const getBySalonId = query({
  args: {
    salonId: v.id("salon"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("salon_schedule_config")
      .withIndex("by_salon_id", (q) => q.eq("salonId", args.salonId).eq("isArchive", false))
      .first();
  },
});