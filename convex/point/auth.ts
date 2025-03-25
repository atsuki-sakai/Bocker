import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "../helpers";
import { ERROR_CODES } from "../errors";
import { Doc } from "../_generated/dataModel";
import { MAX_POINTS, MAX_STAFF_AUTH_CODE_LENGTH } from "../../lib/constants";

// 予約ポイント認証のバリデーション
function validatePointAuth(args: Partial<Doc<"point_auth">>) {
  if (args.authCode && args.authCode.length !== MAX_STAFF_AUTH_CODE_LENGTH) {
    throw new ConvexError({message: `認証コードは${MAX_STAFF_AUTH_CODE_LENGTH}文字で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.points && args.points <= 0) {
    throw new ConvexError({message: "ポイントは0より大きい値を入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.points && args.points > MAX_POINTS) {
    throw new ConvexError({message: `ポイントは${MAX_POINTS}以下で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
}

// 予約ポイント認証の追加
export const add = mutation({
  args: {
    reservationId: v.id("reservation"),
    customerId: v.id("customer"),
    authCode: v.optional(v.string()),
    expirationTime_unix: v.optional(v.number()),
    points: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
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

      validatePointAuth(args);
      const pointAuthId = await ctx.db.insert("point_auth", {
        ...args,
        isArchive: false,
      });
      return pointAuthId;
    } catch (error) {
      handleConvexApiError("予約ポイント認証の追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// 予約ポイント認証の更新
export const update = mutation({
  args: {
    pointAuthId: v.id("point_auth"),
    authCode: v.optional(v.string()),
    expirationTime_unix: v.optional(v.number()),
    points: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // 予約ポイント認証の存在確認
      const pointAuth = await ctx.db.get(args.pointAuthId);
      if (!pointAuth || pointAuth.isArchive) {
        throw new ConvexError({
          message: "指定された予約ポイント認証が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // pointAuthId はパッチ対象から削除する
      delete updateData.pointAuthId;

      validatePointAuth(updateData);

      const newPointAuthId = await ctx.db.patch(args.pointAuthId, updateData);
      return newPointAuthId;
    } catch (error) {
      handleConvexApiError("予約ポイント認証の更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// 予約ポイント認証の削除
export const trash = mutation({
  args: {
    pointAuthId: v.id("point_auth"),
  },
  handler: async (ctx, args) => {
    try {
      // 予約ポイント認証の存在確認
      const pointAuth = await ctx.db.get(args.pointAuthId);
      if (!pointAuth) {
        throw new ConvexError({
          message: "指定された予約ポイント認証が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      await trashRecord(ctx, pointAuth._id);
      return true;
    } catch (error) {
      handleConvexApiError("予約ポイント認証のアーカイブに失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const upsert = mutation({
  args: {
    pointAuthId: v.id("point_auth"),
    reservationId: v.id("reservation"),
    customerId: v.id("customer"),
    authCode: v.optional(v.string()),
    expirationTime_unix: v.optional(v.number()),
    points: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const existingPointAuth = await ctx.db.get(args.pointAuthId);

      if (!existingPointAuth || existingPointAuth.isArchive) {
        validatePointAuth(args);
        return await ctx.db.insert("point_auth", {
          ...args,
          isArchive: false,
        });
      } else {
        validatePointAuth(args);
        const updateData = removeEmptyFields(args);
        delete updateData.pointAuthId;
        return await ctx.db.patch(existingPointAuth._id, updateData);
      }
    } catch (error) {
      handleConvexApiError("予約ポイント認証の追加/更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const kill = mutation({
  args: {
    pointAuthId: v.id("point_auth"),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.pointAuthId);
    } catch (error) {
      handleConvexApiError("予約ポイント認証の削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// 予約IDから予約ポイント認証を取得
export const getByReservationId = query({
  args: {
    reservationId: v.id("reservation"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("point_auth")
      .withIndex("by_reservation_id", (q) => q.eq("reservationId", args.reservationId).eq("isArchive", false))
      .first();
  },
});

// 顧客IDから予約ポイント認証を取得
export const getByCustomerId = query({
  args: {
    customerId: v.id("customer"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("point_auth")
      .withIndex("by_customer_id", (q) => q.eq("customerId", args.customerId).eq("isArchive", false))
      .first();
  },
});

// 有効期限から予約ポイント認証を取得
export const getByExpirationTime = query({
  args: {
    expirationTime_unix: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("point_auth")
      .withIndex("by_expiration_time", (q) => q.eq("expirationTime_unix", args.expirationTime_unix).eq("isArchive", false))
      .first();
  },
});