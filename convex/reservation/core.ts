import { mutation, query } from "../_generated/server";
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
// 予約の追加
export const add = mutation({
  args: {
    customerId: v.id('customer'),
    staffId: v.id('staff'),
    menuId: v.id('menu'),
    salonId: v.id('salon'),
    optionIds: v.optional(v.array(v.id('salon_option'))),
    unitPrice: v.optional(v.number()),
    totalPrice: v.optional(v.number()),
    status: v.optional(reservationStatusType),
    startTime_unix: v.optional(v.number()),
    endTime_unix: v.optional(v.number()),
    hairImgFilePath: v.optional(v.string()),
    usePoints: v.optional(v.number()),
    couponId: v.optional(v.id('coupon')),
    notes: v.optional(v.string()),
    paymentMethod: v.optional(paymentMethodType),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);
    // 顧客の存在確認
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new ConvexCustomError('low', '指定された顧客が存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    // スタッフの存在確認
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new ConvexCustomError('low', '指定されたスタッフが存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    // メニューの存在確認
    const menu = await ctx.db.get(args.menuId);
    if (!menu) {
      throw new ConvexCustomError('low', '指定されたメニューが存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      throw new ConvexCustomError('low', '指定されたサロンが存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    const reservationId = await ctx.db.insert('reservation', {
      ...args,
      isArchive: false,
    });
    return reservationId;
  },
});

// 予約情報の更新
export const update = mutation({
  args: {
    reservationId: v.id('reservation'),
    optionIds: v.optional(v.array(v.id('salon_option'))),
    unitPrice: v.optional(v.number()),
    totalPrice: v.optional(v.number()),
    status: v.optional(reservationStatusType),
    startTime_unix: v.optional(v.number()),
    endTime_unix: v.optional(v.number()),
    hairImgFilePath: v.optional(v.string()),
    usePoints: v.optional(v.number()),
    couponId: v.optional(v.id('coupon')),
    notes: v.optional(v.string()),
    paymentMethod: v.optional(paymentMethodType),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);
    // 予約の存在確認
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation || reservation.isArchive) {
      throw new ConvexCustomError('low', '指定された予約が存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    const updateData = removeEmptyFields(args);
    // reservationId はパッチ対象から削除する
    delete updateData.reservationId;

    return await ctx.db.patch(args.reservationId, updateData);
  },
});

// 予約の削除
export const archive = mutation({
  args: {
    reservationId: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.reservationId, 'reservationId');
    return await archiveRecord(ctx, args.reservationId);
  },
});

export const upsert = mutation({
  args: {
    reservationId: v.id('reservation'),
    customerId: v.id('customer'),
    staffId: v.id('staff'),
    menuId: v.id('menu'),
    salonId: v.id('salon'),
    optionIds: v.optional(v.array(v.id('salon_option'))),
    unitPrice: v.optional(v.number()),
    totalPrice: v.optional(v.number()),
    status: v.optional(reservationStatusType),
    startTime_unix: v.optional(v.number()),
    endTime_unix: v.optional(v.number()),
    hairImgFilePath: v.optional(v.string()),
    usePoints: v.optional(v.number()),
    couponId: v.optional(v.id('coupon')),
    notes: v.optional(v.string()),
    paymentMethod: v.optional(paymentMethodType),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);
    const existingReservation = await ctx.db.get(args.reservationId);
    if (!existingReservation || existingReservation.isArchive) {
      return await ctx.db.insert('reservation', {
        ...args,
        isArchive: false,
      });
    } else {
      const updateData = removeEmptyFields(args);
      delete updateData.reservationId;
      return await ctx.db.patch(existingReservation._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    reservationId: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.reservationId, 'reservationId');
    return await killRecord(ctx, args.reservationId);
  },
});

// 顧客IDから予約一覧を取得
export const getByCustomerId = query({
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
export const getByStaffId = query({
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
export const getByMenuId = query({
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
export const getBySalonId = query({
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
export const getByStatus = query({
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
export const getBySalonAndDate = query({
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
export const getByStaffAndDate = query({
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
export const getByCustomerAndDate = query({
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
export const getBySalonAndStatus = query({
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