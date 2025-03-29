import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { ERROR_CODES } from '../errors';
import { Doc, Id } from '../_generated/dataModel';
import { handleConvexApiError, removeEmptyFields, trashRecord } from '../helpers';
import { MAX_TEXT_LENGTH } from '../../lib/constants';

// カルテ詳細のバリデーション
function validateCarteDetail(args: Partial<Doc<'carte_detail'>>) {
  if (!args.carteId || args.carteId === '') {
    throw new ConvexError({ message: 'カルテIDが必須です', code: ERROR_CODES.INVALID_ARGUMENT });
  }

  if (!args.reservationId || args.reservationId === '') {
    throw new ConvexError({ message: '予約IDが必須です', code: ERROR_CODES.INVALID_ARGUMENT });
  }

  if (args.notes && args.notes.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `メモは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }

  if (args.beforeHairimgPath && args.beforeHairimgPath.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `施術前の髪型画像ファイルIDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }

  if (args.afterHairimgPath && args.afterHairimgPath.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `施術後の髪型画像ファイルIDは${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }
}

export const add = mutation({
  args: {
    carteId: v.id('carte'),
    reservationId: v.id('reservation'),
    beforeHairImgPath: v.optional(v.string()),
    afterHairImgPath: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // 入力検証
      validateCarteDetail(args);

      // 同じカルテ・予約の組み合わせが存在しないか確認
      const existingCarteDetail = await ctx.db
        .query('carte_detail')
        .withIndex('by_carte_id', (q) => q.eq('carteId', args.carteId).eq('isArchive', false))
        .filter((q) => q.eq(q.field('reservationId'), args.reservationId))
        .first();

      if (existingCarteDetail) {
        throw new ConvexError({
          message: '既に同じ予約のカルテ詳細が存在します',
          code: ERROR_CODES.DUPLICATE_RECORD,
        });
      }
      // データベースに挿入
      return await ctx.db.insert('carte_detail', { ...args, isArchive: false });
    } catch (error) {
      handleConvexApiError(
        `カルテ詳細追加処理でエラー発生 (carteId: ${args.carteId}, reservationId: ${args.reservationId}):`,
        ERROR_CODES.UNEXPECTED_ERROR,
        error
      );
    }
  },
});

export const get = query({
  args: {
    id: v.id('carte_detail'),
  },
  handler: async (ctx, args) => {
    try {
      const carteDetail = await ctx.db.get(args.id);
      if (!carteDetail || carteDetail.isArchive) {
        throw new ConvexError({
          message: 'カルテ詳細が見つかりません',
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      return carteDetail;
    } catch (error) {
      handleConvexApiError('カルテ詳細の取得に失敗しました', ERROR_CODES.INTERNAL_ERROR, error);
    }
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
    try {
      validateCarteDetail(args);
      // カルテ詳細の存在確認
      const carteDetail = await ctx.db.get(args.id);

      if (!carteDetail || carteDetail.isArchive) {
        throw new ConvexError({
          message: 'カルテ詳細が見つかりません',
          code: ERROR_CODES.NOT_FOUND,
          carteDetailId: args.id,
        });
      }

      const updateData = removeEmptyFields({ ...args });
      delete updateData.id;

      // データベースを更新
      const updatedId = await ctx.db.patch(args.id, updateData);
      return updatedId;
    } catch (error) {
      handleConvexApiError(
        `カルテ詳細の更新処理でエラー発生 (ID: ${args.id}):`,
        ERROR_CODES.UNEXPECTED_ERROR,
        error
      );
    }
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
    try {
      // 入力検証
      validateCarteDetail(args);

      const existingCarteDetail = await ctx.db
        .query('carte_detail')
        .withIndex('by_carte_id', (q) => q.eq('carteId', args.carteId).eq('isArchive', false))
        .filter((q) => q.eq(q.field('reservationId'), args.reservationId))
        .first();

      if (existingCarteDetail) {
        const updateData = removeEmptyFields({ ...args });
        delete updateData.id;
        return await ctx.db.patch(existingCarteDetail._id, updateData);
      }

      return await ctx.db.insert('carte_detail', { ...args, isArchive: false });
    } catch (error) {
      handleConvexApiError(
        `カルテ詳細の更新/追加処理でエラー発生:`,
        ERROR_CODES.UNEXPECTED_ERROR,
        error
      );
    }
  },
});

export const trash = mutation({
  args: { id: v.id('carte_detail') },
  handler: async (ctx, args) => {
    try {
      const carteDetail = await ctx.db.get(args.id);
      if (!carteDetail) {
        console.warn(`存在しないカルテ詳細の削除が試行されました: ${args.id}`);
        throw new ConvexError({
          message: '存在しないカルテ詳細の削除が試行されました',
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      return trashRecord(ctx, args.id);
    } catch (error) {
      handleConvexApiError(
        `カルテ詳細の削除処理でエラー発生 (ID: ${args.id}):`,
        ERROR_CODES.DATABASE_ERROR,
        error
      );
    }
  },
});

export const kill = mutation({
  args: { id: v.id('carte_detail') },
  handler: async (ctx, args) => {
    try {
      const carteDetail = await ctx.db.get(args.id);
      if (!carteDetail) {
        console.warn(`存在しないカルテ詳細の完全削除が試行されました: ${args.id}`);
        throw new ConvexError({
          message: '存在しないカルテ詳細の完全削除が試行されました',
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      // カルテ詳細を削除
      await ctx.db.delete(args.id);
      return args.id;
    } catch (error) {
      handleConvexApiError(
        `カルテ詳細の完全削除処理でエラー発生 (ID: ${args.id}):`,
        ERROR_CODES.DATABASE_ERROR,
        error
      );
    }
  },
});
