import { BaseRepository, ListOptions, BaseRepositoryOptions } from '../BaseRepository';
import type { RowType, InsertType, UpdateType } from '@/services/supabase/SupabaseService'; // supabase.types から直接も可
import { supabaseClientService } from '@/services/supabase/SupabaseService';
import { throwSupabaseError } from '@/services/supabase/utils/errors';

// テーブル名を指定して型を具体化

/**
 * 顧客 (Customer) テーブル操作リポジトリ
 */
export class CustomerRepository extends BaseRepository<'customer'> {

  constructor(protected supabaseServiceInstance: typeof supabaseClientService = supabaseClientService) {
    super('customer', supabaseServiceInstance);
  }

  /**
   * 新しい顧客を登録します。
   * _id はこのメソッド内で自動生成されます。
   * @param customerData - 登録する顧客データ (email, first_name など)
   * @returns 作成された顧客情報
   */
  async registerNewCustomer(
    customerData: InsertType<'customer'>
  ): Promise<RowType<'customer'>> {
    console.log(`[CustomerRepository] registerNewCustomer: data=${JSON.stringify(customerData)}`);
    const newCustomerDataWithId: InsertType<'customer'> = {
      ...customerData,
      // 共通フィールド (_creation_time, updated_time, is_archive) は BaseRepository の create メソッドで自動追加
    };
    return this.create(newCustomerDataWithId);
  }

  /**
   * 顧客情報、詳細情報、ポイント情報を一度に作成します。
   * 注意: このメソッドはアトミックなトランザクションを保証しません。
   *       本番環境では、データの整合性を保つためにSupabaseのRPC (データベース関数) の使用を強く推奨します。
   * @param customerCoreData - 顧客のコア情報 (email, first_name など)
   * @param detailData - 顧客詳細情報 (メモ、カスタムフィールドなど、_idやcustomer_id以外)
   * @param initialPoints - 初期ポイント数 (デフォルトは0)
   * @returns 作成された顧客、詳細、ポイントの情報を含むオブジェクト。エラー時はnullまたはエラーをスロー。
   */
  async createCustomerWithDetailsAndPoints(
    customerCoreData: InsertType<'customer'>,
    detailData: Omit<InsertType<'customer_detail'>, 'uid' | 'customer_uid' | '_creation_time' | 'updated_time' | 'is_archive'>,
    initialPoints: number = 0
  ): Promise<{ customer: RowType<'customer'> | null }> {
    console.log('[CustomerRepository] createCustomerWithDetailsAndPoints: Calling RPC for atomicity.')

    const params = {
      p_email: customerCoreData.email,
      p_first_name: customerCoreData.first_name,
      p_last_name: customerCoreData.last_name,
      p_phone: customerCoreData.phone,
      p_tenant_id: customerCoreData.tenant_id,
      p_org_id: customerCoreData.org_id,
      p_line_id: customerCoreData.line_id,
      p_line_user_name: customerCoreData.line_user_name,
      p_password_hash: customerCoreData.password_hash ?? null,
      // customer_detail fields
      p_detail_email: detailData.email, // customer_detail.email は customer.email と同じと仮定
      p_detail_gender: detailData.gender,
      p_detail_birthday: detailData.birthday,
      p_detail_age: detailData.age,
      p_detail_notes: detailData.notes,
      // customer_points fields
      p_initial_points: initialPoints,
    }

    try {
      const { data: createdCustomers, error } = await this.supabaseServiceInstance.rpc<RowType<'customer'>>(
        'create_customer_with_details_and_points',
        params
      )

      if (error) {
        console.error('[CustomerRepository] Error calling create_customer_with_details_and_points RPC:', error)
        throwSupabaseError({
          callFunc: 'CustomerRepository.createCustomerWithDetailsAndPoints (RPC)',
          message: error.message || 'Failed to create customer with details and points via RPC',
          error: error,
          severity: 'high',
          details: { params }
        })
        return { customer: null } // エラー時は null を返す (エラーは throwSupabaseError でスローされる)
      }

      if (!createdCustomers || createdCustomers.length === 0) {
        console.warn('[CustomerRepository] create_customer_with_details_and_points RPC returned no data.')
        // RPCがデータを返さなかった場合、エラーとして扱うか、特定の値を返すかは要件によります。
        // ここではエラーとして扱い、 SupabaseError を throw します。
        throwSupabaseError({
          callFunc: 'CustomerRepository.createCustomerWithDetailsAndPoints (RPC)',
          message: 'RPC create_customer_with_details_and_points returned no customer data.',
          severity: 'medium',
          code: 'DATABASE_NO_DATA',
          details: { params }
        })
        return { customer: null }; 
      }
      
      console.log('[CustomerRepository] Successfully created customer with details and points via RPC:', createdCustomers[0])
      return { customer: createdCustomers[0] }
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error('[CustomerRepository] Unexpected error in createCustomerWithDetailsAndPoints (RPC):', error)
      // 既に SupabaseError でない場合は、ここで throwSupabaseError を呼び出す
      if (!(error.name === 'SupabaseError')) { // SupabaseError は Supabase の client library が投げるエラーの name
         throwSupabaseError({
            callFunc: 'CustomerRepository.createCustomerWithDetailsAndPoints (RPC Catch)',
            message: error.message || 'Unexpected error during RPC call for customer registration.',
            error: error,
            severity: 'critical', // 予期せぬエラーはより高い深刻度
            details: { params }
        });
      }
      throw error; // SupabaseError の場合はそのまま再スロー
    }
  }

  /**
   * メールアドレスで顧客を検索します。
   * @param email - 検索するメールアドレス
   * @param options - 取得オプション
   * @returns 顧客情報、または null
   */
  async findByEmail(email: string, options?: BaseRepositoryOptions<'customer'>): Promise<RowType<'customer'> | null> {
    console.log(`[CustomerRepository] findByEmail: email=${email}, options=${JSON.stringify(options)}`);
    return this.findOne({ email } as Partial<RowType<'customer'>>, options); 
  }

  /**
   * 検索用テキストで顧客を検索します。
   * @param searchableText - 検索するテキスト(UserName, LineUserName, Email, Phone...)
   * @param options - 取得オプション
   * @returns 顧客情報、または null
   */
  async findSearchableText(searchableText: string, options?: BaseRepositoryOptions<'customer'>): Promise<RowType<'customer'> | null> {
    console.log(`[CustomerRepository] findSearchableText: searchableText=${searchableText}, options=${JSON.stringify(options)}`);
    return this.findOne({ searchable_text: searchableText } as Partial<RowType<'customer'>>, options); 
  }

  async findByTenantAndOrgAndCustomerEmail(tenantId: string, orgId: string, customerEmail: string, options?: BaseRepositoryOptions<'customer'>): Promise<RowType<'customer'> | null> {
    console.log(`[CustomerRepository] findBySalonAndCustomerEmail: tenantId=${tenantId}, orgId=${orgId}, customerEmail=${customerEmail}, options=${JSON.stringify(options)}`);
    return this.findOne({ tenant_id: tenantId, org_id: orgId, email: customerEmail } as Partial<RowType<'customer'>>, options); 
  }

  async findByTenantAndOrgAndCustomerLineId(tenantId: string, orgId: string, customerLineId: string, options?: BaseRepositoryOptions<'customer'>): Promise<RowType<'customer'> | null> {
    console.log(`[CustomerRepository] findBySalonAndCustomerLineId: tenantId=${tenantId}, orgId=${orgId}, customerLineId=${customerLineId}, options=${JSON.stringify(options)}`);
    return this.findOne({ tenant_id: tenantId, org_id: orgId, line_id: customerLineId } as Partial<RowType<'customer'>>, options); 
  }


  async deleteWithRelatedData(customerUid: string): Promise<void> {
    const { error } = await this.supabaseServiceInstance
      .rpc('delete_customer_and_related_data', { p_customer_uid: customerUid });
    if (error) {
      console.error('Error deleting customer and related data:', error);
      // 適切なエラーハンドリングを行う
      throw error;
    }
  }

  /**
   * 顧客情報、詳細情報、ポイント情報を一度に更新します。
   * @param customerUid - 更新対象の顧客UID
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param customerData - 顧客のコア情報
   * @param detailData - 顧客詳細情報
   * @param totalPoints - 総ポイント数
   * @param tags - タグ配列
   * @returns 更新された顧客情報
   */
  async updateCustomerWithDetailsAndPoints(
    customerUid: string,
    tenantId: string,
    orgId: string,
    customerData: Partial<Pick<InsertType<'customer'>, 'email' | 'first_name' | 'last_name' | 'phone' | 'line_id' | 'line_user_name'>>,
    detailData: Partial<Pick<InsertType<'customer_detail'>, 'email' | 'gender' | 'birthday' | 'age' | 'notes'>>,
    totalPoints: number,
    tags: string[] = []
  ): Promise<{ customer: RowType<'customer'> | null }> {
    console.log('[CustomerRepository] updateCustomerWithDetailsAndPoints: Calling RPC for atomicity.')

    const params = {
      p_customer_uid: customerUid,
      p_tenant_id: tenantId,
      p_org_id: orgId,
      p_email: customerData.email || '',
      p_first_name: customerData.first_name || '',
      p_last_name: customerData.last_name || '',
      p_phone: customerData.phone || '',
      p_line_id: customerData.line_id || '',
      p_line_user_name: customerData.line_user_name || '',
      p_detail_email: detailData.email || '',
      p_detail_gender: detailData.gender || '',
      p_detail_birthday: detailData.birthday || '',
      p_detail_age: detailData.age || 0,
      p_detail_notes: detailData.notes || '',
      p_total_points: totalPoints,
      p_tags: tags,
    }

    try {
      const { data: updatedCustomers, error } = await this.supabaseServiceInstance.rpc<RowType<'customer'>>(
        'update_customer_with_details_and_points',
        params
      )

      if (error) {
        console.error('[CustomerRepository] Error calling update_customer_with_details_and_points RPC:', error)
        throwSupabaseError({
          callFunc: 'CustomerRepository.updateCustomerWithDetailsAndPoints (RPC)',
          message: error.message || 'Failed to update customer with details and points via RPC',
          error: error,
          severity: 'high',
          details: { params }
        })
        return { customer: null }
      }

      if (!updatedCustomers || updatedCustomers.length === 0) {
        console.warn('[CustomerRepository] update_customer_with_details_and_points RPC returned no data.')
        throwSupabaseError({
          callFunc: 'CustomerRepository.updateCustomerWithDetailsAndPoints (RPC)',
          message: 'RPC update_customer_with_details_and_points returned no customer data.',
          severity: 'medium',
          code: 'DATABASE_NO_DATA',
          details: { params }
        })
        return { customer: null }
      }
      
      console.log('[CustomerRepository] Successfully updated customer with details and points via RPC:', updatedCustomers[0])
      return { customer: updatedCustomers[0] }
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error('[CustomerRepository] Unexpected error in updateCustomerWithDetailsAndPoints (RPC):', error)
      if (!(error.name === 'SupabaseError')) {
         throwSupabaseError({
            callFunc: 'CustomerRepository.updateCustomerWithDetailsAndPoints (RPC Catch)',
            message: error.message || 'Unexpected error during RPC call for customer update.',
            error: error,
            severity: 'critical',
            details: { params }
        });
      }
      throw error;
    }
  }

  /**
   * 顧客の完全な情報（顧客、詳細、ポイント）を取得します。
   * @param customerUid - 顧客UID
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @returns 完全な顧客情報
   */
  async getCompleteCustomerData(
    customerUid: string,
    tenantId: string,
    orgId: string
  ): Promise<{
    customer: RowType<'customer'> | null;
    customerDetail: RowType<'customer_detail'> | null;
    customerPoints: RowType<'customer_points'> | null;
  }> {
    console.log(`[CustomerRepository] getCompleteCustomerData: customerUid=${customerUid}, tenantId=${tenantId}, orgId=${orgId}`)

    try {
      // 顧客基本情報を取得
      const customer = await this.findOne({ 
        uid: customerUid, 
        tenant_id: tenantId, 
        org_id: orgId 
      } as Partial<RowType<'customer'>>)

      if (!customer) {
        return { customer: null, customerDetail: null, customerPoints: null }
      }

      // 顧客詳細情報を取得（BaseRepositoryのlistRecordsメソッドを使用）
      const { data: customerDetailData } = await this.supabaseServiceInstance.listRecords<'customer_detail'>('customer_detail', {
        filters: {
          customer_uid: customerUid,
          tenant_id: tenantId,
          org_id: orgId,
          is_archive: false
        } as Partial<RowType<'customer_detail'>>,
        pageSize: 1
      })

      // 顧客ポイント情報を取得（BaseRepositoryのlistRecordsメソッドを使用）
      const { data: customerPointsData } = await this.supabaseServiceInstance.listRecords<'customer_points'>('customer_points', {
        filters: {
          customer_uid: customerUid,
          tenant_id: tenantId,
          org_id: orgId,
          is_archive: false
        } as Partial<RowType<'customer_points'>>,
        pageSize: 1
      })

      return {
        customer,
        customerDetail: customerDetailData.length > 0 ? customerDetailData[0] : null,
        customerPoints: customerPointsData.length > 0 ? customerPointsData[0] : null,
      }
    } catch (error) {
      console.error('[CustomerRepository] Error in getCompleteCustomerData:', error)
      throw error
    }
  }

  /**
   * 名前による顧客検索（改良版・ページネーション対応）
   * @param tenantId - テナントID（salon_idにマップ）
   * @param orgId - 組織ID（現在はsalon_idのみを使用）
   * @param searchText - 検索するテキスト（複数フィールドでのOR検索）
   * @param options - 取得オプション（ページングなど）
   * @returns 検索結果の顧客リスト
   */
  async findBySearchableText(
    tenantId: string,
    orgId: string,
    searchText: string,
    options: ListOptions<'customer'> = {}
  ): Promise<{
    data: RowType<'customer'>[];
    count: number;
    hasMore: boolean;
  }> {
    console.log(`[CustomerRepository] findBySearchableText: START`, {
      tenantId,
      orgId,
      searchText,
      options
    });
    
    // 空文字検索の場合は早期リターン
    if (!searchText.trim()) {
      console.log(`[CustomerRepository] Empty search text, returning empty result`);
      return { data: [], count: 0, hasMore: false }
    }

    try {
      const { page = 1, pageSize = 50, select } = options;
      
      // 基本フィルタ（tenant_id, org_id, is_archive）
      const filters = {
        tenant_id: tenantId,
        org_id: orgId,
        is_archive: false,
      };
      
      // OR検索条件を構築（複数フィールドで検索）
      const searchPattern = `%${searchText}%`;
      const orConditions = [
        { column: 'email', operator: 'ilike', value: searchPattern },
        { column: 'phone', operator: 'ilike', value: searchPattern },
        { column: 'first_name', operator: 'ilike', value: searchPattern },
        { column: 'last_name', operator: 'ilike', value: searchPattern },
        { column: 'line_id', operator: 'ilike', value: searchPattern },
        { column: 'line_user_name', operator: 'ilike', value: searchPattern },
      ];
      
      console.log(`[CustomerRepository] Executing listRecords with OR search:`, {
        filters,
        orConditions,
        page,
        pageSize,
        select
      });

      // 複数フィールドでのOR検索を実行
      const result = await this.supabaseServiceInstance.listRecords<'customer'>('customer', {
        filters,
        orConditions,
        page,
        pageSize,
        select,
      });

      console.log(`[CustomerRepository] listRecords result:`, {
        dataLength: result.data.length,
        count: result.count,
        sampleCustomer: result.data[0] ? {
          uid: result.data[0].uid,
          firstName: result.data[0].first_name,
          lastName: result.data[0].last_name,
          phone: result.data[0].phone,
          email: result.data[0].email,
          lineId: result.data[0].line_id,
          lineUserName: result.data[0].line_user_name,
          tenantId: result.data[0].tenant_id,
          orgId: result.data[0].org_id
        } : 'No customers found'
      });

      // hasMoreを算出（count から判定）
      const hasMore = result.count !== null && result.count > page * pageSize;

      const finalResult = {
        data: result.data,
        count: result.count || 0,
        hasMore
      };
      
      console.log(`[CustomerRepository] findBySearchableText: COMPLETE`, finalResult);
      return finalResult;
    } catch (error) {
      console.error('[CustomerRepository] Unexpected error in findBySearchableText:', error);
      throw error;
    }
  }

  /**
   * デバッグ用：指定したテナント・組織の全顧客を取得（最初の5件）
   */
  async debugListAllCustomers(
    tenantId: string,
    orgId: string
  ): Promise<RowType<'customer'>[]> {
    console.log(`[CustomerRepository] debugListAllCustomers: tenantId=${tenantId}, orgId=${orgId}`);
    
    try {
      const result = await this.supabaseServiceInstance.listRecords<'customer'>('customer', {
        filters: {
          tenant_id: tenantId,
          org_id: orgId,
          is_archive: false,
        },
        pageSize: 5,
        page: 1,
      });
      
      console.log(`[CustomerRepository] debugListAllCustomers result:`, {
        count: result.count,
        dataLength: result.data.length,
        customers: result.data.map(c => ({
          uid: c.uid,
          firstName: c.first_name,
          lastName: c.last_name,
          phone: c.phone,
          searchableText: c.searchable_text,
          tenantId: c.tenant_id,
          orgId: c.org_id
        }))
      });
      
      return result.data;
    } catch (error) {
      console.error('[CustomerRepository] Error in debugListAllCustomers:', error);
      throw error;
    }
  }

  /**
   * 顧客のパスワードハッシュを更新します。
   * @param customerUid - 更新対象の顧客UID
   * @param passwordHash - 新しいパスワードハッシュ
   * @returns 更新された顧客情報
   */
  async updatePassword(customerUid: string, passwordHash: string): Promise<RowType<'customer'>> {
    console.log(`[CustomerRepository] updatePassword: customerUid=${customerUid}`);
    
    const result = await this.supabaseServiceInstance.upsert<'customer'>(
      'customer',
      { uid: customerUid, password_hash: passwordHash } as InsertType<'customer'>,
      { select: '*' }
    );
    
    if (result.length === 0) {
      console.error(`[CustomerRepository] updatePassword failed: No data returned for customerUid=${customerUid}`);
      throw new Error(`Failed to update password for customer ${customerUid}: No data returned.`);
    }
    
    console.log(`[CustomerRepository] updatePassword successful for customerUid=${customerUid}`);
    return result[0];
  }

  /**
   * 顧客ポイント（customer_points.total_points と last_transaction_date_unix）を更新します。
   * - 対象レコードが存在しない場合は新規作成（UPSERT）
   * @param customerUid   顧客UID
   * @param tenantId      テナントID
   * @param orgId         組織ID
   * @param totalPoints   設定する総ポイント数
   * @param lastTransactionDateUnix  最終取引日時（UNIX 秒）
   * @returns 更新後の customer_points レコード
   */
  async updateCustomerPoints(
    customerUid: string,
    tenantId: string,
    orgId: string,
    totalPoints: number,
    lastTransactionDateUnix: number,
  ): Promise<RowType<'customer_points'>> {
    console.log('[CustomerRepository] updateCustomerPoints: Start', {
      customerUid,
      tenantId,
      orgId,
      totalPoints,
      lastTransactionDateUnix,
    });

    // UPSERT 用データを構築
    const upsertData: InsertType<'customer_points'> = {
      uid: crypto.randomUUID(),            // 新規挿入時にのみ使用される
      customer_uid: customerUid,
      tenant_id: tenantId,
      org_id: orgId,
      total_points: totalPoints,
      last_transaction_date_unix: lastTransactionDateUnix,
    } as InsertType<'customer_points'>;

    try {
      // customer_uid / tenant_id / org_id の複合一意制約で UPSERT
      const updatedRecords = await this.supabaseServiceInstance.upsert<'customer_points'>(
        'customer_points',
        upsertData,
        {
          onConflict: 'customer_uid,tenant_id,org_id',
          select: '*',
        },
      );

      if (updatedRecords.length === 0) {
        throw throwSupabaseError({
          callFunc: 'CustomerRepository.updateCustomerPoints',
          message: '顧客のポイント更新に失敗しました。',
          severity: 'medium',
          code: 'DATABASE_NO_DATA',
          details: { upsertData },
        });
      }

      console.log('[CustomerRepository] updateCustomerPoints: Success', updatedRecords[0]);
      return updatedRecords[0];
    } catch (error) {
      console.error('[CustomerRepository] updateCustomerPoints: Unexpected error', error);
      // SupabaseError でない場合は SupabaseError にラップして再スロー
      if (!(error instanceof Error && (error as any).name === 'SupabaseError')) {
        throwSupabaseError({
          callFunc: 'CustomerRepository.updateCustomerPoints',
          message: (error as Error).message || '顧客のポイント更新に失敗しました。',
          error,
          severity: 'critical',
          details: { upsertData },
        });
      }
      throw error;
    }
  }
}


