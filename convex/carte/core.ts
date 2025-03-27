import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { ERROR_CODES } from '../errors';
import { Doc } from '../_generated/dataModel';
import { handleConvexApiError, removeEmptyFields, trashRecord } from '../helpers';
import { MAX_TEXT_LENGTH } from '../../lib/constants';

// カルテのバリデーション
function validateCarte(args: Partial<Doc<'carte'>>) {
  if (!args.salonId || args.salonId == '') {
    throw new ConvexError({ message: 'サロンIDが必須です', code: ERROR_CODES.INVALID_ARGUMENT });
  }

  if (!args.customerId || args.customerId == '') {
    throw new ConvexError({ message: '顧客IDが必須です', code: ERROR_CODES.INVALID_ARGUMENT });
  }

  if (args.skinType && args.skinType.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `肌質は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }

  if (args.hairType && args.hairType.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `髪質は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }

  if (args.allergyHistory && args.allergyHistory.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `アレルギー歴は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }

  if (args.medicalHistory && args.medicalHistory.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `持病は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }

  if (args.hairType && args.hairType.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `髪質は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }

  if (args.allergyHistory && args.allergyHistory.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `アレルギー歴は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }

  if (args.medicalHistory && args.medicalHistory.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({
      message: `持病は${MAX_TEXT_LENGTH}文字以内で入力してください`,
      code: ERROR_CODES.INVALID_ARGUMENT,
    });
  }
}

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
    try {
      // 入力検証
      validateCarte(args);

      // 同じ顧客・サロンのカルテが存在しないか確認
      const existingCarte = await ctx.db
        .query('carte')
        .withIndex('by_salon_customer', (q) =>
          q.eq('salonId', args.salonId).eq('customerId', args.customerId).eq('isArchive', false)
        )
        .first();

      if (existingCarte) {
        throw new ConvexError({
          message: '既に同じ顧客のカルテが存在します',
          code: ERROR_CODES.DUPLICATE_RECORD,
        });
      }
      // データベースに挿入
      const newCarteId = await ctx.db.insert('carte', { ...args, isArchive: false });
      return newCarteId;
    } catch (error) {
      handleConvexApiError(
        `カルテ追加処理でエラー発生 (salonId: ${args.salonId}, customerId: ${args.customerId}):`,
        ERROR_CODES.UNEXPECTED_ERROR,
        error
      );
    }
  },
});

export const get = query({
  args: {
    id: v.id('carte'),
  },
  handler: async (ctx, args) => {
    try {
      const carte = await ctx.db.get(args.id);
      if (!carte || carte.isArchive) {
        throw new ConvexError({
          message: 'カルテが見つかりません',
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      return carte;
    } catch (error) {
      handleConvexApiError('カルテの取得に失敗しました', ERROR_CODES.INTERNAL_ERROR, error);
    }
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
    try {
      validateCarte(args);
      // カルテの存在確認
      const carte = await ctx.db.get(args.id);
      if (!carte || carte.isArchive) {
        throw new ConvexError({
          message: 'カルテが見つかりません',
          code: ERROR_CODES.NOT_FOUND,
          carteId: args.id,
        });
      }

      // 空フィールドを削除
      const updateData = removeEmptyFields(args);

      // データベースを更新
      const updatedId = await ctx.db.patch(args.id, updateData);
      return updatedId;
    } catch (error) {
      // ConvexErrorはそのまま上位へ伝播
      if (error instanceof ConvexError) {
        throw error;
      }

      // その他のエラーは詳細なログを残して再スロー
      console.error(
        `カルテ更新処理でエラー発生 (ID: ${args.id}):`,
        error instanceof Error ? error.message : ''
      );
      throw new ConvexError({
        message: `カルテの更新に失敗しました`,
        code: ERROR_CODES.INTERNAL_ERROR,
      });
    }
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
    try {
      // 入力検証
      validateCarte(args);

      const existingCarte = await ctx.db
        .query('carte')
        .withIndex('by_salon_customer', (q) =>
          q.eq('salonId', args.salonId).eq('customerId', args.customerId).eq('isArchive', false)
        )
        .first();

      // IDが指定されていないか、指定されたレコードが存在しない場合は
      // 同じ顧客・サロンのカルテを検索
      if (existingCarte) {
        // 既存レコードがある場合は更新
        const updateData = removeEmptyFields(args);
        delete updateData.id;
        return await ctx.db.patch(existingCarte._id, updateData);
      } else {
        // 新規レコードを作成
        return await ctx.db.insert('carte', { ...args, isArchive: false });
      }
    } catch (error) {
      handleConvexApiError(
        `カルテの更新/追加処理でエラー発生:`,
        ERROR_CODES.UNEXPECTED_ERROR,
        error
      );
    }
  },
});

export const trash = mutation({
  args: { id: v.id('carte') },
  handler: async (ctx, args) => {
    try {
      const carte = await ctx.db.get(args.id);
      if (!carte) {
        console.warn(`存在しないカルテの削除が試行されました: ${args.id}`);
        throw new ConvexError({
          message: '存在しないカルテの削除が試行されました',
          code: ERROR_CODES.NOT_FOUND,
        });
      }
      return trashRecord(ctx, args.id);
    } catch (error) {
      handleConvexApiError(
        `カルテ削除処理でエラー発生 (ID: ${args.id}):`,
        ERROR_CODES.DATABASE_ERROR,
        error
      );
    }
  },
});

export const kill = mutation({
  args: { id: v.id('carte') },
  handler: async (ctx, args) => {
    try {
      const carte = await ctx.db.get(args.id);
      if (!carte) {
        console.warn(`存在しないカルテの完全削除が試行されました: ${args.id}`);
        throw new ConvexError({
          message: '存在しないカルテの完全削除が試行されました',
          code: ERROR_CODES.NOT_FOUND,
        });
      }

      // 関連するカルテ詳細も削除
      const carteDetails = await ctx.db
        .query('carte_detail')
        .withIndex('by_carte_id', (q) => q.eq('carteId', args.id))
        .collect();

      for (const detail of carteDetails) {
        await ctx.db.delete(detail._id);
      }

      // カルテ自体を削除
      await ctx.db.delete(args.id);
      return args.id;
    } catch (error) {
      handleConvexApiError(
        `カルテの完全削除処理でエラー発生 (ID: ${args.id}):`,
        ERROR_CODES.DATABASE_ERROR,
        error
      );
    }
  },
});
