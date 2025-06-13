import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';

export const findByTenantAndOrg = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.query('point_config').withIndex('by_tenant_org_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_archive', false)).first()
  },
});
