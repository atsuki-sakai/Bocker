/**
 * CamelCase のキーを snake_case に変換するユーティリティ関数
 *
 * @param key - 変換前のキー文字列（例: "startTimeUnix"）
 * @returns スネークケース化されたキー（例: "start_timeUnix"）
 */
function camelToSnake(key: string): string {
    return key
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/__+/g, "_")
      .toLowerCase();
  }
  
  /**
   * snake_case のキーを camelCase に変換するユーティリティ関数
   *
   * @param key - 変換前のキー文字列（例: "start_timeUnix"）
   * @returns キャメルケース化されたキー（例: "startTimeUnix"）
   */
  function snakeToCamel(key: string): string {
    return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  }
  
  /**
   * 任意のレコードオブジェクトのキーと値を一括変換する汎用関数
   *
   * @template T - 入力レコードの型
   * @param record - 変換前のオブジェクト（例: Convex ドキュメントや Supabase Row）
   * @param keyMap - キー変換関数（例: camelToSnake や snakeToCamel）
   * @param opts - オプション設定
   *   @param opts.stringifyArrays - 真の場合、配列またはオブジェクトを JSON 文字列化する
   *   @param opts.dateToIso       - 真の場合、Date オブジェクトを ISO 文字列に変換する
   * @returns 変換後のオブジェクト（キーは keyMap による変換済み、必要に応じて値も JSON 化／ISO 化）
   */
  export function convertConvexToSupabaseRecord<T extends Record<string, any>>(
    record: T,
    isSnakeToCamel: boolean,
    opts: { stringifyArrays?: boolean; dateToIso?: boolean } = {}
  ): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [rawKey, rawVal] of Object.entries(record)) {
      const key = isSnakeToCamel ? snakeToCamel(rawKey) : camelToSnake(rawKey);
      let val: any = rawVal;
  
      // Date を ISO 文字列に変換
      if (opts.dateToIso && rawVal instanceof Date) {
        val = rawVal.toISOString();
      }
      // 配列またはオブジェクトを JSON 文字列に変換（JSONB カラム用）
      else if (
        opts.stringifyArrays &&
        (Array.isArray(rawVal) || (typeof rawVal === "object" && rawVal !== null))
      ) {
        val = JSON.stringify(rawVal);
      }
  
      result[key] = val;
    }
    return result;
  }


/**
 * 新規作成レコードに共通フィールドを追加します。
 * - `_creation_time`: 現在時刻 (ISO文字列)
 * - `updated_time`: 現在時刻 (ISO文字列)
 * - `is_archive`: false (デフォルト)
 * @template T - 入力データオブジェクトの型
 * @param data - 共通フィールドを追加する対象のデータオブジェクト
 * @returns 共通フィールドが追加されたデータオブジェクト
 */
export function addCreationCommonFields<T extends Record<string, any>>(
  data: T
): T & { _creation_time: string; updated_time: string; is_archive: boolean } {
  const now = new Date().toISOString();
  return {
    ...data,
    _creation_time: now,
    updated_time: now,
    is_archive: false, // デフォルト値をfalseに設定
  };
}

/**
 * 更新レコードに共通フィールドを追加します。
 * - `updated_time`: 現在時刻 (ISO文字列)
 * @template T - 入力データオブジェクトの型
 * @param data - 共通フィールドを追加する対象のデータオブジェクト
 * @returns 共通フィールドが追加されたデータオブジェクト
 */
export function addUpdateCommonFields<T extends Record<string, any>>(
  data: T
): T & { updated_time: string } {
  return {
    ...data,
    updated_time: new Date().toISOString(),
  };
}