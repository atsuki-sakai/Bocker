import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { removeEmptyFields, trashRecord, KillRecord, authCheck } from '../helpers';
import { paginationOptsValidator } from 'convex/server';
import { CONVEX_ERROR_CODES } from '../constants';
import { salonScheduleExceptionType, dayOfWeekType } from '../types';
import { validateSalonScheduleException } from '../validators';

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
    authCheck(ctx);
    validateSalonScheduleException(args);
    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      console.error('AddSalonScheduleException: 指定されたサロンが存在しません', { ...args });
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

    return await ctx.db.insert('salon_schedule_exception', {
      ...args,
      isArchive: false,
    });
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
    authCheck(ctx);
    validateSalonScheduleException(args);
    // サロンスケジュール例外の存在確認
    const salonScheduleException = await ctx.db.get(args.salonScheduleExceptionId);
    if (!salonScheduleException || salonScheduleException.isArchive) {
      console.error(
        'UpdateSalonScheduleException: 指定されたサロンスケジュール例外が存在しません',
        {
          ...args,
        }
      );
      throw new ConvexError({
        message: '指定されたサロンスケジュール例外が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonScheduleExceptionId: args.salonScheduleExceptionId,
        },
      });
    }

    const updateData = removeEmptyFields(args);
    // salonScheduleExceptionId はパッチ対象から削除する
    delete updateData.salonScheduleExceptionId;

    return await ctx.db.patch(args.salonScheduleExceptionId, updateData);
  },
});

// サロンスケジュール例外の削除
export const trash = mutation({
  args: {
    salonScheduleExceptionId: v.id('salon_schedule_exception'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // サロンスケジュール例外の存在確認
    const salonScheduleException = await ctx.db.get(args.salonScheduleExceptionId);
    if (!salonScheduleException) {
      console.error('TrashSalonScheduleException: 指定されたサロンスケジュール例外が存在しません', {
        ...args,
      });
      throw new ConvexError({
        message: '指定されたサロンスケジュール例外が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonScheduleExceptionId: args.salonScheduleExceptionId,
        },
      });
    }
    return await trashRecord(ctx, salonScheduleException._id);
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
    authCheck(ctx);
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
  },
});

export const kill = mutation({
  args: {
    salonScheduleExceptionId: v.id('salon_schedule_exception'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await KillRecord(ctx, args.salonScheduleExceptionId);
  },
});

export const getByScheduleList = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('salon_schedule_exception')
      .withIndex('by_salon_type', (q) =>
        q.eq('salonId', args.salonId).eq('type', 'holiday').eq('isArchive', false)
      )
      .collect();
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
    authCheck(ctx);
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
  },
});
