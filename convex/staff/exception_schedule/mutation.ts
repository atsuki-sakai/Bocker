import { exceptionScheduleType } from '@/convex/types'
import { mutation } from '@/convex/_generated/server';

import { v } from 'convex/values';
import { createRecord, updateRecord, excludeFields, archiveRecord, killRecord } from '@/convex/utils/helpers';
import { checkAuth } from '@/convex/utils/auth';
import {
  validateRequired,
  validateDateStrToDate,
  validateStringLength
} from '@/convex/utils/validations';
import { MAX_NOTES_LENGTH } from '@/convex/constants';
import { ConvexError } from 'convex/values';
import { ERROR_SEVERITY, ERROR_STATUS_CODE } from '@/lib/errors/constants';


// スタッフスケジュール例外の追加
export const add = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
    date: v.string(), // YYYY-MM-DD
    start_time_unix: v.optional(v.number()), // ミリ秒のUNIX時間
    end_time_unix: v.optional(v.number()), // ミリ秒のUNIX時間
    notes: v.optional(v.string()), // 最大1000文字
    type: exceptionScheduleType, // holiday or other
    is_all_day: v.boolean(), // 終日かどうか
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    if (args.date) {
      validateDateStrToDate(args.date, 'date');
    }
    if (args.notes) {
      validateStringLength(args.notes, 'notes', MAX_NOTES_LENGTH);
    }

    // スタッフの存在確認
    const staff = await ctx.db.get(args.staff_id);
    if (!staff) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.exception_schedule.add',
        message: '指定されたスタッフが存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }

    // 組織の存在確認
    const org = await ctx.db.get(args.org_id);
    if (!org) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.exception_schedule.add',
        message: '指定された組織が存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }

    return await createRecord(ctx, 'staff_exception_schedule', args);
  },
});

// スタッフスケジュール例外情報の更新
export const update = mutation({
  args: {
    staff_exception_schedule_id: v.id('staff_exception_schedule'),
    date: v.string(),
    start_time_unix: v.optional(v.number()),
    end_time_unix: v.optional(v.number()),
    notes: v.optional(v.string()),
    type: exceptionScheduleType,
    is_all_day: v.boolean(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateDateStrToDate(args.date, 'date');
    validateStringLength(args.notes, 'notes', MAX_NOTES_LENGTH);
    // スタッフスケジュール例外の存在確認
    const staffExceptionSchedule = await ctx.db.get(args.staff_exception_schedule_id);
    if (!staffExceptionSchedule) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.exception_schedule.update',
        message: '指定されたスタッフスケジュール例外が存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }

    const updateData = excludeFields(args, ['staff_exception_schedule_id']);
    return await updateRecord(ctx, args.staff_exception_schedule_id, updateData);
  },
});

// スタッフスケジュール例外の削除
export const archive = mutation({
  args: {
    staff_exception_schedule_id: v.id('staff_exception_schedule'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await archiveRecord(ctx, args.staff_exception_schedule_id);
  },
});

export const upsert = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
    staff_exception_schedule_id: v.id('staff_exception_schedule'),
    date: v.string(),
    start_time_unix: v.optional(v.number()),
    end_time_unix: v.optional(v.number()),
    notes: v.optional(v.string()),
    type: exceptionScheduleType,
    is_all_day: v.boolean(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateDateStrToDate(args.date, 'date');
    validateStringLength(args.notes, 'notes', MAX_NOTES_LENGTH);
    const existingStaffExceptionSchedule = await ctx.db.get(args.staff_exception_schedule_id);

    if (!existingStaffExceptionSchedule || existingStaffExceptionSchedule.is_archive) {
      return await createRecord(ctx, 'staff_exception_schedule', args);
    } else {
      const updateData = excludeFields(args, ['staff_exception_schedule_id']);
      return await updateRecord(ctx, args.staff_exception_schedule_id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    staff_exception_schedule_id: v.id('staff_exception_schedule'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await killRecord(ctx, args.staff_exception_schedule_id);
  },
});

export const upsertSchedules = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
    dates: v.array(
      v.object({
        date: v.string(),
        start_time_unix: v.number(),
        end_time_unix: v.number(),
        notes: v.optional(v.string()),
        is_all_day: v.boolean(),
      })
    ),
    type: exceptionScheduleType,
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    args.dates.forEach((date) => {
      validateDateStrToDate(date.date, 'date');
      validateStringLength(date.notes, 'notes', MAX_NOTES_LENGTH);
    });

    const staff = await ctx.db.get(args.staff_id);
    if (!staff) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.exception_schedule.upsertSchedules',
        message: '指定されたスタッフが存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }
    const org = await ctx.db.get(args.org_id);
    if (!org) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.exception_schedule.upsertSchedules',
        message: '指定された組織が存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }

    // 引数に渡された日付のセットを作成
    const providedDates = new Set(args.dates.map((date) => date.date));

    // 既存のスケジュールを取得（isArchiveフラグに関わらず全て取得）
    const existingSchedules = await ctx.db
      .query('staff_exception_schedule')
      .withIndex('by_tenant_org_staff_date_archive', (q) =>
        q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('staff_id', args.staff_id)
      ).filter((q) => q.eq(q.field('is_archive'), false)).collect();

    // 引数に含まれていない日付のスケジュールを完全に削除
    await Promise.all(
      existingSchedules
        .filter((schedule) => !providedDates.has(schedule.date ?? ''))
        .map((schedule) => ctx.db.delete(schedule._id))
    );

    // 引数の日付に対してupsert処理
    await Promise.all(
      args.dates.map(async (date) => {
        // 既存のスケジュールを確認（isArchiveフラグに関わらず）
        const existingSchedule = await ctx.db
          .query('staff_exception_schedule')
          .withIndex('by_tenant_org_staff_date_archive', (q) =>
            q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('staff_id', args.staff_id).eq('date', date.date).eq('is_archive', false)
          )
          .first();

        if (existingSchedule) {
          // 既存のレコードを更新
          await updateRecord(ctx, existingSchedule._id, {
            start_time_unix: date.start_time_unix,
            end_time_unix: date.end_time_unix,
            type: args.type,
            notes: date.notes,
            is_all_day: date.is_all_day,
            is_archive: false, // 念のためisArchiveをfalseに設定
          });
        } else {
          // 新しいレコードを挿入
          await createRecord(ctx, 'staff_exception_schedule', {
            tenant_id: args.tenant_id,
            org_id: args.org_id,
            staff_id: args.staff_id,
            date: date.date,
            start_time_unix: date.start_time_unix,
            end_time_unix: date.end_time_unix,
            type: args.type,
            notes: date.notes,
            is_all_day: date.is_all_day
          });
        }
      })
    );
  },
});
