import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from '../helpers';
import { ERROR_CODES } from '../errors';
import { Doc } from '../_generated/dataModel';
import { dayOfWeekType } from '../types';
import { paginationOptsValidator } from 'convex/server';

// スタッフスケジュールのバリデーション
function validateStaffSchedule(args: Partial<Doc<'staff_week_schedule'>>) {
  if (args.startHour && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(args.startHour)) {
    throw new ConvexError({
      message: '開始時間は「HH:MM」形式で入力してください',
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }
  if (args.endHour && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(args.endHour)) {
    throw new ConvexError({
      message: '終了時間は「HH:MM」形式で入力してください',
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }
}

// スタッフスケジュールの追加
export const add = mutation({
  args: {
    staffId: v.id('staff'),
    salonId: v.id('salon'),
    dayOfWeek: v.optional(dayOfWeekType),
    startHour: v.optional(v.string()),
    endHour: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // スタッフの存在確認
      const staff = await ctx.db.get(args.staffId);
      if (!staff) {
        console.error('指定されたスタッフが存在しません', args.staffId);
        throw new ConvexError({
          message: '指定されたスタッフが存在しません',
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      // サロンの存在確認
      const salon = await ctx.db.get(args.salonId);
      if (!salon) {
        console.error('指定されたサロンが存在しません', args.salonId);
        throw new ConvexError({
          message: '指定されたサロンが存在しません',
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      validateStaffSchedule(args);
      const staffScheduleId = await ctx.db.insert('staff_schedule', {
        ...args,
        isArchive: false,
      });
      return staffScheduleId;
    } catch (error) {
      handleConvexApiError(
        'スタッフスケジュールの追加に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

// スタッフスケジュール情報の更新
export const update = mutation({
  args: {
    staffWeekScheduleId: v.id('staff_week_schedule'),
    dayOfWeek: v.optional(dayOfWeekType),
    startHour: v.optional(v.string()),
    endHour: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // スタッフスケジュールの存在確認
      const staffWeekSchedule = await ctx.db.get(args.staffWeekScheduleId);
      if (!staffWeekSchedule || staffWeekSchedule.isArchive) {
        throw new ConvexError({
          message: '指定されたスタッフスケジュールが存在しません',
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // staffWeekScheduleId はパッチ対象から削除する
      delete updateData.staffWeekScheduleId;

      validateStaffSchedule(updateData);

      const newStaffWeekScheduleId = await ctx.db.patch(args.staffWeekScheduleId, updateData);
      return newStaffWeekScheduleId;
    } catch (error) {
      handleConvexApiError(
        'スタッフスケジュール情報の更新に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

// スタッフスケジュールの削除
export const trash = mutation({
  args: {
    staffScheduleId: v.id('staff_schedule'),
  },
  handler: async (ctx, args) => {
    try {
      // スタッフスケジュールの存在確認
      const staffSchedule = await ctx.db.get(args.staffScheduleId);
      if (!staffSchedule) {
        throw new ConvexError({
          message: '指定されたスタッフスケジュールが存在しません',
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      await trashRecord(ctx, staffSchedule._id);
      return true;
    } catch (error) {
      handleConvexApiError(
        'スタッフスケジュールのアーカイブに失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

export const upsert = mutation({
  args: {
    staffScheduleId: v.id('staff_schedule'),
    staffId: v.id('staff'),
    salonId: v.id('salon'),
    dayOfWeek: v.optional(dayOfWeekType),
    startHour: v.optional(v.string()),
    endHour: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      validateStaffSchedule(args);
      const existingStaffSchedule = await ctx.db.get(args.staffScheduleId);

      if (!existingStaffSchedule || existingStaffSchedule.isArchive) {
        return await ctx.db.insert('staff_schedule', {
          ...args,
          isArchive: false,
        });
      } else {
        const updateData = removeEmptyFields(args);
        delete updateData.staffScheduleId;
        return await ctx.db.patch(existingStaffSchedule._id, updateData);
      }
    } catch (error) {
      handleConvexApiError(
        'スタッフスケジュールの追加/更新に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

export const kill = mutation({
  args: {
    staffScheduleId: v.id('staff_schedule'),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.staffScheduleId);
    } catch (error) {
      handleConvexApiError(
        'スタッフスケジュールの削除に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

// サロンIDとスタッフIDと曜日からスタッフスケジュールを取得
export const getBySalonStaffAndWeek = query({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
    dayOfWeek: dayOfWeekType,
  },
  handler: async (ctx, args) => {
    try {
      return await ctx.db
        .query('staff_week_schedule')
        .withIndex('by_salon_staff_week_is_open', (q) =>
          q
            .eq('salonId', args.salonId)
            .eq('staffId', args.staffId)
            .eq('dayOfWeek', args.dayOfWeek)
            .eq('isOpen', true)
            .eq('isArchive', false)
        );
    } catch (error) {
      handleConvexApiError(
        'スタッフスケジュールの取得に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});
