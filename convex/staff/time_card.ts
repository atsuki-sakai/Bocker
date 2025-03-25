// convex/queries/timeCard.ts
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { handleConvexApiError, KillRecord, removeEmptyFields, trashRecord } from "../helpers";
import { ERROR_CODES } from "../errors";
import { ConvexError } from "convex/values";
import { Doc } from "../_generated/dataModel";
import { MAX_TEXT_LENGTH, MAX_NOTES_LENGTH } from "../../lib/constants";


// 勤怠データのバリデーション
function validateTimeCard(args: Partial<Doc<"time_card">>) {
  if (args.salonId && args.salonId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({message: `サロンIDは${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  } 
  if (args.staffId && args.staffId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({message: `スタッフIDは${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.startDateTime_unix && args.endDateTime_unix && args.startDateTime_unix > args.endDateTime_unix) {
    throw new ConvexError({message: "開始時間は終了時間よりも前にしてください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.workedTime && args.workedTime < 0) {
    throw new ConvexError({message: "勤務時間は0以上で入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.notes && args.notes.length > MAX_NOTES_LENGTH) {
    throw new ConvexError({message: `メモは${MAX_NOTES_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
}

export const add = mutation({
  args: {
    salonId: v.id("salon"),
    staffId: v.id("staff"),
    startDateTime_unix: v.optional(v.number()),
    endDateTime_unix: v.optional(v.number()),
    workedTime: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      validateTimeCard(args);
      const salon = await ctx.db.get(args.salonId);
      if (!salon) {
        throw new ConvexError({
          message: "サロンが見つかりません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      const staff = await ctx.db.get(args.staffId);
      if (!staff) {
        throw new ConvexError({
          message: "スタッフが見つかりません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      await ctx.db.insert("time_card", {
        ...args,
        isArchive: false,
      });
    } catch (error) {
      handleConvexApiError("勤怠データの追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const update = mutation({
  args: {
    timeCardId: v.id("time_card"),
    startDateTime_unix: v.optional(v.number()),
    endDateTime_unix: v.optional(v.number()),
    workedTime: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      validateTimeCard(args);
      const timeCard = await ctx.db.get(args.timeCardId);
      if (!timeCard) {
        throw new ConvexError({
          message: "勤怠データが見つかりません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      const updateData = removeEmptyFields(args);
      await ctx.db.patch(args.timeCardId, updateData);
    } catch (error) {
      handleConvexApiError("勤怠データの更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const upsert = mutation({
  args: {
    salonId: v.id("salon"),
    staffId: v.id("staff"),
    startDateTime_unix: v.optional(v.number()),
    endDateTime_unix: v.optional(v.number()),
    workedTime: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const timeCard = await ctx.db.query("time_card").withIndex("by_salon_staff", (q) => 
        q.eq("salonId", args.salonId)
        .eq("staffId", args.staffId)
      ).first();

      validateTimeCard(args);
      if (!timeCard) {
        await ctx.db.insert("time_card", {
          ...args,
          isArchive: false,
        });
      }else{
        const updateData = removeEmptyFields(args);
        delete updateData.salonId;
        delete updateData.staffId;
        await ctx.db.patch(timeCard._id, updateData);
      }
    } catch (error) {
      handleConvexApiError("勤怠データの作成または更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const trash = mutation({
  args: {
    timeCardId: v.id("time_card"),
  },
  handler: async (ctx, args) => {
    try {
      const timeCard = await ctx.db.get(args.timeCardId);
      if (!timeCard) {
        throw new ConvexError({
          message: "勤怠データが見つかりません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      await trashRecord(ctx, args.timeCardId);
    } catch (error) {
      handleConvexApiError("勤怠データのアーカイブに失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const kill = mutation({
  args: {
    timeCardId: v.id("time_card"),
  },
  handler: async (ctx, args) => {
    try {
      const timeCard = await ctx.db.get(args.timeCardId);
      if (!timeCard) {
        throw new ConvexError({
          message: "勤怠データが見つかりません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      await KillRecord(ctx, args.timeCardId);
    } catch (error) {
      handleConvexApiError("勤怠データの削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// 指定したスタッフかサロンの日付範囲内の勤務時間を取得する
export const getTimeCardsByDateRange = query({
  args: {
    salonId: v.id("salon"),
    staffId: v.id("staff"),
    startDate_unix: v.number(),
    endDate_unix: v.number(),
    paginationOpts: paginationOptsValidator,
    direction: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    try {
      const { salonId, staffId, startDate_unix, endDate_unix, paginationOpts, direction} = args;

      let q;
      if (staffId) {
        // スタッフIDが指定されている場合は専用インデックスを使用
        q = await ctx.db
        .query("time_card")
        .withIndex("by_salon_staff_start_time", (q) => 
          q.eq("salonId", salonId)
           .eq("staffId", staffId)
           .gte("startDateTime_unix", startDate_unix)
           .lt("startDateTime_unix", endDate_unix)
        )
        .order(direction || "desc")
    } else {
      // サロンIDのみの場合は日付検索も含めたインデックスを使用
      q = ctx.db
        .query("time_card")
        .withIndex("by_salon_start_time", (q) => 
          q.eq("salonId", salonId)
           .gte("startDateTime_unix", startDate_unix,)
           .lt("startDateTime_unix", endDate_unix)
        )
        .order(direction || "desc");
    }
    const result = await  q.paginate(paginationOpts);
    return result;
    } catch (error) {
      handleConvexApiError("勤怠データの取得に失敗しました", ERROR_CODES.INTERNAL_ERROR, error, { salonId: args.salonId });
    }
  },
});

// 特定のスタッフの日時範囲内の勤怠データをページング取得するバージョン
export const paginateTimeCardsByDateRange = query({
  args: {
    salonId: v.id("salon"),
    staffId: v.optional(v.id("staff")),
    startDate_unix: v.number(),
    endDate_unix: v.number(),
    paginationOpts: paginationOptsValidator,
    direction: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    
    try {
      const { salonId, staffId, startDate_unix, endDate_unix, paginationOpts, direction} = args;
    
      // ページングのためのクエリを作成
      let q;
        
      if (staffId) {
        // スタッフIDが指定されている場合は専用インデックスを使用
        q = await ctx.db
          .query("time_card")
          .withIndex("by_salon_staff_start_time", (q) =>
            q.eq("salonId", salonId)
            .eq("staffId", staffId)
            .gte("startDateTime_unix", startDate_unix)
            .lt("startDateTime_unix", endDate_unix)
          )
          .order(direction || "desc");
      } else {
        // サロンIDのみの場合は日付検索も含めたインデックスを使用
        q = await ctx.db
          .query("time_card")
          .withIndex("by_salon_start_time", (q) => 
            q.eq("salonId", salonId)
            .gte("startDateTime_unix", startDate_unix)
            .lt("startDateTime_unix", endDate_unix)
          )
          .order(direction || "desc");
      }
      const result = await q.paginate(paginationOpts);
      return result;
    } catch (error) {
      handleConvexApiError("勤怠データの取得に失敗しました", ERROR_CODES.INTERNAL_ERROR, error, { salonId: args.salonId });
    }
  },
});
