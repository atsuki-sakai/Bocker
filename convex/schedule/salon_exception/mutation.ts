import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { throwConvexError } from '@/lib/error';
import { excludeFields, archiveRecord, killRecord } from '@/services/convex/shared/utils/helper';
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
      throw throwConvexError({
        message: '指定されたサロンが存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたサロンが存在しません',
        callFunc: 'schedule.salon_exception.create',
        severity: 'low',
        details: { ...args },
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
    checkAuth(ctx);
    validateSalonScheduleException(args);
    // サロンスケジュール例外の存在確認
    const salonScheduleException = await ctx.db.get(args.salonScheduleExceptionId);
    if (!salonScheduleException || salonScheduleException.isArchive) {
      throw throwConvexError({
        message: '指定されたサロンスケジュール例外が存在しません',
        status: 404,
        code: 'NOT_FOUND',
        title: '指定されたサロンスケジュール例外が存在しません',
        callFunc: 'schedule.salon_exception.update',
        severity: 'low',
        details: { ...args },
      });
    }

    const updateData = excludeFields(args, ['salonScheduleExceptionId']);

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
      const updateData = excludeFields(args, ['salonScheduleExceptionId', 'salonId']);

      return await ctx.db.patch(existingRecord._id, updateData);
    }
  },
});
