import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "../helpers";
import { paginationOptsValidator } from "convex/server";
import { ERROR_CODES } from "../errors";
import { Doc } from "../_generated/dataModel";
import { MAX_NOTES_LENGTH,MAX_TEXT_LENGTH } from "../../lib/constants";
import { genderType } from "../types";

// スタッフのバリデーション
function validateStaff(args: Partial<Doc<"staff">>) {
  if (args.name && args.name.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({message: `スタッフ名は${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.age && (args.age < 0 || args.age > 120)) {
    throw new ConvexError({message: "年齢は0以上120以下で入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.email && args.email.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({message: `メールアドレスは${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.description && args.description.length > MAX_NOTES_LENGTH) {
    throw new ConvexError({message: `説明は${MAX_NOTES_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
}

// スタッフの追加
export const add = mutation({
  args: {
    salonId: v.id("salon"),
    name: v.optional(v.string()),
    age: v.optional(v.number()),
    email: v.optional(v.string()),
    gender: v.optional(genderType),
    description: v.optional(v.string()),
    imgFileId: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
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

      validateStaff(args);
      const staffId = await ctx.db.insert("staff", {
        ...args,
        isArchive: false,
      });
      return staffId;
    } catch (error) {
      handleConvexApiError("スタッフの追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// スタッフ情報の更新
export const update = mutation({
  args: {
    staffId: v.id("staff"),
    name: v.optional(v.string()),
    age: v.optional(v.number()),
    email: v.optional(v.string()),
    gender: v.optional(genderType),
    description: v.optional(v.string()),
    imgFileId: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      // スタッフの存在確認
      const staff = await ctx.db.get(args.staffId);
      if (!staff || staff.isArchive) {
        throw new ConvexError({
          message: "指定されたスタッフが存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // staffId はパッチ対象から削除する
      delete updateData.staffId;

      validateStaff(updateData);

      const newStaffId = await ctx.db.patch(args.staffId, updateData);
      return newStaffId;
    } catch (error) {
      handleConvexApiError("スタッフ情報の更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// スタッフの削除
export const trash = mutation({
  args: {
    staffId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    try {
      // スタッフの存在確認
      const staff = await ctx.db.get(args.staffId);
      if (!staff) {
        throw new ConvexError({
          message: "指定されたスタッフが存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      await trashRecord(ctx, staff._id);
      return true;
    } catch (error) {
      handleConvexApiError("スタッフのアーカイブに失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const upsert = mutation({
  args: {
    staffId: v.id("staff"),
    salonId: v.id("salon"),
    name: v.optional(v.string()),
    age: v.optional(v.number()),
    email: v.optional(v.string()),
    gender: v.optional(genderType),
    description: v.optional(v.string()),
    imgFileId: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      validateStaff(args);
      const existingStaff = await ctx.db.get(args.staffId);


      if (!existingStaff || existingStaff.isArchive) {
        return await ctx.db.insert("staff", {
          ...args,
          salonId: args.salonId,
          isArchive: false,
        });
      } else {
        const updateData = removeEmptyFields(args);
        delete updateData.staffId;
        return await ctx.db.patch(existingStaff._id, updateData);
      }
    } catch (error) {
      handleConvexApiError("スタッフの追加/更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const kill = mutation({
  args: {
    staffId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.staffId);
    } catch (error) {
      handleConvexApiError("スタッフの削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// サロンIDからスタッフ一覧を取得
export const getStaffListBySalonId = query({
  args: {
    salonId: v.id("salon"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staff")
      .withIndex("by_salon_id", (q) => q.eq("salonId", args.salonId).eq("isActive", true).eq("isArchive", false))
      .paginate(args.paginationOpts);
  },
});

// スタッフ名で検索
export const getStaffListByName = query({
  args: {
    name: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staff")
      .withIndex("by_name", (q) => q.eq("name", args.name).eq("isActive", true).eq("isArchive", false))
      .paginate(args.paginationOpts);
  },
});

// メールアドレスでスタッフを検索
export const getStaffListByEmail = query({
  args: {
    email: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staff")
      .withIndex("by_email", (q) => q.eq("email", args.email).eq("isActive", true).eq("isArchive", false))
      .paginate(args.paginationOpts);
  },
});

// サロンIDとスタッフ名でスタッフを検索
export const getStaffListBySalonIdAndName = query({
  args: {
    salonId: v.id("salon"),
    name: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staff")
      .withIndex("by_salon_id_name", (q) => 
        q.eq("salonId", args.salonId).eq("name", args.name).eq("isActive", true).eq("isArchive", false)
      )
      .paginate(args.paginationOpts);
  },
});

// サロンIDとメールアドレスでスタッフを検索
export const getBySalonIdAndEmail = query({
  args: {
    salonId: v.id("salon"),
    email: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staff")
      .withIndex("by_salon_id_email", (q) => 
        q.eq("salonId", args.salonId).eq("email", args.email).eq("isActive", true).eq("isArchive", false)
      )
      .paginate(args.paginationOpts);
  },
});