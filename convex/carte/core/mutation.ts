import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import {
  removeEmptyFields,
  archiveRecord,
  killRecord,
} from '@/services/convex/shared/utils/helper';
import { validateCarte, validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { ConvexCustomError } from '@/services/convex/shared/utils/error';

export const add = mutation({
  args: {
    salonId: v.id('salon'),
    customerId: v.id('customer'),
    skinType: v.optional(v.string()),
    hairType: v.optional(v.string()),
    allergyHistory: v.optional(v.string()),
    medicalHistory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 認証チェック
    checkAuth(ctx);
    validateCarte(args);

    // 同じ顧客・サロンのカルテが存在しないか確認
    const existingCarte = await ctx.db
      .query('carte')
      .withIndex('by_salon_customer', (q) =>
        q.eq('salonId', args.salonId).eq('customerId', args.customerId).eq('isArchive', false)
      )
      .first();

    if (existingCarte) {
      const err = new ConvexCustomError(
        'low',
        '既に同じ顧客のカルテが存在します',
        'DUPLICATE_RECORD',
        400,
        {
          ...args,
        }
      );
      throw err;
    }

    return await ctx.db.insert('carte', { ...args, isArchive: false });
  },
});

export const update = mutation({
  args: {
    id: v.id('carte'),
    skinType: v.optional(v.string()),
    hairType: v.optional(v.string()),
    allergyHistory: v.optional(v.string()),
    medicalHistory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 認証チェック
    checkAuth(ctx);
    validateCarte(args);
    // カルテの存在確認
    const carte = await ctx.db.get(args.id);
    if (!carte || carte.isArchive) {
      const err = new ConvexCustomError('low', 'カルテが見つかりません', 'NOT_FOUND', 404, {
        ...args,
      });
      throw err;
    }

    // 空フィールドを削除
    const updateData = removeEmptyFields(args);

    // データベースを更新
    const updatedId = await ctx.db.patch(args.id, updateData);
    return updatedId;
  },
});

export const upsert = mutation({
  args: {
    id: v.id('carte'),
    salonId: v.id('salon'),
    customerId: v.id('customer'),
    skinType: v.optional(v.string()),
    hairType: v.optional(v.string()),
    allergyHistory: v.optional(v.string()),
    medicalHistory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCarte(args);

    const existingCarte = await ctx.db
      .query('carte')
      .withIndex('by_salon_customer', (q) =>
        q.eq('salonId', args.salonId).eq('customerId', args.customerId).eq('isArchive', false)
      )
      .first();
    if (existingCarte) {
      const updateData = removeEmptyFields(args);
      delete updateData.id;
      delete updateData.salonId;
      delete updateData.customerId;
      return await ctx.db.patch(existingCarte._id, updateData);
    } else {
      return await ctx.db.insert('carte', { ...args, isArchive: false });
    }
  },
});

export const archive = mutation({
  args: { id: v.id('carte') },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.id, 'id');
    return await archiveRecord(ctx, args.id);
  },
});

export const kill = mutation({
  args: { id: v.id('carte') },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.id, 'id');
    return await killRecord(ctx, args.id);
  },
});
