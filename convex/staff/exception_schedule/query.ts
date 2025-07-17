
import { paginationOptsValidator } from 'convex/server';
import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { ERROR_SEVERITY, ERROR_STATUS_CODE } from '@/lib/errors/constants';
import { checkAuth } from '@/convex/utils/auth';
import { validateDateStrToDate } from '@/convex/utils/validations';import { Doc } from '@/convex/_generated/dataModel';

import type { TimelineSchedule } from '@/hooks/useTimelineData';
// テナントIDと組織IDとスタッフIDと日付からスタッフスケジュール例外を取得
export const getByTenantOrgStaffAndDate = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateDateStrToDate(args.date, 'date');
    return await ctx.db
      .query('staff_exception_schedule')
      .withIndex('by_tenant_org_staff_date_archive', (q) =>
        q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('staff_id', args.staff_id).eq('date', args.date).eq('is_archive', false)
      )
      .first();
  },
});

export const listByTenantOrgStaff = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
    is_all_day: v.optional(v.boolean()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)
    try {
      if (args.is_all_day) {
        return await ctx.db
          .query('staff_exception_schedule')
          .withIndex('by_tenant_org_staff_date_archive', (q) =>
            q
              .eq('tenant_id', args.tenant_id)
              .eq('org_id', args.org_id)
              .eq('staff_id', args.staff_id)
          )
          .filter((q) => q.eq(q.field('is_all_day'), args.is_all_day))
          .filter((q) => q.eq(q.field('is_archive'), false))
          .order('desc')
          .paginate(args.paginationOpts)
      } else {
        return await ctx.db
          .query('staff_exception_schedule')
          .withIndex('by_tenant_org_staff_date_archive', (q) =>
            q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('staff_id', args.staff_id)
          )
          .filter((q) => q.eq(q.field('is_archive'), false))
          .order('desc')
          .paginate(args.paginationOpts)
      }
    } catch (error) {
      console.error(error)
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.exception_schedule.listByTenantOrgStaff',
        message: 'スタッフスケジュール例外の取得に失敗しました',
        code: 'INTERNAL_ERROR',
        status: 500,
        details: { ...args },
      })
    }
  },
})

export const findByTenantOrgStaff = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    try {
      return await ctx.db
        .query('staff_exception_schedule')
        .withIndex('by_tenant_org_staff_date_archive', (q) =>
          q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('staff_id', args.staff_id)
        )
        .order('desc')
        .collect();
    } catch (error) {
      console.error(error)
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.exception_schedule.findByTenantOrgStaff',
        message: 'スタッフスケジュール例外の取得に失敗しました',
        code: 'INTERNAL_ERROR',
        status: 500,
        details: { ...args },
      });
    }
  },
});

// 指定日の組織内全スタッフのスケジュール例外を取得（タイムライン表示用）
export const listByTenantOrgAndDate = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    date: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);
    validateDateStrToDate(args.date, 'date');
    
    try {
      return await ctx.db
        .query('staff_exception_schedule')
        .withIndex('by_tenant_org_date_archive', (q) =>
          q
            .eq('tenant_id', args.tenant_id)
            .eq('org_id', args.org_id)
            .eq('date', args.date)
            .eq('is_archive', false)
        )
        .order('desc')
        .paginate(args.paginationOpts);
    } catch (error) {
      console.error(error);
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.exception_schedule.listByTenantOrgAndDate',
        message: '組織内スタッフスケジュール例外の取得に失敗しました',
        code: 'INTERNAL_ERROR',
        status: 500,
        details: { ...args },
      });
    }
  },
});

/**
 * ¥スケジュールを一括取得
 * - タイムライン画面での全スタッフ表示用
 * - 指定されたスタッフIDリストのスケジュールを取得
 * - パフォーマンス向上のため並列取得
 * データ取得専用でバリデーションはmutationで担保
 */
export const allSchedulesByDate = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_ids: v.array(v.id('staff')),
    date: v.string(), // 日付
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)
    
    if (args.staff_ids.length === 0) {
      return []
    }
    
    try {
        // 各スタッフのスケジュールを並列取得
    const allSchedules: TimelineSchedule[] = [];


    const orgSchedules = await ctx.db
      .query('exception_schedule')
      .withIndex('by_tenant_org_archive', (q) =>
        q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_archive', false)
      )
      .filter((q) => q.eq(q.field('date'), args.date))
      .take(50);

    const staffSchedulePromises = args.staff_ids.map(async (staff_id) => {
      return await ctx.db
        .query('staff_exception_schedule')
        .withIndex('by_tenant_org_staff_date_archive', (q) =>
          q
            .eq('tenant_id', args.tenant_id)
            .eq('org_id', args.org_id)
            .eq('staff_id', staff_id)
            .eq('date', args.date)
            .eq('is_archive', false)
        )
        .take(50); // ここで各スタッフごとに最大50件取得
    });

    const staffScheduleResults = await Promise.all(staffSchedulePromises);
    orgSchedules.forEach(schedule => allSchedules.push({
      tenant_id: schedule.tenant_id,
      org_id: schedule.org_id,
      staff_id: null,
      date: schedule.date,
      is_all_day: null,
      start_time_unix: null,
      end_time_unix: null,
      scheduled_by: "organization"
    }));
    staffScheduleResults.forEach(schedules => schedules.forEach(schedule => {
      allSchedules.push({
        tenant_id: schedule.tenant_id,
        org_id: schedule.org_id,
        staff_id: schedule.staff_id,
        date: schedule.date,
        is_all_day: schedule.is_all_day,
        start_time_unix: schedule.start_time_unix,
        end_time_unix: schedule.end_time_unix,
        scheduled_by: "staff"
      })
    }));

      return allSchedules
    } catch (error) {
      console.error(error)
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.exception_schedule.listByStaffIds',
        message: '全スタッフスケジュールの取得に失敗しました',
        code: 'INTERNAL_ERROR',
        status: 500,
        details: { ...args },
      })
    }
  },
})

export const listByStaffIds = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_ids: v.array(v.id('staff')),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true);

    if (args.staff_ids.length === 0) {
      return [];
    }

    // 各スタッフのスケジュールを並列取得
    const allSchedules: Doc<"staff_exception_schedule">[] = [];

    const schedulePromises = args.staff_ids.map(async (staff_id) => {
      return await ctx.db
        .query('staff_exception_schedule')
        .withIndex('by_tenant_org_staff_date_archive', (q) =>
          q
            .eq('tenant_id', args.tenant_id)
            .eq('org_id', args.org_id)
            .eq('staff_id', staff_id)
            .eq('date', args.date)
            .eq('is_archive', false)
        )
        .take(50); // ここで各スタッフごとに最大50件取得
    });

    const results = await Promise.all(schedulePromises);
    results.forEach(schedules => allSchedules.push(...schedules));

    // 作成日時でソート
    allSchedules.sort((a, b) => b._creationTime - a._creationTime);

    return allSchedules;
  },});