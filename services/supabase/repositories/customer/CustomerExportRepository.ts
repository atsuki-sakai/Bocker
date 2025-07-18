import { BaseRepository } from '../BaseRepository';
import { supabaseClientService } from '@/services/supabase/SupabaseService';
import { throwSupabaseError } from '@/services/supabase/utils/errors';

/**
 * 顧客データエクスポート専用リポジトリ
 * 大規模SaaS向けの高性能エクスポート機能を提供
 * 
 * 主な機能:
 * - 全件・ID指定・件数指定エクスポート
 * - CSV形式エクスポート
 * - 詳細情報・ポイント・予約統計のオプション付与
 * - フィルタ機能（顧客タイプ、予約有無、登録日範囲）
 */
export class CustomerExportRepository extends BaseRepository<'customer'> {
  constructor(instance: typeof supabaseClientService = supabaseClientService) {
    super('customer', instance);
  }

  /**
   * 高性能顧客データエクスポート（改良版RPC使用）
   * 複数の選択オプションに対応したエクスポート機能
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
      first_name: string | null;
      last_name: string | null;
      phone: string | null;
      line_id: string | null;
      line_user_name: string | null;
      customer_type: string | null;
      total_reservation_count: number | null;
      last_reservation_date_unix: number | null;
      created_at: string;
      
      // 詳細情報（オプション）
      detail_gender?: string | null;
      detail_birthday?: string | null;
      detail_age?: number | null;
      detail_notes?: string | null;
      
      // ポイント情報（オプション）
      total_points?: number | null;
      last_transaction_date_unix?: number | null;
      
      // 予約統計（オプション）
      reservation_total_count?: number | null;
    }>;
    total_count: number;
    exported_count: number;
    has_more: boolean;
  }> {
    console.log(`[CustomerExportRepository] exportCustomerData: Starting export`, {
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
      // 改良版RPC関数を使用
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
        }>;
        total_count: number;
        exported_count: number;
        has_more: boolean;
      }>('export_customer_data_optimized_v2', {
        p_tenant_id: tenantId,
        p_org_id: orgId,
        p_export_type: options.exportType,
        p_customer_uids: options.customerUids || null,
        p_max_count: options.maxCount || 1000,
        p_offset: options.offset || 0,
        p_filters: options.filters ? JSON.stringify(options.filters) : null,
        p_include_details: options.includeDetails || false,
        p_include_points: options.includePoints || false,
        p_include_reservation_stats: options.includeReservationStats || false
      });

      if (error) {
        console.error('[CustomerExportRepository] exportCustomerData: RPC error', error);
        throwSupabaseError({
          callFunc: 'CustomerExportRepository.exportCustomerData',
          message: `顧客データエクスポートに失敗しました: ${error.message}`,
          error: new Error(error.message),
          severity: 'high',
          details: { tenantId, orgId, options }
        });
      }

      if (!data || data.length === 0) {
        return {
          customers: [],
          total_count: 0,
          exported_count: 0,
          has_more: false
        };
      }

      const result = data[0];
      console.log(`[CustomerExportRepository] exportCustomerData: Success - exported ${result.exported_count} customers from ${result.total_count} total`);

      return {
        customers: result.customers || [],
        total_count: result.total_count || 0,
        exported_count: result.exported_count || 0,
        has_more: result.has_more || false
      };

    } catch (error) {
      console.error('[CustomerExportRepository] exportCustomerData: Error', error);
      if (error instanceof Error && error.constructor.name === 'SupabaseError') {
        throw error;
      }
      
      throwSupabaseError({
        callFunc: 'CustomerExportRepository.exportCustomerData',
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
   * CSV形式での高速顧客データエクスポート（改良版RPC使用）
   * メモリ効率を重視したストリーミング対応
   * 
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param options - エクスポートオプション
   * @returns CSVエクスポート用のデータ
   */
  async exportCustomersCsv(
    tenantId: string,
    orgId: string,
    options: {
      batchSize?: number;
      offset?: number;
      customerUids?: string[];
      includeHeaders?: boolean;
    } = {}
  ): Promise<{
    csvData: string;
    totalCount: number;
    hasMore: boolean;
  }> {
    console.log(`[CustomerExportRepository] exportCustomersCsv: Exporting CSV data`, {
      tenantId,
      orgId,
      ...options
    });

    try {
      // 改良版RPC関数を使用
      const { data, error } = await this.supabaseServiceInstance.rpc<{
        csv_data: string;
        total_count: number;
        has_more: boolean;
      }>('export_customers_csv_optimized_v2', {
        p_tenant_id: tenantId,
        p_org_id: orgId,
        p_batch_size: options.batchSize || 1000,
        p_offset: options.offset || 0,
        p_customer_uids: options.customerUids || null,
        p_include_headers: options.includeHeaders !== false // デフォルトtrue
      });

      if (error) {
        console.error('[CustomerExportRepository] exportCustomersCsv: RPC error', error);
        throwSupabaseError({
          callFunc: 'CustomerExportRepository.exportCustomersCsv',
          message: `CSV顧客データエクスポートに失敗しました: ${error.message}`,
          error: new Error(error.message),
          severity: 'high',
          details: { tenantId, orgId, options }
        });
      }

      if (!data || data.length === 0) {
        const fallbackCsv = options.includeHeaders !== false 
          ? '顧客ID,メールアドレス,名,姓,電話番号,LINE ID,LINEユーザー名,顧客タイプ,予約回数,最終予約日,登録日\n' 
          : '';
        return {
          csvData: fallbackCsv,
          totalCount: 0,
          hasMore: false
        };
      }

      const result = data[0];
      console.log(`[CustomerExportRepository] exportCustomersCsv: Success - generated CSV for ${result.total_count} customers`);

      return {
        csvData: result.csv_data || '',
        totalCount: result.total_count || 0,
        hasMore: result.has_more || false
      };

    } catch (error) {
      console.error('[CustomerExportRepository] exportCustomersCsv: Error', error);
      if (error instanceof Error && error.constructor.name === 'SupabaseError') {
        throw error;
      }
      
      throwSupabaseError({
        callFunc: 'CustomerExportRepository.exportCustomersCsv',
        message: `CSV顧客データエクスポートに失敗しました: ${(error as Error).message}`,
        error: error as Error,
        severity: 'high',
        details: { tenantId, orgId, options }
      });
    }
    
    // 到達不可能なコードだが、TypeScriptの型チェックのために追加
    throw new Error('Unexpected error in exportCustomersCsv');
  }

  /**
   * 大量データ対応のバッチCSVエクスポート
   * メモリ使用量を抑制しながら大量データをエクスポート
   * 
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param options - エクスポートオプション
   * @param onProgress - 進捗コールバック関数
   * @returns 完全なCSVデータ
   */
  async exportCustomersCsvBatch(
    tenantId: string,
    orgId: string,
    options: {
      customerUids?: string[];
      batchSize?: number;
    } = {},
    onProgress?: (progress: { current: number; total: number; percentage: number }) => void
  ): Promise<{
    csvData: string;
    totalCount: number;
  }> {
    console.log(`[CustomerExportRepository] exportCustomersCsvBatch: Starting batch export`);

    const batchSize = options.batchSize || 1000;
    let offset = 0;
    let allCsvData = '';
    let totalCount = 0;
    let hasMore = true;
    let isFirstBatch = true;

    try {
      while (hasMore) {
        const batchResult = await this.exportCustomersCsv(tenantId, orgId, {
          batchSize,
          offset,
          customerUids: options.customerUids,
          includeHeaders: isFirstBatch // ヘッダーは最初のバッチのみ
        });

        if (isFirstBatch) {
          totalCount = batchResult.totalCount;
          isFirstBatch = false;
        }

        allCsvData += batchResult.csvData;
        offset += batchSize;
        hasMore = batchResult.hasMore;

        // 進捗通知
        if (onProgress) {
          const current = Math.min(offset, totalCount);
          const percentage = totalCount > 0 ? Math.round((current / totalCount) * 100) : 100;
          onProgress({ current, total: totalCount, percentage });
        }

        console.log(`[CustomerExportRepository] exportCustomersCsvBatch: Batch ${Math.ceil(offset / batchSize)} completed (${offset}/${totalCount})`);
      }

      console.log(`[CustomerExportRepository] exportCustomersCsvBatch: Completed - ${totalCount} customers exported`);

      return {
        csvData: allCsvData,
        totalCount
      };

    } catch (error) {
      console.error('[CustomerExportRepository] exportCustomersCsvBatch: Error', error);
      throw error;
    }
  }

  /**
   * エクスポート可能な顧客数を取得
   * フィルタ条件に基づく顧客数の事前確認用
   * 
   * @param tenantId - テナントID
   * @param orgId - 組織ID
   * @param filters - フィルタ条件
   * @returns 対象顧客数
   */
  async getExportableCustomerCount(
    tenantId: string,
    orgId: string,
    filters?: {
      customerType?: string;
      hasReservations?: boolean;
      registrationDateFrom?: string;
      registrationDateTo?: string;
    }
  ): Promise<number> {
    console.log(`[CustomerExportRepository] getExportableCustomerCount: Counting customers`, { tenantId, orgId, filters });

    try {
      // 軽量なカウントクエリを実行
      const result = await this.exportCustomerData(tenantId, orgId, {
        exportType: 'by_count',
        maxCount: 0, // データは取得せず、カウントのみ
        filters
      });

      console.log(`[CustomerExportRepository] getExportableCustomerCount: Found ${result.total_count} customers`);
      return result.total_count;

    } catch (error) {
      console.error('[CustomerExportRepository] getExportableCustomerCount: Error', error);
      throw error;
    }
  }
}