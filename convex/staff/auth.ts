import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { removeEmptyFields, archiveRecord, KillRecord } from '../shared/utils/helper';
import { validateStaffAuth, validateRequired } from '../shared/utils/validation';
import { roleType } from '../shared/types/common';
import { checkAuth } from '../shared/utils/auth';
import { ConvexCustomError } from '../shared/utils/error';

// スタッフ認証の追加
export const add = mutation({
  args: {
    staffId: v.id('staff'),
    pinCode: v.optional(v.string()),
    hashPinCode: v.optional(v.string()),
    role: v.optional(roleType),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaffAuth(args);
    // スタッフの存在確認
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new ConvexCustomError('low', '指定されたスタッフが存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }
    return await ctx.db.insert('staff_auth', {
      ...args,
      isArchive: false,
    });
  },
});

// スタッフ認証情報の更新
export const update = mutation({
  args: {
    staffAuthId: v.id('staff_auth'),
    pinCode: v.optional(v.string()),
    hashPinCode: v.optional(v.string()),
    role: v.optional(roleType),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaffAuth(args);
    // スタッフ認証の存在確認
    const staffAuth = await ctx.db.get(args.staffAuthId);
    if (!staffAuth || staffAuth.isArchive) {
      throw new ConvexCustomError('low', '指定されたスタッフ認証が存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    const updateData = removeEmptyFields(args);
    // staffAuthId はパッチ対象から削除する
    delete updateData.staffAuthId;

    return await ctx.db.patch(args.staffAuthId, updateData);
  },
});

// スタッフ認証の削除
export const archive = mutation({
  args: {
    staffAuthId: v.id('staff_auth'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.staffAuthId, 'staffAuthId');
    return await archiveRecord(ctx, args.staffAuthId);
  },
});

export const upsert = mutation({
  args: {
    staffAuthId: v.id('staff_auth'),
    staffId: v.id('staff'),
    pinCode: v.optional(v.string()),
    hashPinCode: v.optional(v.string()),
    role: v.optional(roleType),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaffAuth(args);
    const existingStaffAuth = await ctx.db.get(args.staffAuthId);

    if (!existingStaffAuth || existingStaffAuth.isArchive) {
      return await ctx.db.insert('staff_auth', {
        ...args,
        isArchive: false,
      });
    } else {
      const updateData = removeEmptyFields(args);
      delete updateData.staffAuthId;
      delete updateData.staffId;
      return await ctx.db.patch(existingStaffAuth._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    staffAuthId: v.id('staff_auth'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.staffAuthId, 'staffAuthId');
    return await KillRecord(ctx, args.staffAuthId);
  },
});

// スタッフIDからスタッフ認証を取得
export const getByStaffId = query({
  args: {
    staffId: v.id('staff'),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.staffId, 'staffId');
    return await ctx.db
      .query('staff_auth')
      .withIndex('by_staff_id', (q) =>
        q.eq('staffId', args.staffId).eq('isArchive', args.includeArchive || false)
      )
      .first();
  },
});