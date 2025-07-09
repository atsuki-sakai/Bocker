
import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { Doc } from '@/convex/_generated/dataModel';

export const list = query({
  args: v.object({
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    take: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const { tenant_id, org_id, take } = args;
    const notifications = await ctx.db.query('reservation_notification').withIndex('by_tenant_org_archive', (q) => q.eq('tenant_id', tenant_id).eq('org_id', org_id).eq('is_archive', false)).take(take || 30);
    const reservationIds = notifications.map((notification) => notification.reservation_id);

    const result: Doc<'reservation_notification'>[] = [];
    await Promise.all(reservationIds.map(async (reservationId) => {
      const reservation = await ctx.db.get(reservationId);
      if (reservation) {
        const notification = notifications.find((notification) => notification.reservation_id === reservationId && notification.notification_sent === false);
        if(notification) {
          result.push({
            ...notification,
          });
        }
      }
    }));
    return result.sort((a, b) => (b.notification_sent_at || 0) - (a.notification_sent_at || 0));
  },
});