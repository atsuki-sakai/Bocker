import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import {
  removeEmptyFields,
  archiveRecord,
  killRecord,
} from '@/services/convex/shared/utils/helper';
import { validateStaff, validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { throwConvexError } from '@/lib/error';
import { genderType } from '@/services/convex/shared/types/common';
// スタッフの追加
export const create = mutation({
  args: {
    salonId: v.id('salon'),
    clerkId: v.optional(v.string()),
    name: v.optional(v.string()),
    age: v.optional(v.number()),
    email: v.optional(v.string()),
    gender: v.optional(genderType),
    description: v.optional(v.string()),
    imgPath: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaff(args);

    // スタッフの存在確認
    const existingStaff = await ctx.db
      .query('staff')
      .withIndex('by_salon_id_email', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('email', args.email)
          .eq('isActive', true)
          .eq('isArchive', false)
      )
      .first();
    if (existingStaff) {
      throw throwConvexError({
        message: '指定されたメールアドレスのスタッフがすでに存在します',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたメールアドレスのスタッフがすでに存在します',
        callFunc: 'staff.core.create',
        severity: 'low',
        details: { ...existingStaff },
      });
    }

    return await ctx.db.insert('staff', {
      ...args,
      isActive: true,
      isArchive: false,
    });
  },
});

// スタッフ情報の更新
export const update = mutation({
  args: {
    staffId: v.id('staff'),
    name: v.optional(v.string()),
    age: v.optional(v.number()),
    email: v.optional(v.string()),
    gender: v.optional(genderType),
    description: v.optional(v.string()),
    imgPath: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaff(args);
    // スタッフの存在確認
    const staff = await ctx.db.get(args.staffId);
    if (!staff || staff.isArchive) {
      throw throwConvexError({
          message: '指定されたスタッフが存在しません',
          status: 404,
          code: 'NOT_FOUND',
          title: '指定されたスタッフが存在しません',
          callFunc: 'staff.core.update',
          severity: 'low',
          details: { ...args },
        });
    }

    const updateData = removeEmptyFields(args);
    // staffId はパッチ対象から削除する
    delete updateData.staffId;

    return await ctx.db.patch(args.staffId, updateData);
  },
});

// スタッフの削除
export const archive = mutation({
  args: {
    staffId: v.id('staff'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.staffId, 'staffId');
    return await archiveRecord(ctx, args.staffId);
  },
});

export const upsert = mutation({
  args: {
    staffId: v.id('staff'),
    salonId: v.id('salon'),
    name: v.optional(v.string()),
    age: v.optional(v.number()),
    email: v.optional(v.string()),
    gender: v.optional(genderType),
    description: v.optional(v.string()),
    imgPath: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaff(args);
    const existingStaff = await ctx.db.get(args.staffId);

    if (!existingStaff || existingStaff.isArchive) {
      return await ctx.db.insert('staff', {
        ...args,
        isArchive: false,
      });
    } else {
      const updateData = removeEmptyFields(args);
      delete updateData.staffId;
      delete updateData.salonId;
      return await ctx.db.patch(existingStaff._id, updateData);
    }
  },
});

export const killRelatedTables = mutation({
  args: {
    staffId: v.id('staff'),
    staffConfigId: v.id('staff_config'),
    staffAuthId: v.id('staff_auth'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);

    if (args.staffConfigId) {
      await killRecord(ctx, args.staffConfigId);
    }
    if (args.staffAuthId) {
      await killRecord(ctx, args.staffAuthId);
    }
    if (args.staffId) {
      await killRecord(ctx, args.staffId);
    }
    const staffWeekSchedules = await ctx.db
      .query('staff_week_schedule')
      .withIndex('by_staff_id', (q) => q.eq('staffId', args.staffId))
      .collect();

    await Promise.all(staffWeekSchedules.map((schedule) => killRecord(ctx, schedule._id)));

    const staffSchedules = await ctx.db
      .query('staff_schedule')
      .withIndex('by_staff_id', (q) => q.eq('staffId', args.staffId))
      .collect();
    await Promise.all(staffSchedules.map((schedule) => killRecord(ctx, schedule._id)));
    return {
      deletedStaffConfigId: args.staffConfigId,
      deletedStaffAuthId: args.staffAuthId,
      deletedStaffId: args.staffId,
    };
  },
});

export const removeImgPath = mutation({
  args: {
    staffId: v.id('staff'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.staffId, 'staffId');
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw throwConvexError({
        message: '指定されたスタッフが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたスタッフが存在しません',
        callFunc: 'staff.core.removeImgPath',
        severity: 'low',
        details: { ...args },
      });
    }
    const deletedStaffImage = await ctx.db.patch(args.staffId, {
      imgPath: undefined,
    });
    return {
      deletedStaffImage,
    };
  },
});
