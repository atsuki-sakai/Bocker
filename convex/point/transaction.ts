import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "../helpers";
import { paginationOptsValidator } from "convex/server";
import { ERROR_CODES } from "../errors";
import { Doc } from "../_generated/dataModel";
import { pointTransactionType } from "../types";
import { MAX_POINTS } from "../../lib/constants";
// ポイント取引のバリデーション
function validatePointTransaction(args: Partial<Doc<"point_transaction">>) {
  if (args.points && args.points === 0) {
    throw new ConvexError({message: "ポイントは0以外の値を入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.points && args.points > MAX_POINTS) {
    throw new ConvexError({message: `ポイントは${MAX_POINTS}以下で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
}

// ポイント取引の追加
export const add = mutation({
  args: {
    salonId: v.id("salon"),
    reservationId: v.id("reservation"),
    customerId: v.id("customer"),
    points: v.optional(v.number()),
    menuId: v.optional(v.id("menu")),
    transactionType: v.optional(pointTransactionType), // 獲得、使用、調整、期限切れ
    transactionDate_unix: v.optional(v.number()),
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

      // 予約の存在確認
      const reservation = await ctx.db.get(args.reservationId);
      if (!reservation) {
        console.error("指定された予約が存在しません", args.reservationId);
        throw new ConvexError({
          message: "指定された予約が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      // 顧客の存在確認
      const customer = await ctx.db.get(args.customerId);
      if (!customer) {
        console.error("指定された顧客が存在しません", args.customerId);
        throw new ConvexError({
          message: "指定された顧客が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      // メニューの存在確認（指定されている場合）
      if (args.menuId) {
        const menu = await ctx.db.get(args.menuId);
        if (!menu) {
          console.error("指定されたメニューが存在しません", args.menuId);
          throw new ConvexError({
            message: "指定されたメニューが存在しません",
            code: ERROR_CODES.NOT_FOUND,
          });
        }
      }

      validatePointTransaction(args);
      const pointTransactionId = await ctx.db.insert("point_transaction", {
        ...args,
        isArchive: false,
      });
      return pointTransactionId;
    } catch (error) {
      handleConvexApiError("ポイント取引の追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// ポイント取引情報の更新
export const update = mutation({
  args: {
    pointTransactionId: v.id("point_transaction"),
    points: v.optional(v.number()),
    transactionType: v.optional(v.union(v.literal("earned"), v.literal("used"), v.literal("adjusted"), v.literal("expired"))),
    transactionDate_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // ポイント取引の存在確認
      const pointTransaction = await ctx.db.get(args.pointTransactionId);
      if (!pointTransaction || pointTransaction.isArchive) {
        throw new ConvexError({
          message: "指定されたポイント取引が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // pointTransactionId はパッチ対象から削除する
      delete updateData.pointTransactionId;

      validatePointTransaction(updateData);

      const newPointTransactionId = await ctx.db.patch(args.pointTransactionId, updateData);
      return newPointTransactionId;
    } catch (error) {
      handleConvexApiError("ポイント取引情報の更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// ポイント取引の削除
export const trash = mutation({
  args: {
    pointTransactionId: v.id("point_transaction"),
  },
  handler: async (ctx, args) => {
    try {
      // ポイント取引の存在確認
      const pointTransaction = await ctx.db.get(args.pointTransactionId);
      if (!pointTransaction) {
        throw new ConvexError({
          message: "指定されたポイント取引が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      await trashRecord(ctx, pointTransaction._id);
      return true;
    } catch (error) {
      handleConvexApiError("ポイント取引のアーカイブに失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const upsert = mutation({
  args: {
    pointTransactionId: v.id("point_transaction"),
    salonId: v.id("salon"),
    reservationId: v.id("reservation"),
    customerId: v.id("customer"),
    points: v.optional(v.number()),
    menuId: v.optional(v.id("menu")),
    transactionType: v.optional(v.union(v.literal("earned"), v.literal("used"), v.literal("adjusted"), v.literal("expired"))),
    transactionDate_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const existingPointTransaction = await ctx.db.get(args.pointTransactionId);

      validatePointTransaction(args);
      if (!existingPointTransaction || existingPointTransaction.isArchive) {
        return await ctx.db.insert("point_transaction", {
          ...args,
          isArchive: false,
        });
      } else {
        const updateData = removeEmptyFields(args);
        delete updateData.pointTransactionId;
        return await ctx.db.patch(existingPointTransaction._id, updateData);
      }
    } catch (error) {
      handleConvexApiError("ポイント取引の追加/更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const kill = mutation({
  args: {
    pointTransactionId: v.id("point_transaction"),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.pointTransactionId);
    } catch (error) {
      handleConvexApiError("ポイント取引の削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// サロンと予約IDからポイント取引を取得
export const getBySalonAndReservationId = query({
  args: {
    salonId: v.id("salon"),
    reservationId: v.id("reservation"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("point_transaction")
      .withIndex("by_salon_reservation_id", (q) => 
        q.eq("salonId", args.salonId).eq("reservationId", args.reservationId).eq("isArchive", false)
      )
      .first();
  },
});

// サロンと顧客IDからポイント取引を取得
export const getBySalonAndCustomerId = query({
  args: {
    salonId: v.id("salon"),
    customerId: v.id("customer"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("point_transaction")
      .withIndex("by_salon_customer_id", (q) => 
        q.eq("salonId", args.salonId).eq("customerId", args.customerId).eq("isArchive", false)
      )
      .paginate(args.paginationOpts);
  },
});

// サロンと顧客と予約IDからポイント取引を取得
export const getBySalonCustomerAndReservation = query({
  args: {
    salonId: v.id("salon"),
    customerId: v.id("customer"),
    reservationId: v.id("reservation"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("point_transaction")
      .withIndex("by_salon_customer_reservation", (q) => 
        q.eq("salonId", args.salonId)
         .eq("customerId", args.customerId)
         .eq("reservationId", args.reservationId)
         .eq("isArchive", false)
      )
      .first();
  },
});