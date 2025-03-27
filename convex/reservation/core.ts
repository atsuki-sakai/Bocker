import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { handleConvexApiError, removeEmptyFields, trashRecord, KillRecord } from "../helpers";
import { paginationOptsValidator } from "convex/server";
import { ERROR_CODES } from "../errors";
import { Doc } from "../_generated/dataModel";
import { reservationStatusType, paymentMethodType } from "../types";
import { MAX_NOTES_LENGTH, MAX_TOTAL_PRICE, MAX_USE_POINTS } from "../../lib/constants";
// 予約のバリデーション
function validateReservation(args: Partial<Doc<"reservation">>) {
  if (args.notes && args.notes.length > MAX_NOTES_LENGTH) {
    throw new ConvexError({message: `備考は${MAX_NOTES_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.usePoints && args.usePoints < 0) {
    throw new ConvexError({message: "使用ポイントは0以上で入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.unitPrice && args.unitPrice < 0) {
    throw new ConvexError({message: "単価は0以上で入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if(args.unitPrice && args.unitPrice > MAX_TOTAL_PRICE) {
    throw new ConvexError({message: `単価は${MAX_TOTAL_PRICE}円以下で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if(args.totalPrice && args.totalPrice < 0) {
    throw new ConvexError({message: "合計金額は0以上で入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if(args.totalPrice && args.totalPrice > MAX_TOTAL_PRICE) {
    throw new ConvexError({message: `合計金額は${MAX_TOTAL_PRICE}円以下で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if(args.usePoints && args.totalPrice && args.usePoints > args.totalPrice) {
    throw new ConvexError({message: "使用ポイントは合計金額以下で入力してください", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if(args.usePoints && args.usePoints > MAX_USE_POINTS) {
    throw new ConvexError({message: `使用ポイントは${MAX_USE_POINTS}ポイント以下で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if(args.notes && args.notes.length > MAX_NOTES_LENGTH) {
    throw new ConvexError({message: `備考は${MAX_NOTES_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }

}

// 予約の追加
export const add = mutation({
  args: {
    customerId: v.id("customer"),
    staffId: v.id("staff"),
    menuId: v.id("menu"),
    salonId: v.id("salon"),
    optionIds: v.optional(v.array(v.id("salon_option"))),
    unitPrice: v.optional(v.number()),
    totalPrice: v.optional(v.number()),
    status: v.optional(reservationStatusType),
    startTime_unix: v.optional(v.number()),
    endTime_unix: v.optional(v.number()),
    hairImgFileId: v.optional(v.string()),
    usePoints: v.optional(v.number()),
    couponId: v.optional(v.id("coupon")),
    notes: v.optional(v.string()),
    paymentMethod: v.optional(paymentMethodType),
  },
  handler: async (ctx, args) => {
    try {
      // 顧客の存在確認
      const customer = await ctx.db.get(args.customerId);
      if (!customer) {
        console.error("指定された顧客が存在しません", args.customerId);
        throw new ConvexError({
          message: "指定された顧客が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      // スタッフの存在確認
      const staff = await ctx.db.get(args.staffId);
      if (!staff) {
        console.error("指定されたスタッフが存在しません", args.staffId);
        throw new ConvexError({
          message: "指定されたスタッフが存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      // メニューの存在確認
      const menu = await ctx.db.get(args.menuId);
      if (!menu) {
        console.error("指定されたメニューが存在しません", args.menuId);
        throw new ConvexError({
          message: "指定されたメニューが存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      // サロンの存在確認
      const salon = await ctx.db.get(args.salonId);
      if (!salon) {
        console.error("指定されたサロンが存在しません", args.salonId);
        throw new ConvexError({
          message: "指定されたサロンが存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      validateReservation(args);
      const reservationId = await ctx.db.insert("reservation", {
        ...args,
        isArchive: false,
      });
      return reservationId;
    } catch (error) {
      handleConvexApiError("予約の追加に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// 予約情報の更新
export const update = mutation({
  args: {
    reservationId: v.id("reservation"),
    optionIds: v.optional(v.array(v.id("salon_option"))),
    unitPrice: v.optional(v.number()),
    totalPrice: v.optional(v.number()),
    status: v.optional(reservationStatusType),
    startTime_unix: v.optional(v.number()),
    endTime_unix: v.optional(v.number()),
    hairImgFileId: v.optional(v.string()),
    usePoints: v.optional(v.number()),
    couponId: v.optional(v.id("coupon")),
    notes: v.optional(v.string()),
    paymentMethod: v.optional(paymentMethodType),
  },
  handler: async (ctx, args) => {
    try {
      // 予約の存在確認
      const reservation = await ctx.db.get(args.reservationId);
      if (!reservation || reservation.isArchive) {
        throw new ConvexError({
          message: "指定された予約が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      const updateData = removeEmptyFields(args);
      // reservationId はパッチ対象から削除する
      delete updateData.reservationId;

      validateReservation(updateData);


      const newReservationId = await ctx.db.patch(args.reservationId, updateData);
      return newReservationId;
    } catch (error) {
      handleConvexApiError("予約情報の更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

// 予約の削除
export const trash = mutation({
  args: {
    reservationId: v.id("reservation"),
  },
  handler: async (ctx, args) => {
    try {
      // 予約の存在確認
      const reservation = await ctx.db.get(args.reservationId);
      if (!reservation) {
        throw new ConvexError({
          message: "指定された予約が存在しません",
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      await trashRecord(ctx, reservation._id);
      return true;
    } catch (error) {
      handleConvexApiError("予約のアーカイブに失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const upsert = mutation({
  args: {
    reservationId: v.id("reservation"),
    customerId: v.id("customer"),
    staffId: v.id("staff"),
    menuId: v.id("menu"),
    salonId: v.id("salon"),
    optionIds: v.optional(v.array(v.id("salon_option"))),
    unitPrice: v.optional(v.number()),
    totalPrice: v.optional(v.number()),
    status: v.optional(reservationStatusType),
    startTime_unix: v.optional(v.number()),
    endTime_unix: v.optional(v.number()),
    hairImgFileId: v.optional(v.string()),
    usePoints: v.optional(v.number()),
    couponId: v.optional(v.id("coupon")),
    notes: v.optional(v.string()),
    paymentMethod: v.optional(paymentMethodType),
  },
  handler: async (ctx, args) => {
    try {
      const existingReservation = await ctx.db.get(args.reservationId);

      validateReservation(args);
      if (!existingReservation || existingReservation.isArchive) {
        return await ctx.db.insert("reservation", {
          ...args,
          isArchive: false,
        });
      } else {
        const updateData = removeEmptyFields(args);
        delete updateData.reservationId;
        return await ctx.db.patch(existingReservation._id, updateData);
      }
    } catch (error) {
      handleConvexApiError("予約の追加/更新に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
  },
});

export const kill = mutation({
  args: {
    reservationId: v.id("reservation"),
  },
  handler: async (ctx, args) => {
    try {
      await KillRecord(ctx, args.reservationId);
    } catch (error) {
      handleConvexApiError("予約の削除に失敗しました", ERROR_CODES.INTERNAL_ERROR, error);
    }
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
    return await ctx.db
      .query('reservation')
      .withIndex('by_status', (q) =>
        q.eq('salonId', args.salonId).eq('status', args.status).eq('isArchive', false)
      )
      .paginate(args.paginationOpts);
  },
});