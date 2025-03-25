import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord, getCurrentUnixTime } from "../helpers";
import { ERROR_CODES } from "../errors";
import { Doc } from "../_generated/dataModel";
import { timeSlotType } from "../types";

// 一度作成したスタッフ予約スロットの日時は更新できない使用
// 過ぎたものを定期スケジュールで削除する

// スタッフ予約スロットのバリデーション
function validateStaffAvailableSlots(args: Partial<Doc<"staff_available_slots">>) {
  if (args.date && !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    throw new ConvexError({message: "日付は「YYYY-MM-DD」形式で入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.availableSlots) {
    for (const slot of args.availableSlots) {
      if (slot.start >= slot.end) {
        throw new ConvexError({message: "スロットの開始時間は終了時間より前である必要があります", code: ERROR_CODES.INVALID_ARGUMENT});
      }
    }
  }
}

// スタッフ予約スロットの追加
export const add = mutation({
  args: {
    salonId: v.id("salon"),
    staffId: v.id("staff"),
    date: v.string(),
    availableSlots: v.array(
      v.object({
        start: v.number(),
        end: v.number(),
      })
    ),
    lastUpdated: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // サロンの存在確認
      const salon = await ctx.db.get(args.salonId);
      if (!salon) {
        console.error("指定されたサロンが存在しません", args.salonId);
        throw new ConvexError({
          message: "指定されたサロンが存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      // スタッフの存在確認
      const staff = await ctx.db.get(args.staffId);
      if (!staff) {
        console.error("指定されたスタッフが存在しません", args.staffId);
        throw new ConvexError({
          message: "指定されたスタッフが存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      validateStaffAvailableSlots(args);
      const lastUpdated = args.lastUpdated || getCurrentUnixTime();
      const staffAvailableSlotsId = await ctx.db.insert("staff_available_slots", {
        ...args,
        lastUpdated,
        isArchive: false,
      });
      return staffAvailableSlotsId;
    } catch (error) {
      handleConvexApiError("スタッフ予約スロットの追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// スタッフ予約スロット情報の更新
export const update = mutation({
  args: {
    staffAvailableSlotsId: v.id("staff_available_slots"),
    availableSlots: v.optional(v.array(
      v.object({
        start: v.number(),
        end: v.number(),
      })
    )),
  },
  handler: async (ctx, args) => {
    try {
      // スタッフ予約スロットの存在確認
      const staffAvailableSlots = await ctx.db.get(args.staffAvailableSlotsId);
      if (!staffAvailableSlots || staffAvailableSlots.isArchive) {
        throw new ConvexError({
          message: "指定されたスタッフ予約スロットが存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // staffAvailableSlotsId はパッチ対象から削除する
      delete updateData.staffAvailableSlotsId;
      validateStaffAvailableSlots(updateData);

      const newStaffAvailableSlotsId = await ctx.db.patch(args.staffAvailableSlotsId, {
        ...updateData,
        lastUpdated: getCurrentUnixTime(),
      });
      return newStaffAvailableSlotsId;
    } catch (error) {
      handleConvexApiError("スタッフ予約スロット情報の更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// スタッフ予約スロットの削除
export const trash = mutation({
  args: {
    staffAvailableSlotsId: v.id("staff_available_slots"),
  },
  handler: async (ctx, args) => {
    try {
      // スタッフ予約スロットの存在確認
      const staffAvailableSlots = await ctx.db.get(args.staffAvailableSlotsId);
      if (!staffAvailableSlots) {
        throw new ConvexError({
          message: "指定されたスタッフ予約スロットが存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      await trashRecord(ctx, staffAvailableSlots._id);
      return true;
    } catch (error) {
      handleConvexApiError("スタッフ予約スロットのアーカイブに失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const upsert = mutation({
  args: {
    staffAvailableSlotsId: v.id("staff_available_slots"),
    salonId: v.id("salon"),
    staffId: v.id("staff"),
    availableSlots: v.optional(v.array(timeSlotType)),
  },
  handler: async (ctx, args) => {
    try {
      const existingStaffAvailableSlots = await ctx.db.get(args.staffAvailableSlotsId);
      const lastUpdated = getCurrentUnixTime();
      validateStaffAvailableSlots(args);
      if (!existingStaffAvailableSlots || existingStaffAvailableSlots.isArchive) {
        return await ctx.db.insert("staff_available_slots", {
          ...args,
          lastUpdated,
          isArchive: false,
        });
      } else {
        const updateData = removeEmptyFields(args);
        delete updateData.staffAvailableSlotsId;
        return await ctx.db.patch(existingStaffAvailableSlots._id, {
          ...updateData,
          lastUpdated,
        });
      }
    } catch (error) {
      handleConvexApiError("スタッフ予約スロットの追加/更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const kill = mutation({
  args: {
    staffAvailableSlotsId: v.id("staff_available_slots"),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.staffAvailableSlotsId);
    } catch (error) {
      handleConvexApiError("スタッフ予約スロットの削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// サロンIDとスタッフIDと日付からスタッフ予約スロットを取得
export const getBySalonStaffAndDate = query({
  args: {
    salonId: v.id("salon"),
    staffId: v.id("staff"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staff_available_slots")
      .withIndex("by_salon_staff_date", (q) => 
        q.eq("salonId", args.salonId)
         .eq("staffId", args.staffId)
         .eq("date", args.date)
      )
      .first();
  },
});