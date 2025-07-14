import { supabaseClientService } from '@/services/supabase/SupabaseService';
import type { SupabaseService } from '@/services/supabase/SupabaseService';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, subYears, startOfWeek, endOfWeek } from 'date-fns';
import { 
  DateRange, 
  FilterOptions, 
  PeriodComparisonData,
  PartitionAwareFilterOptions,
  PeriodAggregationOptions,
} from './types';

/**
 * 分析データアクセス用の基底リポジトリクラス
 * 共通的な機能と日付処理を提供
 */
export abstract class AnalyticsRepository {
  protected supabaseService: SupabaseService;

  constructor(supabaseService: SupabaseService = supabaseClientService) {
    this.supabaseService = supabaseService;
  }

  /**
   * 日付範囲を文字列形式に変換
   */
  protected formatDateRange(dateRange: DateRange): { from: string; to: string } {
    return {
      from: format(startOfDay(dateRange.from), 'yyyy-MM-dd'),
      to: format(endOfDay(dateRange.to), 'yyyy-MM-dd')
    };
  }

  /**
   * 週次範囲を文字列形式に変換（週の開始日・終了日）
   */
  protected formatWeekRange(dateRange: DateRange): { from: string; to: string } {
    return {
      from: format(startOfWeek(dateRange.from, { weekStartsOn: 1 }), 'yyyy-MM-dd'), // 月曜日開始
      to: format(endOfWeek(dateRange.to, { weekStartsOn: 1 }), 'yyyy-MM-dd')       // 日曜日終了
    };
  }

  /**
   * 指定日の週開始日（月曜日）を取得
   */
  protected getWeekStartDate(date: Date): Date {
    return startOfWeek(date, { weekStartsOn: 1 });
  }

  /**
   * 前期間の日付範囲を計算
   */
  protected getPreviousPeriod(dateRange: DateRange): DateRange {
    const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    const previousTo = subDays(dateRange.from, 1);
    const previousFrom = subDays(previousTo, days - 1);
    
    return {
      from: startOfDay(previousFrom),
      to: endOfDay(previousTo)
    };
  }

  /**
   * パーティション対応期間比較データを取得
   */
  protected getComparisonPeriod(dateRange: DateRange, comparisonType: string, customRange?: DateRange): DateRange {
    switch (comparisonType) {
      case 'previous_period':
        return this.getPreviousPeriod(dateRange);
      
      case 'same_period_last_year':
        const yearAgo = subYears(dateRange.from, 1);
        const yearAgoTo = subYears(dateRange.to, 1);
        return {
          from: startOfDay(yearAgo),
          to: endOfDay(yearAgoTo)
        };
      
      case 'custom':
        if (!customRange) {
          throw new Error('Custom comparison range is required for custom comparison type');
        }
        return customRange;
      
      default:
        return this.getPreviousPeriod(dateRange);
    }
  }

  /**
   * パーティション名を生成
   */
  protected generatePartitionName(tableName: string, date: Date): string {
    const monthStr = format(date, 'yyyyMM');
    return `${tableName}_${monthStr}`;
  }

  /**
   * パーティション対応の期間集計方法を決定
   */
  protected shouldUsePartitions(filters: PartitionAwareFilterOptions): boolean {
    // usePartitionsが明示的にfalseでない限りパーティションを使用
    if (filters.usePartitions === false) return false;
    
    // 日次集計レベルまたは大きな期間の場合はパーティションを優先
    const daysDiff = Math.ceil(
      (filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysDiff >= 7; // 7日以上の期間ならパーティションテーブルを使用
  }

  /**
   * パーティション対応クエリを構築
   */
  protected buildPartitionAwareQuery(
    tableName: string, 
    filters: PartitionAwareFilterOptions,
    tenantId: string,
    orgId: string
  ) {
    const usePartitions = this.shouldUsePartitions(filters);
    
    if (usePartitions) {
      // パーティションテーブルを使用
      const client = this.supabaseService.getClient();
      return this.addTenantOrgFilter(
        client.from(tableName), 
        tenantId, 
        orgId
      );
    } else {
      // 通常のreservationテーブルを使用（既存のロジック）
      const client = this.supabaseService.getClient();
      return this.addTenantOrgFilter(
        client.from('reservation'), 
        tenantId, 
        orgId
      );
    }
  }

  /**
   * 集計レベルに応じた日付グループ化を取得
   */
  protected getDateGrouping(aggregationLevel: 'daily' | 'weekly' | 'monthly' = 'daily'): string {
    switch (aggregationLevel) {
      case 'weekly':
        return 'week_start_date';
      case 'monthly':
        return 'DATE_TRUNC(\'month\', business_date)';
      case 'daily':
      default:
        return 'business_date';
    }
  }

  /**
   * DateオブジェクトをRPC関数用の文字列形式に変換
   */
  protected formatDateForRpc(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD形式
  }

  /**
   * 期間別集計オプションに基づくクエリ構築
   */
  protected buildAggregationQuery(
    baseQuery: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    aggregationOptions: PeriodAggregationOptions,
    dateField: string = 'business_date'
  ) {
    const groupByField = this.getGroupByField(aggregationOptions.groupBy, dateField);
    const dateGrouping = this.getDateGrouping(aggregationOptions.period as 'daily' | 'weekly' | 'monthly');
    
    let query = baseQuery
      .select(`
        ${dateGrouping} as period,
        ${groupByField},
        SUM(total_amount) as total_amount,
        SUM(booking_count) as booking_count
      `)
      .order('period', { ascending: true });

    // グループ化
    if (aggregationOptions.groupBy !== 'day') {
      query = query.order(this.getOrderByField(aggregationOptions.groupBy), { ascending: true });
    }

    return query;
  }

  /**
   * グループ化フィールドを取得
   */
  private getGroupByField(groupBy: string, dateField: string): string {
    switch (groupBy) {
      case 'staff':
        return 'staff_id, staff_name';
      case 'menu':
        return 'menu_id, menu_name';
      case 'week':
        return `DATE_TRUNC('week', ${dateField})`;
      case 'month':
        return `DATE_TRUNC('month', ${dateField})`;
      case 'day':
      default:
        return dateField;
    }
  }

  /**
   * ソートフィールドを取得
   */
  private getOrderByField(groupBy: string): string {
    switch (groupBy) {
      case 'staff':
        return 'staff_name';
      case 'menu':
        return 'menu_name';
      default:
        return 'period';
    }
  }

  /**
   * 月次パーティション範囲を取得
   */
  protected getMonthlyPartitionRange(dateRange: DateRange): { from: Date; to: Date }[] {
    const ranges: { from: Date; to: Date }[] = [];
    let current = startOfMonth(dateRange.from);
    const end = endOfMonth(dateRange.to);

    while (current <= end) {
      const monthEnd = endOfMonth(current);
      ranges.push({
        from: current,
        to: monthEnd > dateRange.to ? dateRange.to : monthEnd
      });
      current = startOfMonth(new Date(current.getFullYear(), current.getMonth() + 1, 1));
    }

    return ranges;
  }

  /**
   * 成長率を計算
   */
  protected calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * 平均値を計算（0除算対策）- 予約あたりの平均単価用
   */
  protected calculateAverage(total: number, count: number): number {
    return count > 0 ? Math.round(total / count) : 0;
  }

  /**
   * スタッフあたりの平均売上を計算（0除算対策）
   */
  protected calculateAveragePerStaff(totalAmount: number, staffCount: number): number {
    return staffCount > 0 ? Math.round(totalAmount / staffCount) : 0;
  }

  /**
   * 日次平均売上を計算（0除算対策）
   */
  protected calculateDailyAverage(totalAmount: number, days: number): number {
    return days > 0 ? Math.round(totalAmount / days) : 0;
  }

  /**
   * 週次平均売上を計算（0除算対策）
   */
  protected calculateWeeklyAverage(totalAmount: number, weeks: number): number {
    return weeks > 0 ? Math.round(totalAmount / weeks) : 0;
  }

  /**
   * パーセンテージを計算（0除算対策）
   */
  protected calculatePercentage(value: number, total: number): number {
    return total > 0 ? (value / total) * 100 : 0;
  }

  /**
   * 通貨フォーマット
   */
  protected formatCurrency(amount: number): string {
    return `¥${amount.toLocaleString()}`;
  }

  /**
   * クエリに基本フィルタを追加
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected addTenantOrgFilter(query: any, tenantId: string, orgId: string): any {
    return query
      .eq('tenant_id', tenantId)
      .eq('org_id', orgId);
  }

  /**
   * エラーハンドリング
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected handleError(error: any, operation: string): never {
    console.error(`[AnalyticsRepository] Error in ${operation}:`, error);
    throw new Error(`Failed to ${operation}: ${error.message || 'Unknown error'}`);
  }

  /**
   * 期間比較データの生成
   */
  protected async generatePeriodComparison(
    currentData: { total_amount: number; booking_count: number },
    filters: FilterOptions
  ): Promise<PeriodComparisonData> {
    try {
      const previousPeriod = this.getPreviousPeriod(filters.dateRange);
      const previousFilters = { ...filters, dateRange: previousPeriod };
      
      const previousData = await this.getPeriodData(previousFilters);

      const currentAverage = this.calculateAverage(currentData.total_amount, currentData.booking_count);
      const previousAverage = this.calculateAverage(previousData.total_amount, previousData.booking_count);

      return {
        current: {
          total_amount: currentData.total_amount,
          booking_count: currentData.booking_count,
          average_amount: currentAverage
        },
        previous: {
          total_amount: previousData.total_amount,
          booking_count: previousData.booking_count,
          average_amount: previousAverage
        },
        growth: {
          amount_percentage: this.calculateGrowthRate(currentData.total_amount, previousData.total_amount),
          booking_percentage: this.calculateGrowthRate(currentData.booking_count, previousData.booking_count),
          average_percentage: this.calculateGrowthRate(currentAverage, previousAverage)
        }
      };
    } catch (error) {
      console.error('[AnalyticsRepository] Error generating period comparison:', error);
      throw error;
    }
  }

  /**
   * パーティション対応期間比較データの生成
   */
  protected async generatePartitionAwarePeriodComparison(
    currentData: { total_amount: number; booking_count: number },
    filters: PartitionAwareFilterOptions
  ): Promise<PeriodComparisonData> {
    try {
      const comparisonType = filters.comparisonType || 'previous_period';
      const comparisonPeriod = this.getComparisonPeriod(
        filters.dateRange, 
        comparisonType, 
        filters.customComparisonRange
      );
      
      const previousFilters: PartitionAwareFilterOptions = { 
        ...filters, 
        dateRange: comparisonPeriod 
      };
      
      const previousData = await this.getPartitionAwarePeriodData(previousFilters);

      const currentAverage = this.calculateAverage(currentData.total_amount, currentData.booking_count);
      const previousAverage = this.calculateAverage(previousData.total_amount, previousData.booking_count);

      return {
        current: {
          total_amount: currentData.total_amount,
          booking_count: currentData.booking_count,
          average_amount: currentAverage
        },
        previous: {
          total_amount: previousData.total_amount,
          booking_count: previousData.booking_count,
          average_amount: previousAverage
        },
        growth: {
          amount_percentage: this.calculateGrowthRate(currentData.total_amount, previousData.total_amount),
          booking_percentage: this.calculateGrowthRate(currentData.booking_count, previousData.booking_count),
          average_percentage: this.calculateGrowthRate(currentAverage, previousAverage)
        }
      };
    } catch (error) {
      console.error('[AnalyticsRepository] Error generating partition-aware period comparison:', error);
      throw error;
    }
  }

  /**
   * 前期間データを取得（子クラスで実装）
   */
  protected abstract getPeriodData(filters: FilterOptions): Promise<{ total_amount: number; booking_count: number }>;

  /**
   * パーティション対応前期間データを取得（子クラスで実装）
   */
  protected abstract getPartitionAwarePeriodData(filters: PartitionAwareFilterOptions): Promise<{ total_amount: number; booking_count: number }>;
}