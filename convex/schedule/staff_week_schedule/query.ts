import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { validateStaffWeekSchedule } from '@/services/convex/shared/utils/validation';
import { dayOfWeekType } from '@/services/convex/shared/types/common';
import { checkAuth } from '@/services/convex/shared/utils/auth';

// サロンIDとスタッフIDと曜日からスタッフスケジュールを取得
export const getBySalonStaffAndWeek = query({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
    dayOfWeek: dayOfWeekType,
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaffWeekSchedule(args);
    return await ctx.db
      .query('staff_week_schedule')
      .withIndex('by_salon_staff_week_is_open', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('staffId', args.staffId)
          .eq('dayOfWeek', args.dayOfWeek)
          .eq('isOpen', true)
          .eq('isArchive', false)
      );
  },
});
