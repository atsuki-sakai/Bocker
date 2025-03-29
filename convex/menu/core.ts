import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "../helpers";
import { paginationOptsValidator } from "convex/server";
import { ERROR_CODES } from "../errors";
import { Doc } from "../_generated/dataModel";
import { genderType } from "../types";
import { MAX_TEXT_LENGTH, MAX_CATEGORY_LENGTH, MAX_NOTES_LENGTH, LIMIT_TAG_COUNT, MAX_TAG_LENGTH } from "../../lib/constants";
// メニューのバリデーション
function validateMenu(args: Partial<Doc<"menu">>) {
  if (args.name && args.name.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({message: `メニュー名は${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.price && args.price < 0) {
    throw new ConvexError({message: "価格は0以上で入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.salePrice && args.salePrice < 0) {
    throw new ConvexError({message: "セール価格は0以上で入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.timeToMin && args.timeToMin < 0) {
    throw new ConvexError({message: "施術時間は0以上で入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.category && args.category.length > MAX_CATEGORY_LENGTH) {
    throw new ConvexError({message: `カテゴリは${MAX_CATEGORY_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.description && args.description.length > MAX_NOTES_LENGTH) {
    throw new ConvexError({message: `説明は${MAX_NOTES_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.tags && args.tags.length > LIMIT_TAG_COUNT) {
    throw new ConvexError({message: `タグは${LIMIT_TAG_COUNT}個以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.tags && args.tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
    throw new ConvexError({message: `タグは${MAX_TAG_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
}

// メニューの追加
export const add = mutation({
  args: {
    salonId: v.id('salon'),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
    salePrice: v.optional(v.number()),
    timeToMin: v.optional(v.number()),
    category: v.optional(v.string()),
    imgFilePath: v.optional(v.string()),
    description: v.optional(v.string()),
    couponIds: v.optional(v.array(v.id('coupon'))),
    targetGender: v.optional(genderType),
    availableStaffIds: v.optional(v.array(v.id('staff'))),
    tags: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      // サロンの存在確認
      const salon = await ctx.db.get(args.salonId);
      if (!salon) {
        console.error('指定されたサロンが存在しません', args.salonId);
        throw new ConvexError({
          message: '指定されたサロンが存在しません',
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      validateMenu(args);
      const menuId = await ctx.db.insert('menu', {
        ...args,
        isArchive: false,
      });
      return menuId;
    } catch (error) {
      handleConvexApiError('メニューの追加に失敗しました', ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// メニュー情報の更新
export const update = mutation({
  args: {
    menuId: v.id('menu'),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
    salePrice: v.optional(v.number()),
    timeToMin: v.optional(v.number()),
    category: v.optional(v.string()),
    imgFilePath: v.optional(v.string()),
    description: v.optional(v.string()),
    couponIds: v.optional(v.array(v.id('coupon'))),
    targetGender: v.optional(genderType),
    availableStaffIds: v.optional(v.array(v.id('staff'))),
    tags: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      // メニューの存在確認
      const menu = await ctx.db.get(args.menuId);
      if (!menu || menu.isArchive) {
        throw new ConvexError({
          message: '指定されたメニューが存在しません',
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // menuId はパッチ対象から削除する
      delete updateData.menuId;

      validateMenu(updateData);

      const newMenuId = await ctx.db.patch(args.menuId, updateData);
      return newMenuId;
    } catch (error) {
      handleConvexApiError('メニュー情報の更新に失敗しました', ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// メニューの削除
export const trash = mutation({
  args: {
    menuId: v.id("menu"),
  },
  handler: async (ctx, args) => {
    try {
      // メニューの存在確認
      const menu = await ctx.db.get(args.menuId);
      if (!menu) {
        throw new ConvexError({
          message: "指定されたメニューが存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      await trashRecord(ctx, menu._id);
      return true;
    } catch (error) {
      handleConvexApiError("メニューのアーカイブに失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const upsert = mutation({
  args: {
    menuId: v.id('menu'),
    salonId: v.id('salon'),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
    salePrice: v.optional(v.number()),
    timeToMin: v.optional(v.number()),
    category: v.optional(v.string()),
    imgFilePath: v.optional(v.string()),
    description: v.optional(v.string()),
    couponIds: v.optional(v.array(v.id('coupon'))),
    targetGender: v.optional(genderType),
    availableStaffIds: v.optional(v.array(v.id('staff'))),
    tags: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      validateMenu(args);
      const existingMenu = await ctx.db.get(args.menuId);

      if (!existingMenu || existingMenu.isArchive) {
        return await ctx.db.insert('menu', {
          ...args,
          salonId: args.salonId,
          isArchive: false,
        });
      } else {
        const updateData = removeEmptyFields(args);
        delete updateData.menuId;
        delete updateData.salonId;
        return await ctx.db.patch(existingMenu._id, updateData);
      }
    } catch (error) {
      handleConvexApiError('メニューの追加/更新に失敗しました', ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const kill = mutation({
  args: {
    menuId: v.id("menu"),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.menuId);
    } catch (error) {
      handleConvexApiError("メニューの削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// サロンIDからメニュー一覧を取得
export const getBySalonId = query({
  args: {
    salonId: v.id("salon"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menu")
      .withIndex("by_salon_id", (q) => q.eq("salonId", args.salonId).eq("isActive", true).eq("isArchive", false))
      .paginate(args.paginationOpts);
  },
});

// カテゴリでメニューを取得
export const getByCategory = query({
  args: {
    salonId: v.id("salon"),
    category: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menu")
      .withIndex("by_salon_id_category", (q) => 
        q.eq("salonId", args.salonId).eq("category", args.category).eq("isActive", true).eq("isArchive", false)
      )
      .paginate(args.paginationOpts);
  },
});

// 性別でメニューを取得
export const getByGender = query({
  args: {
    salonId: v.id("salon"),
    targetGender: genderType,
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menu")
      .withIndex("by_salon_id_gender", (q) => 
        q.eq("salonId", args.salonId).eq("targetGender", args.targetGender).eq("isActive", true).eq("isArchive", false)
      )
      .paginate(args.paginationOpts);
  },
});

// 名前でメニューを検索
export const searchByName = query({
  args: {
    searchText: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    try {
      return await ctx.db
        .query("menu")
        .withSearchIndex("search_by_name", (q) => q.search("name", args.searchText).eq("isActive", true).eq("isArchive", false))
        .paginate(args.paginationOpts);
    } catch (error) {
      handleConvexApiError("メニュー検索に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});