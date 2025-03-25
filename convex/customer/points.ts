import { mutation, query } from "./../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "./../helpers";
import { ERROR_CODES } from "./../errors";
import { Doc } from "./../_generated/dataModel";
import { getCurrentUnixTime } from "./../helpers";
// 顧客ポイントのバリデーション
function validateCustomerPoints(args: Partial<Doc<"customer_points">>) {
  if (args.totalPoints && args.totalPoints < 0) {
    throw new ConvexError({message: "ポイントは0以上で入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
}

// 顧客ポイントの追加
export const add = mutation({
  args: {
    customerId: v.id("customer"),
    salonId: v.id("salon"),
    totalPoints: v.optional(v.number()),
    lastTransactionDate_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // 顧客の存在確認
      const customer = await ctx.db.get(args.customerId);
      if (!customer) {
        console.error("指定された顧客が存在しません", args.customerId);
        throw new ConvexError({
          message: "指定された顧客が存在しません",
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

      validateCustomerPoints(args);
      const customerPointsId = await ctx.db.insert("customer_points", {
        ...args,
        isArchive: false,
      });
      return customerPointsId;
    } catch (error) {
      handleConvexApiError("顧客ポイントの追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// 顧客ポイント情報の更新
export const update = mutation({
  args: {
    customerPointsId: v.id("customer_points"),
    totalPoints: v.optional(v.number()),
    lastTransactionDate_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // 顧客ポイントの存在確認
      const customerPoints = await ctx.db.get(args.customerPointsId);
      if (!customerPoints || customerPoints.isArchive) {
        throw new ConvexError({
          message: "指定された顧客ポイントが存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // customerPointsId はパッチ対象から削除する
      delete updateData.customerPointsId;

      validateCustomerPoints(updateData);

      const newCustomerPointsId = await ctx.db.patch(args.customerPointsId, updateData);
      return newCustomerPointsId;
    } catch (error) {
      handleConvexApiError("顧客ポイント情報の更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// 顧客ポイントの削除
export const trash = mutation({
  args: {
    customerPointsId: v.id("customer_points"),
  },
  handler: async (ctx, args) => {
    try {
      // 顧客ポイントの存在確認
      const customerPoints = await ctx.db.get(args.customerPointsId);
      if (!customerPoints) {
        throw new ConvexError({
          message: "指定された顧客ポイントが存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      await trashRecord(ctx, customerPoints._id);
      return true;
    } catch (error) {
      handleConvexApiError("顧客ポイントのアーカイブに失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const upsert = mutation({
  args: {
    customerPointsId: v.id("customer_points"),
    customerId: v.id("customer"),
    salonId: v.id("salon"),
    totalPoints: v.optional(v.number()),
    lastTransactionDate_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const existingCustomerPoints = await ctx.db.get(args.customerPointsId);

      if (!existingCustomerPoints || existingCustomerPoints.isArchive) {
        validateCustomerPoints(args);
        return await ctx.db.insert("customer_points", {
          ...args,
          isArchive: false,
        });
      } else {
        validateCustomerPoints(args);
        const updateData = removeEmptyFields(args);
        delete updateData.customerPointsId;
        return await ctx.db.patch(existingCustomerPoints._id, {
          ...updateData
        });
      }
    } catch (error) {
      handleConvexApiError("顧客ポイントの追加/更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const kill = mutation({
  args: {
    customerPointsId: v.id("customer_points"),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.customerPointsId);
    } catch (error) {
      handleConvexApiError("顧客ポイントの削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// サロンと顧客IDから顧客ポイントを取得
export const getBySalonAndCustomerId = query({
  args: {
    salonId: v.id("salon"),
    customerId: v.id("customer"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customer_points")
      .withIndex("by_salon_customer_archive", (q) => 
        q.eq("salonId", args.salonId).eq("customerId", args.customerId).eq("isArchive", false)
      )
      .first();
  },
});