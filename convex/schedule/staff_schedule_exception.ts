import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import {
  removeEmptyFields,
  archiveRecord,
  killRecord,
} from '@/services/convex/shared/utils/helper';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { staffScheduleType } from '@/services/convex/shared/types/common';
import {
  validateStaffScheduleException,
  validateRequired,
} from '@/services/convex/shared/utils/validation';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';

// スタッフスケジュール例外の追加
export const add = mutation({
  args: {
    staffId: v.id('staff'),
    salonId: v.id('salon'),
    date: v.optional(v.string()),
    startTime_unix: v.optional(v.number()),
    endTime_unix: v.optional(v.number()),
    notes: v.optional(v.string()),
    type: v.optional(staffScheduleType),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaffScheduleException(args);
    // スタッフの存在確認
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new ConvexCustomError('low', '指定されたスタッフが存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      throw new ConvexCustomError('low', '指定されたサロンが存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    return await ctx.db.insert('staff_schedule', {
      ...args,
      isArchive: false,
    });
  },
});

// スタッフスケジュール例外情報の更新
export const update = mutation({
  args: {
    staffScheduleId: v.id('staff_schedule'),
    date: v.optional(v.string()),
    startTime_unix: v.optional(v.number()),
    endTime_unix: v.optional(v.number()),
    notes: v.optional(v.string()),
    type: v.optional(staffScheduleType),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaffScheduleException(args);
    // スタッフスケジュール例外の存在確認
    const staffSchedule = await ctx.db.get(args.staffScheduleId);
    if (!staffSchedule || staffSchedule.isArchive) {
      throw new ConvexCustomError(
        'low',
        '指定されたスタッフスケジュール例外が存在しません',
        'NOT_FOUND',
        404,
        {
          ...args,
        }
      );
    }

    const updateData = removeEmptyFields(args);
    // staffScheduleExceptionId はパッチ対象から削除する
    delete updateData.staffScheduleId;
    return await ctx.db.patch(args.staffScheduleId, updateData);
  },
});

// スタッフスケジュール例外の削除
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
    date: v.optional(v.string()),
    startTime_unix: v.optional(v.number()),
    endTime_unix: v.optional(v.number()),
    notes: v.optional(v.string()),
    type: v.optional(staffScheduleType),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaffScheduleException(args);
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

// サロンIDとスタッフIDと日付からスタッフスケジュール例外を取得
export const getBySalonStaffAndDate = query({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaffScheduleException(args);
    return await ctx.db
      .query('staff_schedule')
      .withIndex('by_salon_staff_date', (q) =>
        q.eq('salonId', args.salonId).eq('staffId', args.staffId).eq('date', args.date)
      )
      .first();
  },
});
