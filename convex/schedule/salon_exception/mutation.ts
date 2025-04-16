import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';
import {
  removeEmptyFields,
  archiveRecord,
  killRecord,
} from '@/services/convex/shared/utils/helper';
import { paginationOptsValidator } from 'convex/server';
import { salonScheduleExceptionType, dayOfWeekType } from '@/services/convex/shared/types/common';
import {
  validateRequired,
  validateSalonScheduleException,
} from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';

// サロンスケジュール例外の追加
export const create = mutation({
  args: {
    salonId: v.id('salon'),
    type: v.optional(salonScheduleExceptionType),
    week: v.optional(dayOfWeekType),
    date: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalonScheduleException(args);
    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      const err = new ConvexCustomError('low', '指定されたサロンが存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
      throw err;
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
    checkAuth(ctx);
    validateSalonScheduleException(args);
    // サロンスケジュール例外の存在確認
    const salonScheduleException = await ctx.db.get(args.salonScheduleExceptionId);
    if (!salonScheduleException || salonScheduleException.isArchive) {
      const err = new ConvexCustomError(
        'low',
        '指定されたサロンスケジュール例外が存在しません',
        'NOT_FOUND',
        404,
        {
          ...args,
        }
      );
      throw err;
    }

    const updateData = removeEmptyFields(args);
    // salonScheduleExceptionId はパッチ対象から削除する
    delete updateData.salonScheduleExceptionId;

    return await ctx.db.patch(args.salonScheduleExceptionId, updateData);
  },
});

// サロンスケジュール例外の削除
export const archive = mutation({
  args: {
    salonScheduleExceptionId: v.id('salon_schedule_exception'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonScheduleExceptionId, 'salonScheduleExceptionId');
    return await archiveRecord(ctx, args.salonScheduleExceptionId);
  },
});

export const kill = mutation({
  args: {
    salonScheduleExceptionId: v.id('salon_schedule_exception'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonScheduleExceptionId, 'salonScheduleExceptionId');
    return await killRecord(ctx, args.salonScheduleExceptionId);
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
    checkAuth(ctx);
    validateSalonScheduleException(args);

    // デバッグ出力
    console.log('検索条件:', {
      salonId: args.salonId,
      date: args.date,
      type: args.type,
    });

    // まず日付とサロンIDのみで検索
    let query = ctx.db
      .query('salon_schedule_exception')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false));

    // 結果を絞り込み
    const allExistingExceptions = await query.collect();

    // 日付とタイプでフィルタリング（タイプはundefinedの可能性もあるため、JavaScriptフィルタを使用）
    const existingExceptions = allExistingExceptions.filter(
      (ex) => ex.date === args.date && ex.type === args.type
    );

    console.log('既存レコード:', existingExceptions);

    if (existingExceptions.length === 0) {
      // 新規作成
      console.log('新規作成します');
      return await ctx.db.insert('salon_schedule_exception', {
        ...args,
        isArchive: false,
      });
    } else {
      // 既存レコードを更新（最初のレコードを使用）
      const existingRecord = existingExceptions[0];
      console.log('更新します。ID:', existingRecord._id);

      // 更新データの準備
      const updateData = removeEmptyFields(args);
      delete updateData.salonScheduleExceptionId;
      delete updateData.salonId; // パッチ時にはサロンIDも更新不要

      return await ctx.db.patch(existingRecord._id, updateData);
    }
  },
});
