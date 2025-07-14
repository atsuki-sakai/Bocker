import { AnalyticsRepository } from './AnalyticsRepository';
import { supabaseClientService } from '@/services/supabase/SupabaseService';
import type { SupabaseService } from '@/services/supabase/SupabaseService';
import { 
  DailySalesData, 
  FilterOptions, 
  SalesSummary,
  PeriodComparisonData,
  ChartDataPoint,
  PartitionAwareFilterOptions,
  PeriodAggregationOptions,
  RpcDailySalesRow,
  RpcAggregatedDailySalesParams
} from './types';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * 日別売上データのリポジトリクラス
 * daily_sales_summaryテーブルからデータを取得・分析
 */
export class DailySalesRepository extends AnalyticsRepository {
  
  constructor(supabaseService: SupabaseService = supabaseClientService) {
    super(supabaseService);
  }

  /**
   * 指定期間の日別売上データを取得（RPC関数使用・型安全）
   */
  async getDailySales(filters: FilterOptions): Promise<DailySalesData[]> {
    try {
      const { supabase } = await import('@/services/supabase/SupabaseService');
      const dateRange = this.formatDateRange(filters.dateRange);
      
      console.log('[DailySalesRepository] getDailySales called with filters:', {
        tenantId: filters.tenantId,
        orgId: filters.orgId,
        dateRange,
        originalDateRange: {
          from: filters.dateRange.from.toISOString(),
          to: filters.dateRange.to.toISOString()
        }
      });

      // RPC関数を使用して型安全にデータ取得
      const rpcParams: RpcAggregatedDailySalesParams = {
        p_tenant_id: filters.tenantId,
        p_org_id: filters.orgId,
        p_date_from: dateRange.from,
        p_date_to: dateRange.to
      };

      const { data, error } = await supabase.rpc('get_aggregated_daily_sales', rpcParams);

      console.log('[DailySalesRepository] RPC query executed:', {
        function: 'get_aggregated_daily_sales',
        params: rpcParams,
        result: {
          data: data,
          error: error,
          dataLength: data?.length || 0
        }
      });

      if (error) {
        console.error('[DailySalesRepository] RPC query error:', error);
        this.handleError(error, 'get daily sales data via RPC');
      }

      if (!data || data.length === 0) {
        console.warn('[DailySalesRepository] No daily sales data found for the specified period');
        return [];
      }

      // RPC関数からの型安全なデータ変換
      const processedData: DailySalesData[] = (data as RpcDailySalesRow[]).map((item: RpcDailySalesRow) => ({
        sale_date: item.business_date,
        total_amount: Number(item.total_amount) || 0,
        booking_count: Number(item.booking_count) || 0,
        average_amount: this.calculateAverage(Number(item.total_amount) || 0, Number(item.booking_count) || 0),
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      console.log('[DailySalesRepository] Successfully processed RPC data:', {
        originalCount: data.length,
        processedCount: processedData.length,
        sampleProcessedData: processedData.slice(0, 3)
      });

      return processedData;
    } catch (error) {
      console.error('[DailySalesRepository] Unexpected error in getDailySales:', error);
      this.handleError(error, 'get daily sales data');
    }
  }

  /**
   * 売上トレンドデータを取得（チャート用）
   */
  async getSalesTrend(filters: FilterOptions): Promise<ChartDataPoint[]> {
    try {
      const salesData = await this.getDailySales(filters);
      
      // 期間内の全日付を生成
      const allDates = eachDayOfInterval({
        start: filters.dateRange.from,
        end: filters.dateRange.to
      });

      return allDates.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayData = salesData.find(item => item.sale_date === dateStr);
        
        return {
          date: format(date, 'M/d', { locale: ja }),
          value: dayData?.total_amount || 0,
          label: this.formatCurrency(dayData?.total_amount || 0)
        };
      });
    } catch (error) {
      this.handleError(error, 'get sales trend data');
    }
  }

  /**
   * 曜日別パフォーマンスを取得
   */
  async getWeekdayPerformance(filters: FilterOptions): Promise<Array<{
    dayOfWeek: number;
    dayName: string;
    totalAmount: number;
    bookingCount: number;
    averageAmount: number;
  }>> {
    try {
      const salesData = await this.getDailySales(filters);
      
      // 全曜日を初期化（日曜日=0 から 土曜日=6 まで）
      const weekdayStats: Record<number, { totalAmount: number; bookingCount: number }> = {};
      for (let i = 0; i <= 6; i++) {
        weekdayStats[i] = { totalAmount: 0, bookingCount: 0 };
      }
      
      // 実際のデータを集計
      salesData.forEach(item => {
        const date = parseISO(item.sale_date);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...
        
        weekdayStats[dayOfWeek].totalAmount += item.total_amount;
        weekdayStats[dayOfWeek].bookingCount += item.booking_count;
      });

      const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
      
      // 全曜日のデータを返す（0-6の順序で）
      return Object.entries(weekdayStats).map(([dayOfWeek, stats]) => ({
        dayOfWeek: parseInt(dayOfWeek),
        dayName: dayNames[parseInt(dayOfWeek)],
        totalAmount: stats.totalAmount,
        bookingCount: stats.bookingCount,
        averageAmount: this.calculateAverage(stats.totalAmount, stats.bookingCount)
      })).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    } catch (error) {
      this.handleError(error, 'get weekday performance data');
    }
  }

  /**
   * 月別売上データを取得
   */
  async getMonthlySales(filters: FilterOptions): Promise<Array<{
    month: string;
    monthName: string;
    totalAmount: number;
    bookingCount: number;
    averageAmount: number;
  }>> {
    try {
      const salesData = await this.getDailySales(filters);
      
      const monthlyStats: Record<string, { totalAmount: number; bookingCount: number }> = {};
      
      salesData.forEach(item => {
        const date = parseISO(item.sale_date);
        const monthKey = format(date, 'yyyy-MM');
        
        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = { totalAmount: 0, bookingCount: 0 };
        }
        
        monthlyStats[monthKey].totalAmount += item.total_amount;
        monthlyStats[monthKey].bookingCount += item.booking_count;
      });

      return Object.entries(monthlyStats).map(([monthKey, stats]) => ({
        month: monthKey,
        monthName: format(parseISO(`${monthKey}-01`), 'yyyy年M月', { locale: ja }),
        totalAmount: stats.totalAmount,
        bookingCount: stats.bookingCount,
        averageAmount: this.calculateAverage(stats.totalAmount, stats.bookingCount)
      })).sort((a, b) => a.month.localeCompare(b.month));
    } catch (error) {
      this.handleError(error, 'get monthly sales data');
    }
  }

  /**
   * 売上サマリーを取得
   */
  async getSalesSummary(filters: FilterOptions): Promise<SalesSummary> {
    try {
      const salesData = await this.getDailySales(filters);

      const totalAmount = salesData.reduce((sum, item) => sum + item.total_amount, 0);
      const totalBookings = salesData.reduce((sum, item) => sum + item.booking_count, 0);
      const averageAmount = this.calculateAverage(totalAmount, totalBookings);
      
      const periodDays = Math.ceil(
        (filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      
      const dailyAverage = Math.round(totalAmount / periodDays);

      return {
        totalAmount,
        totalBookings,
        averageAmount,
        periodDays,
        dailyAverage
      };
    } catch (error) {
      this.handleError(error, 'get sales summary');
    }
  }

  /**
   * 期間比較データを取得
   */
  async getPeriodComparison(filters: FilterOptions): Promise<PeriodComparisonData> {
    try {
      const currentSummary = await this.getSalesSummary(filters);
      
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
    const summary = await this.getSalesSummary(filters);
    return {
      total_amount: summary.totalAmount,
      booking_count: summary.totalBookings
    };
  }

  /**
   * パーティション対応前期間データを取得（基底クラスの抽象メソッド実装）
   */
  protected async getPartitionAwarePeriodData(filters: PartitionAwareFilterOptions): Promise<{ total_amount: number; booking_count: number }> {
    const usePartitions = this.shouldUsePartitions(filters);
    
    if (usePartitions) {
      return await this.getDailySalesFromPartitions(filters);
    } else {
      // 従来の方法でフォールバック
      const summary = await this.getSalesSummary(filters);
      return {
        total_amount: summary.totalAmount,
        booking_count: summary.totalBookings
      };
    }
  }

  /**
   * パーティションテーブルから日別売上データを効率的に取得
   */
  private async getDailySalesFromPartitions(filters: PartitionAwareFilterOptions): Promise<{ total_amount: number; booking_count: number }> {
    try {
      const { supabase } = await import('@/services/supabase/SupabaseService');
      const dateRange = this.formatDateRange(filters.dateRange);
      
      let query = supabase
        .from('daily_sales_summary')
        .select('total_amount, booking_count')
        .gte('business_date', dateRange.from)
        .lte('business_date', dateRange.to);

      // 基本フィルタ
      query = this.addTenantOrgFilter(query, filters.tenantId, filters.orgId);

      const { data, error } = await query;

      if (error) {
        this.handleError(error, 'get daily sales from partitions');
      }

      // データを集計
      const totalAmount = (data || []).reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);
      const totalBookings = (data || []).reduce((sum, item) => sum + (item.booking_count || 0), 0);

      return {
        total_amount: totalAmount,
        booking_count: totalBookings
      };
    } catch (error) {
      this.handleError(error, 'get daily sales from partitions');
    }
  }

  /**
   * パーティション対応期間比較データを取得
   */
  async getPartitionAwarePeriodComparison(filters: PartitionAwareFilterOptions): Promise<PeriodComparisonData> {
    try {
      const currentData = await this.getPartitionAwarePeriodData(filters);
      
      return await this.generatePartitionAwarePeriodComparison(currentData, filters);
    } catch (error) {
      this.handleError(error, 'get partition-aware period comparison');
    }
  }

  /**
   * パーティション対応集計データを取得
   */
  async getAggregatedDailySales(filters: PartitionAwareFilterOptions, options: PeriodAggregationOptions): Promise<DailySalesData[]> {
    try {
      const usePartitions = this.shouldUsePartitions(filters);
      
      if (usePartitions) {
        // パーティションテーブルから効率的に取得
        return await this.getDailySalesOptimized(filters, options);
      } else {
        // 従来の方法でフォールバック
        return await this.getDailySales(filters);
      }
    } catch (error) {
      this.handleError(error, 'get aggregated daily sales');
    }
  }

  /**
   * 最適化された日別売上データを取得（パーティション対応）
   */
  private async getDailySalesOptimized(filters: PartitionAwareFilterOptions, options: PeriodAggregationOptions): Promise<DailySalesData[]> {
    try {
      const { supabase } = await import('@/services/supabase/SupabaseService');
      const dateRange = this.formatDateRange(filters.dateRange);
      
      let query = supabase
        .from('daily_sales_summary')
        .select('*')
        .gte('business_date', dateRange.from)
        .lte('business_date', dateRange.to);

      // 基本フィルタ
      query = this.addTenantOrgFilter(query, filters.tenantId, filters.orgId);

      // 集計レベルに応じたソート
      if (options.period === 'daily') {
        query = query.order('business_date', { ascending: true });
      }

      // データ欠損を埋める場合の制限
      if (options.fillGaps) {
        const maxDays = Math.ceil(
          (filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (maxDays > 365) {
          // 1年以上の期間の場合は制限
          query = query.limit(365);
        }
      }

      const { data, error } = await query;

      if (error) {
        this.handleError(error, 'get optimized daily sales');
      }

      const processedData = (data || []).map(item => ({
        sale_date: item.business_date,
        total_amount: Number(item.total_amount) || 0,
        booking_count: item.booking_count || 0,
        average_amount: this.calculateAverage(Number(item.total_amount) || 0, item.booking_count || 0),
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      // データ欠損を埋める処理
      if (options.fillGaps) {
        return this.fillMissingDates(processedData, filters.dateRange);
      }

      return processedData;
    } catch (error) {
      this.handleError(error, 'get optimized daily sales');
    }
  }

  /**
   * 欠損日付を0データで埋める
   */
  private fillMissingDates(salesData: DailySalesData[], dateRange: { from: Date; to: Date }): DailySalesData[] {
    const allDates = eachDayOfInterval({
      start: dateRange.from,
      end: dateRange.to
    });

    return allDates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const existingData = salesData.find(item => item.sale_date === dateStr);
      
      return existingData || {
        sale_date: dateStr,
        total_amount: 0,
        booking_count: 0,
        average_amount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
  }
}