import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { ERROR_CODES } from "../errors";
import { handleConvexApiError, getCurrentUnixTime, removeEmptyFields } from "../helpers";

/**
 * 管理者の追加
 */
export const add = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      
      // 既存管理者の確認
      const existingAdmin = await ctx.db
        .query("admin")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
        .first();
      
      if (existingAdmin) {
        throw new ConvexError({
          message: "既に同じClerkIDの管理者が存在します",
          code: ERROR_CODES.DUPLICATE_RECORD,
        });
      }
      
      // 管理者の追加
      const adminId = await ctx.db.insert("admin", args);
      return adminId;
    } catch (error) {
      handleConvexApiError("管理者の追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error, { clerkId: args.clerkId });
    }
  },
});

/**
 * 管理者情報の更新
 */
export const update = mutation({
  args: {
    adminId: v.id("admin"),
    email: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      
      
      // 管理者の存在確認
      const admin = await ctx.db.get(args.adminId);
      if (!admin) {
        throw new ConvexError({
          message: "指定された管理者が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      
      const updateData = removeEmptyFields(args);
      delete updateData.adminId;
      
      const updatedAdminId = await ctx.db.patch(args.adminId, updateData);
      return updatedAdminId;
    } catch (error) {
      handleConvexApiError("管理者情報の更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error, { adminId: args.adminId });
    }
  },
});

/**
 * 管理者の論理削除
 */
export const trash = mutation({
  args: {
    adminId: v.id("admin"),
  },
  handler: async (ctx, args) => {
    try {
      
      
      // 管理者の存在確認
      const admin = await ctx.db.get(args.adminId);
      if (!admin) {
        throw new ConvexError({
          message: "指定された管理者が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      
      await ctx.db.patch(args.adminId, {
        isArchive: true,
        deletedAt: getCurrentUnixTime(),
      });
      
      return true;
    } catch (error) {
      handleConvexApiError("管理者の論理削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error, { adminId: args.adminId });
    }
  },
});

/**
 * 管理者の物理削除
 */
export const kill = mutation({
  args: {
    adminId: v.id("admin"),
  },
  handler: async (ctx, args) => {
    try {
      
      
      // 管理者の存在確認
      const admin = await ctx.db.get(args.adminId);
      if (!admin) {
        throw new ConvexError({
          message: "指定された管理者が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      
      await ctx.db.delete(args.adminId);
      return true;
    } catch (error) {
      handleConvexApiError("管理者の物理削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error, { adminId: args.adminId });
    }
  },
});

/**
 * 管理者のupsert（存在すれば更新、なければ作成）
 */
export const upsert = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      
      
      // 既存管理者の確認
      const existingAdmin = await ctx.db
        .query("admin")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
        .first();
      
      if (existingAdmin) {
        // 更新
        return await ctx.db.patch(existingAdmin._id, {
          email: args.email,
          password: args.password,
        });
      } else {
        // 新規作成
        return await ctx.db.insert("admin", args);
      }
    } catch (error) {
      handleConvexApiError("管理者の作成または更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error, { clerkId: args.clerkId });
    }
  },
});

/**
 * ClerkIDから管理者情報を取得
 */
export const getByClerkId = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      
      
      return await ctx.db
        .query("admin")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
        .first();
    } catch (error) {
      handleConvexApiError("管理者情報の取得に失敗しました", ERROR_CODES.INTERNAL_ERROR, error, { clerkId: args.clerkId });
    }
  },
});