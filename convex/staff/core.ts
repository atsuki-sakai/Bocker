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
import { genderType } from '../types';
import { validateStaff } from '../validators';

// スタッフの追加
export const add = mutation({
  args: {
    salonId: v.id('salon'),
    name: v.optional(v.string()),
    age: v.optional(v.number()),
    email: v.optional(v.string()),
    gender: v.optional(genderType),
    description: v.optional(v.string()),
    imgFilePath: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateStaff(args);
    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      console.error('AddStaff: 指定されたサロンが存在しません', { ...args });
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

    return await ctx.db.insert('staff', {
      ...args,
      isArchive: false,
    });
  },
});

// スタッフ情報の更新
export const update = mutation({
  args: {
    staffId: v.id('staff'),
    name: v.optional(v.string()),
    age: v.optional(v.number()),
    email: v.optional(v.string()),
    gender: v.optional(genderType),
    description: v.optional(v.string()),
    imgFilePath: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateStaff(args);
    // スタッフの存在確認
    const staff = await ctx.db.get(args.staffId);
    if (!staff || staff.isArchive) {
      console.error('UpdateStaff: 指定されたスタッフが存在しません', { ...args });
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

    const updateData = removeEmptyFields(args);
    // staffId はパッチ対象から削除する
    delete updateData.staffId;

    return await ctx.db.patch(args.staffId, updateData);
  },
});

// スタッフの削除
export const trash = mutation({
  args: {
    staffId: v.id('staff'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    // スタッフの存在確認
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      console.error('TrashStaff: 指定されたスタッフが存在しません', { ...args });
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

    return await trashRecord(ctx, staff._id);
  },
});

export const upsert = mutation({
  args: {
    staffId: v.id('staff'),
    salonId: v.id('salon'),
    name: v.optional(v.string()),
    age: v.optional(v.number()),
    email: v.optional(v.string()),
    gender: v.optional(genderType),
    description: v.optional(v.string()),
    imgFilePath: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateStaff(args);
    const existingStaff = await ctx.db.get(args.staffId);

    if (!existingStaff || existingStaff.isArchive) {
      return await ctx.db.insert('staff', {
        ...args,
        salonId: args.salonId,
        isArchive: false,
      });
    } else {
      const updateData = removeEmptyFields(args);
      delete updateData.staffId;
      return await ctx.db.patch(existingStaff._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    staffId: v.id('staff'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await KillRecord(ctx, args.staffId);
  },
});

// サロンIDからスタッフ一覧を取得
export const getStaffListBySalonId = query({
  args: {
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('staff')
      .withIndex('by_salon_id', (q) =>
        q.eq('salonId', args.salonId).eq('isActive', true).eq('isArchive', false)
      )
      .paginate(args.paginationOpts);
  },
});

// スタッフ名で検索
export const getStaffListByName = query({
  args: {
    name: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('staff')
      .withIndex('by_name', (q) =>
        q.eq('name', args.name).eq('isActive', true).eq('isArchive', false)
      )
      .paginate(args.paginationOpts);
  },
});

// メールアドレスでスタッフを検索
export const getStaffListByEmail = query({
  args: {
    email: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('staff')
      .withIndex('by_email', (q) =>
        q.eq('email', args.email).eq('isActive', true).eq('isArchive', false)
      )
      .paginate(args.paginationOpts);
  },
});

// サロンIDとスタッフ名でスタッフを検索
export const getStaffListBySalonIdAndName = query({
  args: {
    salonId: v.id('salon'),
    name: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('staff')
      .withIndex('by_salon_id_name', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('name', args.name)
          .eq('isActive', true)
          .eq('isArchive', false)
      )
      .paginate(args.paginationOpts);
  },
});

// サロンIDとメールアドレスでスタッフを検索
export const getBySalonIdAndEmail = query({
  args: {
    salonId: v.id('salon'),
    email: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db
      .query('staff')
      .withIndex('by_salon_id_email', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('email', args.email)
          .eq('isActive', true)
          .eq('isArchive', false)
      )
      .paginate(args.paginationOpts);
  },
});