import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { validateStaffScheduleException } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';

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
