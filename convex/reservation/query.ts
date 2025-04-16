import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import {
  removeEmptyFields,
  archiveRecord,
  killRecord,
} from '@/services/convex/shared/utils/helper';
import { paginationOptsValidator } from 'convex/server';
import { reservationStatusType, paymentMethodType } from '@/services/convex/shared/types/common';
import { validateReservation, validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';

// 顧客IDから予約一覧を取得
export const findByCustomerId = query({
  args: {
    customerId: v.id('customer'),
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);
    return await ctx.db
      .query('reservation')
      .withIndex('by_customer_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('customerId', args.customerId)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// スタッフIDから予約一覧を取得
export const findByStaffId = query({
  args: {
    staffId: v.id('staff'),
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);
    return await ctx.db
      .query('reservation')
      .withIndex('by_staff_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('staffId', args.staffId)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// メニューIDから予約一覧を取得
export const findByMenuId = query({
  args: {
    menuId: v.id('menu'),
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);
    return await ctx.db
      .query('reservation')
      .withIndex('by_menu_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('menuId', args.menuId)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// サロンIDから予約一覧を取得
export const findBySalonId = query({
  args: {
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);
    return await ctx.db
      .query('reservation')
      .withIndex('by_salon_id', (q) =>
        q.eq('salonId', args.salonId).eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// ステータスから予約一覧を取得
export const findByStatus = query({
  args: {
    status: reservationStatusType,
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);
    return await ctx.db
      .query('reservation')
      .withIndex('by_status', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('status', args.status)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// サロンIDと日付から予約一覧を取得
export const findBySalonAndDate = query({
  args: {
    salonId: v.id('salon'),
    startTime_unix: v.number(),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);
    return await ctx.db
      .query('reservation')
      .withIndex('by_salon_date', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('startTime_unix', args.startTime_unix)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// スタッフIDと日付から予約一覧を取得
export const findByStaffAndDate = query({
  args: {
    staffId: v.id('staff'),
    salonId: v.id('salon'),
    startTime_unix: v.number(),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);
    return await ctx.db
      .query('reservation')
      .withIndex('by_staff_date', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('staffId', args.staffId)
          .eq('startTime_unix', args.startTime_unix)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// 顧客IDと日付から予約一覧を取得
export const findByCustomerAndDate = query({
  args: {
    customerId: v.id('customer'),
    salonId: v.id('salon'),
    startTime_unix: v.number(),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);
    return await ctx.db
      .query('reservation')
      .withIndex('by_customer_date', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('customerId', args.customerId)
          .eq('startTime_unix', args.startTime_unix)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

// サロンIDとステータスから予約一覧を取得
export const findBySalonAndStatus = query({
  args: {
    salonId: v.id('salon'),
    status: reservationStatusType,
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    validateReservation(args);
    checkAuth(ctx);
    return await ctx.db
      .query('reservation')
      .withIndex('by_status', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('status', args.status)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});
