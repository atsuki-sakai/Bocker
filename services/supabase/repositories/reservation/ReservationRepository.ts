import { BaseRepository, BaseRepositoryOptions, ListOptions } from '../BaseRepository';
import type { RowType, InsertType, UpdateType } from '@/services/supabase/SupabaseService';
import { supabaseClientService } from '@/services/supabase/SupabaseService';
import { throwSupabaseError } from '@/services/supabase/utils/errors';

/**
 * 予約 (reservation) テーブル操作リポジトリ
 * 
 * Convexから移行された予約履歴データの管理を行います。
 * - 顧客の予約履歴の取得
 * - 日付範囲での予約検索
 * - ステータス別の予約取得
 */
export class ReservationRepository extends BaseRepository<'reservation'> {
  constructor(instance: typeof supabaseClientService = supabaseClientService) {
    super('reservation', instance);
  }

  /**
   * 顧客の予約履歴を取得します。
   * カルテページでの表示用に詳細情報も含めて取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param customerUid - 顧客UID
   * @param options - リスト取得オプション
   * @returns 予約情報の配列と合計件数
   */
  async findByCustomer(
    tenantId: string,
    orgId: string,
    customerUid: string,
    options?: ListOptions<'reservation'>
  ): Promise<{ data: RowType<'reservation'>[]; count: number | null }> {
    console.log(`[ReservationRepository] findByCustomer: tenantId=${tenantId}, orgId=${orgId}, customerUid=${customerUid}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      customer_id: customerUid,
      is_archive: false
    } as Partial<RowType<'reservation'>>;
    
    // デフォルトで新しい順にソート
    const orderBy = options?.orderBy || { column: 'start_time_unix', ascending: false };
    
    return this.list({ ...options, filters, orderBy });
  }

  /**
   * 顧客の予約を予約詳細情報と共に取得します。
   * メニュー、オプション、金額情報を含む完全な予約情報を返します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param customerUid - 顧客UID
   * @param options - リスト取得オプション
   * @returns 予約と詳細情報
   */
  async findByCustomerWithDetails(
    tenantId: string,
    orgId: string,
    customerUid: string,
    options?: {
      page?: number;
      pageSize?: number;
      status?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{ 
    data: Array<{
      reservation: RowType<'reservation'>;
      detail: RowType<'reservation_detail'> | null;
    }>; 
    count: number | null 
  }> {
    console.log(`[ReservationRepository] findByCustomerWithDetails: tenantId=${tenantId}, orgId=${orgId}, customerUid=${customerUid}`);
    
    try {
      // 日付範囲フィルター用のfilters
      const filters: Partial<RowType<'reservation'>> = {
        tenant_id: tenantId,
        org_id: orgId,
        customer_id: customerUid,
        is_archive: false
      };

      // ステータスフィルター
      if (options?.status) {
        filters.status = options.status;
      }

      // rangeFilterを使用して日付範囲を指定
      let rangeFilter: { column: keyof RowType<'reservation'>; from?: string | number; to?: string | number } | undefined;
      if (options?.startDate || options?.endDate) {
        rangeFilter = {
          column: 'start_time_unix',
          from: options.startDate ? new Date(options.startDate).getTime() : undefined,
          to: options.endDate ? new Date(options.endDate).getTime() : undefined
        };
      }

      // listRecordsを使用してデータ取得
      const { data: reservations, count } = await this.supabaseServiceInstance.listRecords('reservation', {
        filters,
        rangeFilter,
        orderBy: { column: 'start_time_unix', ascending: false },
        page: options?.page,
        pageSize: options?.pageSize || 10,
        select: '*'
      });

      // 予約詳細を取得
      const formattedData = await Promise.all(
        (reservations || []).map(async (reservation) => {
          // _convex_idを使用して詳細を取得
          const { data: details } = await this.supabaseServiceInstance.listRecords('reservation_detail', {
            filters: {
              convex_reservation_id: reservation._convex_id
            } as Partial<RowType<'reservation_detail'>>,
            pageSize: 1
          });

          return {
            reservation,
            detail: details?.[0] || null
          };
        })
      );

      return { data: formattedData, count };
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'ReservationRepository.findByCustomerWithDetails',
          message: error.message,
          error: error,
          severity: 'high',
          details: { tenantId, orgId, customerUid, options }
        });
      }
      throw error;
    }
  }

  /**
   * 日付範囲で予約を検索します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param startDate - 開始日
   * @param endDate - 終了日
   * @param options - リスト取得オプション
   * @returns 予約情報の配列と合計件数
   */
  async findByDateRange(
    tenantId: string,
    orgId: string,
    startDate: Date,
    endDate: Date,
    options?: ListOptions<'reservation'>
  ): Promise<{ data: RowType<'reservation'>[]; count: number | null }> {
    console.log(`[ReservationRepository] findByDateRange: tenantId=${tenantId}, orgId=${orgId}, start=${startDate}, end=${endDate}`);
    
    const startUnix = startDate.getTime();
    const endUnix = endDate.getTime();
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      is_archive: false
    } as Partial<RowType<'reservation'>>;
    
    const rangeFilter = {
      column: 'start_time_unix' as keyof RowType<'reservation'>,
      from: startUnix,
      to: endUnix
    };
    
    return this.list({ ...options, filters, rangeFilter });
  }

  /**
   * ステータスで予約を検索します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param status - 予約ステータス
   * @param options - リスト取得オプション
   * @returns 予約情報の配列と合計件数
   */
  async findByStatus(
    tenantId: string,
    orgId: string,
    status: string,
    options?: ListOptions<'reservation'>
  ): Promise<{ data: RowType<'reservation'>[]; count: number | null }> {
    console.log(`[ReservationRepository] findByStatus: tenantId=${tenantId}, orgId=${orgId}, status=${status}`);
    
    const filters = { 
      ...(options?.filters || {}), 
      tenant_id: tenantId,
      org_id: orgId,
      status: status,
      is_archive: false
    } as Partial<RowType<'reservation'>>;
    
    return this.list({ ...options, filters });
  }

  /**
   * 予約の統計情報を取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param customerUid - 顧客UID
   * @returns 統計情報
   */
  async getCustomerReservationStats(
    tenantId: string,
    orgId: string,
    customerUid: string
  ): Promise<{
    totalCount: number;
    completedCount: number;
    cancelledCount: number;
    upcomingCount: number;
    totalAmount: number;
  }> {
    console.log(`[ReservationRepository] getCustomerReservationStats: tenantId=${tenantId}, orgId=${orgId}, customerUid=${customerUid}`);
    
    try {
      // 予約データを取得
      const { data: reservations } = await this.supabaseServiceInstance.listRecords('reservation', {
        filters: {
          tenant_id: tenantId,
          org_id: orgId,
          customer_id: customerUid,
          is_archive: false
        }
      });

      // 予約詳細を取得して統計を計算
      const reservationDetails = await Promise.all(
        (reservations || []).map(async (reservation) => {
          const { data: details } = await this.supabaseServiceInstance.listRecords('reservation_detail', {
            filters: {
              convex_reservation_id: reservation._convex_id
            } as Partial<RowType<'reservation_detail'>>,
            pageSize: 1
          });
          return {
            reservation,
            detail: details?.[0] || null
          };
        })
      );

      const now = Date.now();
      let totalCount = 0;
      let completedCount = 0;
      let cancelledCount = 0;
      let upcomingCount = 0;
      let totalAmount = 0;

      reservationDetails.forEach(({ reservation, detail }) => {
        totalCount++;
        
        if (reservation.status === 'completed') {
          completedCount++;
          if (detail?.total_price) {
            totalAmount += detail.total_price;
          }
        } else if (reservation.status === 'cancelled') {
          cancelledCount++;
        } else if (reservation.status === 'confirmed' && Number(reservation.start_time_unix) > now) {
          upcomingCount++;
        }
      });

      return {
        totalCount,
        completedCount,
        cancelledCount,
        upcomingCount,
        totalAmount
      };
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'ReservationRepository.getCustomerReservationStats',
          message: error.message,
          error: error,
          severity: 'medium',
          details: { tenantId, orgId, customerUid }
        });
      }
      throw error;
    }
  }
}