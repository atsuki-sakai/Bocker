import { mutation, query } from "./../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { ERROR_CODES } from "./../errors";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "./../helpers";
import { Doc } from "./../_generated/dataModel";
import { MAX_TEXT_LENGTH, MAX_NOTES_LENGTH } from "./../../lib/constants";
import { genderType } from "./../types";

// 顧客詳細情報のバリデーション
function validateCustomerDetail(args: Partial<Doc<"customer_detail">>) {
  if (args.customerId && args.customerId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({message: `顧客IDは${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.email && args.email.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({message: `メールアドレスは${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  
  if (args.age && (args.age < 0 || args.age > 120)) {
    throw new ConvexError({message: "年齢は0以上120以下で入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.gender && args.gender !== "未設定" && args.gender !== "男性" && args.gender !== "女性") {
    throw new ConvexError({message: "性別は未設定、男性、女性のいずれかで入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.notes && args.notes.length > MAX_NOTES_LENGTH) {  
    throw new ConvexError({message: `メモは${MAX_NOTES_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
}

// 顧客詳細情報の追加
export const add = mutation({
  args: {
    customerId: v.id("customer"),
    email: v.optional(v.string()),
    age: v.optional(v.number()),
    gender: v.optional(genderType),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      
      // 顧客の存在確認
      const customer = await ctx.db.get(args.customerId);
      if (!customer || customer.isArchive) {
        throw new ConvexError({
          message: "指定された顧客が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      
      
      
      // 既存の詳細データがないか確認
      const existingDetail = await ctx.db
        .query("customer_detail")
        .withIndex("by_customer_id", (q) => q.eq("customerId", args.customerId).eq("isArchive", false))
        .first();
      
      if (existingDetail) {
        handleConvexApiError("すでに顧客詳細情報が存在します", ERROR_CODES.DUPLICATE_RECORD, new ConvexError({
          message: "すでに顧客詳細情報が存在します",
          code: ERROR_CODES.DUPLICATE_RECORD,
        }));
      }

      validateCustomerDetail(args);
      const detailId = await ctx.db.insert("customer_detail", {
        ...args,
        isArchive: false,
      });
      return detailId;
    } catch (error) {
      handleConvexApiError("顧客詳細情報の追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// 顧客詳細情報の更新
export const update = mutation({
  args: {
    detailId: v.id("customer_detail"),
    email: v.optional(v.string()),
    age: v.optional(v.number()),
    gender: v.optional(genderType),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // 顧客詳細情報の存在確認
      const detail = await ctx.db.get(args.detailId);
      if (!detail || detail.isArchive) {
        throw new ConvexError({
          message: "指定された顧客詳細情報が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      
      // 顧客情報の取得
      const customer = await ctx.db.get(detail.customerId);
      if (!customer || customer.isArchive) {
        throw new ConvexError({
          message: "関連する顧客が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      
      

      const updateData = removeEmptyFields(args);
      // detailId はパッチ対象から削除する
      delete updateData.detailId;
      validateCustomerDetail(updateData);

      const newDetailId = await ctx.db.patch(args.detailId, updateData);
      return newDetailId;
    } catch (error) {
      handleConvexApiError("顧客詳細情報の更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// 顧客詳細情報の作成または更新
export const upsert = mutation({
  args: {
    customerId: v.id("customer"),
    email: v.optional(v.string()),
    age: v.optional(v.number()),
    gender: v.optional(genderType),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // 顧客の存在確認
      const customer = await ctx.db.get(args.customerId);
      if (!customer || customer.isArchive) {
        console.error("指定された顧客が存在しません", args.customerId);
        throw new ConvexError({
          message: "指定された顧客が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      
      
      
      // 既存の詳細データがないか確認
      const existingDetail = await ctx.db
        .query("customer_detail")
        .withIndex("by_customer_id", (q) => q.eq("customerId", args.customerId).eq("isArchive", false))
        .first();
      
      if (existingDetail) {
        // 更新
        const updateData = removeEmptyFields(args);
        // customerId はパッチ対象から削除する
        delete updateData.customerId;
        validateCustomerDetail(updateData);
        return await ctx.db.patch(existingDetail._id, updateData);
      } else {
        // 新規作成
        validateCustomerDetail(args);
        return await ctx.db.insert("customer_detail", {
          ...args,
          isArchive: false,
        });
      }
    } catch (error) {
      handleConvexApiError("顧客詳細情報の作成または更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// 顧客詳細情報の削除
export const trash = mutation({
  args: {
    detailId: v.id("customer_detail"),
  },
  handler: async (ctx, args) => {
    try {
      // 顧客詳細情報の存在確認
      const detail = await ctx.db.get(args.detailId);
      if (!detail) {
        throw new ConvexError({
          message: "指定された顧客詳細情報が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      
      // 顧客情報の取得
      const customer = await ctx.db.get(detail.customerId);
      if (!customer) {
        throw new ConvexError({
          message: "関連する顧客が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      
      
      await trashRecord(ctx, args.detailId);
      return true;
    } catch (error) {
      handleConvexApiError("顧客詳細情報の削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const kill = mutation({
  args: {
    detailId: v.id("customer_detail"),
  },
  handler: async (ctx, args) => {
    try {

      const detail = await ctx.db.get(args.detailId);
      if (!detail) {
        throw new ConvexError({
          message: "指定された顧客詳細情報が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      await KillRecord(ctx, args.detailId);
    } catch (error) {
      handleConvexApiError("顧客詳細情報の削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
}); 

// 顧客IDから詳細情報を取得
export const getByCustomerId = query({
  args: {
    customerId: v.id("customer"),
  },
  handler: async (ctx, args) => {
    try {
      // 顧客の存在確認
      const customer = await ctx.db.get(args.customerId);
      if (!customer) {
        throw new ConvexError({
          message: "指定された顧客が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      
      
      
      const detail = await ctx.db
        .query("customer_detail")
        .withIndex("by_customer_id", (q) => q.eq("customerId", args.customerId))
        .first();
        
      return detail;
    } catch (error) {
      handleConvexApiError("顧客詳細情報の取得に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});