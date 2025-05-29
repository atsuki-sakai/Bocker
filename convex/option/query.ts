import { v } from 'convex/values';
import { query } from '@/convex/_generated/server';
import { paginationOptsValidator } from 'convex/server';

export const findById = query({
  args: {
    option_id: v.id('option'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.option_id)
  },
});
export const list = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc')))
  },
  handler: async (ctx, args) => {
    return await ctx.db.query('option').withIndex('by_tenant_org_active_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id)).paginate(args.paginationOpts)
  },
});


