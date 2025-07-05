
import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: v.object({
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    take: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const { tenant_id, org_id, take } = args;
    const notifications = await ctx.db.query('reservation_notification').withIndex('by_tenant_org_archive', (q) => q.eq('tenant_id', tenant_id).eq('org_id', org_id).eq('is_archive', false)).take(take || 30);
    return notifications;
  },
});