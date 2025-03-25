import { mutation, query } from "./../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "./../helpers";
import { paginationOptsValidator } from "convex/server";
import { ERROR_CODES } from "./../errors";
import { Doc } from "./../_generated/dataModel";
import { MAX_TEXT_LENGTH, LIMIT_TAG_COUNT, MAX_TAG_LENGTH, MAX_PHONE_LENGTH } from "./../../lib/constants";

// 顧客のバリデーション
function validateCustomer(args: Partial<Doc<"customer">>) {
  if (args.salonId && args.salonId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({message: `サロンIDは${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.lineId && args.lineId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({message: `LINE IDは${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.lineUserName && args.lineUserName.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({message: `LINEユーザー名は${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.phone && args.phone.length > MAX_PHONE_LENGTH) {
    throw new ConvexError({message: `電話番号は${MAX_PHONE_LENGTH}桁以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.firstName && args.firstName.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({message: `名前は${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.lastName && args.lastName.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({message: `名前は${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.fullName && args.fullName.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({message: `名前は${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.email && args.email.length > MAX_TEXT_LENGTH ) {
    throw new ConvexError({message: `メールアドレスは${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.tags && args.email?.includes('@')) {
    throw new ConvexError({message: "メールアドレスが不正です", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.tags && args.tags.length > LIMIT_TAG_COUNT) {
    throw new ConvexError({message: `タグは${LIMIT_TAG_COUNT}個以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.tags && args.tags.length > LIMIT_TAG_COUNT) {
    if (args.tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
      throw new ConvexError({message: `タグは${MAX_TAG_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
    }
  }
}

// 顧客の追加
export const add = mutation({
  args: {
    salonId: v.id("salon"),
    lineId: v.optional(v.string()),
    lineUserName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    lastReservationDate_unix: v.optional(v.number()),
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
      
      // fullNameが指定されていない場合は自動生成

      const fullName = [args.lastName, args.firstName, args.lineUserName]
          .filter(Boolean)
          .join(" ");
      

      validateCustomer({...args, fullName: fullName});
      const customerId = await ctx.db.insert("customer", {
        ...args,
        fullName: fullName,
        isArchive: false,
      });
      return customerId;
    } catch (error) {
      handleConvexApiError("顧客の追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// 顧客情報の更新
export const update = mutation({
  args: {
    customerId: v.id("customer"),
    lineId: v.optional(v.string()),
    lineUserName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    fullName: v.optional(v.string()),
    lastReservationDate_unix: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    try {
      // 顧客の存在確認
      const customer = await ctx.db.get(args.customerId);
      if (!customer || customer.isArchive) {
        throw new ConvexError({
          message: "指定された顧客が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // customerId はパッチ対象から削除する
      delete updateData.customerId;

      // fullNameを更新
      if (updateData.firstName !== undefined || updateData.lastName !== undefined || updateData.lineUserName !== undefined) {
        const firstName = updateData.firstName !== undefined ? updateData.firstName : customer.firstName;
        const lastName = updateData.lastName !== undefined ? updateData.lastName : customer.lastName;
        const lineUserName = updateData.lineUserName !== undefined ? updateData.lineUserName : customer.lineUserName;
        
        const fullName = [lastName, firstName, lineUserName]
          .filter(Boolean)
          .join(" ");
          
        updateData.fullName = fullName;
      }


      validateCustomer(updateData);

      const newCustomerId = await ctx.db.patch(args.customerId, updateData);
      return newCustomerId;
    } catch (error) {
      handleConvexApiError("顧客情報の更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// 顧客の削除
export const trash = mutation({
  args: {
    customerId: v.id("customer"),
  },
  handler: async (ctx, args) => {
    try {
      // 顧客の存在確認
      const customer = await ctx.db.get(args.customerId);
      if (!customer) {
        throw new ConvexError({
          message: "指定された顧客が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      // 顧客詳細情報の削除
      const customerDetail = await ctx.db.query("customer_detail")
        .withIndex("by_customer_id", (q) => q.eq("customerId", args.customerId))
        .first();
      if (!customerDetail) {
        console.error("DeleteCustomer: 指定された顧客の詳細が存在しません", args.customerId);
        throw new ConvexError({
          message: "DeleteCustomer: 指定された顧客の詳細が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      await trashRecord(ctx, customer._id);
      await trashRecord(ctx, customerDetail._id);
      return true;
    } catch (error) {
      handleConvexApiError("顧客のアーカイブに失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const upsert = mutation({
  args: {
    customerId: v.id("customer"),
    salonId: v.id("salon"),
    lineId: v.optional(v.string()),
    lineUserName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    lastReservationDate_unix: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    try {
      

      const existingCustomer = await ctx.db.get(args.customerId);
      let fullName = "";

      if (!existingCustomer || existingCustomer.isArchive) {
        fullName = [args.lastName, args.firstName, args.lineUserName]
        .filter(Boolean)
        .join(" ");

        validateCustomer({...args, fullName: fullName});
        return await ctx.db.insert("customer", {
          ...args,
          fullName: fullName,
          isArchive: false,
        });
      } else {
        fullName = (args.lineUserName ?? existingCustomer.lineUserName) + " " + (args.lastName ? args.lastName : existingCustomer.lastName) + " " + (args.firstName ?? existingCustomer.firstName);
        validateCustomer({...args, fullName: fullName});
        const updateData = removeEmptyFields(args);
        delete updateData.customerId;
        return await ctx.db.patch(existingCustomer._id, {
          ...updateData,
          fullName: fullName,
        });
      }
    } catch (error) {
      handleConvexApiError("顧客の追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const kill = mutation({
  args: {
    customerId: v.id("customer"),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.customerId);
    } catch (error) {
      handleConvexApiError("顧客の削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// サロンIDから顧客一覧を取得
export const getBySalonId = query({
  args: {
    salonId: v.id("salon"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {

    return await ctx.db
      .query("customer")
      .withIndex("by_salon_id", (q) => q.eq("salonId", args.salonId).eq("isArchive", false))
      .paginate(args.paginationOpts);
  },
});

// LINE IDから顧客情報を取得
export const getByLineId = query({
  args: {
    salonId: v.id("salon"),
    lineId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customer")
      .withIndex("by_salon_line_id", (q) => 
        q.eq("salonId", args.salonId).eq("lineId", args.lineId).eq("isArchive", false)
      )
      .first();
  },
});

// 電話番号から顧客情報を取得
export const getByPhone = query({
  args: {
    salonId: v.id("salon"),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      
      return await ctx.db
        .query("customer")
      .withIndex("by_salon_phone", (q) => 
          q.eq("salonId", args.salonId).eq("phone", args.phone).eq("isArchive", false)
        )
        .first();
    } catch (error) {
      handleConvexApiError("電話番号から顧客情報の取得に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// 名前での顧客検索
export const searchByName = query({
  args: {
    salonId: v.id("salon"),
    searchName: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    try {
       
      
      const result = await ctx.db
      .query("customer")
      .withIndex("by_salon_id_full_name", (q) => q.eq("salonId", args.salonId))
        .filter((q) => q.eq(q.field("fullName"), args.searchName))
        .paginate(args.paginationOpts);

      return result;
    } catch (error) {
      handleConvexApiError("名前での顧客検索に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const customersBySalonId = query({
  args: {
    salonId: v.id("salon"),
    paginationOpts: paginationOptsValidator,
    direction: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    try {
      return await ctx.db
        .query("customer")
        .withIndex("by_salon_id", (q) => q.eq("salonId", args.salonId).eq("isArchive", false))
        .order(args.direction === "asc" ? "asc" : "desc")
        .paginate(args.paginationOpts);
    } catch (error) {
      throw handleConvexApiError("サロンIDから顧客一覧の取得に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});