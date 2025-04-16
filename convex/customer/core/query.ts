import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';

// サロンIDから顧客一覧を取得
export const findBySalonId = query({
  args: {
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonId, 'salonId');
    return await ctx.db
      .query('customer')
      .withIndex('by_salon_id', (q) =>
        q.eq('salonId', args.salonId).eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// LINE IDから顧客情報を取得
export const findByLineId = query({
  args: {
    salonId: v.id('salon'),
    lineId: v.string(),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonId, 'salonId');
    return await ctx.db
      .query('customer')
      .withIndex('by_salon_line_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('lineId', args.lineId)
          .eq('isArchive', args.includeArchive || false)
      )
      .first();
  },
});

// 電話番号から顧客情報を取得
export const findByPhone = query({
  args: {
    salonId: v.id('salon'),
    phone: v.string(),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonId, 'salonId');
    return await ctx.db
      .query('customer')
      .withIndex('by_salon_phone', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('phone', args.phone)
          .eq('isArchive', args.includeArchive || false)
      )
      .first();
  },
});

// 名前での顧客検索
export const findByName = query({
  args: {
    salonId: v.id('salon'),
    searchName: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonId, 'salonId');
    return await ctx.db
      .query('customer')
      .withIndex('by_salon_id_full_name', (q) => q.eq('salonId', args.salonId))
      .filter((q) => q.eq(q.field('fullName'), args.searchName))
      .paginate(args.paginationOpts);
  },
});

export const listBySalonId = query({
  args: {
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.salonId, 'salonId');
    return await ctx.db
      .query('customer')
      .withIndex('by_salon_id', (q) =>
        q.eq('salonId', args.salonId).eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});
