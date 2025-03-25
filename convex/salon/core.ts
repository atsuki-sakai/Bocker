
// convex/salon.ts

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { ERROR_CODES } from "../errors";
import { Doc } from "../_generated/dataModel";
import { handleConvexApiError, removeEmptyFields, trashRecord } from "../helpers";
import { MAX_TEXT_LENGTH } from "../../lib/constants";

// サロンのバリデーション
function validateSalon(args: Partial<Doc<"salon">>) {
  if (args.clerkId && args.clerkId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({message: `Clerk IDは${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if(args.clerkId && args.clerkId === "") {
    throw new ConvexError({message: "Clerk IDが空です", code:ERROR_CODES.INVALID_ARGUMENT})
  }
  if (args.email && args.email.length > MAX_TEXT_LENGTH) {  
    throw new ConvexError({message: `メールアドレスは${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if(args.email && !args.email.includes('@')){
    throw new ConvexError({ message: "メールアドレスの形式が正しくありません", code: ERROR_CODES.INVALID_ARGUMENT})
  }
  if (args.stripeCustomerId && args.stripeCustomerId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({message: `Stripe顧客IDは${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if(args.stripeCustomerId && args.stripeCustomerId === ""){
    throw new ConvexError({message: "Stripe顧客IDが空です", code: ERROR_CODES.INVALID_ARGUMENT})
  }
}

export const add = mutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // 入力検証
      validateSalon(args);
      // 既存ユーザーの検索
      const existingSalon = await ctx.db
        .query("salon")
        .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId).eq("isArchive", false))
        .first();
      
      if (existingSalon) {
        throw new ConvexError({message: "既に存在するClerk IDです", code: ERROR_CODES.DUPLICATE_RECORD});
      }

      // 必須でないフィールドの検証
      const email = args.email || "no-email";
      
      // 挿入するデータの準備

      const salonData: Partial<Doc<"salon">> = {
        clerkId: args.clerkId,
        email: email,
      };

      validateSalon(salonData);
      // 任意フィールドを条件付きで追加
      if (args.stripeCustomerId) {
        salonData.stripeCustomerId = args.stripeCustomerId;
      }
      salonData.isArchive = false;
      
      // データベースに挿入
      const newSalonId = await ctx.db.insert("salon", {
        ...salonData,
        isArchive: false,
      } as Doc<"salon">);
      return newSalonId;
    } catch (error) {
      handleConvexApiError(`サロン追加処理でエラー発生 (clerkId: ${args.clerkId}):`, ERROR_CODES.UNEXPECTED_ERROR, error);
    }
  },
});

export const get = query({
  args: {
    id: v.id("salon"),
  },
  handler: async (ctx, args) => {
    try {
      const salon = await ctx.db.get(args.id);
      if (!salon || salon.isArchive) {
      throw new ConvexError({
        message: "サロンが見つかりません", 
          code: ERROR_CODES.NOT_FOUND
        });
      }
      return salon;
    } catch (error) {
      handleConvexApiError("サロンの取得に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("salon"),
    clerkId: v.optional(v.string()),
    email: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      validateSalon(args);
      // サロンの存在確認
      const salon = await ctx.db.get(args.id);
      
      if (!salon || salon.isArchive) {
        console.warn(`サロンが見つかりません (ID: ${args.id})`);
        throw new ConvexError({
          message: "サロンが見つかりません",
          code: ERROR_CODES.NOT_FOUND,
          salonId: args.id
        });
      }
      
      // 更新前にデータの正当性チェック
      if (args.stripeCustomerId && salon.stripeCustomerId && 
          args.stripeCustomerId !== salon.stripeCustomerId) {
        console.warn(
          `Stripe顧客ID変更の試み: ${args.id}, ` +
          `現在: ${salon.stripeCustomerId}, 新規: ${args.stripeCustomerId}`
        );
        // 変更は許可するが警告としてログに残す
      }
      const updateData = removeEmptyFields({...args});
      delete updateData.id;
      delete updateData.clerkId;
      const updatedId = await ctx.db.patch(args.id, updateData);

      return updatedId;
    } catch (error) {
      // ConvexErrorはそのまま上位へ伝播
      if (error instanceof ConvexError) {
        throw error;
      }
      
      // その他のエラーは詳細なログを残して再スロー
      console.error(`サロン更新処理でエラー発生 (ID: ${args.id}):`, (error instanceof Error ? error.message : ""));
      throw new ConvexError({
        message: `サロンの更新に失敗しました`,
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  },
});

export const upsert = mutation({
  args: {
    id: v.id("salon"),
    clerkId: v.string(),
    email: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    },
  handler: async (ctx, args) => {
    try {
      validateSalon(args);
      const salon = await ctx.db.get(args.id);
      if (!salon || salon.isArchive) {
        return await ctx.db.insert("salon", {
          clerkId: args.clerkId,
          email: args.email,
          stripeCustomerId: args.stripeCustomerId,
          isArchive: false,
        });
      }else{
        const updateData = removeEmptyFields({...args});
        delete updateData.id;
        delete updateData.clerkId;
        return await ctx.db.patch(args.id, updateData);
      }
    } catch (error) {
      handleConvexApiError(`サロンの追加処理でエラー発生 (clerkId: ${args.clerkId}):`, ERROR_CODES.UNEXPECTED_ERROR, error);
    }
  },
});

export const trash = mutation({
  args: { id: v.id("salon") },
  handler: async (ctx, args) => {
    try {
      // より効率的なクエリでサロンを取得
      const salon = await ctx.db.get(args.id);
      if (!salon) {
        console.warn(`存在しないサロンの削除が試行されました: ${args.id}`);
        throw new ConvexError({message: "存在しないサロンの削除が試行されました", code: ERROR_CODES.NOT_FOUND});
      }
      return trashRecord(ctx, args.id);
    } catch (error) {
      handleConvexApiError(`サロン削除処理でエラー発生 (ID: ${args.id}):`, ERROR_CODES.DATABASE_ERROR, error);
    }
  },
});

export const getClerkId = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      validateSalon(args);
      // 指定されたClerk IDを持つサロンを検索
      const salon = await ctx.db
        .query("salon")
        .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId).eq("isArchive", false))
        .first();
        
      if (!salon) {
        return null;
      }
      
      // データ整合性チェック - Stripe顧客IDが設定されているかを確認
      if (!salon.stripeCustomerId) {
        console.warn(`サロン ${salon._id} にStripe顧客IDが設定されていません (clerkId: ${args.clerkId})`);
        // エラーは投げずに警告だけ
      }
      
      return salon;
    } catch (error) {
      // ConvexErrorは上位へ伝搬
      if (error instanceof ConvexError) {
        throw error;
      }
      
      // 予期せぬエラーの場合は詳細なログを残す
      console.error(`clerkIdによるサロン検索でエラー発生 (clerkId: ${args.clerkId}):`, (error instanceof Error ? error.message : ""));
      throw new ConvexError({
        message: `サロンの検索に失敗しました`,
        code: ERROR_CODES.INTERNAL_ERROR
      });
    }
  },
});

// salonのサブスクリプション情報を更新する
export const updateSubscription = mutation({
  args: {
    subscriptionId: v.string(), 
    subscriptionStatus: v.string(),
    stripeCustomerId: v.string()
  },
  handler: async (ctx, args) => {
    try {
      // 1. 顧客IDでサロンを検索
      let salon = await ctx.db
        .query("salon")
        .withIndex("by_stripe_customer_id", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
        .first();

      // 2. 顧客IDでサロンが見つからない場合
      if (!salon) {
        console.log(`Stripe顧客ID ${args.stripeCustomerId} でサロンが見つかりません。サブスクリプションIDで検索します。`);
        
        // 2.1. サブスクリプションIDからレコードを検索
        const subRecord = await ctx.db
          .query("subscription")
          .withIndex("by_subscription_id", (q) => q.eq("subscriptionId", args.subscriptionId))
          .first();
          
        if (!subRecord) {
          console.warn(`サブスクリプションが見つかりません (ID: ${args.subscriptionId})`);
          return null;
        }
        
        // 2.2. サブスクリプションから取得した顧客IDでサロンを再検索
        salon = await ctx.db
          .query("salon")
          .withIndex("by_stripe_customer_id", (q) => q.eq("stripeCustomerId", subRecord.stripeCustomerId))
          .first();
          
        if (!salon) {
          console.warn(`サブスクリプションレコードから取得したStripe顧客ID ${subRecord.stripeCustomerId} でサロンが見つかりません`);
          return null;
        }
      }

      // 3. サロンのサブスクリプション情報を更新
      
      // サブスクリプションの情報を更新して返す
      return await ctx.db.patch(salon._id, {
        subscriptionId: args.subscriptionId,
        subscriptionStatus: args.subscriptionStatus,
      });
    } catch (error) {
      // エラーを詳細にログ
      console.error('サロンのサブスクリプション更新処理でエラー発生:', (error instanceof Error ? error.message : ""));
      throw new ConvexError({
        message: `サブスクリプション情報の更新に失敗しました`,
        code: ERROR_CODES.UNEXPECTED_ERROR
      });
    }
  },
});

// サロンのサブスクリプションステータスを取得する
export const subscriptionStatus = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const salon = await ctx.db.query("salon").withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId).eq("isArchive", false)).first();
    if (!salon) {
      return undefined;
    }
    return salon.subscriptionStatus;
  },
});
