import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import {
  createRecord,
  updateRecord,
  removeEmptyFields,
  archiveRecord,
  killRecord,
} from '@/convex/utils/helpers';
import {
  validateRequired,
  validateHourMinuteFormat
} from '@/convex/utils/validations';
import { dayOfWeekType } from '@/convex/types';
import { checkAuth } from '@/convex/utils/auth';
import { ConvexError } from 'convex/values';
import { ERROR_SEVERITY, ERROR_STATUS_CODE } from '@/lib/errors/constants';
import { DayOfWeek } from '@/convex/types';


// スタッフスケジュールの追加
export const create = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
    day_of_week: dayOfWeekType,
    start_hour: v.string(),
    end_hour: v.string(),
    is_open: v.boolean(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);

    validateHourMinuteFormat(args.start_hour, 'start_hour');
    validateHourMinuteFormat(args.end_hour, 'end_hour');

    // スタッフの存在確認
    const staff = await ctx.db.get(args.staff_id);
    if (!staff) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.week_schedule.create',
        message: '指定されたスタッフが存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }

    // サロンの存在確認
    const org = await ctx.db.get(args.org_id);
    if (!org) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.week_schedule.create',
        message: '指定された組織が存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }
    return await createRecord(ctx, 'staff_week_schedule', args);
  },
});

// スタッフスケジュール情報の更新
export const update = mutation({
  args: {
    staff_week_schedule_id: v.id('staff_week_schedule'),
    day_of_week: dayOfWeekType,
    start_hour: v.string(),
    end_hour: v.string(),
    is_open: v.boolean(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);

    validateHourMinuteFormat(args.start_hour, 'start_hour');
    validateHourMinuteFormat(args.end_hour, 'end_hour');

    // スタッフスケジュールの存在確認
    const staffWeekSchedule = await ctx.db.get(args.staff_week_schedule_id);
    if (!staffWeekSchedule || staffWeekSchedule.is_archive) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.week_schedule.update',
        message: '指定されたスタッフスケジュールが存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }

    const updateData = removeEmptyFields(args);
    // staffWeekScheduleId はパッチ対象から削除する
    delete updateData.staff_week_schedule_id;
    return await updateRecord(ctx, args.staff_week_schedule_id, updateData);
  },
});

// スタッフスケジュールの削除
export const archive = mutation({
  args: {
    staff_week_schedule_id: v.id('staff_week_schedule'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.staff_week_schedule_id, 'staff_week_schedule_id');
    return await archiveRecord(ctx, args.staff_week_schedule_id);
  },
});

export const upsert = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
    staff_week_schedule_id: v.id('staff_week_schedule'),
    day_of_week: dayOfWeekType,
    start_hour: v.string(),
    end_hour: v.string(),
    is_open: v.boolean(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);

    validateHourMinuteFormat(args.start_hour, 'start_hour');
    validateHourMinuteFormat(args.end_hour, 'end_hour');

    const existingStaffSchedule = await ctx.db.get(args.staff_week_schedule_id);

    if (!existingStaffSchedule || existingStaffSchedule.is_archive) {
      return await createRecord(ctx, 'staff_week_schedule', args);
    } else {
      const updateData = removeEmptyFields(args);
      delete updateData.staff_week_schedule_id;
      delete updateData.staff_id;
      delete updateData.tenant_id;
      return await updateRecord(ctx, args.staff_week_schedule_id, updateData);
    }
  },
}); 

export const kill = mutation({
  args: {
    staff_week_schedule_id: v.id('staff_week_schedule'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await killRecord(ctx, args.staff_week_schedule_id);
  },
});

export const updateWeekSchedule = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
    schedule_settings: v.record(
      v.string(),
      v.object({
        is_open: v.boolean(),
        start_hour: v.string(),
        end_hour: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    const { tenant_id, org_id, staff_id, schedule_settings } = args;

    // 曜日の一覧と有効な曜日タイプの定義
    const dayKeys: string[] = Object.keys(schedule_settings);
    const validDays: DayOfWeek[] = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];
    const successResults: { day: string; action: string; id?: string }[] = [];
    let savedCount: number = 0;

    // 既存のスケジュールを取得
    const existingSchedules = await ctx.db
      .query('staff_week_schedule')
      .withIndex('by_tenant_org_staff_archive', (q) =>
        q.eq('tenant_id', tenant_id).eq('org_id', org_id).eq('staff_id', staff_id).eq('is_archive', false)
      )
      .collect();

    // 曜日ごとのマップを作成 - 型を明示的に指定
    const scheduleByDay: Record<DayOfWeek, any> = {} as Record<DayOfWeek, any>;

    existingSchedules.forEach((schedule) => {
      if (schedule.day_of_week && validDays.includes(schedule.day_of_week as DayOfWeek)) {
        scheduleByDay[schedule.day_of_week as DayOfWeek] = schedule;
      }
    });

    // 各曜日のスケジュールを処理
    for (const day of dayKeys) {
      // 不正な曜日はスキップ
      if (!validDays.includes(day as DayOfWeek)) {
        continue;
      }

      const dayOfWeek: DayOfWeek = day as DayOfWeek;
      const { is_open, start_hour, end_hour } = schedule_settings[day];

      try {
        const existingSchedule = scheduleByDay[dayOfWeek];

        if (existingSchedule) {
          // 既存のレコードを更新
          await ctx.db.patch(existingSchedule._id, {
            is_open,
            start_hour,
            end_hour,
          });

          successResults.push({
            day: dayOfWeek,
            action: '更新',
            id: existingSchedule._id,
          });
        } else {
          // 新しいレコードを作成
          const newId = await createRecord(ctx, 'staff_week_schedule', {
            tenant_id,
            org_id,
            staff_id,
            day_of_week: dayOfWeek,
            is_open,
            start_hour,
            end_hour
          });

          successResults.push({
            day: dayOfWeek,
            action: '作成',
            id: newId,
          });
        }

        savedCount++;
      } catch (error) {
        console.error(`${dayOfWeek}の更新中にエラー:`, error);
        throw new ConvexError({
          message: `StaffWeekSchedule スケジュール更新エラー: ${error}`,
          statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'staff.week_schedule.updateWeekSchedule',
          code: 'UNEXPECTED_ERROR',
          status: 500,
          details: { day: dayOfWeek, error: error as string },
        });
      }
    }

    return {
      success: true,
      count: savedCount,
      operations: successResults,
    };
  },
});