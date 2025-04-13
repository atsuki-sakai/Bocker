import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import {
  removeEmptyFields,
  archiveRecord,
  killRecord,
} from '@/services/convex/shared/utils/helper';
import { paginationOptsValidator } from 'convex/server';
import { validateStaff, validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';
import { genderType } from '@/services/convex/shared/types/common';
// スタッフの追加
export const add = mutation({
  args: {
    salonId: v.id('salon'),
    name: v.optional(v.string()),
    age: v.optional(v.number()),
    email: v.optional(v.string()),
    gender: v.optional(genderType),
    description: v.optional(v.string()),
    imgPath: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaff(args);
    // サロンの存在確認
    const salon = await ctx.db.get(args.salonId);
    if (!salon) {
      throw new ConvexCustomError('low', '指定されたサロンが存在しません', 'NOT_FOUND', 404, {
        ...args,
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
    checkAuth(ctx);
    validateRequired(args.staffId, 'staffId');
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
    gender: v.optional(genderType),
    description: v.optional(v.string()),
    imgPath: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaff(args);
    // スタッフの存在確認
    const staff = await ctx.db.get(args.staffId);
    if (!staff || staff.isArchive) {
      throw new ConvexCustomError('low', '指定されたスタッフが存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    const updateData = removeEmptyFields(args);
    // staffId はパッチ対象から削除する
    delete updateData.staffId;

    return await ctx.db.patch(args.staffId, updateData);
  },
});

// スタッフの削除
export const archive = mutation({
  args: {
    staffId: v.id('staff'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.staffId, 'staffId');
    return await archiveRecord(ctx, args.staffId);
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
    imgPath: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
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

export const killRelatedTables = mutation({
  args: {
    staffId: v.id('staff'),
    staffConfigId: v.id('staff_config'),
    staffAuthId: v.id('staff_auth'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);

    if (args.staffConfigId) {
      await killRecord(ctx, args.staffConfigId);
    }
    if (args.staffAuthId) {
      await killRecord(ctx, args.staffAuthId);
    }
    if (args.staffId) {
      await killRecord(ctx, args.staffId);
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
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaff(args);
    return await ctx.db
      .query('staff')
      .withIndex('by_salon_id', (q) =>
        q.eq('salonId', args.salonId).eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort ?? 'desc')
      .paginate(args.paginationOpts);
  },
});

// スタッフ名で検索
export const getStaffListByName = query({
  args: {
    name: v.string(),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaff(args);
    return await ctx.db
      .query('staff')
      .withIndex('by_name', (q) =>
        q.eq('name', args.name).eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort ?? 'desc')
      .paginate(args.paginationOpts);
  },
});

// メールアドレスでスタッフを検索
export const getStaffListByEmail = query({
  args: {
    email: v.string(),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaff(args);
    return await ctx.db
      .query('staff')
      .withIndex('by_email', (q) =>
        q.eq('email', args.email).eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort ?? 'desc')
      .paginate(args.paginationOpts);
  },
});

// サロンIDとスタッフ名でスタッフを検索
export const getStaffListBySalonIdAndName = query({
  args: {
    salonId: v.id('salon'),
    name: v.string(),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaff(args);
    return await ctx.db
      .query('staff')
      .withIndex('by_salon_id_name', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('name', args.name)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort ?? 'desc')
      .paginate(args.paginationOpts);
  },
});

// サロンIDとメールアドレスでスタッフを検索
export const getBySalonIdAndEmail = query({
  args: {
    salonId: v.id('salon'),
    email: v.string(),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaff(args);
    return await ctx.db
      .query('staff')
      .withIndex('by_salon_id_email', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('email', args.email)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort ?? 'desc')
      .paginate(args.paginationOpts);
  },
});

// 関連するテーブルの取得
export const getRelatedTables = query({
  args: {
    staffId: v.id('staff'),
    salonId: v.id('salon'),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStaff(args);
    // staffの取得にもisArchiveチェックを追加
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new ConvexCustomError('low', '指定されたスタッフが存在しません', 'NOT_FOUND', 404, {
        ...args,
      });
    }

    // 残りのデータを並列で取得
    const [staffConfig, staffAuth] = await Promise.all([
      ctx.db
        .query('staff_config')
        .withIndex('by_staff_id', (q) =>
          q.eq('staffId', args.staffId).eq('isArchive', args.includeArchive || false)
        )
        .first(),
      ctx.db
        .query('staff_auth')
        .withIndex('by_staff_id', (q) =>
          q.eq('staffId', args.staffId).eq('isArchive', args.includeArchive || false)
        )
        .first(),
    ]);

    if (!staffConfig) {
      throw new ConvexCustomError(
        'low',
        '指定されたスタッフの設定が存在しません',
        'NOT_FOUND',
        404,
        {
          ...args,
        }
      );
    }

    if (!staffAuth) {
      throw new ConvexCustomError(
        'low',
        '指定されたスタッフの認証情報が存在しません',
        'NOT_FOUND',
        404,
        {
          ...args,
        }
      );
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
      extraCharge: staffConfig.extraCharge,
      priority: staffConfig.priority,
      _creationTime: staff._creationTime,
    };
  },
});

export const removeImgPath = mutation({
  args: {
    staffId: v.id('staff'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.staffId, 'staffId');
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new ConvexCustomError('low', '指定されたスタッフが存在しません', 'NOT_FOUND', 404, {
        ...args,
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
