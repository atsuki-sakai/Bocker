import { MutationCtx } from './_generated/server';
import { ConvexError } from 'convex/values';
import { ERROR_CODES } from './errors';
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
  code: ERROR_CODES,
  error?: unknown,
  context: Record<string, any> = {}
) {
  console.error(code, message, { ...context }, error instanceof Error ? error.message : error);
  throw new ConvexError({
    message,
    code: code,
  });
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
 * @returns 削除後のオブジェクト
 */
export const removeEmptyFields = <T extends Record<string, unknown>>(object: T): Partial<T> => {
  const result: Partial<T> = {};
  for (const key of Object.keys(object) as (keyof T)[]) {
    const value = object[key];
    if (value !== undefined && value !== null) {
      result[key] = value;
    }
  }
  if (Object.keys(result).length === 0) {
    throw new ConvexError({
      message: '更新するデータがありません',
      code: ERROR_CODES.INVALID_ARGUMENT,
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
      code: ERROR_CODES.NOT_FOUND,
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
      code: ERROR_CODES.NOT_FOUND,
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
