import { mutation } from '../../_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '@/convex/utils/auth';
import { validateRequired, validateNumberLength } from '@/convex/utils/validations';
import { reservationIntervalMinutesType } from '@/convex/types';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { createRecord, updateRecord } from '@/convex/utils/helpers';

export const create = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    reservation_limit_days: v.number(), // 予約可能日数
    available_cancel_days: v.number(), // 予約キャンセル可能日数
    reservation_interval_minutes: reservationIntervalMinutesType, // 予約時間間隔(分)
    available_sheet: v.number(), // 予約可能席数
    today_first_later_minutes: v.number(), // 本日の場合、何分後から予約可能か？
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)
    validateRequired(args.org_id, 'org_id');
    validateNumberLength(args.reservation_limit_days, 'reservation_limit_days');
    validateNumberLength(args.available_cancel_days, 'available_cancel_days');
    validateNumberLength(args.reservation_interval_minutes, 'reservation_interval_minutes');
    validateNumberLength(args.available_sheet, 'available_sheet');
    validateNumberLength(args.today_first_later_minutes, 'today_first_later_minutes');
    return await createRecord(ctx, 'reservation_config', args)
  },
})

export const update = mutation({
  args: {
    reservation_config_id: v.id('reservation_config'),
    reservation_limit_days: v.optional(v.number()), // 予約可能日数
    available_cancel_days: v.optional(v.number()), // 予約キャンセル可能日数
    reservation_interval_minutes: v.optional(reservationIntervalMinutesType) || 0, // 予約時間間隔(分)
    available_sheet: v.optional(v.number()), // 予約可能席数
    today_first_later_minutes: v.optional(v.number()), // 本日の場合、何分後から予約可能か？
  },
  handler: async (ctx, args) => {
   
    validateNumberLength(args.reservation_limit_days, 'reservation_limit_days');
    validateNumberLength(args.available_cancel_days, 'available_cancel_days');
    validateNumberLength(args.reservation_interval_minutes, 'reservation_interval_minutes');
    validateNumberLength(args.available_sheet, 'available_sheet');
    validateNumberLength(args.today_first_later_minutes, 'today_first_later_minutes');

    const existing = await ctx.db.get(args.reservation_config_id);
    if (!existing) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.NOT_FOUND,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'reservation_config.update',
        message: '予約設定が見つかりません',
        code: 'NOT_FOUND',
        status: 404,
        details: {
          ...args,
        },
      });
    }
    return await updateRecord(ctx, existing._id, {
      reservation_limit_days: args.reservation_limit_days,
      available_cancel_days: args.available_cancel_days,
      reservation_interval_minutes: args.reservation_interval_minutes,
      available_sheet: args.available_sheet,
      today_first_later_minutes: args.today_first_later_minutes,
    })
  },
})


export const upsert = mutation({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    reservation_limit_days: v.number(), // 予約可能日数
    available_cancel_days: v.number(), // 予約キャンセル可能日数
    reservation_interval_minutes: reservationIntervalMinutesType, // 予約時間間隔(分)
    available_sheet: v.number(), // 予約可能席数
    today_first_later_minutes: v.number(), // 本日の場合、何分後から予約可能か？
  },
  handler: async (ctx, args) => {
    validateNumberLength(args.reservation_limit_days, 'reservation_limit_days');
    validateNumberLength(args.available_cancel_days, 'available_cancel_days');
    validateNumberLength(args.reservation_interval_minutes, 'reservation_interval_minutes');
    validateNumberLength(args.available_sheet, 'available_sheet');
    validateNumberLength(args.today_first_later_minutes, 'today_first_later_minutes');

    const existing = await ctx.db.query('reservation_config').withIndex('by_tenant_org_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id)).first();
  
    if (existing) {
      return await updateRecord(ctx, existing._id, {
        reservation_limit_days: args.reservation_limit_days,
        available_cancel_days: args.available_cancel_days,
        reservation_interval_minutes: args.reservation_interval_minutes,
        available_sheet: args.available_sheet,
        today_first_later_minutes: args.today_first_later_minutes,
      })
    }else{
      return await createRecord(ctx, 'reservation_config', args)
    }
  }
})
