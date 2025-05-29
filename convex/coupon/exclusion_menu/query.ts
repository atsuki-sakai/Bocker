import { query } from '../../_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    coupon_id: v.id('coupon'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.query('coupon_exclusion_menu').withIndex('by_tenant_org_coupon_menu_archive', (q) =>
      q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('coupon_id', args.coupon_id)
    ).collect();
  },
});
