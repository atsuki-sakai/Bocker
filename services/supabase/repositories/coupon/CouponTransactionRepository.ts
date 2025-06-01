import { BaseRepository, BaseRepositoryOptions, ListOptions } from '../BaseRepository';
import type { RowType, InsertType, UpdateType } from '@/services/supabase/SupabaseService';
import { supabaseClientService } from '@/services/supabase/SupabaseService';
import { throwSupabaseError } from '@/services/supabase/utils/errors';

/**
 * クーポン利用履歴 (coupon_transaction) テーブル操作リポジトリ
 * 
 * クーポンの利用履歴の管理を行います。
 * - クーポン利用の記録
 * - 利用履歴の検索・集計
 * - 不正利用の防止・監査
 */
export class CouponTransactionRepository extends BaseRepository<'coupon_transaction'> {
  constructor(instance: typeof supabaseClientService = supabaseClientService) {
    super('coupon_transaction', instance);
  }

  /**
   * 新しいクーポン利用を記録します。
   * @param transactionData - 利用データ
   * @returns 作成された利用履歴情報
   */
  async createCouponTransaction(
    transactionData: Pick<InsertType<'coupon_transaction'>, 'tenant_id' | 'org_id' | 'coupon_id' | 'customer_id' | 'reservation_id' | 'transaction_date_unix' | 'discount_amount'>
  ): Promise<RowType<'coupon_transaction'>> {
    console.log(`[CouponTransactionRepository] createCouponTransaction: data=${JSON.stringify(transactionData)}`);
    
    const newTransactionData: InsertType<'coupon_transaction'> = {
      id: crypto.randomUUID(),
      ...transactionData,
    };

    try {
      return await this.create(newTransactionData);
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'CouponTransactionRepository.createCouponTransaction',
          message: error.message,
          error: error,
          severity: 'high',
          details: { transactionData }
        });
      }
      throw error;
    }
  }

  /**
   * クーポン利用履歴を記録します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param couponId - クーポンID
   * @param customerId - 顧客ID
   * @param reservationId - 予約ID
   * @param discountAmount - 割引額
   * @returns 作成された利用履歴情報
   */
  async recordCouponUsage(
    tenantId: string,
    orgId: string,
    couponId: string,
    customerId: string,
    reservationId: string,
    discountAmount: number
  ): Promise<RowType<'coupon_transaction'>> {
    console.log(`[CouponTransactionRepository] recordCouponUsage: couponId=${couponId}, customerId=${customerId}, discountAmount=${discountAmount}`);
    
    if (discountAmount < 0) {
      throw new Error('Discount amount must be a non-negative number');
    }

    return this.createCouponTransaction({
      tenant_id: tenantId,
      org_id: orgId,
      coupon_id: couponId,
      customer_id: customerId,
      reservation_id: reservationId,
      transaction_date_unix: Math.floor(Date.now() / 1000),
      discount_amount: discountAmount,
    });
  }

  /**
   * 顧客のクーポン利用履歴を取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param customerId - 顧客ID
   * @param options - リスト取得オプション
   * @returns 利用履歴の配列と合計件数
   */
  async findByCustomer(
    tenantId: string,
    orgId: string,
    customerId: string,
    options?: ListOptions<'coupon_transaction'>
  ): Promise<{ data: RowType<'coupon_transaction'>[]; count: number | null }> {
    console.log(`[CouponTransactionRepository] findByCustomer: tenantId=${tenantId}, orgId=${orgId}, customerId=${customerId}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      customer_id: customerId 
    } as Partial<RowType<'coupon_transaction'>>;
    
    return this.list({ ...options, filters });
  }

  /**
   * 特定のクーポンの利用履歴を取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param couponId - クーポンID
   * @param options - リスト取得オプション
   * @returns 利用履歴の配列と合計件数
   */
  async findByCoupon(
    tenantId: string,
    orgId: string,
    couponId: string,
    options?: ListOptions<'coupon_transaction'>
  ): Promise<{ data: RowType<'coupon_transaction'>[]; count: number | null }> {
    console.log(`[CouponTransactionRepository] findByCoupon: tenantId=${tenantId}, orgId=${orgId}, couponId=${couponId}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      coupon_id: couponId 
    } as Partial<RowType<'coupon_transaction'>>;
    
    return this.list({ ...options, filters });
  }

  /**
   * 予約に関連するクーポン利用を取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param reservationId - 予約ID
   * @param options - 取得オプション
   * @returns クーポン利用情報、または null
   */
  async findByReservation(
    tenantId: string,
    orgId: string,
    reservationId: string,
    options?: BaseRepositoryOptions<'coupon_transaction'>
  ): Promise<RowType<'coupon_transaction'> | null> {
    console.log(`[CouponTransactionRepository] findByReservation: tenantId=${tenantId}, orgId=${orgId}, reservationId=${reservationId}`);
    
    return this.findOne({ 
      tenant_id: tenantId,
      org_id: orgId,
      reservation_id: reservationId 
    } as Partial<RowType<'coupon_transaction'>>, options);
  }

  /**
   * 期間を指定してクーポン利用履歴を検索します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param fromUnix - 開始時刻 (Unix timestamp)
   * @param toUnix - 終了時刻 (Unix timestamp)
   * @param options - リスト取得オプション
   * @returns 利用履歴の配列と合計件数
   */
  async findByDateRange(
    tenantId: string,
    orgId: string,
    fromUnix: number,
    toUnix: number,
    options?: ListOptions<'coupon_transaction'>
  ): Promise<{ data: RowType<'coupon_transaction'>[]; count: number | null }> {
    console.log(`[CouponTransactionRepository] findByDateRange: tenantId=${tenantId}, orgId=${orgId}, from=${fromUnix}, to=${toUnix}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
    } as Partial<RowType<'coupon_transaction'>>;
    
    const rangeFilter = {
      column: 'transaction_date_unix' as keyof RowType<'coupon_transaction'>,
      from: fromUnix,
      to: toUnix,
    };
    
    return this.list({ ...options, filters, rangeFilter });
  }

  /**
   * 特定のクーポンと顧客の組み合わせでの利用履歴を取得します。
   * クーポンの利用制限チェックに使用されます。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param couponId - クーポンID
   * @param customerId - 顧客ID
   * @param options - リスト取得オプション
   * @returns 利用履歴の配列と合計件数
   */
  async findByCouponAndCustomer(
    tenantId: string,
    orgId: string,
    couponId: string,
    customerId: string,
    options?: ListOptions<'coupon_transaction'>
  ): Promise<{ data: RowType<'coupon_transaction'>[]; count: number | null }> {
    console.log(`[CouponTransactionRepository] findByCouponAndCustomer: couponId=${couponId}, customerId=${customerId}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      coupon_id: couponId,
      customer_id: customerId 
    } as Partial<RowType<'coupon_transaction'>>;
    
    return this.list({ ...options, filters });
  }

  /**
   * クーポンの利用統計を取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param couponId - クーポンID
   * @returns 利用統計情報
   */
  async getCouponUsageStats(
    tenantId: string,
    orgId: string,
    couponId: string
  ): Promise<{
    totalUsageCount: number;
    totalDiscountAmount: number;
    uniqueCustomers: number;
    firstUsageDate: number | null;
    lastUsageDate: number | null;
  }> {
    console.log(`[CouponTransactionRepository] getCouponUsageStats: couponId=${couponId}`);
    
    const { data: transactions } = await this.findByCoupon(tenantId, orgId, couponId);
    
    const uniqueCustomerIds = new Set<string>();
    let totalDiscountAmount = 0;
    let firstUsageDate: number | null = null;
    let lastUsageDate: number | null = null;
    
    transactions.forEach(transaction => {
      uniqueCustomerIds.add(transaction.customer_id);
      totalDiscountAmount += transaction.discount_amount || 0;
      
      const transactionDate = transaction.transaction_date_unix;
      if (transactionDate) {
        if (!firstUsageDate || transactionDate < firstUsageDate) {
          firstUsageDate = transactionDate;
        }
        if (!lastUsageDate || transactionDate > lastUsageDate) {
          lastUsageDate = transactionDate;
        }
      }
    });
    
    return {
      totalUsageCount: transactions.length,
      totalDiscountAmount,
      uniqueCustomers: uniqueCustomerIds.size,
      firstUsageDate,
      lastUsageDate,
    };
  }

  /**
   * 顧客のクーポン利用統計を取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param customerId - 顧客ID
   * @returns 利用統計情報
   */
  async getCustomerCouponStats(
    tenantId: string,
    orgId: string,
    customerId: string
  ): Promise<{
    totalUsageCount: number;
    totalDiscountAmount: number;
    uniqueCoupons: number;
    firstUsageDate: number | null;
    lastUsageDate: number | null;
  }> {
    console.log(`[CouponTransactionRepository] getCustomerCouponStats: customerId=${customerId}`);
    
    const { data: transactions } = await this.findByCustomer(tenantId, orgId, customerId);
    
    const uniqueCouponIds = new Set<string>();
    let totalDiscountAmount = 0;
    let firstUsageDate: number | null = null;
    let lastUsageDate: number | null = null;
    
    transactions.forEach(transaction => {
      uniqueCouponIds.add(transaction.coupon_id);
      totalDiscountAmount += transaction.discount_amount || 0;
      
      const transactionDate = transaction.transaction_date_unix;
      if (transactionDate) {
        if (!firstUsageDate || transactionDate < firstUsageDate) {
          firstUsageDate = transactionDate;
        }
        if (!lastUsageDate || transactionDate > lastUsageDate) {
          lastUsageDate = transactionDate;
        }
      }
    });
    
    return {
      totalUsageCount: transactions.length,
      totalDiscountAmount,
      uniqueCoupons: uniqueCouponIds.size,
      firstUsageDate,
      lastUsageDate,
    };
  }
}