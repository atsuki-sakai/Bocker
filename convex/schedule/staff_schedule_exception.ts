import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "../helpers";
import { ERROR_CODES } from "../errors";
import { Doc } from '../_generated/dataModel';
import { MAX_NOTES_LENGTH } from '../../lib/constants';
import { staffScheduleType } from '../types';

// スタッフスケジュール例外のバリデーション
function validateStaffScheduleException(args: Partial<Doc<'staff_schedule'>>) {
  if (args.date && !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    throw new ConvexError({
      message: '日付は「YYYY-MM-DD」形式で入力してください',
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }
  if (args.notes && args.notes.length > MAX_NOTES_LENGTH) {
    throw new ConvexError({
      message: `メモは${MAX_NOTES_LENGTH}文字以内で入力してください`,
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }
}

// スタッフスケジュール例外の追加
export const add = mutation({
  args: {
    staffId: v.id('staff'),
    salonId: v.id('salon'),
    date: v.optional(v.string()),
    startTime_unix: v.optional(v.number()),
    endTime_unix: v.optional(v.number()),
    notes: v.optional(v.string()),
    type: v.optional(staffScheduleType),
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

      validateStaffScheduleException(args);
      const staffScheduleId = await ctx.db.insert('staff_schedule', {
        ...args,
        isArchive: false,
      });
      return staffScheduleId;
    } catch (error) {
      handleConvexApiError(
        'スタッフスケジュール例外の追加に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

// スタッフスケジュール例外情報の更新
export const update = mutation({
  args: {
    staffScheduleId: v.id('staff_schedule'),
    date: v.optional(v.string()),
    startTime_unix: v.optional(v.number()),
    endTime_unix: v.optional(v.number()),
    notes: v.optional(v.string()),
    type: v.optional(staffScheduleType),
  },
  handler: async (ctx, args) => {
    try {
      // スタッフスケジュール例外の存在確認
      const staffSchedule = await ctx.db.get(args.staffScheduleId);
      if (!staffSchedule || staffSchedule.isArchive) {
        throw new ConvexError({
          message: '指定されたスタッフスケジュール例外が存在しません',
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // staffScheduleExceptionId はパッチ対象から削除する
      delete updateData.staffScheduleId;

      validateStaffScheduleException(updateData);

      const newStaffScheduleId = await ctx.db.patch(args.staffScheduleId, updateData);
      return newStaffScheduleId;
    } catch (error) {
      handleConvexApiError(
        'スタッフスケジュール例外情報の更新に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

// スタッフスケジュール例外の削除
export const trash = mutation({
  args: {
    staffScheduleId: v.id('staff_schedule'),
  },
  handler: async (ctx, args) => {
    try {
      // スタッフスケジュール例外の存在確認
      const staffSchedule = await ctx.db.get(args.staffScheduleId);
      if (!staffSchedule) {
        throw new ConvexError({
          message: '指定されたスタッフスケジュール例外が存在しません',
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      await trashRecord(ctx, staffSchedule._id);
      return true;
    } catch (error) {
      handleConvexApiError(
        'スタッフスケジュール例外のアーカイブに失敗しました',
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
    date: v.optional(v.string()),
    startTime_unix: v.optional(v.number()),
    endTime_unix: v.optional(v.number()),
    notes: v.optional(v.string()),
    type: v.optional(staffScheduleType),
  },
  handler: async (ctx, args) => {
    try {
      validateStaffScheduleException(args);
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
        'スタッフスケジュール例外の追加/更新に失敗しました',
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
        'スタッフスケジュール例外の削除に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

// サロンIDとスタッフIDと日付からスタッフスケジュール例外を取得
export const getBySalonStaffAndDate = query({
  args: {
    salonId: v.id("salon"),
    staffId: v.id("staff"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('staff_schedule')
      .withIndex('by_salon_staff_date', (q) =>
        q.eq('salonId', args.salonId).eq('staffId', args.staffId).eq('date', args.date)
      )
      .first();
  },
});