import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { removeEmptyFields, archiveRecord, KillRecord } from '../shared/utils/helper';
import { validateSalonSchedule, validateRequired } from '../shared/utils/validation';
import { dayOfWeekType, DayOfWeek } from '../shared/types/common';
import { checkAuth } from '../shared/utils/auth';
import { ConvexCustomError } from '../shared/utils/error';
// サロンスケジュールの追加
export const add = mutation({
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
      throw new ConvexCustomError('low', '指定されたサロンが存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    return await ctx.db.insert('salon_week_schedule', {
      ...args,
      isArchive: false,
    });
  },
});

// サロンスケジュールの取得
export const get = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonId, 'salonId');
    return await ctx.db
      .query('salon_week_schedule')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .first();
  },
});

// サロンIDに基づいて全ての曜日スケジュールを取得
export const getAllBySalonId = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonId, 'salonId');
    return await ctx.db
      .query('salon_week_schedule')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .collect();
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
      throw new ConvexCustomError(
        'low',
        '指定されたサロンスケジュールが存在しません',
        'NOT_FOUND',
        404,
        {
          ...args,
        }
      );
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
    return await KillRecord(ctx, args.salonWeekScheduleId);
  },
});

// サロンIDと曜日と営業フラグからサロンスケジュールを取得
export const getBySalonWeekAndIsOpen = query({
  args: {
    salonId: v.id('salon'),
    dayOfWeek: v.optional(dayOfWeekType),
    isOpen: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalonSchedule(args);
    return await ctx.db
      .query('salon_week_schedule')
      .withIndex('by_salon_week_is_open_day_of_week', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('dayOfWeek', args.dayOfWeek)
          .eq('isOpen', args.isOpen)
          .eq('isArchive', false)
      )
      .first();
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

    // 曜日の一覧
    const dayKeys = Object.keys(scheduleSettings);
    const successResults: { day: string; action: string; id?: string }[] = [];

    // 保存処理の結果を格納する変数
    let savedCount = 0;

    // 曜日ごとにレコードを upsert (存在しなければ作成、あれば更新)
    for (const day of dayKeys) {
      const { isOpen, startHour, endHour } = scheduleSettings[day];

      // 有効な曜日かチェック
      if (
        !['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(
          day
        )
      ) {
        continue; // 無効な曜日はスキップ
      }

      const dayOfWeek = day as DayOfWeek;

      try {
        // 既存レコードがあるか確認 - インデックスは曜日のみで検索
        const existing = await ctx.db
          .query('salon_week_schedule')
          .withIndex('by_salon_id', (q) => q.eq('salonId', salonId).eq('isArchive', false))
          .first();

        if (existing) {
          // 既にレコードがある場合 → 更新
          await ctx.db.patch(existing._id, {
            isOpen,
            startHour,
            endHour,
          });

          // パッチ操作は結果を返さないので、直接結果を追加
          successResults.push({
            day: dayOfWeek,
            action: 'updated',
            id: existing._id,
          });
        } else {
          // レコードがない場合 → 新規作成
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
            action: 'created',
            id: newId,
          });
        }
      } catch (error) {
        throw new ConvexCustomError(
          'low',
          `サロンスケジュールの更新に失敗しました: ${error}`,
          'UNEXPECTED_ERROR',
          500,
          {
            ...args,
          }
        );
      }
    }

    return {
      success: true,
      count: savedCount,
      days: dayKeys.filter((day) =>
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(day)
      ),
      operations: successResults,
    };
  },
});
