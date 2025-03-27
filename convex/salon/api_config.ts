import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "../helpers";
import { ERROR_CODES } from "../errors";
import { Doc } from "../_generated/dataModel";
import { MAX_TEXT_LENGTH } from "../../lib/constants";

// サロンAPI設定のバリデーション
export function validateSalonApiConfig(args: Partial<Doc<'salon_api_config'>>) {
  if (args.lineAccessToken && args.lineAccessToken.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `LINEアクセストークンは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }
  if (args.lineChannelSecret && args.lineChannelSecret.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `LINEチャンネルシークレットは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }
  if (args.liffId && args.liffId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `LIFF IDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }
  if (args.destinationId && args.destinationId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `LINE公式アカウント識別子は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }
}

// サロンAPI設定の追加
export const add = mutation({
  args: {
    salonId: v.id("salon"),
    lineAccessToken: v.optional(v.string()),
    lineChannelSecret: v.optional(v.string()),
    liffId: v.optional(v.string()),
    destinationId: v.optional(v.string()),
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

      validateSalonApiConfig(args);
      const salonApiConfigId = await ctx.db.insert("salon_api_config", {
        ...args,
        isArchive: false,
      });
      return salonApiConfigId;
    } catch (error) {
      handleConvexApiError("サロンAPI設定の追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// サロンAPI設定の更新
export const update = mutation({
  args: {
    salonApiConfigId: v.id("salon_api_config"),
    lineAccessToken: v.optional(v.string()),
    lineChannelSecret: v.optional(v.string()),
    liffId: v.optional(v.string()),
    destinationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // サロンAPI設定の存在確認
      const salonApiConfig = await ctx.db.get(args.salonApiConfigId);
      if (!salonApiConfig || salonApiConfig.isArchive) {
        throw new ConvexError({
          message: "指定されたサロンAPI設定が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // salonApiConfigId はパッチ対象から削除する
      delete updateData.salonApiConfigId;

      validateSalonApiConfig(updateData);

      const newSalonApiConfigId = await ctx.db.patch(args.salonApiConfigId, updateData);
      return newSalonApiConfigId;
    } catch (error) {
      handleConvexApiError("サロンAPI設定の更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// サロンAPI設定の削除
export const trash = mutation({
  args: {
    salonApiConfigId: v.id("salon_api_config"),
  },
  handler: async (ctx, args) => {
    try {
      // サロンAPI設定の存在確認
      const salonApiConfig = await ctx.db.get(args.salonApiConfigId);
      if (!salonApiConfig) {
        throw new ConvexError({
          message: "指定されたサロンAPI設定が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      await trashRecord(ctx, salonApiConfig._id);
      return true;
    } catch (error) {
      handleConvexApiError("サロンAPI設定のアーカイブに失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const upsert = mutation({
  args: {
    salonApiConfigId: v.id("salon_api_config"),
    salonId: v.id("salon"),
    lineAccessToken: v.optional(v.string()),
    lineChannelSecret: v.optional(v.string()),
    liffId: v.optional(v.string()),
    destinationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const existingSalonApiConfig = await ctx.db.get(args.salonApiConfigId);

      if (!existingSalonApiConfig || existingSalonApiConfig.isArchive) {
        validateSalonApiConfig(args);
        return await ctx.db.insert("salon_api_config", {
          ...args,
          isArchive: false,
        });
      } else {
        validateSalonApiConfig(args);
        const updateData = removeEmptyFields(args);
        delete updateData.salonApiConfigId;
        return await ctx.db.patch(existingSalonApiConfig._id, updateData);
      }
    } catch (error) {
      handleConvexApiError("サロンAPI設定の追加/更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const kill = mutation({
  args: {
    salonApiConfigId: v.id("salon_api_config"),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.salonApiConfigId);
    } catch (error) {
      handleConvexApiError("サロンAPI設定の削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// サロンIDからサロンAPI設定を取得
export const getBySalonId = query({
  args: {
    salonId: v.id("salon"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("salon_api_config")
      .withIndex("by_salon_id", (q) => q.eq("salonId", args.salonId).eq("isArchive", false))
      .first();
  },
});