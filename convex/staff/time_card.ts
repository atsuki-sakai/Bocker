// convex/queries/timeCard.ts
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { KillRecord, removeEmptyFields, trashRecord, authCheck } from '../helpers';
import { CONVEX_ERROR_CODES } from '../constants';
import { ConvexError } from 'convex/values';
import { validateTimeCard } from '../validators';

export const add = mutation({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
    startDateTime_unix: v.optional(v.number()),
    endDateTime_unix: v.optional(v.number()),
    workedTime: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateTimeCard(args);
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      console.error('AddTimeCard: 指定されたサロンが見つかりません', { ...args });
      throw new ConvexError({
        message: 'サロンが見つかりません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          salonId: args.salonId,
        },
      });
    }
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      console.error('AddTimeCard: 指定されたスタッフが見つかりません', { ...args });
      throw new ConvexError({
        message: 'スタッフが見つかりません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          staffId: args.staffId,
        },
      });
    }
    await ctx.db.insert('time_card', {
      ...args,
      isArchive: false,
    });
  },
});

export const update = mutation({
  args: {
    timeCardId: v.id('time_card'),
    startDateTime_unix: v.optional(v.number()),
    endDateTime_unix: v.optional(v.number()),
    workedTime: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateTimeCard(args);
    const timeCard = await ctx.db.get(args.timeCardId);
    if (!timeCard) {
      console.error('UpdateTimeCard: 指定された勤怠データが見つかりません', { ...args });
      throw new ConvexError({
        message: '勤怠データが見つかりません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          timeCardId: args.timeCardId,
        },
      });
    }
    const updateData = removeEmptyFields(args);
    return await ctx.db.patch(args.timeCardId, updateData);
  },
});

export const upsert = mutation({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
    startDateTime_unix: v.optional(v.number()),
    endDateTime_unix: v.optional(v.number()),
    workedTime: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateTimeCard(args);
    const timeCard = await ctx.db
      .query('time_card')
      .withIndex('by_salon_staff', (q) => q.eq('salonId', args.salonId).eq('staffId', args.staffId))
      .first();

    if (!timeCard) {
      return await ctx.db.insert('time_card', {
        ...args,
        isArchive: false,
      });
    } else {
      const updateData = removeEmptyFields(args);
      delete updateData.salonId;
      delete updateData.staffId;
      return await ctx.db.patch(timeCard._id, updateData);
    }
  },
});

export const trash = mutation({
  args: {
    timeCardId: v.id('time_card'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);

    const timeCard = await ctx.db.get(args.timeCardId);
    if (!timeCard) {
      console.error('TrashTimeCard: 指定された勤怠データが見つかりません', { ...args });
      throw new ConvexError({
        message: '勤怠データが見つかりません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          timeCardId: args.timeCardId,
        },
      });
    }
    return await trashRecord(ctx, args.timeCardId);
  },
});

export const kill = mutation({
  args: {
    timeCardId: v.id('time_card'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const timeCard = await ctx.db.get(args.timeCardId);
    if (!timeCard) {
      console.error('KillTimeCard: 指定された勤怠データが見つかりません', { ...args });
      throw new ConvexError({
        message: '勤怠データが見つかりません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          timeCardId: args.timeCardId,
        },
      });
    }
    return await KillRecord(ctx, args.timeCardId);
  },
});

// 指定したスタッフかサロンの日付範囲内の勤務時間を取得する
export const getTimeCardsByDateRange = query({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
    startDate_unix: v.number(),
    endDate_unix: v.number(),
    paginationOpts: paginationOptsValidator,
    direction: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateTimeCard(args);

    let q;
    if (args.staffId) {
      // スタッフIDが指定されている場合は専用インデックスを使用
      q = await ctx.db
        .query('time_card')
        .withIndex('by_salon_staff_start_time', (q) =>
          q
            .eq('salonId', args.salonId)
            .eq('staffId', args.staffId)
            .gte('startDateTime_unix', args.startDate_unix)
            .lt('startDateTime_unix', args.endDate_unix)
        )
        .order(args.direction || 'desc');
    } else {
      // サロンIDのみの場合は日付検索も含めたインデックスを使用
      q = ctx.db
        .query('time_card')
        .withIndex('by_salon_start_time', (q) =>
          q
            .eq('salonId', args.salonId)
            .gte('startDateTime_unix', args.startDate_unix)
            .lt('startDateTime_unix', args.endDate_unix)
        )
        .order(args.direction || 'desc');
    }
    return await q.paginate(args.paginationOpts);
  },
});

// 特定のスタッフの日時範囲内の勤怠データをページング取得するバージョン
export const paginateTimeCardsByDateRange = query({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
    startDate_unix: v.number(),
    endDate_unix: v.number(),
    paginationOpts: paginationOptsValidator,
    direction: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateTimeCard(args);
    // ページングのためのクエリを作成
    let q;

    if (args.staffId) {
      // スタッフIDが指定されている場合は専用インデックスを使用
      q = await ctx.db
        .query('time_card')
        .withIndex('by_salon_staff_start_time', (q) =>
          q
            .eq('salonId', args.salonId)
            .eq('staffId', args.staffId)
            .gte('startDateTime_unix', args.startDate_unix)
            .lt('startDateTime_unix', args.endDate_unix)
        )
        .order(args.direction || 'desc');
    } else {
      // サロンIDのみの場合は日付検索も含めたインデックスを使用
      q = await ctx.db
        .query('time_card')
        .withIndex('by_salon_start_time', (q) =>
          q
            .eq('salonId', args.salonId)
            .gte('startDateTime_unix', args.startDate_unix)
            .lt('startDateTime_unix', args.endDate_unix)
        )
        .order(args.direction || 'desc');
    }
    return await q.paginate(args.paginationOpts);
  },
});
