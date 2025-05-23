import { BaseRepository, ListOptions, BaseRepositoryOptions } from '../BaseRepository';
import type { RowType, InsertType, UpdateType } from '../../SupabaseService'; // supabase.types から直接も可
import { supabaseClientService } from '../../SupabaseService';
import { throwSupabaseError } from '../../utils/errors';

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
    customerData: Pick<InsertType<'customer'>, 'email' | 'first_name' | 'last_name' | 'line_id' | 'line_user_name' | 'password_hash' | 'phone' | 'salon_id'>
  ): Promise<RowType<'customer'>> {
    console.log(`[CustomerRepository] registerNewCustomer: data=${JSON.stringify(customerData)}`);
    const newCustomerDataWithId: InsertType<'customer'> = {
      uid: crypto.randomUUID(),
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
    customerCoreData: Pick<InsertType<'customer'>, 'email' | 'first_name' | 'last_name' | 'phone' | 'salon_id' | 'line_id' | 'line_user_name' | 'password_hash'>,
    detailData: Omit<InsertType<'customer_detail'>, 'uid' | 'customer_uid' | '_creation_time' | 'updated_time' | 'is_archive'>,
    initialPoints: number = 0
  ): Promise<{ customer: RowType<'customer'> | null }> {
    console.log('[CustomerRepository] createCustomerWithDetailsAndPoints: Calling RPC for atomicity.')

    const params = {
      p_email: customerCoreData.email,
      p_first_name: customerCoreData.first_name,
      p_last_name: customerCoreData.last_name,
      p_phone: customerCoreData.phone,
      p_salon_id: customerCoreData.salon_id,
      p_line_id: customerCoreData.line_id,
      p_line_user_name: customerCoreData.line_user_name,
      p_password_hash: customerCoreData.password_hash,
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

  async findBySalonAndCustomerEmail(salonId: string, customerEmail: string, options?: BaseRepositoryOptions<'customer'>): Promise<RowType<'customer'> | null> {
    console.log(`[CustomerRepository] findBySalonAndCustomerEmail: salonId=${salonId}, customerEmail=${customerEmail}, options=${JSON.stringify(options)}`);
    return this.findOne({ salon_id: salonId, email: customerEmail } as Partial<RowType<'customer'>>, options); 
  }

  async findBySalonAndCustomerLineId(salonId: string, customerLineId: string, options?: BaseRepositoryOptions<'customer'>): Promise<RowType<'customer'> | null> {
    console.log(`[CustomerRepository] findBySalonAndCustomerLineId: salonId=${salonId}, customerLineId=${customerLineId}, options=${JSON.stringify(options)}`);
    return this.findOne({ salon_id: salonId, line_id: customerLineId } as Partial<RowType<'customer'>>, options); 
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
}
