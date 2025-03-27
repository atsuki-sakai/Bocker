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
      .withIndex('by_salon_week_is_open', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('dayOfWeek', args.dayOfWeek)
          .eq('isOpen', args.isOpen)
          .eq('isArchive', false)
      )
      .first();
  },
});
