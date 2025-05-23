import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { excludeFields, archiveRecord, killRecord, createRecord, updateRecord } from '@/convex/utils/helpers';
import { validateHourMinuteFormat, validateRequired } from '@/convex/utils/validations';
import { dayOfWeekType, DayOfWeek } from '@/convex/types';
import { checkAuth } from '@/convex/utils/auth';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';

// サロンスケジュールの追加
export const create = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    is_open: v.boolean(),
    day_of_week: dayOfWeekType,
    start_hour: v.string(),
    end_hour: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.org_id, 'org_id');
    validateHourMinuteFormat(args.start_hour, 'start_hour');
    validateHourMinuteFormat(args.end_hour, 'end_hour');

    // サロンの存在確認
    const org = await ctx.db.query('organization')
    .withIndex('by_tenant_org_archive', q => 
      q.eq('tenant_id', args.tenant_id)
       .eq('org_id', args.org_id)
       .eq('is_archive', false)
    )
    .first();
    if (!org) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'schedule.week_schedule.create',
        message: '指定されたサロンが存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: { ...args },
      });
    }

    return await createRecord(ctx, 'week_schedule', args);
  },
});

// サロンスケジュールの更新
export const update = mutation({
  args: {
    week_schedule_id: v.id('week_schedule'),
    is_open: v.boolean(),
    day_of_week: dayOfWeekType,
    start_hour: v.string(),
    end_hour: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateHourMinuteFormat(args.start_hour, 'start_hour');
    validateHourMinuteFormat(args.end_hour, 'end_hour');
    // サロンスケジュールの存在確認
    const weekSchedule = await ctx.db.get(args.week_schedule_id);
    if (!weekSchedule) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'schedule.week_schedule.update',
        message: '指定されたサロンスケジュールが存在しません',
        code: 'NOT_FOUND',
        status: 404,
        details: { ...args },
      });
    }

    const updateData = excludeFields(args, ['week_schedule_id']);

    return await updateRecord(ctx, args.week_schedule_id, updateData);
  },
});

// サロンスケジュールの削除
export const archive = mutation({
  args: {
    week_schedule_id: v.id('week_schedule'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await archiveRecord(ctx, args.week_schedule_id);
  },
});

export const upsert = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    is_open: v.boolean(),
    day_of_week: dayOfWeekType,
    start_hour: v.string(),
    end_hour: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.org_id, 'org_id');
    validateHourMinuteFormat(args.start_hour, 'start_hour');
    validateHourMinuteFormat(args.end_hour, 'end_hour');
    const existingWeekSchedule = await ctx.db.query('week_schedule')
    .withIndex('by_tenant_org_week_archive', q =>
      q.eq('tenant_id', args.tenant_id)
       .eq('org_id', args.org_id)
       .eq('day_of_week', args.day_of_week)
       .eq('is_archive', false)
    )
    .first();

    if (!existingWeekSchedule) {
      return await createRecord(ctx, 'week_schedule', args);
    } else {
      const updateData = excludeFields(args, ['tenant_id', 'org_id']);
      return await updateRecord(ctx, existingWeekSchedule._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    week_schedule_id: v.id('week_schedule'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await killRecord(ctx, args.week_schedule_id);
  },
});

export const updateWeekSchedule = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
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
    
    validateRequired(args.org_id, 'org_id');

    const { tenant_id, org_id, schedule_settings } = args;

    // 曜日の一覧と有効な曜日タイプの定義
    const day_keys: string[] = Object.keys(schedule_settings);
    const valid_days: DayOfWeek[] = [
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
      .query('week_schedule')
      .withIndex('by_tenant_org_archive', (q) => q.eq('tenant_id', tenant_id).eq('org_id', org_id).eq('is_archive', false))
      .collect();

    // 曜日ごとのマップを作成 - 型を明示的に指定
    const scheduleByDay: Record<DayOfWeek, any> = {} as Record<DayOfWeek, any>;

    existingSchedules.forEach((schedule) => {
      if (schedule.day_of_week && valid_days.includes(schedule.day_of_week as DayOfWeek)) {
        scheduleByDay[schedule.day_of_week as DayOfWeek] = schedule;
      }
    });

    // 各曜日のスケジュールを処理
    for (const day of day_keys) {
      // 不正な曜日はスキップ
      if (!valid_days.includes(day as DayOfWeek)) {
        continue;
      }

      const day_of_week: DayOfWeek = day as DayOfWeek;
      const { is_open, start_hour, end_hour } = schedule_settings[day];

      try {
        const existingSchedule = scheduleByDay[day_of_week];

        if (existingSchedule) {
          // 既存のレコードを更新
          await ctx.db.patch(existingSchedule._id, {
            is_open,
            start_hour,
            end_hour,
          });

          successResults.push({
            day: day_of_week,
            action: '更新',
            id: existingSchedule._id,
          });
        } else {
          // 新しいレコードを作成
          const newId = await createRecord(ctx, 'week_schedule', {
            tenant_id,
            org_id,
            day_of_week,
            is_open,
            start_hour,
            end_hour,
          });

          successResults.push({
            day: day_of_week,
            action: '作成',
            id: newId,
          });
        }

        savedCount++;
      } catch (error) {
        throw new ConvexError({
          statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'schedule.week_schedule.updateWeekSchedule',
          message: 'サロンスケジュールの更新中にエラーが発生しました',
          code: 'INTERNAL_SERVER_ERROR',
          status: 500,
          details: {
            ...args,
          },
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
