import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "../helpers";
import { ERROR_CODES } from "../errors";
import { Doc } from "../_generated/dataModel";
import { MAX_PIN_CODE_LENGTH, MAX_HASH_PIN_CODE_LENGTH } from "../../lib/constants";
import { staffRoleType } from "../types";
// スタッフ認証のバリデーション
function validateStaffAuth(args: Partial<Doc<"staff_auth">>) {
  if (args.pinCode && args.pinCode.length > MAX_PIN_CODE_LENGTH) {
    throw new ConvexError({message: `ピンコードは${MAX_PIN_CODE_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.hashPinCode && args.hashPinCode.length > MAX_HASH_PIN_CODE_LENGTH) {
    throw new ConvexError({message: `ハッシュ化されたピンコードは${MAX_HASH_PIN_CODE_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
}

// スタッフ認証の追加
export const add = mutation({
  args: {
    staffId: v.id("staff"),
    pinCode: v.optional(v.string()),
    hashPinCode: v.optional(v.string()),
    role: v.optional(staffRoleType),
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

      validateStaffAuth(args);
      const staffAuthId = await ctx.db.insert("staff_auth", {
        ...args,
        isArchive: false,
      });
      return staffAuthId;
    } catch (error) {
      handleConvexApiError("スタッフ認証の追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// スタッフ認証情報の更新
export const update = mutation({
  args: {
    staffAuthId: v.id("staff_auth"),
    pinCode: v.optional(v.string()),
    hashPinCode: v.optional(v.string()),
    role: v.optional(staffRoleType),
  },
  handler: async (ctx, args) => {
    try {
      // スタッフ認証の存在確認
      const staffAuth = await ctx.db.get(args.staffAuthId);
      if (!staffAuth || staffAuth.isArchive) {
        throw new ConvexError({
          message: "指定されたスタッフ認証が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // staffAuthId はパッチ対象から削除する
      delete updateData.staffAuthId;

      validateStaffAuth(updateData);

      const newStaffAuthId = await ctx.db.patch(args.staffAuthId, updateData);
      return newStaffAuthId;
    } catch (error) {
      handleConvexApiError("スタッフ認証情報の更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// スタッフ認証の削除
export const trash = mutation({
  args: {
    staffAuthId: v.id("staff_auth"),
  },
  handler: async (ctx, args) => {
    try {
      // スタッフ認証の存在確認
      const staffAuth = await ctx.db.get(args.staffAuthId);
      if (!staffAuth) {
        throw new ConvexError({
          message: "指定されたスタッフ認証が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      await trashRecord(ctx, staffAuth._id);
      return true;
    } catch (error) {
      handleConvexApiError("スタッフ認証のアーカイブに失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const upsert = mutation({
  args: {
    staffAuthId: v.id("staff_auth"),
    staffId: v.id("staff"),
    pinCode: v.optional(v.string()),
    hashPinCode: v.optional(v.string()),
    role: v.optional(staffRoleType),
  },
  handler: async (ctx, args) => {
    try {
      const existingStaffAuth = await ctx.db.get(args.staffAuthId);

      validateStaffAuth(args);
      if (!existingStaffAuth || existingStaffAuth.isArchive) {
        return await ctx.db.insert("staff_auth", {
          ...args,
          isArchive: false,
        });
      } else {
        const updateData = removeEmptyFields(args);
        delete updateData.staffAuthId;
        return await ctx.db.patch(existingStaffAuth._id, updateData);
      }
    } catch (error) {
      handleConvexApiError("スタッフ認証の追加/更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const kill = mutation({
  args: {
    staffAuthId: v.id("staff_auth"),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.staffAuthId);
    } catch (error) {
      handleConvexApiError("スタッフ認証の削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// スタッフIDからスタッフ認証を取得
export const getByStaffId = query({
  args: {
    staffId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staff_auth")
      .withIndex("by_staff_id", (q) => q.eq("staffId", args.staffId).eq("isArchive", false))
      .first();
  },
});