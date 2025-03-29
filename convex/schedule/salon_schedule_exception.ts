import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from '../helpers';
import { paginationOptsValidator } from 'convex/server';
import { ERROR_CODES } from '../errors';
import { Doc } from '../_generated/dataModel';
import { salonScheduleExceptionType, dayOfWeekType } from '../types';

// サロンスケジュール例外のバリデーション
function validateSalonScheduleException(args: Partial<Doc<'salon_schedule_exception'>>) {
  if (args.date && !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    throw new ConvexError({
      message: '日付は「YYYY-MM-DD」形式で入力してください',
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }
}

// サロンスケジュール例外の追加
export const add = mutation({
  args: {
    salonId: v.id('salon'),
    type: v.optional(salonScheduleExceptionType),
    week: v.optional(dayOfWeekType),
    date: v.string(),
    notes: v.optional(v.string()),
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

      validateSalonScheduleException(args);
      const salonScheduleExceptionId = await ctx.db.insert('salon_schedule_exception', {
        ...args,
        isArchive: false,
      });
      return salonScheduleExceptionId;
    } catch (error) {
      handleConvexApiError(
        'サロンスケジュール例外の追加に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

// サロンスケジュール例外の更新
export const update = mutation({
  args: {
    salonScheduleExceptionId: v.id('salon_schedule_exception'),
    type: v.optional(salonScheduleExceptionType),
    week: v.optional(dayOfWeekType),
    date: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // サロンスケジュール例外の存在確認
      const salonScheduleException = await ctx.db.get(args.salonScheduleExceptionId);
      if (!salonScheduleException || salonScheduleException.isArchive) {
        throw new ConvexError({
          message: '指定されたサロンスケジュール例外が存在しません',
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // salonScheduleExceptionId はパッチ対象から削除する
      delete updateData.salonScheduleExceptionId;

      validateSalonScheduleException(updateData);

      const newSalonScheduleExceptionId = await ctx.db.patch(
        args.salonScheduleExceptionId,
        updateData
      );
      return newSalonScheduleExceptionId;
    } catch (error) {
      handleConvexApiError(
        'サロンスケジュール例外の更新に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

// サロンスケジュール例外の削除
export const trash = mutation({
  args: {
    salonScheduleExceptionId: v.id('salon_schedule_exception'),
  },
  handler: async (ctx, args) => {
    try {
      // サロンスケジュール例外の存在確認
      const salonScheduleException = await ctx.db.get(args.salonScheduleExceptionId);
      if (!salonScheduleException) {
        throw new ConvexError({
          message: '指定されたサロンスケジュール例外が存在しません',
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      await trashRecord(ctx, salonScheduleException._id);
      return true;
    } catch (error) {
      handleConvexApiError(
        'サロンスケジュール例外のアーカイブに失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

export const upsert = mutation({
  args: {
    salonScheduleExceptionId: v.id('salon_schedule_exception'),
    salonId: v.id('salon'),
    type: v.optional(salonScheduleExceptionType),
    week: v.optional(dayOfWeekType),
    date: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      validateSalonScheduleException(args);
      const existingSalonScheduleException = await ctx.db.get(args.salonScheduleExceptionId);

      if (!existingSalonScheduleException || existingSalonScheduleException.isArchive) {
        return await ctx.db.insert('salon_schedule_exception', {
          ...args,
          isArchive: false,
        });
      } else {
        const updateData = removeEmptyFields(args);
        delete updateData.salonScheduleExceptionId;
        return await ctx.db.patch(existingSalonScheduleException._id, updateData);
      }
    } catch (error) {
      handleConvexApiError(
        'サロンスケジュール例外の追加/更新に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

export const kill = mutation({
  args: {
    salonScheduleExceptionId: v.id('salon_schedule_exception'),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.salonScheduleExceptionId);
    } catch (error) {
      handleConvexApiError(
        'サロンスケジュール例外の削除に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

export const getByScheduleList = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    try {
      return await ctx.db
        .query('salon_schedule_exception')
        .withIndex('by_salon_type', (q) =>
          q.eq('salonId', args.salonId).eq('type', 'holiday').eq('isArchive', false)
        )
        .collect();
    } catch (error) {
      handleConvexApiError(
        'サロンスケジュール例外の取得に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});

// サロンIDと日付からサロンスケジュール例外を取得
export const getBySalonAndDate = query({
  args: {
    salonId: v.id('salon'),
    date: v.string(),
    type: v.optional(salonScheduleExceptionType),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    try {
      return await ctx.db
        .query('salon_schedule_exception')
        .withIndex('by_salon_date_type', (q) =>
          q
            .eq('salonId', args.salonId)
            .eq('date', args.date)
            .eq('type', args.type)
            .eq('isArchive', false)
        )
        .paginate(args.paginationOpts);
    } catch (error) {
      handleConvexApiError(
        'サロンスケジュール例外の取得に失敗しました',
        ERROR_CODES.INTERNAL_ERROR,
        error
      );
    }
  },
});
