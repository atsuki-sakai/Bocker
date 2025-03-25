import { mutation, query } from "./../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "./../helpers";
import { paginationOptsValidator } from "convex/server";
import { ERROR_CODES } from "./../errors";

// クーポン取引の追加
export const add = mutation({
  args: {
    couponId: v.id("coupon"),
    customerId: v.id("customer"),
    reservationId: v.id("reservation"),
    transactionDate_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // クーポンの存在確認
      const coupon = await ctx.db.get(args.couponId);
      if (!coupon) {
        console.error("指定されたクーポンが存在しません", args.couponId);
        throw new ConvexError({
          message: "指定されたクーポンが存在しません",
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

      // 予約の存在確認
      const reservation = await ctx.db.get(args.reservationId);
      if (!reservation) {
        console.error("指定された予約が存在しません", args.reservationId);
        throw new ConvexError({
          message: "指定された予約が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const couponTransactionId = await ctx.db.insert("coupon_transaction", {
        ...args,
        isArchive: false,
      });
      return couponTransactionId;
    } catch (error) {
      handleConvexApiError("クーポン取引の追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// クーポン取引の更新
export const update = mutation({
  args: {
    couponTransactionId: v.id("coupon_transaction"),
    transactionDate_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // クーポン取引の存在確認
      const couponTransaction = await ctx.db.get(args.couponTransactionId);
      if (!couponTransaction || couponTransaction.isArchive) {
        throw new ConvexError({
          message: "指定されたクーポン取引が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // couponTransactionId はパッチ対象から削除する
      delete updateData.couponTransactionId;

      const newCouponTransactionId = await ctx.db.patch(args.couponTransactionId, updateData);
      return newCouponTransactionId;
    } catch (error) {
      handleConvexApiError("クーポン取引の更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// クーポン取引の削除
export const trash = mutation({
  args: {
    couponTransactionId: v.id("coupon_transaction"),
  },
  handler: async (ctx, args) => {
    try {
      // クーポン取引の存在確認
      const couponTransaction = await ctx.db.get(args.couponTransactionId);
      if (!couponTransaction) {
        throw new ConvexError({
          message: "指定されたクーポン取引が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      await trashRecord(ctx, couponTransaction._id);
      return true;
    } catch (error) {
      handleConvexApiError("クーポン取引のアーカイブに失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const upsert = mutation({
  args: {
    couponTransactionId: v.id("coupon_transaction"),
    couponId: v.id("coupon"),
    customerId: v.id("customer"),
    reservationId: v.id("reservation"),
    transactionDate_unix: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const existingCouponTransaction = await ctx.db.get(args.couponTransactionId);

      if (!existingCouponTransaction || existingCouponTransaction.isArchive) {
        const updateData = removeEmptyFields(args);
        delete updateData.couponTransactionId;
        return await ctx.db.insert("coupon_transaction", {
          ...updateData,
          couponId: args.couponId,
          customerId: args.customerId,
          reservationId: args.reservationId,
          isArchive: false,
        });
      } else {
        const updateData = removeEmptyFields(args);
        delete updateData.couponTransactionId;
        return await ctx.db.patch(existingCouponTransaction._id, updateData);
      }
    } catch (error) {
      handleConvexApiError("クーポン取引の追加/更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const kill = mutation({
  args: {
    couponTransactionId: v.id("coupon_transaction"),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.couponTransactionId);
    } catch (error) {
      handleConvexApiError("クーポン取引の削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// クーポンIDからクーポン取引履歴を取得
export const getByCouponId = query({
  args: {
    couponId: v.id("coupon"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("coupon_transaction")
      .withIndex("by_coupon_id", (q) => q.eq("couponId", args.couponId).eq("isArchive", false))
      .paginate(args.paginationOpts);
  },
});

// 顧客IDからクーポン取引履歴を取得
export const getByCustomerId = query({
  args: {
    customerId: v.id("customer"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("coupon_transaction")
      .withIndex("by_customer_id", (q) => q.eq("customerId", args.customerId).eq("isArchive", false))
      .paginate(args.paginationOpts);
  },
});

// 予約IDからクーポン取引を取得
export const getByReservationId = query({
  args: {
    reservationId: v.id("reservation"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("coupon_transaction")
      .withIndex("by_reservation_id", (q) => q.eq("reservationId", args.reservationId).eq("isArchive", false))
      .first();
  },
});