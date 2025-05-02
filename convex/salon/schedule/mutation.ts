import { mutation } from '../../_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { validateSalonScheduleConfig } from '@/services/convex/shared/utils/validation';
import { salonService } from '@/services/convex/services';
import { reservationIntervalMinutesType } from '@/services/convex/shared/types/common';

export const create = mutation({
  args: {
    salonId: v.id('salon'),
    reservationLimitDays: v.optional(v.number()), // 予約可能日数
    availableCancelDays: v.optional(v.number()), // 予約キャンセル可能日数
    reservationIntervalMinutes: v.optional(reservationIntervalMinutesType) || 0, // 予約時間間隔(分)
    availableSheet: v.optional(v.number()), // 予約可能席数
    todayFirstLaterMinutes: v.optional(v.number()), // 本日の場合、何分後から予約可能か？
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateSalonScheduleConfig(args)
    return await salonService.createScheduleConfig(ctx, args)
  },
})

export const update = mutation({
  args: {
    salonId: v.id('salon'),
    reservationLimitDays: v.optional(v.number()), // 予約可能日数
    availableCancelDays: v.optional(v.number()), // 予約キャンセル可能日数
    reservationIntervalMinutes: v.optional(reservationIntervalMinutesType) || 0, // 予約時間間隔(分)
    availableSheet: v.optional(v.number()), // 予約可能席数
    todayFirstLaterMinutes: v.optional(v.number()), // 本日の場合、何分後から予約可能か？
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateSalonScheduleConfig(args)
    return await salonService.updateScheduleConfig(ctx, args)
  },
})
