import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { removeEmptyFields, trashRecord, KillRecord, authCheck } from '../helpers';
import { paginationOptsValidator } from 'convex/server';
import { CONVEX_ERROR_CODES } from '../constants';
import { staffGenderType } from '../types';
import { validateStaff } from '../validators';

// スタッフの追加
export const add = mutation({
  args: {
    salonId: v.id('salon'),
    name: v.optional(v.string()),
    age: v.optional(v.number()),
    email: v.optional(v.string()),
    gender: v.optional(staffGenderType),
    description: v.optional(v.string()),
    imgPath: v.optional(v.string()),
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

// スタッフの取得
export const get = query({
  args: {
    staffId: v.id('staff'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db.get(args.staffId);
  },
});

// スタッフ情報の更新
export const update = mutation({
  args: {
    staffId: v.id('staff'),
    name: v.optional(v.string()),
    age: v.optional(v.number()),
    email: v.optional(v.string()),
    gender: v.optional(staffGenderType),
    description: v.optional(v.string()),
    imgPath: v.optional(v.string()),
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
    gender: v.optional(staffGenderType),
    description: v.optional(v.string()),
    imgPath: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    validateStaff(args);
    const existingStaff = await ctx.db.get(args.staffId);

    if (!existingStaff || existingStaff.isArchive) {
      return await ctx.db.insert('staff', {
        ...args,
        isArchive: false,
      });
    } else {
      const updateData = removeEmptyFields(args);
      delete updateData.staffId;
      delete updateData.salonId;
      return await ctx.db.patch(existingStaff._id, updateData);
    }
  },
});

export const kill = mutation({
  args: {
    staffId: v.id('staff'),
    staffConfigId: v.id('staff_config'),
    staffAuthId: v.id('staff_auth'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);

    if (args.staffConfigId) {
      await KillRecord(ctx, args.staffConfigId);
    }
    if (args.staffAuthId) {
      await KillRecord(ctx, args.staffAuthId);
    }
    if (args.staffId) {
      await KillRecord(ctx, args.staffId);
    }
    return {
      deletedStaffConfigId: args.staffConfigId,
      deletedStaffAuthId: args.staffAuthId,
      deletedStaffId: args.staffId,
    };
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
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
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
      .withIndex('by_name', (q) => q.eq('name', args.name).eq('isArchive', false))
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
      .withIndex('by_email', (q) => q.eq('email', args.email).eq('isArchive', false))
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
        q.eq('salonId', args.salonId).eq('name', args.name).eq('isArchive', false)
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
        q.eq('salonId', args.salonId).eq('email', args.email).eq('isArchive', false)
      )
      .paginate(args.paginationOpts);
  },
});

// 関連するテーブルの取得
export const getRelatedTables = query({
  args: {
    staffId: v.id('staff'),
    salonId: v.id('salon'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);

    // staffの取得にもisArchiveチェックを追加
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new ConvexError({
        message: '指定されたスタッフが存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          staffId: args.staffId,
          salonId: args.salonId,
        },
      });
    }

    // 残りのデータを並列で取得
    const [staffConfig, staffAuth] = await Promise.all([
      ctx.db
        .query('staff_config')
        .withIndex('by_staff_id', (q) =>
          q.eq('salonId', args.salonId).eq('staffId', args.staffId).eq('isArchive', false)
        )
        .first(),
      ctx.db
        .query('staff_auth')
        .withIndex('by_staff_id', (q) => q.eq('staffId', args.staffId).eq('isArchive', false))
        .first(),
    ]);

    if (!staffConfig) {
      throw new ConvexError({
        message: '指定されたスタッフの設定が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          staffId: args.staffId,
          salonId: args.salonId,
        },
      });
    }

    if (!staffAuth) {
      throw new ConvexError({
        message: '指定されたスタッフの認証情報が存在しません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        severity: 'low',
        status: 404,
        context: {
          staffId: args.staffId,
          salonId: args.salonId,
        },
      });
    }

    return {
      salonId: staff.salonId,
      staffId: staff._id,
      name: staff.name,
      age: staff.age,
      email: staff.email,
      gender: staff.gender,
      description: staff.description,
      imgPath: staff.imgPath,
      isActive: staff.isActive,
      staffAuthId: staffAuth._id,
      pinCode: staffAuth.pinCode,
      role: staffAuth.role,
      staffConfigId: staffConfig._id,
      hourlyRate: staffConfig.hourlyRate,
      extraCharge: staffConfig.extraCharge,
      priority: staffConfig.priority,
    };
  },
});

export const removeImgPath = mutation({
  args: {
    staffId: v.id('staff'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new ConvexError({
        message: '指定されたスタッフが存在しません',
      });
    }
    const deletedStaffImage = await ctx.db.patch(args.staffId, {
      imgPath: undefined,
    });
    return {
      deletedStaffImage,
    };
  },
});
