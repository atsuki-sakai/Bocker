import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { CONVEX_ERROR_CODES } from '../constants';
import { getCurrentUnixTime, removeEmptyFields, authCheck } from '../helpers';
import { validateAdmin } from '../validators';

/**
 * 管理者の追加
 */
export const add = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateAdmin(args);
    // 既存管理者の確認
    const existingAdmin = await ctx.db
      .query('admin')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .first();

    if (existingAdmin) {
      console.error('AddAdmin: 既に同じClerkIDの管理者が存在します', args.clerkId);
      throw new ConvexError({
        message: '既に同じClerkIDの管理者が存在します',
        code: CONVEX_ERROR_CODES.DUPLICATE_RECORD,
        status: 400,
        severity: 'low',
      });
    }

    // 管理者の追加
    const adminId = await ctx.db.insert('admin', args);
    return adminId;
  },
});

export const get = query({
  args: {
    adminId: v.id('admin'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db.get(args.adminId);
  },
});

/**
 * 管理者情報の更新
 */
export const update = mutation({
  args: {
    adminId: v.id('admin'),
    email: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateAdmin(args);
    // 管理者の存在確認
    const admin = await ctx.db.get(args.adminId);
    if (!admin) {
      console.error('UpdateAdmin: 指定された管理者が存在しません', args.adminId);
      throw new ConvexError({
        message: '指定された管理者が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 400,
        severity: 'low',
      });
    }

    const updateData = removeEmptyFields(args);
    delete updateData.adminId;

    const updatedAdminId = await ctx.db.patch(args.adminId, updateData);
    return updatedAdminId;
  },
});

/**
 * 管理者の論理削除
 */
export const trash = mutation({
  args: {
    adminId: v.id('admin'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // 管理者の存在確認
    const admin = await ctx.db.get(args.adminId);
    if (!admin) {
      console.error('TrashAdmin: 指定された管理者が存在しません', args.adminId);
      throw new ConvexError({
        message: '指定された管理者が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
      });
    }

    await ctx.db.patch(args.adminId, {
      isArchive: true,
      deletedAt: getCurrentUnixTime(),
    });

    return true;
  },
});

/**
 * 管理者の物理削除
 */
export const kill = mutation({
  args: {
    adminId: v.id('admin'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // 管理者の存在確認
    const admin = await ctx.db.get(args.adminId);
    if (!admin) {
      console.error('KillAdmin: 指定された管理者が存在しません', args.adminId);
      throw new ConvexError({
        message: '指定された管理者が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
      });
    }

    await ctx.db.delete(args.adminId);
    return true;
  },
});

/**
 * 管理者のupsert（存在すれば更新、なければ作成）
 */
export const upsert = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateAdmin(args);
    // 既存管理者の確認
    const existingAdmin = await ctx.db
      .query('admin')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .first();

    if (existingAdmin) {
      // 更新
      return await ctx.db.patch(existingAdmin._id, {
        email: args.email,
        password: args.password,
      });
    } else {
      // 新規作成
      return await ctx.db.insert('admin', args);
    }
  },
});

/**
 * ClerkIDから管理者情報を取得
 */
export const getByClerkId = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    validateAdmin(args);
    return await ctx.db
      .query('admin')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .first();
  },
});