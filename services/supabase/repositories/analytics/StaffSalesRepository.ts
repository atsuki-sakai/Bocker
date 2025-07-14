import { AnalyticsRepository } from './AnalyticsRepository';
import { 
  StaffSalesData, 
  FilterOptions, 
  RankingData,
  SalesSummary,
  PeriodComparisonData,
  BarChartDataPoint,
  AnalyticsResponse,
  AggregationOptions,
  SelectOption,
  PartitionAwareFilterOptions,
  PeriodAggregationOptions,
  RpcStaffSalesRow,
  RpcAggregatedStaffSalesParams
} from './types';
import { SupabaseService } from '@/services/supabase/SupabaseService';
import { supabaseClientService } from '@/services/supabase/SupabaseService';

/**
 * スタッフ別売上データのリポジトリクラス
 * staff_sales_summaryテーブルからデータを取得・分析
 */
export class StaffSalesRepository extends AnalyticsRepository {

  constructor(supabaseService: SupabaseService = supabaseClientService) {
    super(supabaseService);
  }

  /**
   * RPC関数から返される値を安全に数値に変換するヘルパー
   */
  private safeParseNumber(value: string | number | bigint | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * エンタープライズレベル：BIGINT値を安全にnumberに変換（3,000店舗対応）
   */
  private safeParseInteger(value: string | number | bigint | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Math.floor(value);
    if (typeof value === 'bigint') {
      // BigIntの範囲チェック（JavaScriptのMAX_SAFE_INTEGER以内）
      if (value > Number.MAX_SAFE_INTEGER) {
        console.warn('[Enterprise] BigInt value exceeds MAX_SAFE_INTEGER:', value);
        return Number.MAX_SAFE_INTEGER;
      }
      return Number(value);
    }
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) return 0;
      // 文字列からのパースでも安全性チェック
      if (parsed > Number.MAX_SAFE_INTEGER) {
        console.warn('[Enterprise] Parsed integer exceeds MAX_SAFE_INTEGER:', parsed);
        return Number.MAX_SAFE_INTEGER;
      }
      return parsed;
    }
    return 0;
  }

  /**
   * 指定期間のスタッフ別売上データを取得
   */
  async getStaffSales(filters: FilterOptions, options: AggregationOptions = {
    groupBy: 'staff',
    orderBy: 'amount',
    order: 'desc'
  }): Promise<AnalyticsResponse<StaffSalesData[]>> {
    try {
      const { supabase } = await import('@/services/supabase/SupabaseService');
      
      // パーティション対応: RPC関数を使用してスタッフ別に集計
      const dateRange = this.formatDateRange(filters.dateRange);
      const rpcParams: RpcAggregatedStaffSalesParams = {
        p_tenant_id: filters.tenantId,
        p_org_id: filters.orgId,
        p_date_from: dateRange.from,
        p_date_to: dateRange.to,
        p_staff_ids: (filters.staffIds?.length ? filters.staffIds : null)
      };

      console.log('[StaffSalesRepository] RPC function params:', {
        p_tenant_id: filters.tenantId,
        p_org_id: filters.orgId,
        p_date_from: dateRange.from,
        p_date_to: dateRange.to,
        p_staff_ids: (filters.staffIds?.length ? filters.staffIds : null),
        daysDiff: Math.ceil((filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) / (1000 * 60 * 60 * 24)),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        shouldUsePartitions: this.shouldUsePartitions(filters as any)
      });

      const { data, error } = await supabase.rpc('get_aggregated_staff_sales', rpcParams);

      if (error) {
        console.error('[StaffSalesRepository] RPC function error:', error);
        this.handleError(error, 'get staff sales data');
      }

      console.log('[Enterprise] RPC function response received:', {
        dataLength: data?.length,
        sampleData: data?.[0],
        error,
        filterDateRange: {
          from: dateRange.from,
          to: dateRange.to,
          dateTruncFrom: `DATE_TRUNC('month', '${dateRange.from}')`,
          dateTruncTo: `DATE_TRUNC('month', '${dateRange.to}')`
        }
      });

      // エンタープライズレベル：大規模SaaS向けデータ変換・検証
      const staffData: StaffSalesData[] = (data as RpcStaffSalesRow[] || []).map((item: RpcStaffSalesRow, index: number) => {
        try {
          const totalAmount = this.safeParseNumber(item.total_amount);
          const bookingCount = this.safeParseInteger(item.booking_count);
          const averageAmount = this.calculateAverage(totalAmount, bookingCount);

          return {
            staff_id: item.staff_id,
            staff_name: item.staff_name || null,
            total_amount: totalAmount,
            booking_count: bookingCount,
            average_amount: averageAmount,
            last_booking_date: item.last_booking_date,
            created_at: item.created_at,
            updated_at: item.updated_at
          };
        } catch (itemError) {
          console.error(`[Enterprise] Error processing staff item ${index}:`, {
            item,
            error: itemError
          });
          
          return {
            staff_id: item.staff_id || `unknown_${index}`,
            staff_name: 'Data Error',
            total_amount: 0,
            booking_count: 0,
            average_amount: 0,
            last_booking_date: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
      });

      // ソートを適用
      const sortedData = this.applySorting(staffData, options);
      
      // リミット・オフセットを適用
      const paginatedData = this.applyPagination(sortedData, options);

      console.log('[Enterprise] Successfully processed staff sales data:', {
        originalCount: data?.length || 0,
        processedCount: staffData.length,
        sortedCount: sortedData.length,
        paginatedCount: paginatedData.length,
        topStaff: paginatedData.map(s => ({ 
          name: s.staff_name, 
          amount: s.total_amount 
        }))
      });

      return {
        data: paginatedData,
        meta: {
          total: staffData.length,
          aggregationLevel: 'monthly'
        }
      };
    } catch (error) {
      console.error('[Enterprise] Unexpected error in getStaffSales:', error);
      this.handleError(error, 'get staff sales data');
    }
  }

  /**
   * スタッフデータのソートを適用
   */
  private applySorting(data: StaffSalesData[], options: AggregationOptions): StaffSalesData[] {
    const { orderBy = 'amount', order = 'desc' } = options;
    
    return [...data].sort((a, b) => {
      let aValue: number | string, bValue: number | string;
      
      switch (orderBy) {
        case 'amount':
          aValue = a.total_amount;
          bValue = b.total_amount;
          break;
        case 'count':
          aValue = a.booking_count;
          bValue = b.booking_count;
          break;
        default:
          aValue = a.staff_name || '';
          bValue = b.staff_name || '';
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      const numA = Number(aValue);
      const numB = Number(bValue);
      return order === 'asc' ? numA - numB : numB - numA;
    });
  }

  /**
   * ページネーションを適用
   */
  private applyPagination(data: StaffSalesData[], options: AggregationOptions): StaffSalesData[] {
    const { limit, offset = 0 } = options;
    
    if (!limit) return data;
    
    return data.slice(offset, offset + limit);
  }

  /**
   * スタッフ売上ランキングを取得
   */
  async getStaffRanking(
    filters: FilterOptions, 
    limit: number = 10
  ): Promise<RankingData[]> {
    try {
      const isSpecificStaffSelected = filters.staffIds && filters.staffIds.length > 0;
      
      if (isSpecificStaffSelected) {
        // 特定スタッフが選択されている場合：選択されたスタッフ群内でのランキング
        const { data: selectedData } = await this.getStaffSales(filters, {
          groupBy: 'staff',
          orderBy: 'amount',
          order: 'desc'
        });

        const totalAmount = selectedData.reduce((sum, item) => sum + item.total_amount, 0);
        const limitedData = selectedData.slice(0, limit);

        return limitedData.map((item, index) => ({
          id: item.staff_id,
          name: item.staff_name || `スタッフ${item.staff_id}`,
          value: item.total_amount,
          percentage: this.calculatePercentage(item.total_amount, totalAmount),
          rank: index + 1
        }));
      } else {
        // 全スタッフ表示の場合：全体に対するランキング
        const { data: allData } = await this.getStaffSales(filters, {
          groupBy: 'staff',
          orderBy: 'amount',
          order: 'desc'
        });

        const totalAmount = allData.reduce((sum, item) => sum + item.total_amount, 0);
        const limitedData = allData.slice(0, limit);

        return limitedData.map((item, index) => ({
          id: item.staff_id,
          name: item.staff_name || `スタッフ${item.staff_id}`,
          value: item.total_amount,
          percentage: this.calculatePercentage(item.total_amount, totalAmount),
          rank: index + 1
        }));
      }
    } catch (error) {
      this.handleError(error, 'get staff ranking');
    }
  }

  /**
   * チャート用データを取得（棒グラフ用）
   */
  async getChartData(filters: FilterOptions, limit: number = 10): Promise<BarChartDataPoint[]> {
    try {
      const { data } = await this.getStaffSales(filters, {
        groupBy: 'staff',
        orderBy: 'amount',
        order: 'desc',
        limit
      });

      return data.map(item => ({
        name: item.staff_name || `スタッフ${item.staff_id}`,
        value: item.total_amount,
        label: this.formatCurrency(item.total_amount)
      }));
    } catch (error) {
      this.handleError(error, 'get chart data');
    }
  }

  /**
   * スタッフ売上サマリーを取得
   */
  async getStaffSummary(filters: FilterOptions): Promise<SalesSummary & {
    topStaff: StaffSalesData | null;
    activeStaffCount: number;
  }> {
    try {
      const { data } = await this.getStaffSales(filters);

      const totalAmount = data.reduce((sum, item) => sum + item.total_amount, 0);
      const totalBookings = data.reduce((sum, item) => sum + item.booking_count, 0);
      const averageAmount = this.calculateAverage(totalAmount, totalBookings);
      
      const periodDays = Math.ceil(
        (filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      
      const dailyAverage = this.calculateDailyAverage(totalAmount, periodDays);
      const activeStaffCount = data.filter(item => item.total_amount > 0).length;
      const topStaff = data.length > 0 ? data[0] : null;

      return {
        totalAmount,
        totalBookings,
        averageAmount,
        periodDays,
        dailyAverage,
        topStaff,
        activeStaffCount
      };
    } catch (error) {
      this.handleError(error, 'get staff summary');
    }
  }

  /**
   * 特定スタッフの詳細データを取得
   */
  async getStaffDetail(
    tenantId: string, 
    orgId: string, 
    staffId: string
  ): Promise<StaffSalesData | null> {
    try {
      const { supabase } = await import('@/services/supabase/SupabaseService');
      let query = supabase
        .from('staff_sales_summary')
        .select('*');

      query = this.addTenantOrgFilter(query, tenantId, orgId);
      query = query.eq('staff_id', staffId);

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          // データが見つからない場合
          return null;
        }
        this.handleError(error, 'get staff detail');
      }

      return {
        staff_id: data.staff_id,
        staff_name: data.staff_name,
        total_amount: data.total_amount || 0,
        booking_count: data.booking_count || 0,
        average_amount: this.calculateAverage(data.total_amount || 0, data.booking_count || 0),
        last_booking_date: data.last_booking_date,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      this.handleError(error, 'get staff detail');
    }
  }

  /**
   * スタッフ選択用オプションを取得
   */
  async getStaffOptions(tenantId: string, orgId: string): Promise<SelectOption[]> {
    try {
      const { supabase } = await import('@/services/supabase/SupabaseService');
      
      // パーティション対応: 生SQLでDISTINCTを使用してパフォーマンス最適化
      const { data, error } = await supabase
        .rpc('get_distinct_staff_options', {
          p_tenant_id: tenantId,
          p_org_id: orgId
        });

      if (error) {
        this.handleError(error, 'get staff options');
      }

      return (data || []).map((item: { staff_id: string; staff_name: string }) => ({
        value: item.staff_id,
        label: item.staff_name || `スタッフ${item.staff_id}`
      }));
    } catch (error) {
      this.handleError(error, 'get staff options');
    }
  }

  /**
   * スタッフパフォーマンス比較を取得
   */
  async getStaffPerformanceComparison(
    filters: FilterOptions
  ): Promise<{
    topPerformers: StaffSalesData[];
    averagePerformance: {
      averageAmount: number;
      averageBookings: number;
      medianAmount: number;
    };
    performanceDistribution: {
      high: number; // 平均以上
      medium: number; // 平均の50-100%
      low: number; // 平均の50%未満
    };
    additionalStats: {
      topPerformerRatio: number; // トップ20%のスタッフの売上シェア
      averageBookingValue: number; // 平均予約単価
      performanceVariance: number; // パフォーマンスのばらつき（標準偏差）
      consistencyScore: number; // 一貫性スコア（CV値の逆数）
    };
  }> {
    try {
      const isSpecificStaffSelected = filters.staffIds && filters.staffIds.length > 0;
      const isSingleStaffSelected = filters.staffIds && filters.staffIds.length === 1;
      
      let data: StaffSalesData[];
      let comparisonData: StaffSalesData[] = [];
      
      if (isSpecificStaffSelected) {
        // 選択されたスタッフのデータを取得
        const { data: selectedData } = await this.getStaffSales(filters);
        data = selectedData;
        
        if (isSingleStaffSelected) {
          // 単一スタッフ選択時は全体との比較のため、全スタッフデータも取得
          const allStaffFilters = { ...filters, staffIds: undefined };
          const { data: allStaffData } = await this.getStaffSales(allStaffFilters);
          comparisonData = allStaffData;
        }
      } else {
        // 全スタッフデータを取得
        const { data: allData } = await this.getStaffSales(filters);
        data = allData;
      }

      if (data.length === 0) {
        return {
          topPerformers: [],
          averagePerformance: { 
            averageAmount: 0, 
            averageBookings: 0,
            medianAmount: 0
          },
          performanceDistribution: { high: 0, medium: 0, low: 0 },
          additionalStats: {
            topPerformerRatio: 0,
            averageBookingValue: 0,
            performanceVariance: 0,
            consistencyScore: 0
          }
        };
      }

      // 比較計算用のデータを決定
      const comparisonDataForAverage = comparisonData.length > 0 ? comparisonData : data;
      
      // 全体平均を計算（単一選択時は全体平均、複数選択時は選択群平均）
      const totalAmount = data.reduce((sum, item) => sum + item.total_amount, 0);
      const totalBookings = data.reduce((sum, item) => sum + item.booking_count, 0);
      
      // 比較用の平均（単一選択時は全体平均、複数選択時は選択群平均）
      const comparisonTotalAmount = comparisonDataForAverage.reduce((sum, item) => sum + item.total_amount, 0);
      const comparisonTotalBookings = comparisonDataForAverage.reduce((sum, item) => sum + item.booking_count, 0);
      
      // スタッフあたりの平均売上
      const averageAmountPerStaff = comparisonDataForAverage.length > 0 ? comparisonTotalAmount / comparisonDataForAverage.length : 0;
      // 予約あたりの平均単価
      const averageAmountPerBooking = comparisonTotalBookings > 0 ? comparisonTotalAmount / comparisonTotalBookings : 0;
      const averageBookings = comparisonDataForAverage.length > 0 ? comparisonTotalBookings / comparisonDataForAverage.length : 0;

      // 中央値を計算（比較データを使用）
      const sortedAmounts = [...comparisonDataForAverage].sort((a, b) => a.total_amount - b.total_amount);
      const medianAmount = comparisonDataForAverage.length % 2 === 0
        ? (sortedAmounts[comparisonDataForAverage.length / 2 - 1].total_amount + sortedAmounts[comparisonDataForAverage.length / 2].total_amount) / 2
        : sortedAmounts[Math.floor(comparisonDataForAverage.length / 2)].total_amount;

      
      const topPerformers = data;

      // パフォーマンス分布（スタッフあたりの平均売上基準）
      let high = 0, medium = 0, low = 0;
      
      if (isSingleStaffSelected) {
        // 単一スタッフ選択時は分布表示を無効化（個人詳細のため分布は意味がない）
        high = medium = low = 0;
      } else {
        // 複数スタッフ選択時または全スタッフ表示時は分布を計算
        data.forEach(staff => {
          if (staff.total_amount >= averageAmountPerStaff) {
            high++;
          } else if (staff.total_amount >= averageAmountPerStaff * 0.5) {
            medium++;
          } else {
            low++;
          }
        });
      }

      // 追加統計情報を計算
      const additionalStats = this.calculateAdditionalStats(data, comparisonDataForAverage);

      return {
        topPerformers,
        averagePerformance: {
          averageAmount: Math.round(averageAmountPerStaff),
          averageBookings: Math.round(averageBookings),
          medianAmount: Math.round(medianAmount)
        },
        performanceDistribution: { high, medium, low },
        additionalStats
      };
    } catch (error) {
      this.handleError(error, 'get staff performance comparison');
    }
  }

  /**
   * 追加統計情報を計算
   */
  private calculateAdditionalStats(
    data: StaffSalesData[], 
    comparisonData: StaffSalesData[]
  ): {
    topPerformerRatio: number;
    averageBookingValue: number;
    performanceVariance: number;
    consistencyScore: number;
  } {
    if (data.length === 0) {
      return {
        topPerformerRatio: 0,
        averageBookingValue: 0,
        performanceVariance: 0,
        consistencyScore: 0
      };
    }

    // トップ20%のスタッフの売上シェアを計算
    const top20PercentCount = Math.max(1, Math.ceil(data.length * 0.2));
    const topPerformers = data.slice(0, top20PercentCount);
    const topPerformerTotalAmount = topPerformers.reduce((sum, staff) => sum + staff.total_amount, 0);
    const totalAmount = data.reduce((sum, staff) => sum + staff.total_amount, 0);
    const topPerformerRatio = totalAmount > 0 ? (topPerformerTotalAmount / totalAmount) * 100 : 0;

    // 平均予約単価を計算
    const totalBookings = data.reduce((sum, staff) => sum + staff.booking_count, 0);
    const averageBookingValue = totalBookings > 0 ? totalAmount / totalBookings : 0;

    // パフォーマンスのばらつき（標準偏差）を計算
    const amounts = data.map(staff => staff.total_amount);
    const mean = totalAmount / data.length;
    const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / data.length;
    const performanceVariance = Math.sqrt(variance);

    // 一貫性スコア（変動係数の逆数）を10点満点で計算
    const coefficientOfVariation = mean > 0 ? performanceVariance / mean : 0;
    const consistencyScore = coefficientOfVariation > 0 ? Math.min(10, (1 / coefficientOfVariation)) : 10;

    return {
      topPerformerRatio: Math.round(topPerformerRatio * 10) / 10, // 小数点1桁
      averageBookingValue: Math.round(averageBookingValue),
      performanceVariance: Math.round(performanceVariance),
      consistencyScore: Math.round(consistencyScore * 10) / 10 // 小数点1桁
    };
  }

  /**
   * 期間比較データを取得
   */
  async getPeriodComparison(filters: FilterOptions): Promise<PeriodComparisonData> {
    try {
      const currentSummary = await this.getStaffSummary(filters);
      
      return await this.generatePeriodComparison(
        {
          total_amount: currentSummary.totalAmount,
          booking_count: currentSummary.totalBookings
        },
        filters
      );
    } catch (error) {
      this.handleError(error, 'get period comparison');
    }
  }

  /**
   * 前期間データを取得（基底クラスの抽象メソッド実装）
   */
  protected async getPeriodData(filters: FilterOptions): Promise<{ total_amount: number; booking_count: number }> {
    const summary = await this.getStaffSummary(filters);
    return {
      total_amount: summary.totalAmount,
      booking_count: summary.totalBookings
    };
  }

  /**
   * パーティション対応前期間データを取得（基底クラスの抽象メソッド実装）
   */
  protected async getPartitionAwarePeriodData(filters: PartitionAwareFilterOptions): Promise<{ total_amount: number; booking_count: number }> {
    const summary = await this.getStaffSummary(filters);
    return {
      total_amount: summary.totalAmount,
      booking_count: summary.totalBookings
    };
  }
}