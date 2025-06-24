import { BaseRepository } from '../BaseRepository';
import { SupabaseService } from '../../SupabaseService';

interface CouponTransactionData {
  tenant_id: string;
  org_id: string;
  coupon_id: string;
  customer_id: string;
  reservation_id: string;
  transaction_date_unix: number;
  discount_amount: number;
  sort_key?: string;
}

export class CouponTransactionRepository extends BaseRepository {
  constructor(supabaseService: SupabaseService) {
    super(supabaseService, 'coupon_transaction');
  }

  /**
   * クーポン取引レコードを作成
   */
  async create(data: CouponTransactionData) {
    const insertData = {
      ...data,
      sort_key: data.sort_key || `${data.tenant_id}_${data.org_id}_${data.transaction_date_unix}`,
      is_archive: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return await this.client
      .from(this.tableName)
      .insert(insertData)
      .select()
      .single();
  }

  /**
   * 予約IDによるクーポン取引の検索
   */
  async findByReservation(
    tenant_id: string,
    org_id: string,
    reservation_id: string
  ) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('org_id', org_id)
      .eq('reservation_id', reservation_id)
      .eq('is_archive', false)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * 顧客IDによるクーポン取引履歴の取得
   */
  async findByCustomer(
    customer_id: string,
    limit: number = 100
  ) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('customer_id', customer_id)
      .eq('is_archive', false)
      .order('transaction_date_unix', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * クーポンIDによる取引回数の取得
   */
  async countByCoupon(
    tenant_id: string,
    org_id: string,
    coupon_id: string
  ): Promise<number> {
    const { count, error } = await this.client
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .eq('org_id', org_id)
      .eq('coupon_id', coupon_id)
      .eq('is_archive', false);

    if (error) {
      throw error;
    }

    return count || 0;
  }
}