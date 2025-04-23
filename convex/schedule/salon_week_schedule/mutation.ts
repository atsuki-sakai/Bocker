import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import {
  removeEmptyFields,
  archiveRecord,
  killRecord,
} from '@/services/convex/shared/utils/helper';
import { validateSalonSchedule, validateRequired } from '@/services/convex/shared/utils/validation';
import { dayOfWeekType, DayOfWeek } from '@/services/convex/shared/types/common';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { throwConvexError } from '@/lib/error';
// サロンスケジュールの追加
export const create = mutation({
  args: {
    salonId: v.id('salon'),
    isOpen: v.optional(v.boolean()),
    dayOfWeek: v.optional(dayOfWeekType),
    startHour: v.optional(v.string()),
    endHour: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalonSchedule(args);
    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      throw throwConvexError({
        message: '指定されたサロンが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたサロンが存在しません',
        callFunc: 'schedule.salon_week_schedule.create',
        severity: 'low',
        details: { ...args },
      });
    }

    return await ctx.db.insert('salon_week_schedule', {
      ...args,
      isArchive: false,
    });
  },
});

// サロンスケジュールの更新
export const update = mutation({
  args: {
    salonWeekScheduleId: v.id('salon_week_schedule'),
    isOpen: v.optional(v.boolean()),
    dayOfWeek: v.optional(dayOfWeekType),
    startHour: v.optional(v.string()),
    endHour: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalonSchedule(args);
    // サロンスケジュールの存在確認
    const salonWeekSchedule = await ctx.db.get(args.salonWeekScheduleId);
    if (!salonWeekSchedule) {
      throw throwConvexError({
        message: '指定されたサロンスケジュールが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたサロンスケジュールが存在しません',
        callFunc: 'schedule.salon_week_schedule.update',
        severity: 'low',
        details: { ...args },
      });
    }

    const updateData = removeEmptyFields(args);
    // salonWeekScheduleId はパッチ対象から削除する
    delete updateData.salonWeekScheduleId;

    return await ctx.db.patch(args.salonWeekScheduleId, updateData);
  },
});

// サロンスケジュールの削除
export const archive = mutation({
  args: {
    salonWeekScheduleId: v.id('salon_week_schedule'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonWeekScheduleId, 'salonWeekScheduleId');
    return await archiveRecord(ctx, args.salonWeekScheduleId);
  },
});

export const upsert = mutation({
  args: {
    salonWeekScheduleId: v.id('salon_week_schedule'),
    salonId: v.id('salon'),
    isOpen: v.optional(v.boolean()),
    dayOfWeek: v.optional(dayOfWeekType),
    startHour: v.optional(v.string()),
    endHour: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalonSchedule(args);
    const existingSalonWeekSchedule = await ctx.db.get(args.salonWeekScheduleId);

    if (!existingSalonWeekSchedule) {
      return await ctx.db.insert('salon_week_schedule', {
        ...args,
        isArchive: false,
      });
    } else {
      const updateData = removeEmptyFields(args);
      delete updateData.salonWeekScheduleId;
      delete updateData.salonId;
      return await ctx.db.patch(existingSalonWeekSchedule._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    salonWeekScheduleId: v.id('salon_week_schedule'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonWeekScheduleId, 'salonWeekScheduleId');
    return await killRecord(ctx, args.salonWeekScheduleId);
  },
});

export const updateWeekSchedule = mutation({
  args: {
    salonId: v.id('salon'),
    scheduleSettings: v.record(
      v.string(),
      v.object({
        isOpen: v.boolean(),
        startHour: v.string(),
        endHour: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    const { salonId, scheduleSettings } = args;

    // 曜日の一覧と有効な曜日タイプの定義
    const dayKeys: string[] = Object.keys(scheduleSettings);
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
      .query('salon_week_schedule')
      .withIndex('by_salon_id', (q) => q.eq('salonId', salonId).eq('isArchive', false))
      .collect();

    // 曜日ごとのマップを作成 - 型を明示的に指定
    const scheduleByDay: Record<DayOfWeek, any> = {} as Record<DayOfWeek, any>;

    existingSchedules.forEach((schedule) => {
      if (schedule.dayOfWeek && validDays.includes(schedule.dayOfWeek as DayOfWeek)) {
        scheduleByDay[schedule.dayOfWeek as DayOfWeek] = schedule;
      }
    });

    // 各曜日のスケジュールを処理
    for (const day of dayKeys) {
      // 不正な曜日はスキップ
      if (!validDays.includes(day as DayOfWeek)) {
        continue;
      }

      const dayOfWeek: DayOfWeek = day as DayOfWeek;
      const { isOpen, startHour, endHour } = scheduleSettings[day];

      try {
        const existingSchedule = scheduleByDay[dayOfWeek];

        if (existingSchedule) {
          // 既存のレコードを更新
          await ctx.db.patch(existingSchedule._id, {
            isOpen,
            startHour,
            endHour,
          });

          successResults.push({
            day: dayOfWeek,
            action: '更新',
            id: existingSchedule._id,
          });
        } else {
          // 新しいレコードを作成
          const newId = await ctx.db.insert('salon_week_schedule', {
            salonId,
            dayOfWeek,
            isOpen,
            startHour,
            endHour,
            isArchive: false,
          });

          successResults.push({
            day: dayOfWeek,
            action: '作成',
            id: newId,
          });
        }

        savedCount++;
      } catch (error) {
        throw throwConvexError({
          message: `スケジュール更新エラー: ${error}`,
          status: 500,
          code: 'UNEXPECTED_ERROR',
          title: 'スケジュール更新エラー',
          callFunc: 'schedule.salon_week_schedule.updateWeekSchedule',
          severity: 'low',
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
