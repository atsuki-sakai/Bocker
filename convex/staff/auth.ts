import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { removeEmptyFields, trashRecord, KillRecord, authCheck } from '../helpers';
import { CONVEX_ERROR_CODES } from '../constants';
import { validateStaffAuth } from '../validators';
import { staffRoleType } from '../types';

// スタッフ認証の追加
export const add = mutation({
  args: {
    staffId: v.id('staff'),
    pinCode: v.optional(v.string()),
    hashPinCode: v.optional(v.string()),
    role: v.optional(staffRoleType),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateStaffAuth(args);
    // スタッフの存在確認
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      console.error('AddStaffAuth: 指定されたスタッフが存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたスタッフが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          staffId: args.staffId,
        },
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
    role: v.optional(staffRoleType),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateStaffAuth(args);
    // スタッフ認証の存在確認
    const staffAuth = await ctx.db.get(args.staffAuthId);
    if (!staffAuth || staffAuth.isArchive) {
      console.error('UpdateStaffAuth: 指定されたスタッフ認証が存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたスタッフ認証が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          staffAuthId: args.staffAuthId,
        },
      });
    }

    const updateData = removeEmptyFields(args);
    // staffAuthId はパッチ対象から削除する
    delete updateData.staffAuthId;

    return await ctx.db.patch(args.staffAuthId, updateData);
  },
});

// スタッフ認証の削除
export const trash = mutation({
  args: {
    staffAuthId: v.id('staff_auth'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // スタッフ認証の存在確認
    const staffAuth = await ctx.db.get(args.staffAuthId);
    if (!staffAuth) {
      console.error('TrashStaffAuth: 指定されたスタッフ認証が存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたスタッフ認証が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          staffAuthId: args.staffAuthId,
        },
      });
    }

    return await trashRecord(ctx, staffAuth._id);
  },
});

export const upsert = mutation({
  args: {
    staffAuthId: v.id('staff_auth'),
    staffId: v.id('staff'),
    pinCode: v.optional(v.string()),
    hashPinCode: v.optional(v.string()),
    role: v.optional(staffRoleType),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
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
    authCheck(ctx);
    return await KillRecord(ctx, args.staffAuthId);
  },
});

// スタッフIDからスタッフ認証を取得
export const getByStaffId = query({
  args: {
    staffId: v.id('staff'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('staff_auth')
      .withIndex('by_staff_id', (q) => q.eq('staffId', args.staffId).eq('isArchive', false))
      .first();
  },
});