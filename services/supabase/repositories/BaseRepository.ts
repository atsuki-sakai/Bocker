import { supabaseClientService, RowType, InsertType, UpdateType, TableName, SelectCols } from '../SupabaseService';
import { addCreationCommonFields, addUpdateCommonFields } from '../utils/helper';

/**
 * リポジトリの基本操作オプション
 */
export interface BaseRepositoryOptions<T extends TableName> {
  select?: SelectCols<RowType<T>>;
}

/**
 * ページネーション付きリスト取得オプション
 */
export interface ListOptions<T extends TableName> extends BaseRepositoryOptions<T> {
  page?: number;
  pageSize?: number;
  filters?: Partial<RowType<T>>;
  rangeFilter?: { column: keyof RowType<T>; from?: string | number; to?: string | number };
}

/**
 * 基底リポジトリクラス
 * Supabase の各テーブルに対する基本的な CRUD 操作を提供します。
 *
 * @template K テーブル名 (例: "customer", "reservation")
 */
export class BaseRepository<K extends TableName> {
  protected tableName: K;
  protected supabaseServiceInstance: typeof supabaseClientService;

  /**
   * BaseRepository のコンストラクタ
   * @param tableName - 操作対象のテーブル名
   * @param supabaseInstance - Supabase クライアントインスタンス (テスト用に注入可能)
   */
  constructor(tableName: K, supabaseInstance: typeof supabaseClientService = supabaseClientService) {
    this.tableName = tableName;
    this.supabaseServiceInstance = supabaseInstance;
  }

  /**
   * レコードを ID で取得します。
   * @param id - 取得するレコードの ID
   * @param options - 取得オプション (select カラムなど)
   * @returns 取得したレコード、または見つからない場合は null
   * @throws Supabaseエラーが発生した場合
   */
  async findByUid(
    uid: string,
    options?: BaseRepositoryOptions<K>
  ): Promise<RowType<K> | null> {
    console.log(`[BaseRepository<${this.tableName}>] findByUid: uid=${uid}, options=${JSON.stringify(options)}`);
    const { data } = await this.supabaseServiceInstance.listRecords<K>(this.tableName, {
      filters: { uid: uid } as unknown as Partial<RowType<K>>,
      select: options?.select,
      pageSize: 1,
    });
    if (data.length > 0) {
      console.log(`[BaseRepository<${this.tableName}>] findByUid successful: returned ${data.length} record(s)`);
      return data[0];
    }
    console.log(`[BaseRepository<${this.tableName}>] findByUid: No record found with uid=${uid}`);
    return null;
  }

  /**
   * 条件に一致する最初のレコードを取得します。
   * @param filters - 検索条件 (例: { email: 'test@example.com' })
   * @param options - 取得オプション (select カラムなど)
   * @returns 条件に一致した最初のレコード、または見つからない場合は null
   * @throws Supabaseエラーが発生した場合
   */
  async findOne(
    filters: Partial<RowType<K>>,
    options?: BaseRepositoryOptions<K>
  ): Promise<RowType<K> | null> {
    console.log(`[BaseRepository<${this.tableName}>] findOne: filters=${JSON.stringify(filters)}, options=${JSON.stringify(options)}`);
    const { data } = await this.supabaseServiceInstance.listRecords<K>(this.tableName, {
      filters,
      select: options?.select,
      pageSize: 1,
    });
    if (data.length > 0) {
      console.log(`[BaseRepository<${this.tableName}>] findOne successful: returned ${data.length} record(s)`);
      return data[0];
    }
    console.log(`[BaseRepository<${this.tableName}>] findOne: No record found with filters=${JSON.stringify(filters)}`);
    return null;
  }

  /**
   * 条件に一致する複数のレコードをページネーション付きで取得します。
   * @param listOptions - リスト取得オプション (ページ、ページサイズ、フィルタなど)
   * @returns レコードの配列と合計件数
   * @throws Supabaseエラーが発生した場合
   */
  async list(
    listOptions: ListOptions<K> = {}
  ): Promise<{ data: RowType<K>[]; count: number | null }> {
    console.log(`[BaseRepository<${this.tableName}>] list: options=${JSON.stringify(listOptions)}`);
    const result = await this.supabaseServiceInstance.listRecords<K>(this.tableName, listOptions);
    console.log(`[BaseRepository<${this.tableName}>] list successful: returned ${result.data.length} record(s), total count ${result.count}`);
    return result;
  }

  /**
   * 新しいレコードを作成します。
   * @param createData - 作成するレコードのデータ
   * @param options - 作成オプション (select カラムなど)
   * @returns 作成されたレコード
   * @throws Supabaseエラーまたはバリデーションエラーが発生した場合
   */
  async create(
    createData: InsertType<K>,
    options?: BaseRepositoryOptions<K>
  ): Promise<RowType<K>> {
    console.log(`[BaseRepository<${this.tableName}>] create: originalData=${JSON.stringify(createData)}, options=${JSON.stringify(options)}`);
    if (!('_id' in createData) || !createData._id) {
        console.warn(`[BaseRepository<${this.tableName}>] create: _id is not provided in createData. This might lead to issues if not handled by the database or specific repository.`);
    }
    // 共通作成フィールドを追加
    const dataWithCommonFields = addCreationCommonFields(createData);
    console.log(`[BaseRepository<${this.tableName}>] create: dataWithCommonFields=${JSON.stringify(dataWithCommonFields)}`);

    const result = await this.supabaseServiceInstance.upsert<K>(
      this.tableName,
      dataWithCommonFields as InsertType<K>, // 型アサーションが必要な場合がある
      { select: options?.select }
    );
    if (result.length === 0) {
      console.error(`[BaseRepository<${this.tableName}>] create failed: No data returned after upsert.`);
      throw new Error(`Failed to create record in ${this.tableName}: No data returned.`);
    }
    console.log(`[BaseRepository<${this.tableName}>] create successful: returned ${result.length} record(s)`);
    return result[0];
  }

  /**
   * 既存のレコードを ID で更新します。
   * @param id - 更新するレコードの ID
   * @param updateData - 更新するデータ (部分更新可能)
   * @param options - 更新オプション (select カラムなど)
   * @returns 更新されたレコード
   * @throws Supabaseエラーまたはレコードが見つからない場合
   */
  async update(
    id: string,
    updateData: UpdateType<K>,
    options?: BaseRepositoryOptions<K>
  ): Promise<RowType<K>> {
    console.log(`[BaseRepository<${this.tableName}>] update: id=${id}, originalData=${JSON.stringify(updateData)}, options=${JSON.stringify(options)}`);
    
    // 共通更新フィールドを追加
    const dataWithCommonFields = addUpdateCommonFields(updateData);
    console.log(`[BaseRepository<${this.tableName}>] update: dataWithCommonFields=${JSON.stringify(dataWithCommonFields)}`);

    // _id は updateData には通常含まれないため、ここで payload に含める
    const payload = { ...dataWithCommonFields, _id: id } as InsertType<K>;

    const result = await this.supabaseServiceInstance.upsert<K>(
      this.tableName,
      payload,
      {
        onConflict: '_id',
        select: options?.select,
      }
    );
    if (result.length === 0) {
      console.error(`[BaseRepository<${this.tableName}>] update failed for id=${id}: No data returned after upsert. Record might not exist or onConflict prevented update.`);
      throw new Error(`Failed to update record with id ${id} in ${this.tableName}. Record may not exist or update was prevented.`);
    }
    console.log(`[BaseRepository<${this.tableName}>] update successful: returned ${result.length} record(s)`);
    return result[0];
  }

  /**
   * レコードをキーで削除します。
   * @param key - 削除するレコードのキー
   * @param value - 削除するレコードの値
   * @returns Promise<void>
   * @throws Supabaseエラーが発生した場合
   */
  async delete(key: keyof RowType<K> & string, value: RowType<K>[typeof key]): Promise<void> {
    await this.supabaseServiceInstance.delete(this.tableName, key, value);
  }

  /**
   * 複数のレコードをバルクで作成または更新（Upsert）します。
   * @param records - 作成または更新するレコードの配列
   * @param onConflictColumn - コンフリクトが発生した場合に対象とするカラム (通常は主キー)
   * @param options - 操作オプション (select カラムなど)
   * @returns 作成または更新されたレコードの配列
   * @throws Supabaseエラーが発生した場合
   */
  async bulkUpsert(
    records: InsertType<K>[],
    onConflictColumn: keyof RowType<K> & string,
    options?: BaseRepositoryOptions<K>
  ): Promise<RowType<K>[]> {
    console.log(`[BaseRepository<${this.tableName}>] bulkUpsert: ${records.length} records, onConflict=${onConflictColumn}, options=${JSON.stringify(options)}`);
    const result = await this.supabaseServiceInstance.upsert<K>(
      this.tableName,
      records,
      {
        onConflict: onConflictColumn,
        select: options?.select,
      }
    );
    console.log(`[BaseRepository<${this.tableName}>] bulkUpsert successful: returned ${result.length} record(s)`);
    return result;
  }
}
