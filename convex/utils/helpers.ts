import { MutationCtx } from '@/convex/_generated/server';
import { DataModel, Doc } from '@/convex/_generated/dataModel';
import { Id } from '@/convex/_generated/dataModel';
import { WithoutSystemFields } from 'convex/server';
import { getCurrentUnixTime } from '@/lib/schedules';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';

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
      statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
      severity: ERROR_SEVERITY.WARNING,
      callFunc: 'removeEmptyFields',
      message: '更新するデータがありません',
      code: 'BAD_REQUEST',
      status: 400,
      details: {
        object: JSON.stringify(object),
      },
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

export async function createRecord<T extends keyof DataModel>(
  ctx: MutationCtx,
  tableName: T,
  data: WithoutSystemFields<Doc<T>>
): Promise<Id<T>> {
  const id = await ctx.db.insert(tableName, {
    ...data,
    is_archive: false, // 論理削除フラグ
    updated_at: getCurrentUnixTime(), // 更新日時 (UNIXタイム)
    deleted_at: getCurrentUnixTime(24 * 1095), // 論理削除日時 (UNIXタイム)
  });
  return id;
}

export async function updateRecord<T extends keyof DataModel>(
  ctx: MutationCtx,
  id: Id<T>,
  patch: Partial<Doc<T>>
): Promise<void> {
  const record = await ctx.db.get(id);
  if (!record) {
    throw new ConvexError({
      statusCode: ERROR_STATUS_CODE.NOT_FOUND,
      severity: ERROR_SEVERITY.WARNING,
      callFunc: 'updateRecord',
      message: '指定されたレコードが存在しません',
      code: 'NOT_FOUND',
      status: 404,
      details: {
        record: JSON.stringify(record),
      },
    });
  }
  await ctx.db.patch(id, {
    ...patch,
    updated_at: getCurrentUnixTime(),
  });
}

export async function archiveRecord<T extends keyof DataModel>(ctx: MutationCtx, id: Id<T>) {
  const record = await ctx.db.get(id);
  if (!record || record.isArchive) {
    throw new ConvexError({
      statusCode: ERROR_STATUS_CODE.NOT_FOUND,
      severity: ERROR_SEVERITY.WARNING,
      callFunc: 'archiveRecord',
      message: '指定されたレコードが存在しないか、アーカイブされています',
      code: 'NOT_FOUND',
      status: 404,
      details: {
        record: JSON.stringify(record),
      },
    });
  }
  await ctx.db.patch(id as Id<T> | any, {
    is_archive: true,
    updated_at: getCurrentUnixTime(),
    deleted_at: getCurrentUnixTime(24 * 365),
  });
}

export async function killRecord<T extends keyof DataModel>(ctx: MutationCtx, id: Id<T>) {
  const record = await ctx.db.get(id);
  if (!record || record.is_archive) {
    throw new ConvexError({
      statusCode: ERROR_STATUS_CODE.NOT_FOUND,
      severity: ERROR_SEVERITY.WARNING,
      callFunc: 'killRecord',
      message: '指定されたレコードが存在しないか、アーカイブされています',
      code: 'NOT_FOUND',
      status: 404,
      details: {
        record: JSON.stringify(record),
      },
    });
  }
  await ctx.db.delete(id as Id<T>);
}
