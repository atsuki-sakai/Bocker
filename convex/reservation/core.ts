import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import {
  handleConvexApiError,
  removeEmptyFields,
  trashRecord,
  KillRecord,
  authCheck,
} from '../helpers';
import { paginationOptsValidator } from 'convex/server';
import { CONVEX_ERROR_CODES } from '../constants';
import { reservationStatusType, paymentMethodType } from '../types';
import { validateReservation } from '../validators';

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
    authCheck(ctx);
    validateReservation(args);
    // 顧客の存在確認
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      console.error('AddReservation: 指定された顧客が存在しません', { ...args });
      throw new ConvexError({
        message: '指定された顧客が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          customerId: args.customerId,
        },
      });
    }

    // スタッフの存在確認
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      console.error('AddReservation: 指定されたスタッフが存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたスタッフが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          staffId: args.staffId,
        },
      });
    }

    // メニューの存在確認
    const menu = await ctx.db.get(args.menuId);
    if (!menu) {
      console.error('AddReservation: 指定されたメニューが存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたメニューが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          menuId: args.menuId,
        },
      });
    }

    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      console.error('AddReservation: 指定されたサロンが存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたサロンが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonId: args.salonId,
        },
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
    authCheck(ctx);
    validateReservation(args);
    // 予約の存在確認
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation || reservation.isArchive) {
      console.error('UpdateReservation: 指定された予約が存在しません', { ...args });
      throw new ConvexError({
        message: '指定された予約が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          reservationId: args.reservationId,
        },
      });
    }

    const updateData = removeEmptyFields(args);
    // reservationId はパッチ対象から削除する
    delete updateData.reservationId;

    return await ctx.db.patch(args.reservationId, updateData);
  },
});

// 予約の削除
export const trash = mutation({
  args: {
    reservationId: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // 予約の存在確認
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      console.error('TrashReservation: 指定された予約が存在しません', { ...args });
      throw new ConvexError({
        message: '指定された予約が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          reservationId: args.reservationId,
        },
      });
    }

    await trashRecord(ctx, reservation._id);
    return true;
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
    authCheck(ctx);
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
    authCheck(ctx);
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      console.error('KillReservation: 指定された予約が存在しません', { ...args });
      throw new ConvexError({
        message: '指定された予約が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          reservationId: args.reservationId,
        },
      });
    }
    return await KillRecord(ctx, args.reservationId);
  },
});

// 顧客IDから予約一覧を取得
export const getByCustomerId = query({
  args: {
    customerId: v.id('customer'),
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('reservation')
      .withIndex('by_customer_id', (q) =>
        q.eq('salonId', args.salonId).eq('customerId', args.customerId).eq('isArchive', false)
      )
      .paginate(args.paginationOpts);
  },
});

// スタッフIDから予約一覧を取得
export const getByStaffId = query({
  args: {
    staffId: v.id('staff'),
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('reservation')
      .withIndex('by_staff_id', (q) =>
        q.eq('salonId', args.salonId).eq('staffId', args.staffId).eq('isArchive', false)
      )
      .paginate(args.paginationOpts);
  },
});

// メニューIDから予約一覧を取得
export const getByMenuId = query({
  args: {
    menuId: v.id('menu'),
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('reservation')
      .withIndex('by_menu_id', (q) =>
        q.eq('salonId', args.salonId).eq('menuId', args.menuId).eq('isArchive', false)
      )
      .paginate(args.paginationOpts);
  },
});

// サロンIDから予約一覧を取得
export const getBySalonId = query({
  args: {
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('reservation')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .paginate(args.paginationOpts);
  },
});

// ステータスから予約一覧を取得
export const getByStatus = query({
  args: {
    status: reservationStatusType,
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('reservation')
      .withIndex('by_status', (q) =>
        q.eq('salonId', args.salonId).eq('status', args.status).eq('isArchive', false)
      )
      .paginate(args.paginationOpts);
  },
});

// サロンIDと日付から予約一覧を取得
export const getBySalonAndDate = query({
  args: {
    salonId: v.id('salon'),
    startTime_unix: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('reservation')
      .withIndex('by_salon_date_archive', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('startTime_unix', args.startTime_unix)
          .eq('isArchive', false)
      )
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
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('reservation')
      .withIndex('by_staff_date_archive', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('staffId', args.staffId)
          .eq('startTime_unix', args.startTime_unix)
          .eq('isArchive', false)
      )
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
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('reservation')
      .withIndex('by_customer_date_archive', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('customerId', args.customerId)
          .eq('startTime_unix', args.startTime_unix)
          .eq('isArchive', false)
      )
      .paginate(args.paginationOpts);
  },
});

// サロンIDとステータスから予約一覧を取得
export const getBySalonAndStatus = query({
  args: {
    salonId: v.id('salon'),
    status: reservationStatusType,
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('reservation')
      .withIndex('by_status', (q) =>
        q.eq('salonId', args.salonId).eq('status', args.status).eq('isArchive', false)
      )
      .paginate(args.paginationOpts);
  },
});