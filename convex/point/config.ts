import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { ERROR_CODES } from "../errors";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "../helpers";
import { Doc } from "../_generated/dataModel";
import { MAX_POINT_RATE, MAX_FIXED_POINT } from "../../lib/constants";

// ポイント設定のバリデーション
function validatePointConfig(args: Partial<Doc<"point_config">>) {
  
  // pointRateのバリデーション
  if (args.pointRate !== undefined) {
    if (args.pointRate < 0 || args.pointRate > MAX_POINT_RATE) {
      throw new ConvexError({message: `ポイント付与率は0〜${MAX_POINT_RATE}の間で設定してください`, code: ERROR_CODES.INVALID_ARGUMENT});
    }
  }

  // fixedPointのバリデーション
  if (args.fixedPoint !== undefined) {
    if (args.fixedPoint <= 0) {
      throw new ConvexError({message: `固定ポイントは0より大きい値を設定してください`, code: ERROR_CODES.INVALID_ARGUMENT});
    }
    if (args.fixedPoint > MAX_FIXED_POINT) {
      throw new ConvexError({message: `固定ポイントは${MAX_FIXED_POINT}以下で設定してください`, code: ERROR_CODES.INVALID_ARGUMENT});
    }
  }

  // pointExpirationDaysのバリデーション
  if (args.pointExpirationDays !== undefined) {
    if (args.pointExpirationDays <= 0) {
      throw new ConvexError({message: `ポイント有効期限は0より大きい値を設定してください`, code: ERROR_CODES.INVALID_ARGUMENT});
    }
  }

  // 相関バリデーション
  if (args.isFixedPoint === true && args.fixedPoint === undefined) {
    throw new ConvexError({message: "固定ポイント設定時は固定ポイント値を設定してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }

  if (args.isFixedPoint === false && args.pointRate === undefined) {
    throw new ConvexError({message: "変動ポイント設定時はポイント付与率を設定してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
}

export const add = mutation({
  args: {
    salonId: v.id("salon"),
    menuIds: v.optional(v.array(v.id("menu"))), // 適応されるメニューID
    isFixedPoint: v.optional(v.boolean()), // 固定ポイントかどうか
    pointRate: v.optional(v.number()), // ポイント付与率  利用金額に対しての付与率 (例: 0.1なら10%)
    fixedPoint: v.optional(v.number()), // 固定ポイント (例: 100円につき1ポイント)
    pointExpirationDays: v.optional(v.number()), // ポイントの有効期限(日)
  },
  handler: async (ctx, args) => {

    try {
      
      validatePointConfig(args);
      const salonMenuPointConfigId = await ctx.db.insert("point_config", {
        ...args,
        isArchive: false,
      });
      return salonMenuPointConfigId;
    } catch (error) {
      handleConvexApiError("ポイント設定の追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const get = query({
  args: {
    salonId: v.id("salon"),
  },
  handler: async (ctx, args) => {

    try {
      const salonMenuPointConfig = await ctx.db.query("point_config").withIndex("by_salon_id", q => q.eq("salonId", args.salonId).eq("isArchive", false)).first();
        if (!salonMenuPointConfig) {
        console.error("ポイント設定が見つかりません", args.salonId);
        throw new ConvexError({message: "ポイント設定が見つかりません", code: ERROR_CODES.NOT_FOUND});
        }
        return salonMenuPointConfig;
    } catch (error) {
      handleConvexApiError("ポイント設定の取得に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const update = mutation({
  args: {
    salonId: v.id("salon"),
    menuIds: v.optional(v.array(v.id("menu"))), // 適応されるメニューID
    isFixedPoint: v.optional(v.boolean()), // 固定ポイントかどうか
    pointRate: v.optional(v.number()), // ポイント付与率  利用金額に対しての付与率 (例: 0.1なら10%)
    fixedPoint: v.optional(v.number()), // 固定ポイント (例: 100円につき1ポイント)
    pointExpirationDays: v.optional(v.number()), // ポイントの有効期限(日)
  },
  handler: async (ctx, args) => {

    try {
      
      
      const salonMenuPointConfig = await ctx.db.query("point_config").withIndex("by_salon_id", q => q.eq("salonId", args.salonId).eq("isArchive", false)).first();
        if (!salonMenuPointConfig) {
        console.error("ポイント設定が見つかりません", args.salonId);
        throw new ConvexError({message: "ポイント設定が見つかりません", code: ERROR_CODES.NOT_FOUND});
        }

        const updateData = removeEmptyFields({...args});
        
        // 更新前のデータと新しいデータをマージして検証
        const mergedData = { ...salonMenuPointConfig, ...updateData };
        validatePointConfig(mergedData);

      await ctx.db.patch(salonMenuPointConfig._id, {
        ...updateData,
      });
      return true;
    } catch (error) {
      handleConvexApiError("ポイント設定の更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const upsert = mutation({
  args: {
    salonId: v.id("salon"),
    menuIds: v.optional(v.array(v.id("menu"))), // 適応されるメニューID
    isFixedPoint: v.optional(v.boolean()), // 固定ポイントかどうか
    pointRate: v.optional(v.number()), // ポイント付与率  利用金額に対しての付与率 (例: 0.1なら10%)
    fixedPoint: v.optional(v.number()), // 固定ポイント (例: 100円につき1ポイント)
    pointExpirationDays: v.optional(v.number()), // ポイントの有効期限(日)
  },
  handler: async (ctx, args) => {
    try {
      
      validatePointConfig(args);
      
      const existingConfig = await ctx.db.query("point_config")
        .withIndex("by_salon_id", q => q.eq("salonId", args.salonId).eq("isArchive", false))
        .first();

      if (existingConfig) {

        const updateData = removeEmptyFields(args);
        delete updateData.salonId;
        return await ctx.db.patch(existingConfig._id, updateData);
      } else {
        return await ctx.db.insert("point_config", {
          ...args,
          isArchive: false,
        });
      }
    } catch (error) {
      console.error("ポイント設定の作成/更新に失敗しました", args.salonId, error);
      
      if (error instanceof ConvexError) {
        throw error; // バリデーションエラーなどはそのまま再スロー
      }
      
      throw new ConvexError({
        message: "ポイント設定の作成/更新に失敗しました", 
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  },
});

export const trash = mutation({
  args: {
    salonId: v.id("salon"),
  },
  handler: async (ctx, args) => {
    try {
      
      
        // まず対象のドキュメントを検索
        const salonMenuPointConfig = await ctx.db.query("point_config")
        .withIndex("by_salon_id", q => q.eq("salonId", args.salonId))
        .first();
        
        if (!salonMenuPointConfig) {
        console.error("ポイント設定が見つかりません", args.salonId);
        throw new ConvexError({message: "ポイント設定が見つかりません", code: ERROR_CODES.NOT_FOUND});
        }
      await trashRecord(ctx, salonMenuPointConfig._id);
      return true;
    } catch (error) {
      handleConvexApiError("ポイント設定の削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const kill = mutation({  
  args: {
    salonId: v.id("salon"),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.salonId);
      return true;
    } catch (error) {
      handleConvexApiError("ポイント設定の削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});
