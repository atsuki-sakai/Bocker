import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import {
  handleConvexApiError,
  removeEmptyFields,
  trashRecord,
  KillRecord,
  authCheck,
} from '../helpers';
import { CONVEX_ERROR_CODES } from '../constants';
import { staffScheduleType } from '../types';
import { validateStaffScheduleException } from '../validators';

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
    authCheck(ctx);
    validateStaffScheduleException(args);
    // スタッフの存在確認
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      console.error('AddStaffScheduleException: 指定されたスタッフが存在しません', { ...args });
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
      console.error('AddStaffScheduleException: 指定されたサロンが存在しません', { ...args });
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
    authCheck(ctx);
    validateStaffScheduleException(args);
    // スタッフスケジュール例外の存在確認
    const staffSchedule = await ctx.db.get(args.staffScheduleId);
    if (!staffSchedule || staffSchedule.isArchive) {
      console.error(
        'UpdateStaffScheduleException: 指定されたスタッフスケジュール例外が存在しません',
        {
          ...args,
        }
      );
      throw new ConvexError({
        message: '指定されたスタッフスケジュール例外が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          staffScheduleId: args.staffScheduleId,
        },
      });
    }

    const updateData = removeEmptyFields(args);
    // staffScheduleExceptionId はパッチ対象から削除する
    delete updateData.staffScheduleId;
    return await ctx.db.patch(args.staffScheduleId, updateData);
  },
});

// スタッフスケジュール例外の削除
export const trash = mutation({
  args: {
    staffScheduleId: v.id('staff_schedule'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // スタッフスケジュール例外の存在確認
    const staffSchedule = await ctx.db.get(args.staffScheduleId);
    if (!staffSchedule) {
      console.error(
        'TrashStaffScheduleException: 指定されたスタッフスケジュール例外が存在しません',
        {
          ...args,
        }
      );
      throw new ConvexError({
        message: '指定されたスタッフスケジュール例外が存在しません',
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
    date: v.optional(v.string()),
    startTime_unix: v.optional(v.number()),
    endTime_unix: v.optional(v.number()),
    notes: v.optional(v.string()),
    type: v.optional(staffScheduleType),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
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
    // スタッフスケジュール例外の存在確認
    const staffSchedule = await ctx.db.get(args.staffScheduleId);
    if (!staffSchedule) {
      console.error(
        'KillStaffScheduleException: 指定されたスタッフスケジュール例外が存在しません',
        {
          ...args,
        }
      );
      throw new ConvexError({
        message: '指定されたスタッフスケジュール例外が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          staffScheduleId: args.staffScheduleId,
        },
      });
    }
    return await KillRecord(ctx, args.staffScheduleId);
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
    authCheck(ctx);
    return await ctx.db
      .query('staff_schedule')
      .withIndex('by_salon_staff_date', (q) =>
        q.eq('salonId', args.salonId).eq('staffId', args.staffId).eq('date', args.date)
      )
      .first();
  },
});