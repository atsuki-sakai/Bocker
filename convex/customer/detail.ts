import { mutation, query } from "./../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { CONVEX_ERROR_CODES } from './../constants';
import { removeEmptyFields, trashRecord, KillRecord, authCheck } from './../helpers';
import { genderType } from './../types';
import { validateCustomerDetail } from './../validators';

// 顧客詳細情報の追加
export const add = mutation({
  args: {
    customerId: v.id('customer'),
    email: v.optional(v.string()),
    age: v.optional(v.number()),
    gender: v.optional(genderType),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateCustomerDetail(args);
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.isArchive) {
      console.error('AddCustomerDetail: 指定された顧客が存在しません', { ...args });
      throw new ConvexError({
        message: '指定された顧客が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          customerId: args.customerId,
        },
      });
    }

    // 既存の詳細データがないか確認
    const existingDetail = await ctx.db
      .query('customer_detail')
      .withIndex('by_customer_id', (q) =>
        q.eq('customerId', args.customerId).eq('isArchive', false)
      )
      .first();

    if (existingDetail) {
      console.error('AddCustomerDetail: すでに顧客詳細情報が存在します', { ...args });
      throw new ConvexError({
        message: 'すでに顧客詳細情報が存在します',
        code: CONVEX_ERROR_CODES.DUPLICATE_RECORD,
        status: 400,
        severity: 'low',
        context: {
          customerId: args.customerId,
        },
      });
    }
    const detailId = await ctx.db.insert('customer_detail', {
      ...args,
      isArchive: false,
    });
    return detailId;
  },
});

// 顧客詳細情報の更新
export const update = mutation({
  args: {
    detailId: v.id('customer_detail'),
    email: v.optional(v.string()),
    age: v.optional(v.number()),
    gender: v.optional(genderType),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateCustomerDetail(args);
    const detail = await ctx.db.get(args.detailId);
    if (!detail || detail.isArchive) {
      console.error('UpdateCustomerDetail: 指定された顧客詳細情報が存在しません', { ...args });
      throw new ConvexError({
        message: '指定された顧客詳細情報が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          detailId: args.detailId,
        },
      });
    }

    // 顧客情報の取得
    const customer = await ctx.db.get(detail.customerId);
    if (!customer || customer.isArchive) {
      console.error('UpdateCustomerDetail: 関連する顧客が存在しません', { ...args });
      throw new ConvexError({
        message: '関連する顧客が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          customerId: detail.customerId,
        },
      });
    }

    const updateData = removeEmptyFields(args);
    // detailId はパッチ対象から削除する
    delete updateData.detailId;
    const newDetailId = await ctx.db.patch(args.detailId, updateData);
    return newDetailId;
  },
});

// 顧客詳細情報の作成または更新
export const upsert = mutation({
  args: {
    customerId: v.id('customer'),
    email: v.optional(v.string()),
    age: v.optional(v.number()),
    gender: v.optional(genderType),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateCustomerDetail(args);
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.isArchive) {
      console.error('UpsertCustomerDetail: 指定された顧客が存在しません', { ...args });
      throw new ConvexError({
        message: '指定された顧客が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          customerId: args.customerId,
        },
      });
    }

    // 既存の詳細データがないか確認
    const existingDetail = await ctx.db
      .query('customer_detail')
      .withIndex('by_customer_id', (q) =>
        q.eq('customerId', args.customerId).eq('isArchive', false)
      )
      .first();

    if (existingDetail) {
      // 更新
      const updateData = removeEmptyFields(args);
      // customerId はパッチ対象から削除する
      delete updateData.customerId;
      return await ctx.db.patch(existingDetail._id, updateData);
    } else {
      // 新規作成
      return await ctx.db.insert('customer_detail', {
        ...args,
        isArchive: false,
      });
    }
  },
});

// 顧客詳細情報の削除
export const trash = mutation({
  args: {
    detailId: v.id('customer_detail'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // 顧客詳細情報の存在確認
    const detail = await ctx.db.get(args.detailId);
    if (!detail) {
      console.error('TrashCustomerDetail: 指定された顧客詳細情報が存在しません', { ...args });
      throw new ConvexError({
        message: '指定された顧客詳細情報が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          detailId: args.detailId,
        },
      });
    }

    // 顧客情報の取得
    const customer = await ctx.db.get(detail.customerId);
    if (!customer) {
      console.error('TrashCustomerDetail: 関連する顧客が存在しません', { ...args });
      throw new ConvexError({
        message: '関連する顧客が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          customerId: detail.customerId,
        },
      });
    }

    await trashRecord(ctx, args.detailId);
    return true;
  },
});

export const kill = mutation({
  args: {
    detailId: v.id('customer_detail'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // 顧客詳細情報の存在確認
    const detail = await ctx.db.get(args.detailId);
    if (!detail) {
      console.error('KillCustomerDetail: 指定された顧客詳細情報が存在しません', { ...args });
      throw new ConvexError({
        message: '指定された顧客詳細情報が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          detailId: args.detailId,
        },
      });
    }
    await KillRecord(ctx, args.detailId);
  },
});

// 顧客IDから詳細情報を取得
export const getByCustomerId = query({
  args: {
    customerId: v.id('customer'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // 顧客の存在確認
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      console.error('GetCustomerDetail: 指定された顧客が存在しません', { ...args });
      throw new ConvexError({
        message: '指定された顧客が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          customerId: args.customerId,
        },
      });
    }

    const detail = await ctx.db
      .query('customer_detail')
      .withIndex('by_customer_id', (q) => q.eq('customerId', args.customerId))
      .first();

    return detail;
  },
});