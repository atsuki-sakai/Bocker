import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from '../helpers';
import { ERROR_CODES } from '../errors';
import { Doc } from '../_generated/dataModel';

// サロンスケジュールのバリデーション
function validateSalonSchedule(args: Partial<Doc<'salon_week_schedule'>>) {
  if (args.startHour && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(args.startHour)) {
    throw new ConvexError({
      message: '開始時間は「HH:MM」形式で入力してください',
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }
  if (args.endHour && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(args.endHour)) {
    throw new ConvexError({
      message: '終了時間は「HH:MM」形式で入力してください',
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }
}

// サロンスケジュールの追加
export const add = mutation({
  args: {
    salonId: v.id('salon'),
    isOpen: v.optional(v.boolean()),
    dayOfWeek: v.optional(
      v.union(
        v.literal('sunday'),
        v.literal('monday'),
        v.literal('tuesday'),
        v.literal('wednesday'),
        v.literal('thursday'),
        v.literal('friday'),
        v.literal('saturday')
      )
    ),
    startHour: v.optional(v.string()),
    endHour: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // サロンの存在確認
      const salon = await ctx.db.get(args.salonId);
      if (!salon) {
        console.error('指定されたサロンが存在しません', args.salonId);
        throw new ConvexError({
          message: '指定されたサロンが存在しません',
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      validateSalonSchedule(args);
      const salonScheduleId = await ctx.db.insert('salon_week_schedule', {
        ...args,
        isArchive: false,
      });
      return salonScheduleId;
    } catch (error) {
      handleConvexApiError(
        'サロンスケジュールの追加に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

// サロンスケジュールの取得
export const get = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('salon_week_schedule')
      .withIndex('by_salon', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .first();
  },
});

// サロンIDに基づいて全ての曜日スケジュールを取得
export const getAllBySalonId = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('salon_week_schedule')
      .withIndex('by_salon', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .collect();
  },
});

// サロンスケジュールの更新
export const update = mutation({
  args: {
    salonWeekScheduleId: v.id('salon_week_schedule'),
    isOpen: v.optional(v.boolean()),
    dayOfWeek: v.optional(
      v.union(
        v.literal('sunday'),
        v.literal('monday'),
        v.literal('tuesday'),
        v.literal('wednesday'),
        v.literal('thursday'),
        v.literal('friday'),
        v.literal('saturday')
      )
    ),
    startHour: v.optional(v.string()),
    endHour: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // サロンスケジュールの存在確認
      const salonWeekSchedule = await ctx.db.get(args.salonWeekScheduleId);
      if (!salonWeekSchedule || salonWeekSchedule.isArchive) {
        throw new ConvexError({
          message: '指定されたサロンスケジュールが存在しません',
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // salonWeekScheduleId はパッチ対象から削除する
      delete updateData.salonWeekScheduleId;

      validateSalonSchedule(updateData);

      const newSalonWeekScheduleId = await ctx.db.patch(args.salonWeekScheduleId, updateData);
      return newSalonWeekScheduleId;
    } catch (error) {
      handleConvexApiError(
        'サロンスケジュールの更新に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

// サロンスケジュールの削除
export const trash = mutation({
  args: {
    salonWeekScheduleId: v.id('salon_week_schedule'),
  },
  handler: async (ctx, args) => {
    try {
      // サロンスケジュールの存在確認
      const salonWeekSchedule = await ctx.db.get(args.salonWeekScheduleId);
      if (!salonWeekSchedule) {
        throw new ConvexError({
          message: '指定されたサロンスケジュールが存在しません',
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      await trashRecord(ctx, salonWeekSchedule._id);
      return true;
    } catch (error) {
      handleConvexApiError(
        'サロンスケジュールのアーカイブに失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

export const upsert = mutation({
  args: {
    salonWeekScheduleId: v.id('salon_week_schedule'),
    salonId: v.id('salon'),
    isOpen: v.optional(v.boolean()),
    dayOfWeek: v.optional(
      v.union(
        v.literal('sunday'),
        v.literal('monday'),
        v.literal('tuesday'),
        v.literal('wednesday'),
        v.literal('thursday'),
        v.literal('friday'),
        v.literal('saturday')
      )
    ),
    startHour: v.optional(v.string()),
    endHour: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const existingSalonWeekSchedule = await ctx.db.get(args.salonWeekScheduleId);

      validateSalonSchedule(args);
      if (!existingSalonWeekSchedule || existingSalonWeekSchedule.isArchive) {
        return await ctx.db.insert('salon_week_schedule', {
          ...args,
          isArchive: false,
        });
      } else {
        const updateData = removeEmptyFields(args);
        delete updateData.salonWeekScheduleId;
        return await ctx.db.patch(existingSalonWeekSchedule._id, updateData);
      }
    } catch (error) {
      handleConvexApiError(
        'サロンスケジュールの追加/更新に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

export const kill = mutation({
  args: {
    salonWeekScheduleId: v.id('salon_week_schedule'),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.salonWeekScheduleId);
    } catch (error) {
      handleConvexApiError(
        'サロンスケジュールの削除に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

// サロンIDと曜日と営業フラグからサロンスケジュールを取得
export const getBySalonWeekAndIsOpen = query({
  args: {
    salonId: v.id('salon'),
    dayOfWeek: v.union(
      v.literal('sunday'),
      v.literal('monday'),
      v.literal('tuesday'),
      v.literal('wednesday'),
      v.literal('thursday'),
      v.literal('friday'),
      v.literal('saturday')
    ),
    isOpen: v.boolean(),
  },
  handler: async (ctx, args) => {
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
        scheduleId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { salonId, scheduleSettings } = args;

    // 曜日の一覧
    const dayKeys = Object.keys(scheduleSettings);

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

      const dayOfWeek = day as
        | 'monday'
        | 'tuesday'
        | 'wednesday'
        | 'thursday'
        | 'friday'
        | 'saturday'
        | 'sunday';

      // 既存レコードがあるか確認
      const existing = await ctx.db
        .query('salon_week_schedule')
        .withIndex('by_salon_week_is_open_day_of_week', (q) =>
          q.eq('salonId', salonId).eq('dayOfWeek', dayOfWeek)
        )
        .first();

      if (existing) {
        // 既にレコードがある場合 → 更新
        await ctx.db.patch(existing._id, {
          isOpen,
          startHour,
          endHour,
        });
      } else {
        // レコードがない場合 → 新規作成
        await ctx.db.insert('salon_week_schedule', {
          salonId,
          dayOfWeek,
          isOpen,
          startHour,
          endHour,
          isArchive: false,
        });
      }
    }

    return true; // フロントエンドへ返す値
  },
});
