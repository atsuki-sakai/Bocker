import { mutation } from '@/convex/_generated/server';
import { v } from 'convex/values';
import {
  removeEmptyFields,
  archiveRecord,
  killRecord,
} from '@/services/convex/shared/utils/helper';
import { validateCarteDetail, validateRequired } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { throwConvexError } from '@/lib/error';

export const add = mutation({
  args: {
    carteId: v.id('carte'),
    reservationId: v.id('reservation'),
    beforeHairImgPath: v.optional(v.string()),
    afterHairImgPath: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 入力検証
    checkAuth(ctx);
    validateCarteDetail(args);

    // 同じカルテ・予約の組み合わせが存在しないか確認
    const existingCarteDetail = await ctx.db
      .query('carte_detail')
      .withIndex('by_carte_id_reservation_id', (q) =>
        q.eq('carteId', args.carteId).eq('reservationId', args.reservationId).eq('isArchive', false)
      )
      .first();

    if (existingCarteDetail) {
      throw throwConvexError({
        message: '既に同じ予約のカルテ詳細が存在します',
        status: 400,
        code: 'DUPLICATE_RECORD',
        title: '既に同じ予約のカルテ詳細が存在します',
        callFunc: 'carteDetail.add',
        severity: 'low',
        details: { ...args },
      });
    }
    // データベースに挿入
    return await ctx.db.insert('carte_detail', { ...args, isArchive: false });
  },
});

export const update = mutation({
  args: {
    id: v.id('carte_detail'),
    beforeHairImgPath: v.optional(v.string()),
    afterHairImgPath: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCarteDetail(args);

    const carteDetail = await ctx.db.get(args.id);
    if (!carteDetail || carteDetail.isArchive) {
      throw throwConvexError({
        message: 'カルテ詳細が見つかりません',
        status: 404,
        code: 'NOT_FOUND',
        title: 'カルテ詳細が見つかりません',
        callFunc: 'carteDetail.update',
        severity: 'low',
        details: { ...args },
      });
    }

    const updateData = removeEmptyFields({ ...args });
    delete updateData.id;

    return await ctx.db.patch(args.id, updateData);
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id('carte_detail')),
    carteId: v.id('carte'),
    reservationId: v.id('reservation'),
    beforeHairImgPath: v.optional(v.string()),
    afterHairImgPath: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateCarteDetail(args);

    const existingCarteDetail = await ctx.db
      .query('carte_detail')
      .withIndex('by_carte_id_reservation_id', (q) =>
        q.eq('carteId', args.carteId).eq('reservationId', args.reservationId).eq('isArchive', false)
      )
      .first();

    if (existingCarteDetail) {
      const updateData = removeEmptyFields({ ...args });
      delete updateData.id;
      delete updateData.carteId;
      delete updateData.reservationId;
      return await ctx.db.patch(existingCarteDetail._id, updateData);
    }

    return await ctx.db.insert('carte_detail', { ...args, isArchive: false });
  },
});

export const archive = mutation({
  args: { id: v.id('carte_detail') },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.id, 'id');
    return await archiveRecord(ctx, args.id);
  },
});

export const kill = mutation({
  args: { id: v.id('carte_detail') },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateRequired(args.id, 'id');
    return await killRecord(ctx, args.id);
  },
});
