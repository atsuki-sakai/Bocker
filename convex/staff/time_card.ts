// convex/queries/timeCard.ts
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { KillRecord, removeEmptyFields, archiveRecord } from '../shared/utils/helper';
import { ConvexCustomError } from '../shared/utils/error';
import { checkAuth } from '../shared/utils/auth';
import { validateTimeCard, validateRequired } from '../shared/utils/validation';

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
    checkAuth(ctx);
    validateTimeCard(args);
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      throw new ConvexCustomError('low', '指定されたサロンが見つかりません', 'NOT_FOUND', 404, {
        ...args,
      });
    }
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new ConvexCustomError('low', '指定されたスタッフが見つかりません', 'NOT_FOUND', 404, {
        ...args,
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
    checkAuth(ctx);
    validateTimeCard(args);
    const timeCard = await ctx.db.get(args.timeCardId);
    if (!timeCard) {
      throw new ConvexCustomError('low', '指定された勤怠データが見つかりません', 'NOT_FOUND', 404, {
        ...args,
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
    checkAuth(ctx);
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

export const archive = mutation({
  args: {
    timeCardId: v.id('time_card'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.timeCardId, 'timeCardId');
    return await archiveRecord(ctx, args.timeCardId);
  },
});

export const kill = mutation({
  args: {
    timeCardId: v.id('time_card'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.timeCardId, 'timeCardId');
    return await KillRecord(ctx, args.timeCardId);
  },
});

