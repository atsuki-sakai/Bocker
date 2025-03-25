// convex/storage.ts
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ERROR_CODES } from "../errors";
import { handleConvexApiError} from "../helpers";

export const generateUploadUrl = mutation({
  args: {
  },
  handler: async (ctx) => {
    try {
      const url = await ctx.storage.generateUploadUrl();
      return url;
    } catch (error) {
      handleConvexApiError("ストレージのアップロードURL生成中にエラーが発生しました", ERROR_CODES.UNEXPECTED_ERROR, error);
    }
  },
});

export const getUrl = query({
  args: {
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      return await ctx.storage.getUrl(args.storageId);
    } catch (error) {
      handleConvexApiError("ストレージのURL取得中にエラーが発生しました", ERROR_CODES.UNEXPECTED_ERROR, error);
    }
  },
});

export const trash = mutation({
  args: {
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.storage.delete(args.storageId);
    } catch (error) {
      handleConvexApiError("ストレージの削除中にエラーが発生しました", ERROR_CODES.UNEXPECTED_ERROR, error);
    }
  },
});