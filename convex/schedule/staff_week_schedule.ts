import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { removeEmptyFields, trashRecord, KillRecord, authCheck } from '../helpers';
import { CONVEX_ERROR_CODES } from '../constants';
import { dayOfWeekType } from '../types';
import { validateStaffWeekSchedule } from '../validators';

// スタッフスケジュールの追加
export const add = mutation({
  args: {
    staffId: v.id('staff'),
    salonId: v.id('salon'),
    dayOfWeek: v.optional(dayOfWeekType),
    startHour: v.optional(v.string()),
    endHour: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateStaffWeekSchedule(args);
    // スタッフの存在確認
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      console.error('AddStaffWeekSchedule: 指定されたスタッフが存在しません', { ...args });
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

    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      console.error('AddStaffWeekSchedule: 指定されたサロンが存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたサロンが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonId: args.salonId,
        },
      });
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
    authCheck(ctx);
    validateStaffWeekSchedule(args);
    // スタッフスケジュールの存在確認
    const staffWeekSchedule = await ctx.db.get(args.staffWeekScheduleId);
    if (!staffWeekSchedule || staffWeekSchedule.isArchive) {
      console.error('UpdateStaffWeekSchedule: 指定されたスタッフスケジュールが存在しません', {
        ...args,
      });
      throw new ConvexError({
        message: '指定されたスタッフスケジュールが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          staffWeekScheduleId: args.staffWeekScheduleId,
        },
      });
    }

    const updateData = removeEmptyFields(args);
    // staffWeekScheduleId はパッチ対象から削除する
    delete updateData.staffWeekScheduleId;
    return await ctx.db.patch(args.staffWeekScheduleId, updateData);
  },
});

// スタッフスケジュールの削除
export const trash = mutation({
  args: {
    staffScheduleId: v.id('staff_schedule'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // スタッフスケジュールの存在確認
    const staffSchedule = await ctx.db.get(args.staffScheduleId);
    if (!staffSchedule) {
      console.error('TrashStaffWeekSchedule: 指定されたスタッフスケジュールが存在しません', {
        ...args,
      });
      throw new ConvexError({
        message: '指定されたスタッフスケジュールが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          staffScheduleId: args.staffScheduleId,
        },
      });
    }
    return await trashRecord(ctx, staffSchedule._id);
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
    authCheck(ctx);
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
      return await ctx.db.patch(existingStaffSchedule._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    staffScheduleId: v.id('staff_schedule'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await KillRecord(ctx, args.staffScheduleId);
  },
});

// サロンIDとスタッフIDと曜日からスタッフスケジュールを取得
export const getBySalonStaffAndWeek = query({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
    dayOfWeek: dayOfWeekType,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('staff_week_schedule')
      .withIndex('by_salon_staff_week_is_open', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('staffId', args.staffId)
          .eq('dayOfWeek', args.dayOfWeek)
          .eq('isOpen', true)
          .eq('isArchive', false)
      );
  },
});
