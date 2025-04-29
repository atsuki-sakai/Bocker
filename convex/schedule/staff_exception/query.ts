import { paginationOptsValidator } from 'convex/server';
import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { validateStaffScheduleException } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { ConvexError } from 'convex/values';
import { canScheduling } from '@/lib/schedule';

// サロンIDとスタッフIDと日付からスタッフスケジュール例外を取得
export const getBySalonStaffAndDate = query({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaffScheduleException(args);
    return await ctx.db
      .query('staff_schedule')
      .withIndex('by_salon_staff_date', (q) =>
        q.eq('salonId', args.salonId).eq('staffId', args.staffId).eq('date', args.date)
      )
      .first();
  },
});

export const paginateBySalonAndStaffId = query({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateStaffScheduleException(args);
    try {
      return await ctx.db
        .query('staff_schedule')
        .withIndex('by_salon_staff_id', (q) =>
          q.eq('salonId', args.salonId).eq('staffId', args.staffId).eq('isArchive', false)
        )
        .order('desc')
        .paginate(args.paginationOpts);
    } catch (error) {
      throw new ConvexError({
        message: 'スタッフスケジュール例外の取得に失敗しました',
        status: 500,
        code: 'INTERNAL_ERROR',
        title: 'スタッフスケジュール例外の取得に失敗しました',
        details: { ...args },
      });
    }
  },
});

export const findBySalonAndStaffId = query({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateStaffScheduleException(args);
    try {
      return await ctx.db
        .query('staff_schedule')
        .withIndex('by_salon_staff_id', (q) =>
          q.eq('salonId', args.salonId).eq('staffId', args.staffId).eq('isArchive', false)
        )
        .order('desc')
        .collect();
    } catch (error) {
      throw new ConvexError({
        message: 'スタッフスケジュール例外の取得に失敗しました',
        status: 500,
        code: 'INTERNAL_ERROR',
        title: 'スタッフスケジュール例外の取得に失敗しました',
        details: { ...args },
      });
    }
  },
});

export const checkDoubleBooking = query({
  args: {
    salonId: v.id('salon'), // サロンID 予約がないか確認したいサロンの_id
    staffId: v.id('staff'), // スタッフID 予約がないか確認したいスタッフの_id
    startTime_unix: v.number(), // 予約がないか確認したい時間の範囲の開始時間
    endTime_unix: v.number(), // 予約がないか確認したい時間の範囲の終了時間
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)
    validateStaffScheduleException(args)
    // Add date range filtering if possible
    const reservations = await ctx.db
      .query('reservation')
      .withIndex('by_salon_staff_status_start_end', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('staffId', args.staffId)
          .eq('isArchive', false)
          .eq('status', 'confirmed')
          .gte('startTime_unix', args.startTime_unix) // Add time constraints
          .lt('startTime_unix', args.endTime_unix)
      )
      .first()
    if (reservations) {
      return {
        isOverlapping: true,
        overlappingReservation: reservations,
      };
    }
    return { isOverlapping: false };
  },
});
