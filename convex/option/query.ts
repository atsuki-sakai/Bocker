import { v } from 'convex/values';
import { query } from '@/convex/_generated/server';
import { paginationOptsValidator } from 'convex/server';
import { optionService } from '@/services/convex/services';

export const get = query({
  args: {
    optionId: v.id('salon_option'),
  },
  handler: async (ctx, args) => {
    return await optionService.getOption(ctx, args.optionId);
  },
});
export const list = query({
  args: {
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    activeOnly: v.optional(v.boolean()),
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await optionService.listBySalonId(ctx, args);
  },
});
