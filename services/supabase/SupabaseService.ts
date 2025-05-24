import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/supabase.types'
import { throwSupabaseError } from './utils/errors'
import { CustomerRepository, CustomerDetailRepository, CustomerPointsRepository } from './repositories/customer'
import { ReservationRepository } from './repositories/ReservationRepository'

/* 型エイリアス --------------------------------------------------- */
export type Tables = Database['public']['Tables']
export type TableName = keyof Tables
export type RowType<K extends TableName> = Tables[K]['Row'];
export type InsertType<K extends TableName> = Tables[K]['Insert'];
export type UpdateType<K extends TableName> = Tables[K]['Update'];
export type SelectCols<R> = '*' | keyof R | (keyof R)[];

/* クライアント --------------------------------------------------- */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // クライアントサイドでは参照しない

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL. Please check your .env file.')
}
if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
// export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey) // モジュールロード時の初期化を削除

// サーバーサイド用 Supabase Admin クライアントを作成するファクトリ関数
export function createSupabaseAdminClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY. This client is intended for server-side use only.');
  }
  if (!supabaseUrl) { // supabaseUrlもここでチェック（通常は上でチェックされるが念のため）
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL for admin client.');
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

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
interface FetchOptions<K extends TableName> {
  /** 取得カラム（既定 `"*"`） */
  select?: SelectCols<RowType<K>>
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

interface UpsertOptions<K extends TableName> {
  onConflict?: string
  select?: SelectCols<RowType<K>>
}

/* サービスクラス ------------------------------------------------- */
class SupabaseBaseService {
  private client: SupabaseClient
  private defaultRetryOptions = { retries: 3, delay: 1000 }

  constructor(private supabaseInstance: SupabaseClient) {
    this.client = supabaseInstance;
  }

  /** ページネーション対応 SELECT */
  async fetch<K extends TableName>(
    table: K,
    {
      select = '*' as SelectCols<RowType<K>>,
      page,
      pageSize,
      limit,
      offset = 0,
      count = 'exact',
    }: FetchOptions<K> = {},
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
        throw throwSupabaseError({
          callFunc: `SupabaseService.fetch(${String(table)})`,
          message: error.message,
          title: `Supabase fetch error from table ${String(table)}`,
          severity: 'high',
          code: 'DATABASE_ERROR',
          status: 500,
          details: {
            table,
            select,
          },
          error: error,
        })
      }
      console.log(`[SupabaseService] ${operationName} success. Count: ${total}, Returned: ${data?.length ?? 0}`)
      return { data: (data ?? []) as unknown as RowType<K>[], count: total }
    }, { ...this.defaultRetryOptions, operationName });
  }

  /**
   * Supabase RPC (Remote Procedure Call) を実行します。
   * @param fn 関数名
   * @param params 関数に渡すパラメータ
   * @param options オプション（ヘッドレスなど）
   */
  async rpc<T = any>(
    fn: string,
    params?: object,
    options?: { head?: boolean; count?: 'exact' | 'planned' | 'estimated' }
  ): Promise<{ data: T[]; error: any; count: number | null }> {
    const operationName = `rpc call to ${fn}`
    return retryOperation(async () => {
      console.log(`[SupabaseService] Executing ${operationName}`, { fn, params, options });
      const query = this.client.rpc(fn, params as any, options)
      
      const { data, error, count } = await query;

      if (error) {
        throw throwSupabaseError({
          callFunc: `SupabaseService.rpc(${fn})`,
          message: error.message,
          title: `Supabase RPC error for function ${fn}`,
          severity: 'high',
          code: 'DATABASE_ERROR',
          status: 500,
          details: {
            functionName: fn,
            params,
            options
          },
          error: error,
        });
      }
      console.log(`[SupabaseService] ${operationName} success. Returned: ${data?.length ?? 0}, Count: ${count}`);
      return { data: (data ?? []) as T[], error, count };
    }, { ...this.defaultRetryOptions, operationName });
  }

  /** バルク UPSERT */
  async upsert<K extends TableName>(
    table: K,
    rows: InsertType<K>[] | InsertType<K>,
    { onConflict, select = '*' as SelectCols<RowType<K>> }: UpsertOptions<K> = {},
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
        throw throwSupabaseError({
          callFunc: `SupabaseService.upsert(${String(table)})`,
          message: error.message,
          title: `Supabase upsert error to table ${String(table)}`,
          severity: 'high',
          code: 'DATABASE_ERROR',
          status: 500,
          details: {
            table,
            onConflict,
            select,
          },
          error: error,
        })
      }
      console.log(`[SupabaseService] ${operationName} success. Returned: ${data?.length ?? 0}`)
      return (data ?? []) as unknown as RowType<K>[]
    }, { ...this.defaultRetryOptions, operationName });
  }

  /** _id 指定 DELETE */
  async delete<K extends TableName>(
    table: K, 
    idColumn: keyof RowType<K> & string, 
    idValue: RowType<K>[typeof idColumn]
  ): Promise<void> {
    const operationName = `delete from ${String(table)} with ${String(idColumn)} = ${idValue}`
    return retryOperation(async () => {
      console.log(`[SupabaseService] Executing ${operationName}`, { table, idColumn, idValue });
      const { error } = await this.client.from(table).delete().eq(idColumn as string, idValue)
      if (error) {
        throw throwSupabaseError({
          callFunc: `SupabaseService.delete(${String(table)})`,
          message: error.message,
          title: `Supabase delete error from table ${String(table)} for ${String(idColumn)} = ${idValue}`,
          severity: 'high',
          code: 'DATABASE_ERROR',
          status: 500,
          details: {
            table,
            idColumn,
            idValue,
          },
          error: error,
        })
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
    throw throwSupabaseError({
      callFunc: `SupabaseService.listRecords(${String(table)})`,
      message: error.message,
      title: `Supabase listRecords error from table ${String(table)}`,
      severity: 'high',
      code: 'DATABASE_ERROR',
      status: 500,
      details: {
        table,
        filters,
        rangeFilter,
        page,
        pageSize,
        select,
      },
      error: error,
    })
  }

  console.log(`[SupabaseService] ${operationName} success. Count: ${count}, Returned: ${data?.length ?? 0}`)
  return { data: (data ?? []) as unknown as RowType<T>[], count }
}, { ...this.defaultRetryOptions, operationName })
}
  
}

class SupabaseService extends SupabaseBaseService {
  public readonly customer: CustomerRepository
  public readonly reservation: ReservationRepository
  public readonly customerDetail: CustomerDetailRepository
  public readonly customerPoints: CustomerPointsRepository

  constructor(supabaseInstance: SupabaseClient) {
    super(supabaseInstance)
    this.reservation = new ReservationRepository(this)
    this.customer = new CustomerRepository(this)
    this.customerDetail = new CustomerDetailRepository(this)
    this.customerPoints = new CustomerPointsRepository(this)
  }

  async registerCustomerWithDetailsAndInitialPoints(
    customerCoreData: Pick<InsertType<'customer'>, 'email' | 'first_name' | 'last_name' | 'phone' | 'salon_id' | 'line_id' | 'line_user_name' | 'password_hash'>,
    detailData: Omit<InsertType<'customer_detail'>, '_id' | 'customer_id' | '_creation_time' | 'updated_time' | 'is_archive'>, 
    initialPoints: number = 0
  ): ReturnType<CustomerRepository['createCustomerWithDetailsAndPoints']> { 
    console.log("[SupabaseService] Calling CustomerRepository.createCustomerWithDetailsAndPoints");
    try {
      return await this.customer.createCustomerWithDetailsAndPoints(customerCoreData, detailData, initialPoints);
    } catch (error) {
      console.error("[SupabaseService] Error calling createCustomerWithDetailsAndPoints from CustomerRepository:", error);
      if (error instanceof Error && !(error.name === 'SupabaseError')) {
         throwSupabaseError({
            callFunc: 'SupabaseService.registerCustomerWithDetailsAndInitialPoints',
            message: `Failed during customer registration with details: ${error.message}`,
            error: error,
            severity: 'high',
        });
      }
      throw error; 
    }
  }
}


// クライアントサイド用 (Anon権限)
export const supabaseClientService = new SupabaseService(supabase); 

// サーバーサイド用 (Admin権限)
export const getSupabaseAdminService = () => new SupabaseService(createSupabaseAdminClient());
