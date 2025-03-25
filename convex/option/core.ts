import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { ERROR_CODES } from "../errors";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "../helpers";
import { paginationOptsValidator } from "convex/server";
import { Doc } from "../_generated/dataModel";
import { MAX_ORDER_LIMIT, MAX_NOTES_LENGTH, MAX_TEXT_LENGTH, MAX_TAG_LENGTH, LIMIT_TAG_COUNT } from "../../lib/constants";


// 共通のバリデーション関数
const validateOption = (args: Partial<Doc<"salon_option">>) => {
  if (args.unitPrice !== undefined && args.unitPrice < 0) {
    throw new ConvexError({
      message: "価格は0以上である必要があります", 
      code: ERROR_CODES.INVALID_ARGUMENT
    });
  }
  
  if (args.timeToMin !== undefined && args.timeToMin <= 0) {
    throw new ConvexError({
      message: "時間は0より大きい必要があります", 
      code: ERROR_CODES.INVALID_ARGUMENT
    });
  }
  
  if (args.salePrice !== undefined && args.unitPrice !== undefined && args.salePrice > args.unitPrice) {
    throw new ConvexError({
      message: "セール価格は通常価格以下である必要があります", 
      code: ERROR_CODES.INVALID_ARGUMENT
    });
  }

  if (args.orderLimit !== undefined && (args.orderLimit < 0 || args.orderLimit > MAX_ORDER_LIMIT)) {
    throw new ConvexError({
      message: `注文制限は0以上${MAX_ORDER_LIMIT}以下である必要があります`, 
      code: ERROR_CODES.INVALID_ARGUMENT
    });
  }

  if (args.tags !== undefined && args.tags.length > LIMIT_TAG_COUNT) {
    throw new ConvexError({
      message: `タグは${LIMIT_TAG_COUNT}個以下である必要があります`, 
      code: ERROR_CODES.INVALID_ARGUMENT
    });
  }
  if (args.tags !== undefined && args.tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
    throw new ConvexError({
      message: `タグは${MAX_TAG_LENGTH}文字以下である必要があります`, 
      code: ERROR_CODES.INVALID_ARGUMENT
    });
  }
  if (args.category !== undefined && args.category.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `カテゴリは${MAX_TEXT_LENGTH}文字以下である必要があります`, 
      code: ERROR_CODES.INVALID_ARGUMENT
    });
  }
  if (args.description !== undefined && args.description.length > MAX_NOTES_LENGTH) {
    throw new ConvexError({
      message: `説明は${MAX_NOTES_LENGTH}文字以下である必要があります`, 
      code: ERROR_CODES.INVALID_ARGUMENT
    });
  }
  
  
  
};

// オプションメニューの追加
export const add = mutation({
  args: {
    salonId: v.id("salon"),
    name: v.string(), // オプションメニュー名
    unitPrice: v.number(), // 価格
    salePrice: v.optional(v.number()), // セール価格
    orderLimit: v.optional(v.number()), // 注文制限
    timeToMin: v.number(), // 時間(分)
    tags: v.optional(v.array(v.string())), // タグ
    category: v.optional(v.string()), // カテゴリ
    description: v.optional(v.string()), // 説明
    isActive: v.optional(v.boolean()), // 有効/無効フラグ
  },
  handler: async (ctx, args) => {
    try {

      // サロンの存在確認
      const salon = await ctx.db.get(args.salonId);
      if (!salon || salon.isArchive) {
        throw new ConvexError({
          message: "指定されたサロンが存在しません", 
          code: ERROR_CODES.NOT_FOUND
        });
      }
      
      // 価格と時間のバリデーション
      validateOption(args);
      
      // isActiveが指定されていない場合はデフォルトでtrueに設定
      const optionData = {
        ...args,
        isActive: args.isActive === undefined ? true : args.isActive,
        isArchive: false,
      };

      const salonOptionId = await ctx.db.insert("salon_option", optionData);
      return salonOptionId;
    } catch (error) {
      handleConvexApiError("オプションメニューの追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// オプションメニューの更新
export const update = mutation({
  args: {
    salonOptionId: v.id("salon_option"),
    name: v.optional(v.string()), // オプションメニュー名
    unitPrice: v.optional(v.number()), // 価格
    salePrice: v.optional(v.number()), // セール価格
    orderLimit: v.optional(v.number()), // 注文制限
    timeToMin: v.optional(v.number()), // 時間(分)
    tags: v.optional(v.array(v.string())), // タグ
    category: v.optional(v.string()), // カテゴリ
    description: v.optional(v.string()), // 説明
    isActive: v.optional(v.boolean()), // 有効/無効フラグ
  },
  handler: async (ctx, args) => {
    try {
      // オプションメニューの存在確認
      const salonOption = await ctx.db.get(args.salonOptionId);
      if (!salonOption || salonOption.isArchive) {
        console.error("指定されたオプションメニューが存在しません", args.salonOptionId);
        throw new ConvexError({
          message: "指定されたオプションメニューが存在しません", 
          code: ERROR_CODES.NOT_FOUND
        });
      }

      // 価格と時間のバリデーション
      validateOption(args);

      // 更新データの準備（空フィールドを削除）
      const updateData = removeEmptyFields(args);
      // salonOptionId はパッチ対象から削除する
      delete updateData.salonOptionId;

      const newSalonOptionId = await ctx.db.patch(args.salonOptionId, updateData);
      return newSalonOptionId;
    } catch (error) {
      handleConvexApiError("オプションメニューの更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// オプションメニューの作成または更新
export const upsert = mutation({
  args: {
    salonId: v.id("salon"),
    salonOptionId: v.id("salon_option"),
    name: v.string(), // オプションメニュー名
    unitPrice: v.number(), // 価格
    salePrice: v.optional(v.number()), // セール価格
    orderLimit: v.optional(v.number()), // 注文制限
    timeToMin: v.number(), // 時間(分)
    tags: v.optional(v.array(v.string())), // タグ
    category: v.optional(v.string()), // カテゴリ
    description: v.optional(v.string()), // 説明
    isActive: v.optional(v.boolean()), // 有効/無効フラグ
  },
  handler: async (ctx, args) => {
    try {
      
      // 価格と時間のバリデーション
      validateOption(args);

      const existingSalonOption = await ctx.db.get(args.salonOptionId);
      if (!existingSalonOption || existingSalonOption.isArchive) {
        // 更新データの準備（空フィールドを削除）
        const updateData = removeEmptyFields(args);
        delete updateData.salonOptionId;
        return await ctx.db.patch(args.salonOptionId, updateData);
      } else {
        // isActiveが未設定の場合はデフォルト値を設定
        return await ctx.db.insert("salon_option", {
          ...args,
          isActive: args.isActive === undefined ? true : args.isActive,
          isArchive: false,
        });
      }
    } catch (error) {
      handleConvexApiError("オプションメニューの作成/更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// オプションメニューの論理削除
export const trash = mutation({
  args: {
    salonOptionId: v.id("salon_option"),
  },
  handler: async (ctx, args) => {
    try {
      // オプションメニューの存在確認
      const salonOption = await ctx.db.get(args.salonOptionId);
      if (!salonOption) {
        console.error("指定されたオプションメニューが存在しません", args.salonOptionId);
        throw new ConvexError({
          message: "指定されたオプションメニューが存在しません", 
          code: ERROR_CODES.NOT_FOUND
        });
      }
      // 論理削除の実装（isActiveをfalseに設定）
      await trashRecord(ctx, args.salonOptionId);
      return true;
    } catch (error) {
      handleConvexApiError("オプションメニューの削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const kill = mutation({
  args: {
    salonOptionId: v.id("salon_option"),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.salonOptionId);
      return true;
    } catch (error) {
      handleConvexApiError("オプションメニューの削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});
// サロンIDからオプションメニュー一覧を取得
export const getBySalonId = query({
  args: {
    salonId: v.id("salon"),
    paginationOpts: paginationOptsValidator,
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      return await ctx.db
        .query("salon_option")
        .withIndex("by_salon_id", (q) => 
          q.eq("salonId", args.salonId).eq("isActive", args.activeOnly).eq("isArchive", false)
        )
        .paginate(args.paginationOpts);
    } catch (error) {
      handleConvexApiError("オプションメニューの取得に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// オプションIDからオプションメニュー情報を取得
export const getById = query({
  args: {
    salonOptionId: v.id("salon_option"),
  },
  handler: async (ctx, args) => {
    const salonOption = await ctx.db.get(args.salonOptionId);
    if (!salonOption || salonOption.isArchive) {
      throw new ConvexError({
        message: "指定されたオプションメニューが存在しません",
        code: ERROR_CODES.NOT_FOUND,
      });
    }
    
    return salonOption;
  },
});

// カテゴリでオプションメニューを検索
export const getByCategory = query({
  args: {
    salonId: v.id("salon"),
    category: v.string(),
    paginationOpts: paginationOptsValidator,
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      // すべてのオプションを検索
      return await ctx.db
        .query("salon_option")
        .withIndex("by_salon_category", (q) => q.eq("salonId", args.salonId).eq("category", args.category).eq("isActive", args.activeOnly).eq("isArchive", false))
        .paginate(args.paginationOpts);
    } catch (error) {
      handleConvexApiError("オプションメニューの取得に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// オプションメニューを名前で検索
export const searchByName = query({
  args: {
    salonId: v.id("salon"),
    name: v.string(),
    paginationOpts: paginationOptsValidator,
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      // searchIndexを使用して効率的に検索
      return await ctx.db
        .query("salon_option")
        .withSearchIndex("search_by_name", (q) => 
          q.search("name", args.name).eq("isActive", args.activeOnly).eq("isArchive", false)
        )
        .filter((q) => q.eq(q.field("salonId"), args.salonId))
        .paginate(args.paginationOpts);
    } catch (error) {
      handleConvexApiError("オプションメニューの取得に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});
