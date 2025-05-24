import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { validateRequired } from '@/convex/utils/validations';
import { dayOfWeekType } from '@/convex/types';
import { checkAuth } from '@/convex/utils/auth';

// サロンスケジュールの取得
export const get = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.org_id, 'org_id');
    return await ctx.db
      .query('week_schedule')
      .withIndex('by_tenant_org_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_archive', false))
      .first();
  },
});

// サロンIDに基づいて全ての曜日スケジュールを取得
export const getAllByTenantAndOrg = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)
    validateRequired(args.org_id, 'org_id');
    return await ctx.db
      .query('week_schedule')
      .withIndex('by_tenant_org_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_archive', false))
      .collect();
  },
});

// サロンIDと曜日と営業フラグからサロンスケジュールを取得
export const getByTenantAndOrgToWeekSchedule = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    day_of_week: dayOfWeekType,
    is_open: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.org_id, 'org_id');
    return await ctx.db
      .query('week_schedule')
      .withIndex('by_tenant_org_week_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('day_of_week', args.day_of_week)
          .eq('is_archive', false)
      ).filter((q) => q.eq(q.field('is_open'), args.is_open || true))
      .first();
  },
});
