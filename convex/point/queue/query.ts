import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { validateRequiredNumber } from '@/convex/utils/validations';
import { checkAuth } from '@/convex/utils/auth';

// 予約IDからポイントキューを取得
export const findByReservationId = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    reservation_id: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    return await ctx.db
      .query('point_queue')
      .withIndex('by_tenant_org_reservation_archive', (q) =>
        q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('reservation_id', args.reservation_id).eq('is_archive', false)
      )
      .first();
  },
});

// 指定したスケジュール日のポイントキューを取得
export const findByScheduledFor = query({
  args: {
    target_date: v.string(), // 対象日(YYYY-MM-DD)
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    const startTimestamp = Math.floor(new Date(args.target_date).getTime() / 1000);
　　　const endTimestamp = startTimestamp + 24 * 60 * 60; // 翌日の0時

    return await ctx.db
      .query('point_queue')
      .withIndex('by_scheduled_for', (q) =>
        q.gte('scheduled_for_unix', startTimestamp).lt('scheduled_for_unix', endTimestamp)
      )
      .paginate(args.paginationOpts);
      },
});
