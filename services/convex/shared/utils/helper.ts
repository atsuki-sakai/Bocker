import { MutationCtx } from '@/convex/_generated/server';
import { DataModel } from '@/convex/_generated/dataModel';
import { Id } from '@/convex/_generated/dataModel';
import { throwConvexError } from '@/lib/error';

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
    throw throwConvexError({
      message: '更新するデータがありません',
      status: 400,
      code: 'INVALID_ARGUMENT',
      title: '更新するデータがありません',
      callFunc: 'removeEmptyFields',
      severity: 'low',
      details: { ...object },
    });
  }
  return result;
};

/**
 * オブジェクトから指定したフィールドを除外した新しいオブジェクトを返す（非破壊）
 *
 * @param obj 元のオブジェクト
 * @param keysToExclude 除外するフィールド名の配列
 * @returns 指定したフィールドを除外したオブジェクト
 *
 * @example
 * const user = { id: 1, name: 'John', password: '123456', email: 'john@example.com' };
 * const safeUser = excludeFields(user, ['password']);
 * // => { id: 1, name: 'John', email: 'john@example.com' }
 */
export function excludeFields<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keysToExclude: readonly K[]
): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keysToExclude.includes(key as K))
  ) as Omit<T, K>;
}

/**
 * レコードを論理削除
 * @param ctx Convexコンテキスト
 * @param id レコードID
 */
export async function archiveRecord<T extends keyof DataModel>(ctx: MutationCtx, id: Id<T>) {
  const record = await ctx.db.get(id);
  if (!record || record.isArchive) {
    throw throwConvexError({
      message: '指定されたレコードが存在しないか、アーカイブされています',
      status: 404,
      code: 'NOT_FOUND',
      title: '指定されたレコードが存在しないか、アーカイブされています',
      callFunc: 'archiveRecord',
      severity: 'low',
      details: { record },
    });
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
    throw throwConvexError({
      message: '指定されたレコードが存在しないか、アーカイブされています',
      status: 404,
      code: 'NOT_FOUND',
      title: '指定されたレコードが存在しないか、アーカイブされています',
      callFunc: 'killRecord',
      severity: 'low',
      details: { record },
    });
  }
  await ctx.db.delete(id as Id<T>);
}
