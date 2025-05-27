import { query } from '../../_generated/server';
import { v } from 'convex/values';
import { checkAuth } from '@/convex/utils/auth';
import { validateRequired } from '@/convex/utils/validations';

export const findByTenantAndOrg = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization')
  },
  handler: async (ctx, args) => {
    validateRequired(args.org_id, 'org_id');
    return await ctx.db.query('reservation_config')
    .withIndex('by_tenant_org_archive', q => 
      q.eq('tenant_id', args.tenant_id)
       .eq('org_id', args.org_id)
       .eq('is_archive', false)
    )
    .first();
  },
});

export const getWeekSchedule = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization')
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.org_id, 'org_id');
    return await ctx.db.query('reservation_config')
    .withIndex('by_tenant_org_archive', q => 
      q.eq('tenant_id', args.tenant_id)
       .eq('org_id', args.org_id)
       .eq('is_archive', false)
    )
    .first();
  },
});
