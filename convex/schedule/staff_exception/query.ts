import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { validateStaffScheduleException } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { ConvexError } from 'convex/values';

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
