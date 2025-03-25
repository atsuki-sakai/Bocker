import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "../helpers";
import { ERROR_CODES } from "../errors";
import { Doc } from "../_generated/dataModel";
import { staffRoleType } from "../types";
import { MAX_HOURLY_RATE, MAX_EXTRA_CHARGE, MAX_PRIORITY } from "../../lib/constants";

// スタッフ設定のバリデーション
function validateStaffConfig(args: Partial<Doc<"staff_config">>) {
  if (args.hourlyRate && args.hourlyRate < 0) {
    throw new ConvexError({message: "時間給は0以上で入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if(args.hourlyRate && args.hourlyRate > MAX_HOURLY_RATE) {
    throw new ConvexError({message: `時間給は${MAX_HOURLY_RATE}円以下で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.extraCharge && args.extraCharge < 0) {
    throw new ConvexError({message: "指名料金は0以上で入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if(args.extraCharge && args.extraCharge > MAX_EXTRA_CHARGE) {
    throw new ConvexError({message: `指名料金は${MAX_EXTRA_CHARGE}円以下で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.priority && args.priority < 0) {
    throw new ConvexError({message: "優先度は0以上で入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if(args.priority && args.priority > MAX_PRIORITY) {
    throw new ConvexError({message: `優先度は${MAX_PRIORITY}以下で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
}

// スタッフ設定の追加
export const add = mutation({
  args: {
    staffId: v.id("staff"),
    salonId: v.id("salon"),
    hourlyRate: v.optional(v.number()),
    extraCharge: v.optional(v.number()),
    priority: v.optional(v.number()),
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

      validateStaffConfig(args);
      const staffConfigId = await ctx.db.insert("staff_config", {
        ...args,
        isArchive: false,
      });
      return staffConfigId;
    } catch (error) {
      handleConvexApiError("スタッフ設定の追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// スタッフ設定情報の更新
export const update = mutation({
  args: {
    staffConfigId: v.id("staff_config"),
    hourlyRate: v.optional(v.number()),
    extraCharge: v.optional(v.number()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // スタッフ設定の存在確認
      const staffConfig = await ctx.db.get(args.staffConfigId);
      if (!staffConfig || staffConfig.isArchive) {
        throw new ConvexError({
          message: "指定されたスタッフ設定が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // staffConfigId はパッチ対象から削除する
      delete updateData.staffConfigId;

      validateStaffConfig(updateData);

      const newStaffConfigId = await ctx.db.patch(args.staffConfigId, updateData);
      return newStaffConfigId;
    } catch (error) {
      handleConvexApiError("スタッフ設定情報の更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// スタッフ設定の削除
export const trash = mutation({
  args: {
    staffConfigId: v.id("staff_config"),
  },
  handler: async (ctx, args) => {
    try {
      // スタッフ設定の存在確認
      const staffConfig = await ctx.db.get(args.staffConfigId);
      if (!staffConfig) {
        throw new ConvexError({
          message: "指定されたスタッフ設定が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      await trashRecord(ctx, staffConfig._id);
      return true;
    } catch (error) {
      handleConvexApiError("スタッフ設定のアーカイブに失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const upsert = mutation({
  args: {
    staffConfigId: v.id("staff_config"),
    staffId: v.id("staff"),
    salonId: v.id("salon"),
    hourlyRate: v.optional(v.number()),
    extraCharge: v.optional(v.number()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      validateStaffConfig(args);
      const existingStaffConfig = await ctx.db.get(args.staffConfigId);
      if (!existingStaffConfig || existingStaffConfig.isArchive) {
        return await ctx.db.insert("staff_config", {
          ...args,
          isArchive: false,
        });
      } else {

        const updateData = removeEmptyFields(args);
        delete updateData.staffConfigId;
        return await ctx.db.patch(existingStaffConfig._id, updateData);
      }
    } catch (error) {
      handleConvexApiError("スタッフ設定の追加/更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const kill = mutation({
  args: {
    staffConfigId: v.id("staff_config"),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.staffConfigId);
    } catch (error) {
      handleConvexApiError("スタッフ設定の削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// サロンIDとスタッフIDからスタッフ設定を取得
export const getBySalonAndStaffId = query({
  args: {
    salonId: v.id("salon"),
    staffId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staff_config")
      .withIndex("by_staff_id", (q) => q.eq("salonId", args.salonId).eq("staffId", args.staffId).eq("isArchive", false))
      .first();
  },
});