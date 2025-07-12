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
  SelectOption
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
   * 指定期間のスタッフ別売上データを取得
   */
  async getStaffSales(filters: FilterOptions, options: AggregationOptions = {
    groupBy: 'staff',
    orderBy: 'amount',
    order: 'desc'
  }): Promise<AnalyticsResponse<StaffSalesData[]>> {
    try {
      const { supabase } = await import('@/services/supabase/SupabaseService');
      let query = supabase
        .from('staff_sales_summary')
        .select('*');

      // 基本フィルタ
      query = this.addTenantOrgFilter(query, filters.tenantId, filters.orgId);

      // スタッフIDフィルタ
      if (filters.staffIds && filters.staffIds.length > 0) {
        query = query.in('staff_id', filters.staffIds);
      }

      // ソート
      const orderColumn = options.orderBy === 'amount' ? 'total_amount' : 
                         options.orderBy === 'count' ? 'booking_count' : 
                         'staff_name';
      query = query.order(orderColumn, { ascending: options.order === 'asc' });

      // リミット・オフセット
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        this.handleError(error, 'get staff sales data');
      }

      // データを変換して平均額を計算
      const staffData: StaffSalesData[] = (data || []).map(item => ({
        staff_id: item.staff_id,
        staff_name: item.staff_name,
        total_amount: item.total_amount || 0,
        booking_count: item.booking_count || 0,
        average_amount: this.calculateAverage(item.total_amount || 0, item.booking_count || 0),
        last_booking_date: item.last_booking_date,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      return {
        data: staffData,
        meta: {
          total: staffData.length
        }
      };
    } catch (error) {
      this.handleError(error, 'get staff sales data');
    }
  }

  /**
   * スタッフ売上ランキングを取得
   */
  async getStaffRanking(
    filters: FilterOptions, 
    limit: number = 10
  ): Promise<RankingData[]> {
    try {
      const { data } = await this.getStaffSales(filters, {
        groupBy: 'staff',
        orderBy: 'amount',
        order: 'desc',
        limit
      });

      const totalAmount = data.reduce((sum, item) => sum + item.total_amount, 0);

      return data.map((item, index) => ({
        id: item.staff_id,
        name: item.staff_name || `スタッフ${item.staff_id}`,
        value: item.total_amount,
        percentage: this.calculatePercentage(item.total_amount, totalAmount),
        rank: index + 1
      }));
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
      
      const dailyAverage = Math.round(totalAmount / periodDays);
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
      let query = supabase
        .from('staff_sales_summary')
        .select('staff_id, staff_name');

      query = this.addTenantOrgFilter(query, tenantId, orgId);
      query = query.order('staff_name', { ascending: true });

      const { data, error } = await query;

      if (error) {
        this.handleError(error, 'get staff options');
      }

      return (data || []).map(item => ({
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
    };
    performanceDistribution: {
      high: number; // 平均以上
      medium: number; // 平均の50-100%
      low: number; // 平均の50%未満
    };
  }> {
    try {
      const { data } = await this.getStaffSales(filters);

      if (data.length === 0) {
        return {
          topPerformers: [],
          averagePerformance: { averageAmount: 0, averageBookings: 0 },
          performanceDistribution: { high: 0, medium: 0, low: 0 }
        };
      }

      // 全体平均を計算
      const totalAmount = data.reduce((sum, item) => sum + item.total_amount, 0);
      const totalBookings = data.reduce((sum, item) => sum + item.booking_count, 0);
      const averageAmount = totalAmount / data.length;
      const averageBookings = totalBookings / data.length;

      // トップパフォーマー（上位3名）
      const topPerformers = data.slice(0, 3);

      // パフォーマンス分布
      let high = 0, medium = 0, low = 0;
      data.forEach(staff => {
        if (staff.total_amount >= averageAmount) {
          high++;
        } else if (staff.total_amount >= averageAmount * 0.5) {
          medium++;
        } else {
          low++;
        }
      });

      return {
        topPerformers,
        averagePerformance: {
          averageAmount: Math.round(averageAmount),
          averageBookings: Math.round(averageBookings)
        },
        performanceDistribution: { high, medium, low }
      };
    } catch (error) {
      this.handleError(error, 'get staff performance comparison');
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
}