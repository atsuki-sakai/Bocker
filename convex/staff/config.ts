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
import { CONVEX_ERROR_CODES } from '../constants';
import { validateStaffConfig } from '../validators';

// スタッフ設定の追加
export const add = mutation({
  args: {
    staffId: v.id('staff'),
    salonId: v.id('salon'),
    extraCharge: v.optional(v.number()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // スタッフの存在確認
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      console.error('AddStaffConfig: 指定されたスタッフが存在しません', { ...args });
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

    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      console.error('AddStaffConfig: 指定されたサロンが存在しません', { ...args });
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

    return await ctx.db.insert('staff_config', {
      ...args,
      isArchive: false,
    });
  },
});

// スタッフ設定情報の更新
export const update = mutation({
  args: {
    staffConfigId: v.id('staff_config'),
    extraCharge: v.optional(v.number()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateStaffConfig(args);
    // スタッフ設定の存在確認
    const staffConfig = await ctx.db.get(args.staffConfigId);
    if (!staffConfig || staffConfig.isArchive) {
      console.error('UpdateStaffConfig: 指定されたスタッフ設定が存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたスタッフ設定が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          staffConfigId: args.staffConfigId,
        },
      });
    }

    const updateData = removeEmptyFields(args);
    // staffConfigId はパッチ対象から削除する
    delete updateData.staffConfigId;

    return await ctx.db.patch(args.staffConfigId, updateData);
  },
});

// スタッフ設定の削除
export const trash = mutation({
  args: {
    staffConfigId: v.id('staff_config'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // スタッフ設定の存在確認
    const staffConfig = await ctx.db.get(args.staffConfigId);
    if (!staffConfig) {
      console.error('TrashStaffConfig: 指定されたスタッフ設定が存在しません', { ...args });
      throw new ConvexError({
        message: '指定されたスタッフ設定が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          staffConfigId: args.staffConfigId,
        },
      });
    }

    return await trashRecord(ctx, staffConfig._id);
  },
});

export const upsert = mutation({
  args: {
    staffConfigId: v.id('staff_config'),
    staffId: v.id('staff'),
    salonId: v.id('salon'),
    extraCharge: v.optional(v.number()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateStaffConfig(args);
    const existingStaffConfig = await ctx.db.get(args.staffConfigId);
    if (!existingStaffConfig || existingStaffConfig.isArchive) {
      return await ctx.db.insert('staff_config', {
        ...args,
        isArchive: false,
      });
    } else {
      const updateData = removeEmptyFields(args);
      delete updateData.staffConfigId;
      delete updateData.staffId;
      delete updateData.salonId;
      return await ctx.db.patch(existingStaffConfig._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    staffConfigId: v.id('staff_config'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await KillRecord(ctx, args.staffConfigId);
  },
});

// サロンIDとスタッフIDからスタッフ設定を取得
export const getBySalonAndStaffId = query({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('staff_config')
      .withIndex('by_staff_id', (q) =>
        q.eq('salonId', args.salonId).eq('staffId', args.staffId).eq('isArchive', false)
      )
      .first();
  },
});