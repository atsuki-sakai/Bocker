import { BaseRepository, ListOptions } from './BaseRepository';
import type { RowType, InsertType, UpdateType, SelectCols } from '../SupabaseService';
import { supabaseClientService } from '../SupabaseService';
import { throwSupabaseError } from '../utils/errors';

/**
 * 予約 (Reservation) テーブル操作リポジトリ
 */
export class ReservationRepository extends BaseRepository<'reservation'> {
  constructor(protected supabaseServiceInstance: typeof supabaseClientService = supabaseClientService) {
    super('reservation', supabaseServiceInstance);
  }

  /**
   * 新しい予約を作成します。
   * _id はこのメソッド内で自動生成されます。
   * @param reservationData - 作成する予約データ
   * @returns 作成された予約情報
   */
  async createReservation(
    reservationData: Pick<InsertType<'reservation'>, 'customer_id' | 'customer_name' | 'salon_id' | 'staff_id' | 'staff_name' | 'start_time_unix' | 'end_time_unix' | 'menus' | 'options' | 'total_price' | 'unit_price' | 'payment_method' | 'status' | 'notes' | 'coupon_id' | 'coupon_discount' | 'use_points'>
  ): Promise<RowType<'reservation'>> {
    console.log(`[ReservationRepository] createReservation: data=${JSON.stringify(reservationData)}`);
    const newReservationDataWithId: InsertType<'reservation'> = {
      _id: crypto.randomUUID(),
      ...reservationData,
    };
    try {
        return await this.create(newReservationDataWithId);
    } catch (error) {
        if (error instanceof Error) {
            throwSupabaseError({
                callFunc: 'ReservationRepository.createReservation',
                message: error.message,
                error: error,
                severity: 'high',
                details: { reservationData }
            });
        }
        throw error;
    }
  }

  /**
   * 特定の顧客の予約を取得します。
   * (元 SupabaseService.getCustomerReservations)
   * @param customerId - 顧客ID
   * @param options - リスト取得オプション (ページ、ページサイズ、select、ステータス、未来の予約のみ)
   * @returns 予約情報の配列と合計件数
   */
  async getCustomerReservations(
    customerId: string,
    options?: {
      page?: number;
      pageSize?: number;
      select?: SelectCols<RowType<'reservation'>>;
      status?: RowType<'reservation'>['status'];
      upcomingOnly?: boolean;
    }
  ): Promise<{ data: RowType<'reservation'>[]; count: number | null }> {
    console.log(`[ReservationRepository] getCustomerReservations: customerId=${customerId}, options=${JSON.stringify(options)}`);
    const filters: Partial<RowType<'reservation'>> = { customer_id: customerId };
    if (options?.status) {
      filters.status = options.status;
    }
    let rangeFilter: { column: keyof RowType<'reservation'>; from?: string | number; to?: string | number } | undefined;
    if (options?.upcomingOnly) {
      rangeFilter = {
        column: 'start_time_unix' as keyof RowType<'reservation'>,
        from: Math.floor(Date.now() / 1000),
      };
    }
    try {
        return await this.list({ ...options, filters, rangeFilter });
    } catch (error) {
        if (error instanceof Error) {
            throwSupabaseError({
                callFunc: 'ReservationRepository.getCustomerReservations',
                message: error.message,
                error: error,
                severity: 'high',
                details: { customerId, options }
            });
        }
        throw error;
    }
  }

  /**
   * 特定の顧客の予約を取得します。
   * @param customerId - 顧客ID
   * @param listOptions - リスト取得オプション (期間での絞り込みも可能)
   * @returns 予約情報の配列と合計件数
   */
  async findByCustomerId(
    customerId: string,
    listOptions: ListOptions<'reservation'> = {}
  ): Promise<{ data: RowType<'reservation'>[]; count: number | null }> {
    console.log(`[ReservationRepository] findByCustomerId: customerId=${customerId}, options=${JSON.stringify(listOptions)}`);
    const filters = { ...(listOptions.filters || {}), customer_id: customerId } as Partial<RowType<'reservation'>>;
    return this.list({ ...listOptions, filters });
  }

  /**
   * 特定のスタッフの予約を取得します。
   * @param staffId - スタッフID
   * @param listOptions - リスト取得オプション
   * @returns 予約情報の配列と合計件数
   */
  async findByStaffId(
    staffId: string,
    listOptions: ListOptions<'reservation'> = {}
  ): Promise<{ data: RowType<'reservation'>[]; count: number | null }> {
    console.log(`[ReservationRepository] findByStaffId: staffId=${staffId}, options=${JSON.stringify(listOptions)}`);
    const filters = { ...(listOptions.filters || {}), staff_id: staffId } as Partial<RowType<'reservation'>>;
    return this.list({ ...listOptions, filters });
  }

  /**
   * 指定された期間内の予約を取得します。
   * `start_time_unix` と `end_time_unix` はUnixタイムスタンプ(文字列)であることを想定しています。
   * @param startTimeUnix - 検索開始時刻 (Unixタイムスタンプ文字列)
   * @param endTimeUnix - 検索終了時刻 (Unixタイムスタンプ文字列)
   * @param listOptions - その他のリスト取得オプション (顧客IDやスタッフIDでの絞り込みなど)
   * @returns 予約情報の配列と合計件数
   */
  async findByTimeRange(
    startTimeUnix: string,
    endTimeUnix: string,
    listOptions: ListOptions<'reservation'> = {}
  ): Promise<{ data: RowType<'reservation'>[]; count: number | null }> {
    console.log(`[ReservationRepository] findByTimeRange: start=${startTimeUnix}, end=${endTimeUnix}, options=${JSON.stringify(listOptions)}`);
    const rangeFilter = {
      column: 'start_time_unix' as keyof RowType<'reservation'>,
      from: startTimeUnix,
      to: endTimeUnix,
    };
    console.warn("[ReservationRepository] findByTimeRange: Current implementation filters by start_time_unix within the range. For more complex overlap logic, consider using an RPC.");
    return this.list({ ...listOptions, rangeFilter });
  }

  /**
   * 予約ステータスで予約を検索します。
   * @param status - 検索する予約ステータス
   * @param listOptions - リスト取得オプション
   * @returns 予約情報の配列と合計件数
   */
  async findByStatus(
    status: string,
    listOptions: ListOptions<'reservation'> = {}
  ): Promise<{ data: RowType<'reservation'>[]; count: number | null }> {
    console.log(`[ReservationRepository] findByStatus: status=${status}, options=${JSON.stringify(listOptions)}`);
    const filters = { ...(listOptions.filters || {}), status: status } as Partial<RowType<'reservation'>>;
    return this.list({ ...listOptions, filters });
  }
}
