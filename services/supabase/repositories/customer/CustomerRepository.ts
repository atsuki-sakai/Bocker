import { BaseRepository, ListOptions, BaseRepositoryOptions } from '../BaseRepository';
import type { RowType, InsertType } from '@/services/supabase/SupabaseService'; // supabase.types から直接も可
import { supabaseClientService } from '@/services/supabase/SupabaseService';
import { throwSupabaseError } from '@/services/supabase/utils/errors';
import { generateUUID } from '@/services/supabase/utils/uuid';

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
      // 共通フィールド (created_at, updated_at, is_archive) は BaseRepository の create メソッドで自動追加
    };
    return this.create(newCustomerDataWithId);
  }

  /**
   * 顧客情報、詳細情報、ポイント情報を一度に作成します。
   * 注意: このメソッドはアトミックなトランザクションを保証しません。
   *       本番環境では、データの整合性を保つためにSupabaseのRPC (データベース関数) の使用を強く推奨します。
   * @param customerCoreData - 顧客のコア情報 (email, first_name など)
   * @param detailData - 顧客詳細情報 (メモ、カスタムフィールドなど、_idやcustomer_uid以外)
   * @param initialPoints - 初期ポイント数 (デフォルトは0)
   * @returns 作成された顧客、詳細、ポイントの情報を含むオブジェクト。エラー時はnullまたはエラーをスロー。
   */
  async createCustomerWithDetailsAndPoints(
    customerCoreData: InsertType<'customer'>,
    detailData: Omit<InsertType<'customer_detail'>, 'uid' | 'customer_uid' | 'created_at' | 'updated_at' | 'is_archive'>,
    initialPoints: number = 0
  ): Promise<{ customer: RowType<'customer'> | null }> {
    console.log('[CustomerRepository] createCustomerWithDetailsAndPoints: Calling RPC for atomicity.')

    const params = {
      p_email: customerCoreData.email || null,
      p_first_name: customerCoreData.first_name || '',
      p_last_name: customerCoreData.last_name || '',
      p_phone: customerCoreData.phone || '',
      p_tenant_id: customerCoreData.tenant_id || '',
      p_org_id: customerCoreData.org_id || '',
      p_line_id: customerCoreData.line_id || null,
      p_line_user_name: customerCoreData.line_user_name || null,
      p_password_hash: customerCoreData.password_hash ?? null,
      // customer_detail fields
      p_detail_email: detailData.email || null,
      p_detail_gender: detailData.gender || null,
      p_detail_birthday: detailData.birthday || null,
      p_detail_age: detailData.age ?? 0,
      p_detail_notes: detailData.notes || '',
      // customer_points fields
      p_initial_points: initialPoints,
      // customer_type field (new parameter)
      p_customer_type: customerCoreData.customer_type || 'first_time',
    }
    
    console.log('[CustomerRepository] RPC params before sanitization:', JSON.stringify(params, null, 2))

    try {
      // ------------------------------------------------------------
      // PostgREST は undefined のフィールドを JSON から削除してしまう。 
      // その結果、関数シグネチャと引数リストが一致せず
      // 「function not found in the schema cache」というエラーになる。
      // 予約フローでは email が無いケースがあるため、
      // undefined → null に変換して **必ず 16 個のキー** を送信する。
      // ------------------------------------------------------------

      const sanitizedParams = Object.fromEntries(
        Object.entries(params).map(([key, value]) => [key, value === undefined ? null : value])
      ) as typeof params
      
      console.log('[CustomerRepository] RPC params after sanitization:', JSON.stringify(sanitizedParams, null, 2))
      console.log('[CustomerRepository] Param count:', Object.keys(sanitizedParams).length)

      const { data: createdCustomers, error } = await this.supabaseServiceInstance.rpc<RowType<'customer'>>(
        'create_customer_with_details_and_points',
        sanitizedParams
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
    try {
      // Use the proper RPC function that handles deletion order correctly
      // This ensures all related data is deleted in the correct order regardless of foreign key constraint settings
      const { error } = await this.supabaseServiceInstance.rpc(
        'delete_customer_and_related_data',
        { p_customer_uid: customerUid }
      );
      
      if (error) {
        console.error(`[CustomerRepository] RPC delete_customer_and_related_data error for uid=${customerUid}:`, error);
        throwSupabaseError({
          callFunc: 'CustomerRepository.deleteWithRelatedData',
          message: `顧客とその関連データの削除に失敗しました: ${error.message}`,
          error: new Error(error.message),
          severity: 'high',
          details: { customerUid }
        });
      }
      
      console.log(`Successfully deleted customer ${customerUid} and all related data via RPC function`);
    } catch (error) {
      console.error('Error deleting customer and related data:', error);
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
      p_line_id: customerData.line_id === undefined ? null : customerData.line_id || '',
      p_line_user_name: customerData.line_user_name === undefined ? null : customerData.line_user_name || '',
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
      // 顧客基本情報を取得（customerUidがTEXT型の場合はUUIDにキャスト）
      let customer: RowType<'customer'> | null = null;
      
      try {
        // まずUUID型として検索を試行
        customer = await this.findOne({ 
          uid: customerUid, 
          tenant_id: tenantId, 
          org_id: orgId 
        } as Partial<RowType<'customer'>>);
      } catch (error) {
        // UUID形式エラーの場合、TEXT型からUUID型への変換を試行
        if (error instanceof Error && error.message.includes('invalid input syntax for type uuid')) {
          console.log(`[CustomerRepository] Attempting UUID cast for customer_uid: ${customerUid}`);
          
          // Supabaseの専用関数を使用してTEXT型UUIDを変換
          const { data: customerData, error: rpcError } = await this.supabaseServiceInstance.rpc<RowType<'customer'>>(
            'find_customer_by_text_uuid',
            {
              p_customer_uid: customerUid,
              p_tenant_id: tenantId,
              p_org_id: orgId
            }
          );
            
          if (rpcError) {
            console.error('[CustomerRepository] UUID conversion RPC failed:', rpcError);
            throw rpcError;
          }
          
          if (customerData && customerData.length > 0) {
            customer = customerData[0];
          } else {
            console.warn(`[CustomerRepository] Customer not found with UUID conversion: ${customerUid}`);
          }
        } else {
          throw error;
        }
      }

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
   * 顧客の基本情報を更新します。
   * @param customerUid - 更新対象の顧客UID
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param updateData - 更新する顧客データ
   * @returns 更新された顧客情報
   */
  async updateCustomer(
    customerUid: string,
    tenantId: string,
    orgId: string,
    updateData: Partial<Pick<InsertType<'customer'>, 'email' | 'first_name' | 'last_name' | 'phone' | 'line_id' | 'line_user_name' | 'last_reservation_date_unix' | 'total_reservation_count' | 'customer_type'>>
  ): Promise<RowType<'customer'>> {
    console.log(`[CustomerRepository] updateCustomer: customerUid=${customerUid}, tenantId=${tenantId}, orgId=${orgId}, updateData=${JSON.stringify(updateData)}`);
    
    try {
      // JSONBパラメータ用のオブジェクトを作成
      const params: Record<string, string | number | null> = {
        p_customer_uid: customerUid,
        p_tenant_id: tenantId,
        p_org_id: orgId
      };

      // オプションパラメータは値が存在する場合のみ追加
      if (updateData.email !== undefined) params.p_email = updateData.email;
      if (updateData.first_name !== undefined) params.p_first_name = updateData.first_name;
      if (updateData.last_name !== undefined) params.p_last_name = updateData.last_name;
      if (updateData.phone !== undefined) params.p_phone = updateData.phone;
      if (updateData.line_id !== undefined) params.p_line_id = updateData.line_id;
      if (updateData.line_user_name !== undefined) params.p_line_user_name = updateData.line_user_name;
      if (updateData.last_reservation_date_unix !== undefined) params.p_last_reservation_date_unix = updateData.last_reservation_date_unix;
      if (updateData.total_reservation_count !== undefined) params.p_total_reservation_count = updateData.total_reservation_count;
      if (updateData.customer_type !== undefined) params.p_customer_type = updateData.customer_type;

      console.log('[CustomerRepository] Calling update_customer_json RPC with params:', params);

      // JSON版のRPCを呼び出す（パラメータ順序の問題を回避）
      const { data, error } = await this.supabaseServiceInstance.rpc<RowType<'customer'>>(
        'update_customer_json',
        { params }
      );
      
      if (error) {
        console.error('[CustomerRepository] Error calling update_customer RPC:', error);
        throwSupabaseError({
          callFunc: 'CustomerRepository.updateCustomer',
          message: '顧客の更新に失敗しました。',
          error: new Error(error.message),
          severity: 'high',
          details: { customerUid, tenantId, orgId, updateData }
        });
      }
      
      if (!data || data.length === 0) {
        throwSupabaseError({
          callFunc: 'CustomerRepository.updateCustomer',
          message: '顧客の更新に失敗しました。対象の顧客が見つかりません。',
          severity: 'medium',
          code: 'DATABASE_NO_DATA',
          details: { customerUid, tenantId, orgId, updateData }
        });
      }
      
      console.log('[CustomerRepository] updateCustomer: Success', data[0]);
      return data[0];
    } catch (error) {
      console.error('[CustomerRepository] updateCustomer: Unexpected error', error);
      if (error instanceof Error && error.constructor.name === 'SupabaseError') {
        throw error;
      }
      throwSupabaseError({
        callFunc: 'CustomerRepository.updateCustomer',
        message: (error as Error).message || '顧客の更新に失敗しました。',
        error: error as Error,
        severity: 'high',
        details: { customerUid, tenantId, orgId, updateData }
      });
    }
    
    // 到達不可能なコードだが、TypeScriptの型チェックのために追加
    throw new Error('Unexpected error in updateCustomer');
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
      uid: generateUUID(),            // 新規挿入時にのみ使用される
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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


  /**
   * アトミックポイント更新操作
   * ポイント残高の更新と取引履歴の記録を同時に行い、データ整合性を保証します
   * 
   * @param customerUid - 顧客UID
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param pointsDelta - ポイント変動量（正数：付与、負数：使用）
   * @param transactionType - 取引タイプ ('earned' | 'used' | 'expired' など)
   * @param description - 取引説明
   * @param reservationId - 関連予約ID（オプション）
   * @returns 新しい残高と取引ID
   */
  async updatePointsAtomic(
    customerUid: string,
    tenantId: string,
    orgId: string,
    pointsDelta: number,
    transactionType: string,
    description: string,
    reservationId?: string
  ): Promise<{ newTotalPoints: number; transactionId: string }> {
    console.log(`[CustomerRepository] updatePointsAtomic: customerUid=${customerUid}, pointsDelta=${pointsDelta}, type=${transactionType}`);
    
    try {
      // RPC関数を呼び出してアトミック操作を実行
      const { data, error } = await this.supabaseServiceInstance.rpc<{
        new_total_points: number;
        transaction_id: string;
      }>('update_customer_points_atomic', {
        p_customer_uid: customerUid,
        p_tenant_id: tenantId,
        p_org_id: orgId,
        p_points_delta: pointsDelta,
        p_transaction_type: transactionType,
        p_description: description,
        p_reservation_id: reservationId || null
      });

      if (error) {
        console.error('[CustomerRepository] updatePointsAtomic: RPC error', error);
        throwSupabaseError({
          callFunc: 'CustomerRepository.updatePointsAtomic',
          message: `アトミックポイント更新に失敗しました: ${error.message}`,
          error: new Error(error.message),
          severity: 'high',
          details: { customerUid, pointsDelta, transactionType, description }
        });
      }

      if (!data || data.length === 0) {
        throwSupabaseError({
          callFunc: 'CustomerRepository.updatePointsAtomic',
          message: 'アトミックポイント更新の結果が空です',
          severity: 'high',
          details: { customerUid, pointsDelta, transactionType, description }
        });
      }

      const result = data[0];
      console.log(`[CustomerRepository] updatePointsAtomic: Success - newBalance=${result.new_total_points}, transactionId=${result.transaction_id}`);
      
      return {
        newTotalPoints: result.new_total_points,
        transactionId: result.transaction_id
      };
    } catch (error) {
      console.error('[CustomerRepository] updatePointsAtomic: Error', error);
      if (error instanceof Error && error.constructor.name === 'SupabaseError') {
        throw error;
      }
      
      throwSupabaseError({
        callFunc: 'CustomerRepository.updatePointsAtomic',
        message: `アトミックポイント更新に失敗しました: ${(error as Error).message}`,
        error: error as Error,
        severity: 'critical',
        details: { customerUid, pointsDelta, transactionType, description }
      });
    }
    
    // 到達不可能なコードだが、TypeScriptの型チェックのために追加
    throw new Error('Unexpected error in updatePointsAtomic');
  }

  /**
   * 高速顧客検索（RPC版）
   * PostgreSQL側で最適化された検索処理を実行し、JSONBで結果を返す
   * 
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param searchText - 検索テキスト
   * @param page - ページ番号（1始まり）
   * @param pageSize - ページサイズ
   * @returns 検索結果と総件数
   */
  async searchCustomersOptimized(
    tenantId: string,
    orgId: string,
    searchText: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{
    customers: Array<{
      uid: string;
      email: string | null;
      first_name: string | null;
      last_name: string | null;
      phone: string | null;
      line_user_name: string | null;
      total_reservation_count: number | null;
      last_reservation_date_unix: number | null;
    }>;
    totalCount: number;
    hasMore: boolean;
  }> {
    console.log(`[CustomerRepository] searchCustomersOptimized: START`, {
      tenantId,
      orgId,
      searchText,
      page,
      pageSize
    });

    try {
      const { data, error } = await this.supabaseServiceInstance.rpc<{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        customers: any; // JSONB型
        total_count: number;
        has_more: boolean;
      }>('search_customers_optimized', {
        p_tenant_id: tenantId,
        p_org_id: orgId,
        p_search_text: searchText,
        p_page: page,
        p_page_size: pageSize
      });

      if (error) {
        console.error('[CustomerRepository] searchCustomersOptimized: RPC error', error);
        throwSupabaseError({
          callFunc: 'CustomerRepository.searchCustomersOptimized',
          message: `高速顧客検索に失敗しました: ${error.message}`,
          error: new Error(error.message),
          severity: 'high',
          details: { tenantId, orgId, searchText, page, pageSize }
        });
      }

      if (!data || data.length === 0) {
        return {
          customers: [],
          totalCount: 0,
          hasMore: false
        };
      }

      const result = data[0];
      console.log(`[CustomerRepository] searchCustomersOptimized: Success`, {
        customersCount: result.customers?.length || 0,
        totalCount: result.total_count,
        hasMore: result.has_more
      });

      return {
        customers: result.customers || [],
        totalCount: result.total_count || 0,
        hasMore: result.has_more || false
      };
    } catch (error) {
      console.error('[CustomerRepository] searchCustomersOptimized: Error', error);
      if (error instanceof Error && error.constructor.name === 'SupabaseError') {
        throw error;
      }
      
      throwSupabaseError({
        callFunc: 'CustomerRepository.searchCustomersOptimized',
        message: `高速顧客検索に失敗しました: ${(error as Error).message}`,
        error: error as Error,
        severity: 'high',
        details: { tenantId, orgId, searchText, page, pageSize }
      });
    }
    
    // 到達不可能なコードだが、TypeScriptの型チェックのために追加
    throw new Error('Unexpected error in searchCustomersOptimized');
  }

  /**
   * ポイント残高再計算
   * 取引履歴から正しい残高を再計算し、不整合を修正します
   * 
   * @param customerUid - 顧客UID
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @returns 残高の修正結果
   */
  async recalculatePointsBalance(
    customerUid: string,
    tenantId: string,
    orgId: string
  ): Promise<{ oldBalance: number; newBalance: number; difference: number }> {
    console.log(`[CustomerRepository] recalculatePointsBalance: customerUid=${customerUid}`);
    
    try {
      const { data, error } = await this.supabaseServiceInstance.rpc<{
        old_balance: number;
        new_balance: number;
        difference: number;
      }>('recalculate_customer_points_balance', {
        p_customer_uid: customerUid,
        p_tenant_id: tenantId,
        p_org_id: orgId
      });

      if (error) {
        console.error('[CustomerRepository] recalculatePointsBalance: RPC error', error);
        throwSupabaseError({
          callFunc: 'CustomerRepository.recalculatePointsBalance',
          message: `ポイント残高再計算に失敗しました: ${error.message}`,
          error: new Error(error.message),
          severity: 'medium',
          details: { customerUid, tenantId, orgId }
        });
      }

      if (!data || data.length === 0) {
        throwSupabaseError({
          callFunc: 'CustomerRepository.recalculatePointsBalance',
          message: 'ポイント残高再計算の結果が空です',
          severity: 'medium',
          details: { customerUid, tenantId, orgId }
        });
      }

      const result = data[0];
      console.log(`[CustomerRepository] recalculatePointsBalance: Success - oldBalance=${result.old_balance}, newBalance=${result.new_balance}, difference=${result.difference}`);
      
      return {
        oldBalance: result.old_balance,
        newBalance: result.new_balance,
        difference: result.difference
      };
    } catch (error) {
      console.error('[CustomerRepository] recalculatePointsBalance: Error', error);
      if (error instanceof Error && error.constructor.name === 'SupabaseError') {
        throw error;
      }
      
      throwSupabaseError({
        callFunc: 'CustomerRepository.recalculatePointsBalance',
        message: `ポイント残高再計算に失敗しました: ${(error as Error).message}`,
        error: error as Error,
        severity: 'medium',
        details: { customerUid, tenantId, orgId }
      });
    }
    
    // 到達不可能なコードだが、TypeScriptの型チェックのために追加
    throw new Error('Unexpected error in recalculatePointsBalance');
  }

  /**
   * 大規模SaaS向け高性能顧客名一括取得
   * 複数の顧客UIDから顧客名を効率的に取得します。
   * - PostgreSQL IN句による一括取得でクエリ回数を最小化
   * - Email形式の名前を実名で置き換える優先度ロジック
   * - 大量データ対応のバッチ処理（最大1000件/リクエスト）
   * 
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param customerUids - 顧客UID配列（最大1000件まで）
   * @returns 顧客UID -> 顧客名のマップ
   */
  async getCustomerNamesBatch(
    tenantId: string,
    orgId: string,
    customerUids: string[]
  ): Promise<Map<string, string>> {
    console.log(`[CustomerRepository] getCustomerNamesBatch: tenantId=${tenantId}, orgId=${orgId}, customerCount=${customerUids.length}`);
    
    // 空配列の場合は早期リターン
    if (customerUids.length === 0) {
      return new Map();
    }

    // PostgreSQLのIN句制限とメモリ使用量を考慮して最大1000件に制限
    if (customerUids.length > 1000) {
      console.warn(`[CustomerRepository] getCustomerNamesBatch: Too many customer UIDs (${customerUids.length}), limiting to 1000`);
      customerUids = customerUids.slice(0, 1000);
    }

    try {
      // 重複除去して効率化
      const uniqueUids = [...new Set(customerUids)];
      
      console.log(`[CustomerRepository] getCustomerNamesBatch: Fetching ${uniqueUids.length} unique customers`);

      // PostgreSQLのRPC関数を使用して高速な一括取得
      const { data, error } = await this.supabaseServiceInstance.rpc<{
        customer_uid: string;
        display_name: string;
        is_email_format: boolean;
      }>('get_customer_names_batch_optimized', {
        p_tenant_id: tenantId,
        p_org_id: orgId,
        p_customer_uids: uniqueUids
      });

      if (error) {
        console.error('[CustomerRepository] getCustomerNamesBatch: RPC error', error);
        throwSupabaseError({
          callFunc: 'CustomerRepository.getCustomerNamesBatch',
          message: `顧客名一括取得に失敗しました: ${error.message}`,
          error: new Error(error.message),
          severity: 'high',
          details: { tenantId, orgId, customerUidsCount: uniqueUids.length }
        });
      }

      // 結果をMapに変換
      const customerNamesMap = new Map<string, string>();
      
      if (data && data.length > 0) {
        // Email形式の名前を実名で置き換える処理
        const customerNameGroups = new Map<string, Array<{ name: string; isEmail: boolean }>>();
        
        // 同一顧客の名前を収集
        data.forEach(customer => {
          if (!customerNameGroups.has(customer.customer_uid)) {
            customerNameGroups.set(customer.customer_uid, []);
          }
          customerNameGroups.get(customer.customer_uid)!.push({
            name: customer.display_name,
            isEmail: customer.is_email_format
          });
        });

        // 各顧客について最適な名前を選択
        customerNameGroups.forEach((names, uid) => {
          // Email形式でない名前を優先、なければEmail形式の名前を使用
          const nonEmailName = names.find(n => !n.isEmail);
          const finalName = nonEmailName ? nonEmailName.name : names[0]?.name || '';
          customerNamesMap.set(uid, finalName);
        });
      }

      console.log(`[CustomerRepository] getCustomerNamesBatch: Success - retrieved ${customerNamesMap.size} customer names`);
      return customerNamesMap;
    } catch (error) {
      console.error('[CustomerRepository] getCustomerNamesBatch: Error', error);
      if (error instanceof Error && error.constructor.name === 'SupabaseError') {
        throw error;
      }
      
      throwSupabaseError({
        callFunc: 'CustomerRepository.getCustomerNamesBatch',
        message: `顧客名一括取得に失敗しました: ${(error as Error).message}`,
        error: error as Error,
        severity: 'high',
        details: { tenantId, orgId, customerUidsCount: customerUids.length }
      });
    }
    
    // 到達不可能なコードだが、TypeScriptの型チェックのために追加
    throw new Error('Unexpected error in getCustomerNamesBatch');
  }

  /**
   * 大規模データ対応の分割バッチ処理
   * 1000件を超える場合の自動分割処理
   * 
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param customerUids - 顧客UID配列（件数制限なし）
   * @returns 顧客UID -> 顧客名のマップ
   */
  async getCustomerNamesLargeBatch(
    tenantId: string,
    orgId: string,
    customerUids: string[]
  ): Promise<Map<string, string>> {
    console.log(`[CustomerRepository] getCustomerNamesLargeBatch: Processing ${customerUids.length} customer UIDs`);
    
    const BATCH_SIZE = 1000;
    const allResults = new Map<string, string>();
    
    // 重複除去
    const uniqueUids = [...new Set(customerUids)];
    
    // バッチ処理で分割実行
    for (let i = 0; i < uniqueUids.length; i += BATCH_SIZE) {
      const batch = uniqueUids.slice(i, i + BATCH_SIZE);
      console.log(`[CustomerRepository] getCustomerNamesLargeBatch: Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(uniqueUids.length/BATCH_SIZE)} (${batch.length} items)`);
      
      const batchResults = await this.getCustomerNamesBatch(tenantId, orgId, batch);
      
      // 結果をマージ
      batchResults.forEach((name, uid) => {
        allResults.set(uid, name);
      });
    }
    
    console.log(`[CustomerRepository] getCustomerNamesLargeBatch: Completed - retrieved ${allResults.size} customer names from ${uniqueUids.length} requests`);
    return allResults;
  }

  /**
   * 大規模SaaS向け顧客データエクスポート機能
   * 複数の選択オプションに対応した高性能エクスポート
   * 
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param options - エクスポートオプション
   * @returns エクスポート用顧客データ
   */
  async exportCustomerData(
    tenantId: string,
    orgId: string,
    options: {
      // エクスポート方式選択
      exportType: 'all' | 'by_ids' | 'by_count';
      
      // ID指定エクスポート用
      customerUids?: string[];
      
      // 件数指定エクスポート用
      maxCount?: number;
      offset?: number;
      
      // フィルタ条件
      filters?: {
        customerType?: string;
        hasReservations?: boolean;
        registrationDateFrom?: string;
        registrationDateTo?: string;
        lastReservationDateFrom?: string;
        lastReservationDateTo?: string;
      };
      
      // 含める情報の選択
      includeDetails?: boolean;
      includePoints?: boolean;
      includeReservationStats?: boolean;
    }
  ): Promise<{
    customers: Array<{
      // 基本情報
      uid: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      lineId: string | null;
      lineUserName: string | null;
      customerType: string | null;
      totalReservationCount: number | null;
      lastReservationDateUnix: number | null;
      createdAt: string;
      
      // 詳細情報（オプション）
      details?: {
        gender: string | null;
        birthday: string | null;
        age: number | null;
        notes: string | null;
      };
      
      // ポイント情報（オプション）
      points?: {
        totalPoints: number;
        lastTransactionDateUnix: number | null;
      };
      
      // 予約統計（オプション）
      reservationStats?: {
        totalCount: number;
        completedCount: number;
        cancelledCount: number;
        totalAmount: number;
      };
    }>;
    totalCount: number;
    exportedCount: number;
    hasMore: boolean;
  }> {
    console.log(`[CustomerRepository] exportCustomerData: Starting export`, {
      tenantId,
      orgId,
      exportType: options.exportType,
      customerUidsCount: options.customerUids?.length || 0,
      maxCount: options.maxCount,
      includeDetails: options.includeDetails,
      includePoints: options.includePoints,
      includeReservationStats: options.includeReservationStats
    });

    try {
      // 大規模データ対応のためRPC関数を使用
      const { data, error } = await this.supabaseServiceInstance.rpc<{
        customers: Array<{
          uid: string;
          email: string | null;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          line_id: string | null;
          line_user_name: string | null;
          customer_type: string | null;
          total_reservation_count: number | null;
          last_reservation_date_unix: number | null;
          created_at: string;
          // 詳細情報
          detail_gender?: string | null;
          detail_birthday?: string | null;
          detail_age?: number | null;
          detail_notes?: string | null;
          // ポイント情報
          total_points?: number | null;
          last_transaction_date_unix?: number | null;
          // 予約統計
          reservation_total_count?: number | null;
          reservation_completed_count?: number | null;
          reservation_cancelled_count?: number | null;
          reservation_total_amount?: number | null;
        }>;
        total_count: number;
        exported_count: number;
        has_more: boolean;
      }>('export_customer_data_optimized', {
        p_tenant_id: tenantId,
        p_org_id: orgId,
        p_export_type: options.exportType,
        p_customer_uids: options.customerUids || null,
        p_max_count: options.maxCount || null,
        p_offset: options.offset || 0,
        p_filters: options.filters ? JSON.stringify(options.filters) : null,
        p_include_details: options.includeDetails || false,
        p_include_points: options.includePoints || false,
        p_include_reservation_stats: options.includeReservationStats || false
      });

      if (error) {
        console.error('[CustomerRepository] exportCustomerData: RPC error', error);
        throwSupabaseError({
          callFunc: 'CustomerRepository.exportCustomerData',
          message: `顧客データエクスポートに失敗しました: ${error.message}`,
          error: new Error(error.message),
          severity: 'high',
          details: { tenantId, orgId, options }
        });
      }

      if (!data || data.length === 0) {
        return {
          customers: [],
          totalCount: 0,
          exportedCount: 0,
          hasMore: false
        };
      }

      const result = data[0];
      
      // データを整形
      const formattedCustomers = result.customers.map(customer => {
        const baseCustomer: any = {
          uid: customer.uid,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          phone: customer.phone,
          lineId: customer.line_id,
          lineUserName: customer.line_user_name,
          customerType: customer.customer_type,
          totalReservationCount: customer.total_reservation_count,
          lastReservationDateUnix: customer.last_reservation_date_unix,
          createdAt: customer.created_at
        };

        // オプション情報を追加
        if (options.includeDetails) {
          baseCustomer.details = {
            gender: customer.detail_gender,
            birthday: customer.detail_birthday,
            age: customer.detail_age,
            notes: customer.detail_notes
          };
        }

        if (options.includePoints) {
          baseCustomer.points = {
            totalPoints: customer.total_points || 0,
            lastTransactionDateUnix: customer.last_transaction_date_unix
          };
        }

        if (options.includeReservationStats) {
          baseCustomer.reservationStats = {
            totalCount: customer.reservation_total_count || 0,
            completedCount: customer.reservation_completed_count || 0,
            cancelledCount: customer.reservation_cancelled_count || 0,
            totalAmount: customer.reservation_total_amount || 0
          };
        }

        return baseCustomer;
      });

      console.log(`[CustomerRepository] exportCustomerData: Success - exported ${result.exported_count} customers from ${result.total_count} total`);

      return {
        customers: formattedCustomers,
        totalCount: result.total_count,
        exportedCount: result.exported_count,
        hasMore: result.has_more
      };

    } catch (error) {
      console.error('[CustomerRepository] exportCustomerData: Error', error);
      if (error instanceof Error && error.constructor.name === 'SupabaseError') {
        throw error;
      }
      
      throwSupabaseError({
        callFunc: 'CustomerRepository.exportCustomerData',
        message: `顧客データエクスポートに失敗しました: ${(error as Error).message}`,
        error: error as Error,
        severity: 'high',
        details: { tenantId, orgId, options }
      });
    }
    
    // 到達不可能なコードだが、TypeScriptの型チェックのために追加
    throw new Error('Unexpected error in exportCustomerData');
  }

  /**
   * CSVエクスポート用の高速顧客データ取得
   * メモリ効率を重視したストリーミング対応
   * 
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param options - エクスポートオプション
   * @returns CSVエクスポート用のデータ
   */
  async getCustomersForCsvExport(
    tenantId: string,
    orgId: string,
    options: {
      batchSize?: number;
      offset?: number;
      customerUids?: string[];
      includeHeaders?: boolean;
    }
  ): Promise<{
    csvData: string;
    totalCount: number;
    hasMore: boolean;
  }> {
    console.log(`[CustomerRepository] getCustomersForCsvExport: Exporting CSV data`, options);

    try {
      const { data, error } = await this.supabaseServiceInstance.rpc<{
        csv_data: string;
        total_count: number;
        has_more: boolean;
      }>('export_customers_csv_optimized', {
        p_tenant_id: tenantId,
        p_org_id: orgId,
        p_batch_size: options.batchSize || 1000,
        p_offset: options.offset || 0,
        p_customer_uids: options.customerUids || null,
        p_include_headers: options.includeHeaders || false
      });

      if (error) {
        console.error('[CustomerRepository] getCustomersForCsvExport: RPC error', error);
        throwSupabaseError({
          callFunc: 'CustomerRepository.getCustomersForCsvExport',
          message: `CSV顧客データエクスポートに失敗しました: ${error.message}`,
          error: new Error(error.message),
          severity: 'high',
          details: { tenantId, orgId, options }
        });
      }

      if (!data || data.length === 0) {
        return {
          csvData: options.includeHeaders ? 'uid,email,firstName,lastName,phone,customerType,totalReservations,createdAt\n' : '',
          totalCount: 0,
          hasMore: false
        };
      }

      const result = data[0];
      console.log(`[CustomerRepository] getCustomersForCsvExport: Success - generated CSV for ${result.total_count} customers`);

      return {
        csvData: result.csv_data,
        totalCount: result.total_count,
        hasMore: result.has_more
      };

    } catch (error) {
      console.error('[CustomerRepository] getCustomersForCsvExport: Error', error);
      if (error instanceof Error && error.constructor.name === 'SupabaseError') {
        throw error;
      }
      
      throwSupabaseError({
        callFunc: 'CustomerRepository.getCustomersForCsvExport',
        message: `CSV顧客データエクスポートに失敗しました: ${(error as Error).message}`,
        error: error as Error,
        severity: 'high',
        details: { tenantId, orgId, options }
      });
    }
    
    // 到達不可能なコードだが、TypeScriptの型チェックのために追加
    throw new Error('Unexpected error in getCustomersForCsvExport');
  }
}


