import { mutation, query } from "./../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "./../helpers";
import { paginationOptsValidator } from "convex/server";
import { ERROR_CODES } from "./../errors";
import { Doc } from "./../_generated/dataModel";
import { couponDiscountType } from "./../types";
import { MAX_TEXT_LENGTH, MAX_COUPON_UID_LENGTH } from "./../../lib/constants";

// クーポンのバリデーション
function validateCoupon(args: Partial<Doc<"coupon">>) {
  if (args.salonId && args.salonId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({message: `サロンIDは${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.name && args.name.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({message: `クーポン名は${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.couponUId && args.couponUId.length !== MAX_COUPON_UID_LENGTH) {
    throw new ConvexError({message: `クーポン識別IDは${MAX_COUPON_UID_LENGTH}文字で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
}

// クーポンの追加
export const add = mutation({
  args: {
    salonId: v.id("salon"),
    menuIds: v.optional(v.array(v.id("menu"))),
    couponUId: v.optional(v.string()),
    name: v.optional(v.string()),
    discountType: v.optional(couponDiscountType),
    percentageDiscountValue: v.optional(v.number()),
    fixedDiscountValue: v.optional(v.number()),
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

      validateCoupon(args);
      const couponId = await ctx.db.insert("coupon", {
        ...args,
        isArchive: false,
      });
      return couponId;
    } catch (error) {
      handleConvexApiError("クーポンの追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// クーポン情報の更新
export const update = mutation({
  args: {
    couponId: v.id("coupon"),
    menuIds: v.optional(v.array(v.id("menu"))),
    couponUId: v.optional(v.string()),
    name: v.optional(v.string()),
    discountType: v.optional(couponDiscountType),
    percentageDiscountValue: v.optional(v.number()),
    fixedDiscountValue: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      // クーポンの存在確認
      const coupon = await ctx.db.get(args.couponId);
      if (!coupon || coupon.isArchive) {
        throw new ConvexError({
          message: "指定されたクーポンが存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // couponId はパッチ対象から削除する
      delete updateData.couponId;

      validateCoupon(updateData);

      const newCouponId = await ctx.db.patch(args.couponId, updateData);
      return newCouponId;
    } catch (error) {
      handleConvexApiError("クーポン情報の更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// クーポンの削除
export const trash = mutation({
  args: {
    couponId: v.id("coupon"),
  },
  handler: async (ctx, args) => {
    try {
      // クーポンの存在確認
      const coupon = await ctx.db.get(args.couponId);
      if (!coupon) {
        throw new ConvexError({
          message: "指定されたクーポンが存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      await trashRecord(ctx, coupon._id);
      return true;
    } catch (error) {
      handleConvexApiError("クーポンのアーカイブに失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const upsert = mutation({
  args: {
    couponId: v.id("coupon"),
    salonId: v.id("salon"),
    menuIds: v.optional(v.array(v.id("menu"))),
    couponUId: v.optional(v.string()),
    name: v.optional(v.string()),
    discountType: v.optional(couponDiscountType),
    percentageDiscountValue: v.optional(v.number()),
    fixedDiscountValue: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      const existingCoupon = await ctx.db.get(args.couponId);

      if (!existingCoupon || existingCoupon.isArchive) {
        validateCoupon(args);
        return await ctx.db.insert("coupon", {
          ...args,
          isArchive: false,
        });
      } else {
        validateCoupon(args);
        const updateData = removeEmptyFields(args);
        delete updateData.couponId;
        return await ctx.db.patch(existingCoupon._id, updateData);
      }
    } catch (error) {
      handleConvexApiError("クーポンの追加/更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const kill = mutation({
  args: {
    couponId: v.id("coupon"),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.couponId);
    } catch (error) {
      handleConvexApiError("クーポンの削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// サロンIDからクーポン一覧を取得
export const getBySalonId = query({
  args: {
    salonId: v.id("salon"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("coupon")
      .withIndex("by_salon_id", (q) => q.eq("salonId", args.salonId).eq("isActive", true).eq("isArchive", false))
      .paginate(args.paginationOpts);
  },
});

// クーポンUIDからクーポン情報を取得
export const getByCouponUId = query({
  args: {
    salonId: v.id("salon"),
    couponUId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("coupon")
      .withIndex("by_salon_coupon_uid", (q) => 
        q.eq("salonId", args.salonId).eq("couponUId", args.couponUId)
      )
      .first();
  },
});