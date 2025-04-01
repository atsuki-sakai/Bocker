import { MutationCtx, QueryCtx, ActionCtx } from './_generated/server';
import { ConvexError } from 'convex/values';
import { CONVEX_ERROR_CODES } from './constants';
import { DataModel } from './_generated/dataModel';
import { Id } from './_generated/dataModel';
import { PropertyValidators } from 'convex/values';
import { v } from 'convex/values';

/**
 * エラーハンドリング関数
 * @param error エラーオブジェクト
 * @param message エラーメッセージ
 * @param context コンテキスト情報
 */
// eslint-disable-next-line
export function handleConvexApiError(
  message: string,
  code: CONVEX_ERROR_CODES,
  error?: unknown,
  context: Record<string, any> = {}
) {
  console.log('error', error);
  // エラーの詳細情報を取得
  let errorDetails: Record<string, any> = {
    type: typeof error,
  };

  // 元のエラーメッセージとコードを保持
  let originalMessage = '';
  let originalCode: CONVEX_ERROR_CODES | undefined;

  // Errorオブジェクトの場合は詳細プロパティを取得
  if (error instanceof Error) {
    errorDetails = {
      ...errorDetails,
      name: error.name,
      message: error.message,
      stack: error.stack,
    };

    originalMessage = error.message;

    // エラーオブジェクトの追加プロパティも取得
    Object.keys(error).forEach((key) => {
      try {
        const value = (error as any)[key];
        if (typeof value !== 'function') {
          errorDetails[key] = value;
          // codeプロパティがあれば保存
          if (key === 'code') {
            originalCode = value;
          }
        }
      } catch (e) {
        // プロパティアクセス失敗は無視
      }
    });
  } else if (error instanceof ConvexError) {
    // ConvexErrorの詳細情報をJSON化
    const errorJson = {
      message: error.message,
      code: error.data?.code,
      data: error.data,
    };

    errorDetails.stringified = JSON.stringify(errorJson);

    // ConvexErrorの場合は元のメッセージとコードを使用
    originalMessage = error.message;
    originalCode = error.data?.code;
  } else if (error && typeof error === 'object') {
    // オブジェクトの場合はJSON化を試みる
    try {
      errorDetails.stringified = JSON.stringify(error);

      // エラーオブジェクトにmessageプロパティがあれば保存
      if ('message' in error) {
        originalMessage = (error as { message: string }).message;
      }
      // コードプロパティがあれば保存
      if ('code' in error) {
        originalCode = (error as { code: CONVEX_ERROR_CODES }).code;
      }
    } catch (e) {
      errorDetails.stringifyFailed = true;
    }
  }

  // エラー詳細をコンソールに出力
  console.error(code, message, { ...context }, errorDetails);

  // エラーがある場合は元のエラー情報を使用
  if (originalMessage) {
    throw new ConvexError({
      message: originalMessage,
      code: originalCode || code,
      originalError: error instanceof ConvexError ? error.data : undefined,
    });
  } else {
    // デフォルトのエラーメッセージと共に新しいエラーをスロー
    throw new ConvexError({
      message,
      code,
      originalError: error instanceof ConvexError ? error.data : undefined,
    });
  }
}

/**
 * 現在のUnixタイムスタンプを取得
 * @param addDays 加算する日数
 * @returns 現在のUnixタイムスタンプ
 */
export function getCurrentUnixTime(addDays?: number) {
  return addDays ? Math.floor(Date.now() / 1000) + addDays * 86400 : Math.floor(Date.now() / 1000);
}

/**
 * オブジェクトから undefined のデータを削除
 * @param object オブジェクト
 * @param emptyStringAsUndefined 空文字列をundefinedに変換するかどうか
 * @returns 削除後のオブジェクト
 */
export const removeEmptyFields = <T extends Record<string, unknown>>(
  object: T,
  emptyStringAsUndefined = false
): Partial<T> => {
  const result: Partial<T> = {};
  for (const key of Object.keys(object) as (keyof T)[]) {
    const value = object[key];
    if (value !== undefined && value !== null) {
      // 空文字列の処理
      if (typeof value === 'string' && value.trim() === '') {
        if (emptyStringAsUndefined) {
          // 空文字列をundefinedとして扱う場合
          result[key] = undefined;
          continue;
        }
      }
      result[key] = value;
    }
  }
  if (Object.keys(result).length === 0) {
    throw new ConvexError({
      message: '更新するデータがありません',
      code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
      status: 400,
      severity: 'low',
    });
  }
  return result;
};

/**
 * レコードを論理削除
 * @param ctx Convexコンテキスト
 * @param id レコードID
 */
export async function trashRecord<T extends keyof DataModel>(ctx: MutationCtx, id: Id<T>) {
  const record = await ctx.db.get(id);
  // eslint-disable-next-line
  if (!record || (record as any).isArchive) {
    console.error('指定されたレコードが存在しないか、アーカイブされています', id);
    throw new ConvexError({
      message: '指定されたレコードが存在しないか、アーカイブされています',
      code: CONVEX_ERROR_CODES.NOT_FOUND,
      status: 404,
      severity: 'low',
    });
  }
  // eslint-disable-next-line
  await ctx.db.patch(id as Id<T> | any, {
    isArchive: true,
    deletedAt: getCurrentUnixTime(365),
  });
}

/**
 * レコードを物理削除
 * @param ctx Convexコンテキスト
 * @param id レコードID
 */
export async function KillRecord<T extends keyof DataModel>(ctx: MutationCtx, id: Id<T>) {
  const record = await ctx.db.get(id);
  // eslint-disable-next-line
  if (!record || (record as any).isArchive) {
    console.error('指定されたレコードが存在しないか、アーカイブされています', id);
    throw new ConvexError({
      message: '指定されたレコードが存在しないか、アーカイブされています',
      code: CONVEX_ERROR_CODES.NOT_FOUND,
      status: 404,
      severity: 'low',
    });
  }
  // eslint-disable-next-line
  await ctx.db.delete(id as Id<T> | any);
}

/**
 * テーブルのフィールドから、指定されたフィールドを除外したフィールドを返す
 * @param tableFields テーブルのフィールド
 * @param fieldsToExclude 除外するフィールド
 * @returns 除外後のフィールド
 */
export function excludeFields(tableFields: PropertyValidators, fieldsToExclude: string[]) {
  const remainingFields = { ...tableFields };
  fieldsToExclude.forEach((field) => {
    if (field in remainingFields) {
      delete remainingFields[field];
    }
  });
  return v.object(remainingFields);
}

export async function authCheck(ctx: MutationCtx | QueryCtx | ActionCtx, skip: boolean = false) {
  if (skip) {
    return;
  }
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({
      message: '未認証のユーザーは操作できません',
      code: CONVEX_ERROR_CODES.AUTHENTICATION,
      status: 401,
      severity: 'high',
      context: {
        identity,
      },
    });
  }
}
