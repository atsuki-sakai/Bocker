
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { ERROR_CODES } from "../errors";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "../helpers";
import { Doc } from "../_generated/dataModel";
import { MAX_TEXT_LENGTH, MAX_PHONE_LENGTH, MAX_NOTES_LENGTH, MAX_POSTAL_CODE_LENGTH, MAX_ADDRESS_LENGTH } from "../../lib/constants";


// サロンの設定のバリデーション
export function validateSalonConfig(args: Partial<Doc<'salon_config'>>) {
  if (args.salonName && args.salonName.trim() === '') {
    throw new ConvexError({
      message: 'サロン名は空ではいけません',
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }
  if (args.email && args.email.trim() !== '') {
    if (!args.email.includes('@')) {
      throw new ConvexError({
        message: 'メールアドレスが有効ではありません',
        code: ERROR_CODES.INVALID_ARGUMENT,
      });
    }
    if (args.email.length > MAX_TEXT_LENGTH) {
      throw new ConvexError({
        message: `メールアドレスは${MAX_TEXT_LENGTH}文字以内で入力してください`,
        code: ERROR_CODES.INVALID_ARGUMENT,
      });
    }
  }
  if (args.phone && args.phone.toString().length > MAX_PHONE_LENGTH) {
    throw new ConvexError({
      message: `電話番号は${MAX_PHONE_LENGTH}桁以内で入力してください`,
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }
  if (
    args.postalCode &&
    (args.postalCode.toString().length > MAX_POSTAL_CODE_LENGTH ||
      args.postalCode.toString().length < MAX_POSTAL_CODE_LENGTH)
  ) {
    throw new ConvexError({
      message: `郵便番号は${MAX_POSTAL_CODE_LENGTH}桁で入力してください`,
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }
  if (args.address && args.address.trim() === '') {
    if (args.address.length > MAX_ADDRESS_LENGTH) {
      throw new ConvexError({
        message: `住所は${MAX_ADDRESS_LENGTH}文字以内で入力してください`,
        code: ERROR_CODES.INVALID_ARGUMENT,
      });
    }
  }
  if (args.reservationRules && args.reservationRules.trim() === '') {
    if (args.reservationRules.length > MAX_NOTES_LENGTH) {
      throw new ConvexError({
        message: `予約ルールは${MAX_NOTES_LENGTH}文字以内で入力してください`,
        code: ERROR_CODES.INVALID_ARGUMENT,
      });
    }
  }
  if (args.description && args.description.trim() === '') {
    if (args.description.length > MAX_NOTES_LENGTH) {
      throw new ConvexError({
        message: `説明は${MAX_NOTES_LENGTH}文字以内で入力してください`,
        code: ERROR_CODES.INVALID_ARGUMENT,
      });
    }
  }
}

export const add = mutation({
  args: {
    salonId: v.id("salon"),
    salonName: v.optional(v.string()), // サロン名
    email: v.optional(v.string()), // サロンのメールアドレス
    phone: v.optional(v.number()), // サロンの電話番号
    postalCode: v.optional(v.number()), // サロンの郵便番号
    address: v.optional(v.string()), // サロンの住所
    reservationRules: v.optional(v.string()), // サロンの予約ルール
    imgFileId: v.optional(v.string()), // サロンの画像ファイルID
    description: v.optional(v.string()), // サロンの説明
  },
  handler: async (ctx, args) => {
    try {
      
      const salon = await ctx.db.get(args.salonId);
      if (!salon || salon.isArchive) {
          console.error("サロンが見つかりません", args.salonId);
          throw new ConvexError({message: "サロンが見つかりません", code: ERROR_CODES.NOT_FOUND});
      }
      const salonConfig = await ctx.db.get(args.salonId);
      if (salonConfig) {
          console.error("サロンの設定が既に存在します", args.salonId);
          throw new ConvexError({message: "サロンの設定が既に存在します", code: ERROR_CODES.DUPLICATE_RECORD});
      }

      validateSalonConfig(args);

      const salonConfigId = await ctx.db.insert("salon_config", {
        ...args,
        isArchive: false,
      });

      return salonConfigId;
    } catch (error) {
      handleConvexApiError("サロンの設定の追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const get = query({
  args: {
    salonId: v.id("salon"),
  },
  handler: async (ctx, args) => {
    try {
      
      const salonConfig = await ctx.db.query("salon_config").withIndex("by_salon_id", q => q.eq("salonId", args.salonId)).first();
      if (!salonConfig) {
        console.error("サロンの設定が見つかりません", args.salonId);
        throw new ConvexError({message: "サロンの設定が見つかりません", code: ERROR_CODES.NOT_FOUND});
      }
      return salonConfig;
    } catch (error) {
      handleConvexApiError("サロンの設定の取得に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const update = mutation({
  args: {
    salonId: v.id("salon"),
    salonName: v.optional(v.string()), // サロン名
    email: v.optional(v.string()), // サロンのメールアドレス
    phone: v.optional(v.number()), // サロンの電話番号
    postalCode: v.optional(v.number()), // サロンの郵便番号
    address: v.optional(v.string()), // サロンの住所
    reservationRules: v.optional(v.string()), // サロンの予約ルール
    imgFileId: v.optional(v.string()), // サロンの画像ファイルID
    description: v.optional(v.string()), // サロンの説明
  },
  handler: async (ctx, args) => {
    try {
      validateSalonConfig(args);
      const salonConfig = await ctx.db.get(args.salonId);
      if (!salonConfig || salonConfig.isArchive) {
        console.error("サロンの設定が見つかりません", args.salonId);
        throw new ConvexError({message: "サロンの設定が見つかりません", code: ERROR_CODES.NOT_FOUND});
      }
      const updateData = removeEmptyFields({...args});
      await ctx.db.patch(salonConfig._id, {
        ...updateData,
      });
      return true;
    } catch (error) {
      handleConvexApiError("サロンの設定の更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});


export const upsert = mutation({
  args: {
    salonId: v.id("salon"),
    salonName: v.optional(v.string()), // サロン名
    email: v.optional(v.string()), // サロンのメールアドレス
    phone: v.optional(v.number()), // サロンの電話番号
    postalCode: v.optional(v.number()), // サロンの郵便番号
    address: v.optional(v.string()), // サロンの住所
    reservationRules: v.optional(v.string()), // サロンの予約ルール
    imgFileId: v.optional(v.string()), // サロンの画像ファイルID
    description: v.optional(v.string()), // サロンの説明
  },
  handler: async (ctx, args) => {
    try {
      validateSalonConfig(args);
      const salonConfig = await ctx.db.get(args.salonId);
      if (!salonConfig) {
        console.error("サロンの設定が見つかりません", args.salonId);
        throw new ConvexError({message: "サロンの設定が見つかりません", code: ERROR_CODES.NOT_FOUND});
      }

      if (salonConfig && !salonConfig.isArchive) {
        const updateData = removeEmptyFields({...args});
        await ctx.db.patch(salonConfig._id, {
          ...updateData,
        });
      } else {
        await ctx.db.insert("salon_config", {
          ...args,
          isArchive: false,
        });
      }
      return true;
    } catch (error) {
      handleConvexApiError("サロンの設定の更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});


export const trash = mutation({
  args: {
    salonId: v.id("salon"),
  },
  handler: async (ctx, args) => {

    try {
      const salongConfig = await ctx.db.query("salon_config").withIndex("by_salon_id", q => q.eq("salonId", args.salonId)).first();
      if (!salongConfig) {
          console.error("サロンの設定が見つかりません", args.salonId);
          throw new ConvexError({message: "サロンの設定が見つかりません", code: ERROR_CODES.NOT_FOUND});
      }
      await trashRecord(ctx, salongConfig._id);
      return true;
    } catch (error) {
      handleConvexApiError("サロンの設定の削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
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
      handleConvexApiError("サロンの設定の削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});