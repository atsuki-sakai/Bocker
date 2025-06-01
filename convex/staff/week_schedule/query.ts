import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '@/convex/utils/auth';
import { dayOfWeekType } from '@/convex/types';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';

// 組織IDとスタッフIDと曜日からスタッフスケジュールを取得
export const getByTenantOrgStaffWeek = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
    day_of_week: dayOfWeekType,
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await ctx.db
      .query('staff_week_schedule')
      .withIndex('by_tenant_org_staff_week_open_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('staff_id', args.staff_id)
          .eq('day_of_week', args.day_of_week)
      ).filter((q) => q.eq(q.field('is_archive'), false)).first();
  },
});

// 組織IDとスタッフIDからスタッフスケジュールを取得
export const getByTenantOrgStaff = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)
    try {
      return await ctx.db
        .query('staff_week_schedule')
        .withIndex('by_tenant_org_staff_archive', (q) =>
          q.eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('staff_id', args.staff_id)
        )
        .filter((q) => q.eq(q.field('is_archive'), false))
        .collect();
    } catch (error) {
      throw new ConvexError({
        message: 'スタッフのスケジュール取得に失敗しました',
        statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'staff.week_schedule.getByTenantOrgStaff',
        code: 'UNEXPECTED_ERROR',
      });
    }
  },
});
