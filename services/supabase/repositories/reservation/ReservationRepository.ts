import { BaseRepository, ListOptions } from '../BaseRepository';
import type { RowType } from '@/services/supabase/SupabaseService';
import { supabaseClientService } from '@/services/supabase/SupabaseService';
import { throwSupabaseError } from '@/services/supabase/utils/errors';

// 最適化されたRPC関数のレスポンス型定義
interface OptimizedReservationRpcResponse {
  reservations: Array<{
    reservation: RowType<'reservation'>;
    detail: RowType<'reservation_detail'> | null;
  }>;
  total_count: number;
  current_page: number;
  page_size: number;
  has_more: boolean;
}

interface ExportReservationRpcResponse {
  reservations: Array<{
    reservation: RowType<'reservation'>;
    detail: RowType<'reservation_detail'> | null;
  }>;
  total_count: number;
  processing_time_ms: number;
}

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
      customer_uid: customerUid,
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
        customer_uid: customerUid,
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
        orderBy: { column: 'start_time_unix', ascending: true },
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
              _convex_reservation_id: reservation._convex_id
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
          customer_uid: customerUid,
          is_archive: false
        }
      });

      // 予約詳細を取得して統計を計算
      const reservationDetails = await Promise.all(
        (reservations || []).map(async (reservation) => {
          const { data: details } = await this.supabaseServiceInstance.listRecords('reservation_detail', {
            filters: {
              _convex_reservation_id: reservation._convex_id
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

  /**
   * 組織レベルで予約を詳細情報と共に取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param options - リスト取得オプション
   * @returns 予約と詳細情報
   */
  async findByOrganizationWithDetails(
    tenantId: string,
    orgId: string,
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
    console.log(`[ReservationRepository] findByOrganizationWithDetails: tenantId=${tenantId}, orgId=${orgId}`);
    
    try {
      // 日付範囲フィルター用のfilters
      const filters: Partial<RowType<'reservation'>> = {
        tenant_id: tenantId,
        org_id: orgId,
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
        orderBy: { column: 'start_time_unix', ascending: true },
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
              _convex_reservation_id: reservation._convex_id
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
          callFunc: 'ReservationRepository.findByOrganizationWithDetails',
          message: error.message,
          error: error,
          severity: 'high',
          details: { tenantId, orgId, options }
        });
      }
      throw error;
    }
  }

  /**
   * 組織の予約統計情報を取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param startDate - 開始日（オプション）
   * @param endDate - 終了日（オプション）
   * @returns 統計情報
   */
  async getOrganizationReservationStats(
    tenantId: string,
    orgId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalCount: number;
    completedCount: number;
    cancelledCount: number;
    upcomingCount: number;
    totalAmount: number;
  }> {
    console.log(`[ReservationRepository] getOrganizationReservationStats: tenantId=${tenantId}, orgId=${orgId}`);
    
    try {
      // フィルター設定
      const filters: Partial<RowType<'reservation'>> = {
        tenant_id: tenantId,
        org_id: orgId,
        is_archive: false
      };

      // 日付範囲フィルター
      let rangeFilter: { column: keyof RowType<'reservation'>; from?: string | number; to?: string | number } | undefined;
      if (startDate || endDate) {
        rangeFilter = {
          column: 'start_time_unix',
          from: startDate ? new Date(startDate).getTime() : undefined,
          to: endDate ? new Date(endDate).getTime() : undefined
        };
      }

      // 予約データを取得
      const { data: reservations } = await this.supabaseServiceInstance.listRecords('reservation', {
        filters,
        rangeFilter
      });

      // 予約詳細を取得して統計を計算
      const reservationDetails = await Promise.all(
        (reservations || []).map(async (reservation) => {
          const { data: details } = await this.supabaseServiceInstance.listRecords('reservation_detail', {
            filters: {
              _convex_reservation_id: reservation._convex_id
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
          callFunc: 'ReservationRepository.getOrganizationReservationStats',
          message: error.message,
          error: error,
          severity: 'medium',
          details: { tenantId, orgId, startDate, endDate }
        });
      }
      throw error;
    }
  }

  /**
   * 最適化された予約データ取得（N+1クエリ問題解決版）
   * JOIN クエリを使用して一度のクエリで予約と詳細情報を取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param options - 取得オプション
   * @returns 予約と詳細情報
   */
  async findByOrganizationWithDetailsOptimized(
    tenantId: string,
    orgId: string,
    options?: {
      page?: number;
      pageSize?: number;
      status?: string;
      startDate?: string;
      endDate?: string;
      includeCount?: boolean;
    }
  ): Promise<{ 
    data: Array<{
      reservation: RowType<'reservation'>;
      detail: RowType<'reservation_detail'> | null;
    }>; 
    count: number | null;
    currentPage: number;
    pageSize: number;
    hasMore: boolean;
  }> {
    console.log(`[ReservationRepository] findByOrganizationWithDetailsOptimized: tenantId=${tenantId}, orgId=${orgId}`);
    
    try {
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 10;
      const status = options?.status;
      const startDate = options?.startDate;
      const endDate = options?.endDate;
      const includeCount = options?.includeCount !== false; // デフォルトでtrueキ

      // RPC関数を呼び出し
      const { data, error } = await this.supabaseServiceInstance.rpc<OptimizedReservationRpcResponse>(
        'get_reservations_with_details_optimized',
        {
          p_tenant_id: tenantId,
          p_org_id: orgId,
          p_page: page,
          p_page_size: pageSize,
          p_status: status || null,
          p_start_date: startDate || null,
          p_end_date: endDate || null,
          p_include_count: includeCount
        }
      );

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          data: [],
          count: 0,
          currentPage: page,
          pageSize: pageSize,
          hasMore: false
        };
      }

      const result = data[0];
      const reservations = result.reservations || [];
      const totalCount = result.total_count;
      const hasMore = result.has_more;

      // データを適切な型に変換（型安全）
      const formattedData = reservations.map((item) => ({
        reservation: item.reservation,
        detail: item.detail
      }));

      return {
        data: formattedData,
        count: totalCount >= 0 ? totalCount : null,
        currentPage: page,
        pageSize: pageSize,
        hasMore: hasMore
      };
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'ReservationRepository.findByOrganizationWithDetailsOptimized',
          message: error.message,
          error: error,
          severity: 'high',
          details: { tenantId, orgId, options }
        });
      }
      throw error;
    }
  }

  /**
   * 大量データエクスポート専用の最適化された取得関数
   * 一度に大量のデータを効率的に取得します。
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param options - 取得オプション
   * @returns 予約と詳細情報の配列
   */
  async exportAllReservationsOptimized(
    tenantId: string,
    orgId: string,
    options?: {
      status?: string;
      startDate?: string;
      endDate?: string;
      batchSize?: number;
    }
  ): Promise<{ 
    data: Array<{
      reservation: RowType<'reservation'>;
      detail: RowType<'reservation_detail'> | null;
    }>; 
    totalCount: number;
    processingTimeMs: number;
  }> {
    console.log(`[ReservationRepository] exportAllReservationsOptimized: tenantId=${tenantId}, orgId=${orgId}`);
    
    try {
      const status = options?.status;
      const startDate = options?.startDate;
      const endDate = options?.endDate;
      const batchSize = options?.batchSize || 5000;
      
      // RPC関数を呼び出し
      const { data, error } = await this.supabaseServiceInstance.rpc<ExportReservationRpcResponse>(
        'export_all_reservations_optimized',
        {
          p_tenant_id: tenantId,
          p_org_id: orgId,
          p_status: status || null,
          p_start_date: startDate || null,
          p_end_date: endDate || null,
          p_batch_size: batchSize
        }
      );
      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          data: [],
          totalCount: 0,
          processingTimeMs: 0
        };
      }

      const result = data[0];
      const reservations = result.reservations || [];
      const totalCount = result.total_count;
      const processingTimeMs = result.processing_time_ms;

      console.log(`[ReservationRepository] Raw result:`, { 
        reservationsType: typeof reservations, 
        reservationsLength: Array.isArray(reservations) ? reservations.length : 'not array',
        reservations: reservations
      });

      // JSONBデータを適切な型に変換
      let formattedData: { reservation: RowType<'reservation'>; detail: RowType<'reservation_detail'> | null }[] = [];
      if (Array.isArray(reservations)) {
        formattedData = reservations.map((item: { reservation: RowType<'reservation'>; detail: RowType<'reservation_detail'> | null }) => ({
          reservation: item.reservation as RowType<'reservation'>,
          detail: item.detail as RowType<'reservation_detail'> | null
        }));
      } else if (reservations && typeof reservations === 'object') {
        // JSONBが配列として正しく解析されていない場合
        const parsedReservations = Array.isArray(reservations) ? reservations : [reservations];
        formattedData = parsedReservations.map((item: { reservation: RowType<'reservation'>; detail: RowType<'reservation_detail'> | null }) => ({
          reservation: item.reservation as RowType<'reservation'>,
          detail: item.detail as RowType<'reservation_detail'> | null
        }));
      }

      console.log(`[ReservationRepository] exportAllReservationsOptimized completed: ${formattedData.length} records in ${processingTimeMs}ms`);

      return {
        data: formattedData,
        totalCount: totalCount,
        processingTimeMs: processingTimeMs
      };
    } catch (error) {
      if (error instanceof Error) {
        throwSupabaseError({
          callFunc: 'ReservationRepository.exportAllReservationsOptimized',
          message: error.message,
          error: error,
          severity: 'high',
          details: { tenantId, orgId, options }
        });
      }
      throw error;
    }
  }
}