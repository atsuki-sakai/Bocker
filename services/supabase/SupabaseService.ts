import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/supabase.types'

/* 型エイリアス --------------------------------------------------- */
type Tables = Database['public']['Tables']
type TableName = keyof Tables
type RowType<K extends TableName> = Tables[K]['Row'];
type InsertType<K extends TableName> = Tables[K]['Insert'];
type SelectCols<R> = '*' | keyof R | (keyof R)[];

/* クライアント --------------------------------------------------- */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase        = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseAdmin   = createClient(supabaseUrl, serviceRoleKey)

/* リトライヘルパー ------------------------------------------------ */
async function retryOperation<T>(
  operation: () => Promise<T>,
  options: { retries: number; delay: number; operationName: string }
): Promise<T> {
  let attempts = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      console.log(`[SupabaseService] Attempting operation ${options.operationName}, attempt ${attempts + 1}`)
      const result = await operation()
      console.log(`[SupabaseService] Operation ${options.operationName} successful on attempt ${attempts + 1}`)
      return result
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      attempts++
      console.warn(
        `[SupabaseService] Operation ${options.operationName} failed on attempt ${attempts}. Error: ${error.message}`,
        { errorDetails: error }
      )
      if (attempts >= options.retries) {
        console.error(
          `[SupabaseService] Operation ${options.operationName} failed after ${options.retries + 1} attempts. No more retries.`,
          error
        )
        throw error // Rethrow the last error
      }
      const delayTime = options.delay * Math.pow(2, attempts - 1) // Exponential backoff
      console.log(`[SupabaseService] Retrying operation ${options.operationName} in ${delayTime}ms...`)
      await new Promise(resolve => setTimeout(resolve, delayTime))
    }
  }
}

/* オプション型 --------------------------------------------------- */
interface FetchOptions {
  /** 取得カラム（既定 `"*"`） */
  select?: string // This will be refined in the method signature
  /** 1 始まりのページ番号（指定時 pageSize 必須） */
  page?: number
  /** 1 ページ当たり件数 */
  pageSize?: number
  /** limit / offset を直接使いたい場合 */
  limit?: number
  offset?: number
  /** 合計件数を取得する方法（既定 `"exact"`） */
  count?: 'exact' | 'planned' | 'estimated'
}

interface UpsertOptions {
  onConflict?: string
  select?: string // This will be refined in the method signature
}

/* サービスクラス ------------------------------------------------- */
class SupabaseService {
  private client: SupabaseClient
  private defaultRetryOptions = { retries: 3, delay: 1000 }

  constructor(private supabaseInstance: SupabaseClient) {
    this.client = supabaseInstance;
  }

  /** ページネーション対応 SELECT */
  async fetch<K extends TableName>(
    table: K,
    {
      select = '*',
      page,
      pageSize,
      limit,
      offset = 0,
      count = 'exact',
    }: FetchOptions & { select?: SelectCols<RowType<K>> } = {},
  ): Promise<{ data: RowType<K>[]; count: number | null }> {
    const operationName = `fetch from ${String(table)}`
    return retryOperation(async () => {
      console.log(`[SupabaseService] Executing ${operationName}`, { table, select, page, pageSize, limit, offset, count });
      const sel = Array.isArray(select) ? select.join(',') : String(select);
      let query = this.client.from(table).select(sel, { count })

      if (page !== undefined && pageSize !== undefined) {
        const from = (page - 1) * pageSize
        const to   = from + pageSize - 1
        query = query.range(from, to)
      } else if (limit !== undefined) {
        const from = offset
        const to   = from + limit - 1
        query = query.range(from, to)
      }

      const { data, error, count: total } = await query
      if (error) {
        console.error(`[SupabaseService] ${operationName} error: ${error.message}`, { errorDetails: error, table, select })
        throw new Error(`Supabase fetch error from table ${String(table)}: ${error.message}`)
      }
      console.log(`[SupabaseService] ${operationName} success. Count: ${total}, Returned: ${data?.length ?? 0}`)
      return { data: (data ?? []) as unknown as RowType<K>[], count: total }
    }, { ...this.defaultRetryOptions, operationName });
  }

  /** バルク UPSERT */
  async upsert<K extends TableName>(
    table: K,
    rows: InsertType<K>[] | InsertType<K>,
    { onConflict, select = '*' }: UpsertOptions & { select?: SelectCols<RowType<K>> } = {},
  ): Promise<RowType<K>[]> {
    const operationName = `upsert to ${String(table)}`
    return retryOperation(async () => {
      const payload = Array.isArray(rows) ? rows : [rows];
      console.log(`[SupabaseService] Executing ${operationName}`, { table, rowsCount: payload.length, onConflict, select });
      const sel = Array.isArray(select) ? select.join(',') : String(select);
      const { data, error } = await this.client
        .from(table)
        .upsert(payload, { onConflict })
        .select(sel)
      if (error) {
        console.error(`[SupabaseService] ${operationName} error: ${error.message}`, { errorDetails: error, table, onConflict, select })
        throw new Error(`Supabase upsert error to table ${String(table)}: ${error.message}`)
      }
      console.log(`[SupabaseService] ${operationName} success. Returned: ${data?.length ?? 0}`)
      return (data ?? []) as unknown as RowType<K>[]
    }, { ...this.defaultRetryOptions, operationName });
  }

  /** _id 指定 DELETE */
  async delete<K extends TableName>(
    table: K, 
    idColumn: keyof RowType<K>, 
    idValue: RowType<K>[typeof idColumn]
  ): Promise<void> {
    const operationName = `delete from ${String(table)} with ${String(idColumn)} = ${idValue}`
    return retryOperation(async () => {
      console.log(`[SupabaseService] Executing ${operationName}`, { table, idColumn, idValue });
      const { error } = await this.client.from(table).delete().eq(idColumn as string, idValue)
      if (error) {
        console.error(`[SupabaseService] ${operationName} error: ${error.message}`, { errorDetails: error, table, idColumn, idValue })
        throw new Error(`Supabase delete error from table ${String(table)} for ${String(idColumn)} = ${idValue}: ${error.message}`)
      }
      console.log(`[SupabaseService] ${operationName} success.`)
    }, { ...this.defaultRetryOptions, operationName});
  }
  
  /**
 * 任意テーブル用取得メソッド
 *  - filters     : { columnName: value } の完全一致条件を任意個指定
 *  - rangeFilter : 範囲検索に使うカラム名と from / to
 *  - page        : 1 始まりのページ番号（未指定なら全件）
 *  - pageSize    : 1 ページ当たり件数（既定 50）
 *  - select      : '*' かカラム配列
 */
async listRecords<
T extends TableName
>(
table: T,
{
  filters,
  rangeFilter,
  page,
  pageSize = 50,
  select = '*' as SelectCols<RowType<T>>,
}: {
  filters?: Partial<RowType<T>>
  rangeFilter?: { column: keyof RowType<T>; from?: string | number; to?: string | number }
  page?: number
  pageSize?: number
  select?: SelectCols<RowType<T>>
},
): Promise<{ data: RowType<T>[]; count: number | null }> {
const operationName = `listRecords(${String(table)})`
return retryOperation(async () => {
  console.log(`[SupabaseService] Executing ${operationName}`, { filters, rangeFilter, page, pageSize, select })

  const sel = Array.isArray(select) ? select.join(',') : String(select);
  let query = this.client
    .from(table)
    .select(sel, { count: 'exact' })

  /* 完全一致フィルタ */
  if (filters) {
    for (const [col, val] of Object.entries(filters)) {
      // null / undefined は無視
      if (val !== undefined && val !== null) {
        query = query.eq(col as keyof RowType<T> & string, val)
      }
    }
  }

  /* 範囲フィルタ */
  if (rangeFilter) {
    const col = String(rangeFilter.column)
    if (rangeFilter.from !== undefined) query = query.gte(col, rangeFilter.from)
    if (rangeFilter.to   !== undefined) query = query.lte(col, rangeFilter.to)
  }

  /* ページネーション */
  if (page !== undefined) {
    const fromIdx = (page - 1) * pageSize
    query = query.range(fromIdx, fromIdx + pageSize - 1)
  }

  const { data, error, count } = await query
  if (error) {
    console.error(`[SupabaseService] ${operationName} error: ${error.message}`, { errorDetails: error })
    throw new Error(`Supabase listRecords error: ${error.message}`)
  }

  console.log(`[SupabaseService] ${operationName} success. Count: ${count}, Returned: ${data?.length ?? 0}`)
  return { data: (data ?? []) as unknown as RowType<T>[], count }
}, { ...this.defaultRetryOptions, operationName })
}
  
}

/* インスタンスをエクスポート ------------------------------------ */
export const supabaseService = new SupabaseService(supabaseAdmin)