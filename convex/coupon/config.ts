import { mutation, query } from "./../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "./../helpers";
import { ERROR_CODES } from "./../errors";
import { Doc } from "./../_generated/dataModel";
import { LIMIT_USE_COUPON_COUNT } from "./../../lib/constants";

// クーポン設定のバリデーション
function validateCouponConfig(args: Partial<Doc<"coupon_config">>) {
  if (args.maxUseCount && args.maxUseCount < 0) {
    throw new ConvexError({message: "最大利用回数は0以上で入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.numberOfUse && args.numberOfUse < 0) {
    throw new ConvexError({message: "現在の利用回数は0以上で入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if(args.maxUseCount && args.maxUseCount > LIMIT_USE_COUPON_COUNT) {
    throw new ConvexError({message: `最大利用回数は${LIMIT_USE_COUPON_COUNT}回以下で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
}

// クーポン設定の追加
export const add = mutation({
  args: {
    couponId: v.id("coupon"),
    startDate_unix: v.optional(v.number()),
    endDate_unix: v.optional(v.number()),
    maxUseCount: v.optional(v.number()),
    numberOfUse: v.optional(v.number()),
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

      validateCouponConfig(args);
      const couponConfigId = await ctx.db.insert("coupon_config", {
        ...args,
        isArchive: false,
      });
      return couponConfigId;
    } catch (error) {
      handleConvexApiError("クーポン設定の追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// クーポン設定の更新
export const update = mutation({
  args: {
    couponConfigId: v.id("coupon_config"),
    startDate_unix: v.optional(v.number()),
    endDate_unix: v.optional(v.number()),
    maxUseCount: v.optional(v.number()),
    numberOfUse: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // クーポン設定の存在確認
      const couponConfig = await ctx.db.get(args.couponConfigId);
      if (!couponConfig || couponConfig.isArchive) {
        throw new ConvexError({
          message: "指定されたクーポン設定が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // couponConfigId はパッチ対象から削除する
      delete updateData.couponConfigId;

      validateCouponConfig(updateData);

      const newCouponConfigId = await ctx.db.patch(args.couponConfigId, updateData);
      return newCouponConfigId;
    } catch (error) {
      handleConvexApiError("クーポン設定の更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// クーポン設定の削除
export const trash = mutation({
  args: {
    couponConfigId: v.id("coupon_config"),
  },
  handler: async (ctx, args) => {
    try {
      // クーポン設定の存在確認
      const couponConfig = await ctx.db.get(args.couponConfigId);
      if (!couponConfig) {
        throw new ConvexError({
          message: "指定されたクーポン設定が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      await trashRecord(ctx, couponConfig._id);
      return true;
    } catch (error) {
      handleConvexApiError("クーポン設定のアーカイブに失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const upsert = mutation({
  args: {
    couponConfigId: v.id("coupon_config"),
    couponId: v.id("coupon"),
    startDate_unix: v.optional(v.number()),
    endDate_unix: v.optional(v.number()),
    maxUseCount: v.optional(v.number()),
    numberOfUse: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const existingCouponConfig = await ctx.db.get(args.couponConfigId);

      if (!existingCouponConfig || existingCouponConfig.isArchive) {
        validateCouponConfig(args);
        return await ctx.db.insert("coupon_config", {
          ...args,
          isArchive: false,
        });
      } else {
        validateCouponConfig(args);
        const updateData = removeEmptyFields(args);
        delete updateData.couponConfigId;
        return await ctx.db.patch(existingCouponConfig._id, updateData);
      }
    } catch (error) {
      handleConvexApiError("クーポン設定の追加/更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const kill = mutation({
  args: {
    couponConfigId: v.id("coupon_config"),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.couponConfigId);
    } catch (error) {
      handleConvexApiError("クーポン設定の削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// クーポンIDからクーポン設定を取得
export const getByCouponId = query({
  args: {
    couponId: v.id("coupon"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("coupon_config")
      .withIndex("by_coupon_id", (q) => q.eq("couponId", args.couponId).eq("isArchive", false))
      .first();
  },
});