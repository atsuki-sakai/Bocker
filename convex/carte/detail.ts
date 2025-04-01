import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { CONVEX_ERROR_CODES } from '../constants';
import { removeEmptyFields, trashRecord, authCheck } from '../helpers';
import { validateCarteDetail } from '../validators';

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
    authCheck(ctx);
    validateCarteDetail(args);

    // 同じカルテ・予約の組み合わせが存在しないか確認
    const existingCarteDetail = await ctx.db
      .query('carte_detail')
      .withIndex('by_carte_id_reservation_id', (q) =>
        q.eq('carteId', args.carteId).eq('reservationId', args.reservationId).eq('isArchive', false)
      )
      .first();

    if (existingCarteDetail) {
      console.error('AddCarteDetail: 既に同じ予約のカルテ詳細が存在します', {
        ...args,
      });
      throw new ConvexError({
        message: '既に同じ予約のカルテ詳細が存在します',
        code: CONVEX_ERROR_CODES.DUPLICATE_RECORD,
        status: 400,
        severity: 'low',
        context: {
          carteDetailId: existingCarteDetail._id,
        },
      });
    }
    // データベースに挿入
    return await ctx.db.insert('carte_detail', { ...args, isArchive: false });
  },
});

export const get = query({
  args: {
    id: v.id('carte_detail'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await ctx.db.get(args.id);
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
    authCheck(ctx);
    validateCarteDetail(args);
    // カルテ詳細の存在確認
    const carteDetail = await ctx.db.get(args.id);

    if (!carteDetail || carteDetail.isArchive) {
      console.error('UpdateCarteDetail: カルテ詳細が見つかりません', { ...args });
      throw new ConvexError({
        message: 'カルテ詳細が見つかりません',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          carteDetailId: args.id,
        },
      });
    }

    const updateData = removeEmptyFields({ ...args });
    delete updateData.id;

    // データベースを更新
    const updatedId = await ctx.db.patch(args.id, updateData);
    return updatedId;
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
    authCheck(ctx);
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
      return await ctx.db.patch(existingCarteDetail._id, updateData);
    }

    return await ctx.db.insert('carte_detail', { ...args, isArchive: false });
  },
});

export const trash = mutation({
  args: { id: v.id('carte_detail') },
  handler: async (ctx, args) => {
    authCheck(ctx);

    const carteDetail = await ctx.db.get(args.id);
    if (!carteDetail) {
      console.error('TrashCarteDetail: 存在しないカルテ詳細の削除が試行されました', { ...args });
      throw new ConvexError({
        message: '存在しないカルテ詳細の削除が試行されました',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          carteDetailId: args.id,
        },
      });
    }
    return trashRecord(ctx, args.id);
  },
});

export const kill = mutation({
  args: { id: v.id('carte_detail') },
  handler: async (ctx, args) => {
    authCheck(ctx);
    const carteDetail = await ctx.db.get(args.id);
    if (!carteDetail) {
      console.error('KillCarteDetail: 存在しないカルテ詳細の完全削除が試行されました', { ...args });
      throw new ConvexError({
        message: '存在しないカルテ詳細の完全削除が試行されました',
        code: CONVEX_ERROR_CODES.NOT_FOUND,
        status: 404,
        severity: 'low',
        context: {
          carteDetailId: args.id,
        },
      });
    }

    // カルテ詳細を削除
    await ctx.db.delete(args.id);
    return args.id;
  },
});
