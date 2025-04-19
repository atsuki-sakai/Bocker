import { query } from '@/convex/_generated/server';
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


export const displayExceptionSchedule = query({
  args: {
    salonId: v.id('salon'),
    dateString: v.string(),
    take: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await ctx.db
      .query('salon_schedule_exception')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId))
      .filter((q) => q.gte(q.field('date'), args.dateString)) // gteを使用して当日を含める
      .order('desc')
      .take(args.take || 10);
  },
});
// 取得関数の修正
export const getByScheduleList = query({
  args: {
    salonId: v.id('salon'),
    type: v.optional(salonScheduleExceptionType),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);

    // デバッグ出力
    console.log('検索条件:', {
      salonId: args.salonId,
      type: args.type,
      includeArchive: args.includeArchive || false,
    });

    // 基本クエリ
    let query = ctx.db
      .query('salon_schedule_exception')
      .withIndex('by_salon_id', (q) =>
        q.eq('salonId', args.salonId).eq('isArchive', args.includeArchive || false)
      );

    // タイプが指定されている場合は、結果をフィルタリング
    const results = await query.collect();

    if (args.type !== undefined) {
      // JavaScriptでフィルタリング
      return results.filter((ex) => ex.type === args.type);
    }

    return results;
  },
});

// サロンIDと日付からサロンスケジュール例外を取得
export const getBySalonAndDate = query({
  args: {
    salonId: v.id('salon'),
    date: v.string(),
    type: v.optional(salonScheduleExceptionType),
    paginationOpts: paginationOptsValidator,
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await ctx.db
      .query('salon_schedule_exception')
      .withIndex('by_salon_date_type', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('date', args.date)
          .eq('type', args.type)
          .eq('isArchive', args.includeArchive)
      )
      .paginate(args.paginationOpts);
  },
});
