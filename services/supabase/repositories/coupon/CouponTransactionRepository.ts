import { BaseRepository } from '../BaseRepository';
import { RowType, SupabaseService } from '@/services/supabase/SupabaseService';

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

export class CouponTransactionRepository extends BaseRepository<'coupon_transaction'> {

  constructor(supabaseService: SupabaseService) {
    super('coupon_transaction', supabaseService);
  }

  /**
   * クーポン取引レコードを作成
   */
  async create(data: CouponTransactionData): Promise<RowType<'coupon_transaction'>> {
    const insertData = {
      ...data,
      sort_key: data.sort_key || `${data.tenant_id}_${data.org_id}_${data.transaction_date_unix}`,
      is_archive: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return await super.create(insertData);
  }

  /**
   * 予約IDによるクーポン取引の検索
   */
  async findByReservation(
    tenant_id: string,
    org_id: string,
    reservation_id: string
  ) {
    const data = await this.findOne({
      tenant_id,
      org_id,
      reservation_id,
      is_archive: false,
    });

    return data;
  }

  /**
   * 顧客IDによるクーポン取引履歴の取得
   */
  async findByCustomer(
    customer_id: string,
    limit: number = 100
  ) {
    const data = await this.list({
      filters: {
        customer_id,
        is_archive: false,
      },
      orderBy: { column: 'transaction_date_unix', ascending: false },
      pageSize: limit,
    });

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
    const { count } = await this.list({
      filters: {
        tenant_id,
        org_id,
        coupon_id,
        is_archive: false,
      },
    });

    return count || 0;
  }
}