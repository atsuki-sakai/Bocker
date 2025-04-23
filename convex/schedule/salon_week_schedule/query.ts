import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { validateSalonSchedule, validateRequired } from '@/services/convex/shared/utils/validation';
import { dayOfWeekType } from '@/services/convex/shared/types/common';
import { checkAuth } from '@/services/convex/shared/utils/auth';

// サロンスケジュールの取得
export const get = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonId, 'salonId');
    return await ctx.db
      .query('salon_week_schedule')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .first();
  },
});

// サロンIDに基づいて全ての曜日スケジュールを取得
export const getAllBySalonId = query({
  args: {
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonId, 'salonId');
    return await ctx.db
      .query('salon_week_schedule')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .collect();
  },
});

// サロンIDと曜日と営業フラグからサロンスケジュールを取得
export const getBySalonWeekAndIsOpen = query({
  args: {
    salonId: v.id('salon'),
    dayOfWeek: v.optional(dayOfWeekType),
    isOpen: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateSalonSchedule(args);
    return await ctx.db
      .query('salon_week_schedule')
      .withIndex('by_salon_week_is_open_day_of_week', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('dayOfWeek', args.dayOfWeek)
          .eq('isOpen', args.isOpen)
          .eq('isArchive', false)
      )
      .first();
  },
});
