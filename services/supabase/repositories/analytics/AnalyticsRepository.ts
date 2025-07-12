import { supabaseClientService } from '@/services/supabase/SupabaseService';
import type { SupabaseService } from '@/services/supabase/SupabaseService';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { 
  DateRange, 
  FilterOptions, 
  PeriodComparisonData, 
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
   * 成長率を計算
   */
  protected calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * 平均値を計算（0除算対策）
   */
  protected calculateAverage(total: number, count: number): number {
    return count > 0 ? Math.round(total / count) : 0;
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
   * 前期間データを取得（子クラスで実装）
   */
  protected abstract getPeriodData(filters: FilterOptions): Promise<{ total_amount: number; booking_count: number }>;
}