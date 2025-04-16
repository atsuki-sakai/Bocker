import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import {
  removeEmptyFields,
  archiveRecord,
  killRecord,
} from '@/services/convex/shared/utils/helper';
import {
  validateStaffWeekSchedule,
  validateRequired,
} from '@/services/convex/shared/utils/validation';
import { dayOfWeekType } from '@/services/convex/shared/types/common';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';

// スタッフスケジュールの追加
export const create = mutation({
  args: {
    staffId: v.id('staff'),
    salonId: v.id('salon'),
    dayOfWeek: v.optional(dayOfWeekType),
    startHour: v.optional(v.string()),
    endHour: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaffWeekSchedule(args);
    // スタッフの存在確認
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      const err = new ConvexCustomError(
        'low',
        '指定されたスタッフが存在しません',
        'NOT_FOUND',
        404,
        {
          ...args,
        }
      );
      throw err;
    }

    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      const err = new ConvexCustomError('low', '指定されたサロンが存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
      throw err;
    }

    return await ctx.db.insert('staff_schedule', {
      ...args,
      isArchive: false,
    });
  },
});

// スタッフスケジュール情報の更新
export const update = mutation({
  args: {
    staffWeekScheduleId: v.id('staff_week_schedule'),
    dayOfWeek: v.optional(dayOfWeekType),
    startHour: v.optional(v.string()),
    endHour: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaffWeekSchedule(args);
    // スタッフスケジュールの存在確認
    const staffWeekSchedule = await ctx.db.get(args.staffWeekScheduleId);
    if (!staffWeekSchedule || staffWeekSchedule.isArchive) {
      const err = new ConvexCustomError(
        'low',
        '指定されたスタッフスケジュールが存在しません',
        'NOT_FOUND',
        404,
        {
          ...args,
        }
      );
      throw err;
    }

    const updateData = removeEmptyFields(args);
    // staffWeekScheduleId はパッチ対象から削除する
    delete updateData.staffWeekScheduleId;
    return await ctx.db.patch(args.staffWeekScheduleId, updateData);
  },
});

// スタッフスケジュールの削除
export const archive = mutation({
  args: {
    staffScheduleId: v.id('staff_schedule'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.staffScheduleId, 'staffScheduleId');
    return await archiveRecord(ctx, args.staffScheduleId);
  },
});

export const upsert = mutation({
  args: {
    staffScheduleId: v.id('staff_schedule'),
    staffId: v.id('staff'),
    salonId: v.id('salon'),
    dayOfWeek: v.optional(dayOfWeekType),
    startHour: v.optional(v.string()),
    endHour: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaffWeekSchedule(args);
    const existingStaffSchedule = await ctx.db.get(args.staffScheduleId);

    if (!existingStaffSchedule || existingStaffSchedule.isArchive) {
      return await ctx.db.insert('staff_schedule', {
        ...args,
        isArchive: false,
      });
    } else {
      const updateData = removeEmptyFields(args);
      delete updateData.staffScheduleId;
      delete updateData.staffId;
      delete updateData.salonId;
      return await ctx.db.patch(existingStaffSchedule._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    staffScheduleId: v.id('staff_schedule'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.staffScheduleId, 'staffScheduleId');
    return await killRecord(ctx, args.staffScheduleId);
  },
});
