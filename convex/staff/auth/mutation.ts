import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import {
  removeEmptyFields,
  archiveRecord,
  killRecord,
} from '@/services/convex/shared/utils/helper';
import { validateStaffAuth, validateRequired } from '@/services/convex/shared/utils/validation';
import { roleType } from '@/services/convex/shared/types/common';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { throwConvexError } from '@/lib/error';

// スタッフ認証の追加
export const create = mutation({
  args: {
    staffId: v.id('staff'),
    role: v.optional(roleType),
    pinCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaffAuth(args);
    // スタッフ認証の存在確認
    const staffAuth = await ctx.db
      .query('staff_auth')
      .withIndex('by_staff_id', (q) => q.eq('staffId', args.staffId))
      .first();
    if (staffAuth) {
      throw throwConvexError({
        message: '指定されたスタッフ認証が存在します',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたスタッフ認証が存在します',
        callFunc: 'staff.auth.create',
        severity: 'low',
        details: { ...args, ...staffAuth },
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

    role: v.optional(roleType),
    pinCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaffAuth(args);
    // スタッフ認証の存在確認
    const staffAuth = await ctx.db.get(args.staffAuthId);
    if (!staffAuth || staffAuth.isArchive) {
      throw throwConvexError({
        message: '指定されたスタッフ認証が存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたスタッフ認証が存在しません',
        callFunc: 'staff.auth.update',
        severity: 'low',
        details: { ...args },
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

    role: v.optional(roleType),
    pinCode: v.optional(v.string()),
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
    return await killRecord(ctx, args.staffAuthId);
  },
});
