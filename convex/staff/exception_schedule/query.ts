import { paginationOptsValidator } from 'convex/server';
import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { ERROR_SEVERITY, ERROR_STATUS_CODE } from '@/lib/errors/constants';

import { checkAuth } from '@/convex/utils/auth';
import { validateDateStrToDate } from '@/convex/utils/validations';

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
