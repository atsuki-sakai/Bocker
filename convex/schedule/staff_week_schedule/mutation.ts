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
import { throwConvexError } from '@/lib/error';
import { DayOfWeek } from '@/services/convex/shared/types/common';
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
      throw throwConvexError({
        message: '指定されたスタッフが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたスタッフが存在しません',
        callFunc: 'schedule.staff_week_schedule.create',
        severity: 'low',
        details: { ...args },
      });
    }

    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      throw throwConvexError({
        message: '指定されたサロンが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたサロンが存在しません',
        callFunc: 'schedule.staff_week_schedule.create',
        severity: 'low',
        details: { ...args },
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
    checkAuth(ctx);
    validateStaffWeekSchedule(args);
    // スタッフスケジュールの存在確認
    const staffWeekSchedule = await ctx.db.get(args.staffWeekScheduleId);
    if (!staffWeekSchedule || staffWeekSchedule.isArchive) {
      throw throwConvexError({
        message: '指定されたスタッフスケジュールが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたスタッフスケジュールが存在しません',
        callFunc: 'schedule.staff_week_schedule.update',
        severity: 'low',
        details: { ...args },
      });
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

export const updateWeekSchedule = mutation({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
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
    const { salonId, staffId, scheduleSettings } = args;

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
      .query('staff_week_schedule')
      .withIndex('by_salon_id_staff_id', (q) =>
        q.eq('salonId', salonId).eq('staffId', staffId).eq('isArchive', false)
      )
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
          const newId = await ctx.db.insert('staff_week_schedule', {
            salonId,
            staffId,
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
        console.error(`${dayOfWeek}の更新中にエラー:`, error);
        throw throwConvexError({
          message: `StaffWeekSchedule スケジュール更新エラー: ${error}`,
          status: 500,
          code: 'UNEXPECTED_ERROR',
          title: 'StaffWeekSchedule スケジュール更新エラー',
          callFunc: 'schedule.staff_week_schedule.updateWeekSchedule',
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