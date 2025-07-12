import { AnalyticsRepository } from './AnalyticsRepository';
import { supabaseClientService } from '@/services/supabase/SupabaseService';
import type { SupabaseService } from '@/services/supabase/SupabaseService';
import { 
  DailySalesData, 
  FilterOptions, 
  SalesSummary,
  PeriodComparisonData,
  ChartDataPoint
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
   * 指定期間の日別売上データを取得
   */
  async getDailySales(filters: FilterOptions): Promise<DailySalesData[]> {
    try {
      const { supabase } = await import('@/services/supabase/SupabaseService');
      const { from, to } = this.formatDateRange(filters.dateRange);
      
      console.log('[DailySalesRepository] getDailySales called with filters:', {
        tenantId: filters.tenantId,
        orgId: filters.orgId,
        dateRange: { from, to },
        originalDateRange: {
          from: filters.dateRange.from.toISOString(),
          to: filters.dateRange.to.toISOString()
        }
      });

      // まずテーブルにどんなデータがあるかを確認
      const allDataQuery = await supabase
        .from('daily_sales_summary')
        .select('*')
        .limit(10);
      
      console.log('[DailySalesRepository] Sample data from daily_sales_summary table:', {
        data: allDataQuery.data,
        error: allDataQuery.error,
        count: allDataQuery.data?.length || 0
      });

      // 実際のクエリを実行
      const { data, error } = await supabase
        .from('daily_sales_summary')
        .select('*')
        .eq('tenant_id', filters.tenantId)
        .eq('org_id', filters.orgId)
        .gte('business_date', from)
        .lte('business_date', to)
        .order('business_date', { ascending: true });

      console.log('[DailySalesRepository] Query executed:', {
        query: {
          table: 'daily_sales_summary',
          tenant_id: filters.tenantId,
          org_id: filters.orgId,
          business_date_gte: from,
          business_date_lte: to
        },
        result: {
          data: data,
          error: error,
          dataLength: data?.length || 0
        }
      });

      if (error) {
        console.error('[DailySalesRepository] Supabase query error:', error);
        this.handleError(error, 'get daily sales data');
      }

      if (!data || data.length === 0) {
        console.warn('[DailySalesRepository] No daily sales data found for the specified period');
        
        // デバッグ用：テナント・組織IDでのデータ存在確認
        const debugQuery = await supabase
          .from('daily_sales_summary')
          .select('*')
          .eq('tenant_id', filters.tenantId)
          .eq('org_id', filters.orgId)
          .limit(5);
        
        console.log('[DailySalesRepository] Debug - Data for tenant/org without date filter:', {
          tenantId: filters.tenantId,
          orgId: filters.orgId,
          foundData: debugQuery.data,
          foundCount: debugQuery.data?.length || 0
        });

        return [];
      }

      const processedData = data.map(item => ({
        sale_date: item.business_date,
        total_amount: Number(item.total_amount) || 0,
        booking_count: item.booking_count || 0,
        average_amount: this.calculateAverage(Number(item.total_amount) || 0, item.booking_count || 0),
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      console.log('[DailySalesRepository] Successfully processed data:', {
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
}