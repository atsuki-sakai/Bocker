import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "../helpers";
import { ERROR_CODES } from "../errors";
import { Doc } from "../_generated/dataModel";
import { MAX_NOTES_LENGTH } from "../../lib/constants";
import { scheduleExceptionType, dayOfWeekType } from "../types";

// スタッフスケジュール例外のバリデーション
function validateStaffScheduleException(args: Partial<Doc<"staff_schedule_exception">>) {
  if (args.date && !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    throw new ConvexError({message: "日付は「YYYY-MM-DD」形式で入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.notes && args.notes.length > MAX_NOTES_LENGTH) {
    throw new ConvexError({message: `メモは${MAX_NOTES_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
}

// スタッフスケジュール例外の追加
export const add = mutation({
  args: {
    staffId: v.id("staff"),
    salonId: v.id("salon"),
    date: v.optional(v.string()),
    startTime_unix: v.optional(v.number()),
    endTime_unix: v.optional(v.number()),
    notes: v.optional(v.string()),
    type: v.optional(scheduleExceptionType),
  },
  handler: async (ctx, args) => {
    try {
      // スタッフの存在確認
      const staff = await ctx.db.get(args.staffId);
      if (!staff) {
        console.error("指定されたスタッフが存在しません", args.staffId);
        throw new ConvexError({
          message: "指定されたスタッフが存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      // サロンの存在確認
      const salon = await ctx.db.get(args.salonId);
      if (!salon) {
        console.error("指定されたサロンが存在しません", args.salonId);
        throw new ConvexError({
          message: "指定されたサロンが存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      validateStaffScheduleException(args);
      const staffScheduleExceptionId = await ctx.db.insert("staff_schedule_exception", {
        ...args,
        isArchive: false,
      });
      return staffScheduleExceptionId;
    } catch (error) {
      handleConvexApiError("スタッフスケジュール例外の追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// スタッフスケジュール例外情報の更新
export const update = mutation({
  args: {
    staffScheduleExceptionId: v.id("staff_schedule_exception"),
    date: v.optional(v.string()),
    startTime_unix: v.optional(v.number()),
    endTime_unix: v.optional(v.number()),
    notes: v.optional(v.string()),
    type: v.optional(scheduleExceptionType),
  },
  handler: async (ctx, args) => {
    try {
      // スタッフスケジュール例外の存在確認
      const staffScheduleException = await ctx.db.get(args.staffScheduleExceptionId);
      if (!staffScheduleException || staffScheduleException.isArchive) {
        throw new ConvexError({
          message: "指定されたスタッフスケジュール例外が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // staffScheduleExceptionId はパッチ対象から削除する
      delete updateData.staffScheduleExceptionId;

      validateStaffScheduleException(updateData);

      const newStaffScheduleExceptionId = await ctx.db.patch(args.staffScheduleExceptionId, updateData);
      return newStaffScheduleExceptionId;
    } catch (error) {
      handleConvexApiError("スタッフスケジュール例外情報の更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// スタッフスケジュール例外の削除
export const trash = mutation({
  args: {
    staffScheduleExceptionId: v.id("staff_schedule_exception"),
  },
  handler: async (ctx, args) => {
    try {
      // スタッフスケジュール例外の存在確認
      const staffScheduleException = await ctx.db.get(args.staffScheduleExceptionId);
      if (!staffScheduleException) {
        throw new ConvexError({
          message: "指定されたスタッフスケジュール例外が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      await trashRecord(ctx, staffScheduleException._id);
      return true;
    } catch (error) {
      handleConvexApiError("スタッフスケジュール例外のアーカイブに失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const upsert = mutation({
  args: {
    staffScheduleExceptionId: v.id("staff_schedule_exception"),
    staffId: v.id("staff"),
    salonId: v.id("salon"),
    date: v.optional(v.string()),
    startTime_unix: v.optional(v.number()),
    endTime_unix: v.optional(v.number()),
    notes: v.optional(v.string()),
    type: v.optional(scheduleExceptionType),
  },
  handler: async (ctx, args) => {
    try {
      validateStaffScheduleException(args);
      const existingStaffScheduleException = await ctx.db.get(args.staffScheduleExceptionId);

      if (!existingStaffScheduleException || existingStaffScheduleException.isArchive) {
        return await ctx.db.insert("staff_schedule_exception", {
          ...args,
          isArchive: false,
        });
      } else {
        
        const updateData = removeEmptyFields(args);
        delete updateData.staffScheduleExceptionId;
        return await ctx.db.patch(existingStaffScheduleException._id, updateData);
      }
    } catch (error) {
      handleConvexApiError("スタッフスケジュール例外の追加/更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const kill = mutation({
  args: {
    staffScheduleExceptionId: v.id("staff_schedule_exception"),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.staffScheduleExceptionId);
    } catch (error) {
      handleConvexApiError("スタッフスケジュール例外の削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
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
      .query("staff_schedule_exception")
      .withIndex("by_salon_staff_date", (q) => 
        q.eq("salonId", args.salonId)
         .eq("staffId", args.staffId)
         .eq("date", args.date)
      )
      .first();
  },
});