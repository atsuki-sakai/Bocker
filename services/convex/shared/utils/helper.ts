import { MutationCtx } from '../../../../convex/_generated/server';
import { DataModel } from '../../../../convex/_generated/dataModel';
import { Id } from '../../../../convex/_generated/dataModel';
import { v } from 'convex/values';
import { ConvexCustomError } from './error';

/**
 * 現在の Unix タイムスタンプ（秒単位）を取得する
 *
 * @param addHours オプション。加算する時間（整数）を指定します。0も有効です。
 * @returns 現在の Unix タイムスタンプ（秒単位）
 */
export function getCurrentUnixTime(addHours?: number): number {
  const currentTimeSec = Math.floor(Date.now() / 1000);
  return addHours !== undefined ? currentTimeSec + addHours * 3600 : currentTimeSec;
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
    throw new ConvexCustomError('low', '更新するデータがありません', 'INVALID_ARGUMENT', 400);
  }
  return result;
};

/**
 * オブジェクトから指定したフィールドを除外する
 *
 * @param obj 元のオブジェクト
 * @param keysToExclude 除外するフィールド名の配列
 * @returns 指定したフィールドを除外した新しいオブジェクト
 *
 * @example
 * const user = { id: 1, name: 'John', password: '123456', email: 'john@example.com' };
 * const safeUser = excludeFields(user, ['password']);
 * // => { id: 1, name: 'John', email: 'john@example.com' }
 */
export function excludeFields<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keysToExclude: K[]
): Omit<T, K> {
  const result = { ...obj };

  keysToExclude.forEach((key) => {
    delete result[key];
  });

  return result;
}

/**
 * レコードを論理削除
 * @param ctx Convexコンテキスト
 * @param id レコードID
 */
export async function archiveRecord<T extends keyof DataModel>(ctx: MutationCtx, id: Id<T>) {
  const record = await ctx.db.get(id);
  if (!record || record.isArchive) {
    throw new ConvexCustomError(
      'low',
      '指定されたレコードが存在しないか、アーカイブされています',
      'NOT_FOUND',
      404,
      {
        record,
      }
    );
  }
  await ctx.db.patch(id as Id<T> | any, {
    isArchive: true,
    deletedAt: getCurrentUnixTime(24 * 365),
  });
}

/**
 * レコードを物理削除
 * @param ctx Convexコンテキスト
 * @param id レコードID
 */
export async function killRecord<T extends keyof DataModel>(ctx: MutationCtx, id: Id<T>) {
  const record = await ctx.db.get(id);
  if (!record || record.isArchive) {
    throw new ConvexCustomError(
      'low',
      '指定されたレコードが存在しないか、アーカイブされています',
      'NOT_FOUND',
      404,
      {
        record,
      }
    );
  }
  await ctx.db.delete(id as Id<T>);
}
