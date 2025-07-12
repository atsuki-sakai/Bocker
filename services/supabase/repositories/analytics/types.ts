// 分析ダッシュボード用の型定義

export interface DateRange {
  from: Date;
  to: Date;
}

export interface FilterOptions {
  dateRange: DateRange;
  staffIds?: string[];
  menuIds?: string[];
  tenantId: string;
  orgId: string;
}

// 日別売上データ
export interface DailySalesData {
  sale_date: string; // YYYY-MM-DD形式
  total_amount: number;
  booking_count: number;
  average_amount: number;
  created_at: string;
  updated_at: string;
}

// スタッフ別売上データ
export interface StaffSalesData {
  staff_id: string;
  staff_name: string | null;
  total_amount: number;
  booking_count: number;
  average_amount: number;
  last_booking_date: string | null;
  created_at: string;
  updated_at: string;
}

// メニュー別売上データ
export interface MenuSalesData {
  menu_id: string;
  menu_name: string | null;
  total_amount: number;
  booking_count: number;
  average_amount: number;
  created_at: string;
  updated_at: string;
}

// 期間比較用データ
export interface PeriodComparisonData {
  current: {
    total_amount: number;
    booking_count: number;
    average_amount: number;
  };
  previous: {
    total_amount: number;
    booking_count: number;
    average_amount: number;
  };
  growth: {
    amount_percentage: number;
    booking_percentage: number;
    average_percentage: number;
  };
}

// トレンドデータ（時系列）
export interface TrendData {
  date: string;
  value: number;
  label?: string;
}

// ランキングデータ
export interface RankingData {
  id: string;
  name: string;
  value: number;
  percentage: number;
  rank: number;
}

// 売上指標サマリー
export interface SalesSummary {
  totalAmount: number;
  totalBookings: number;
  averageAmount: number;
  periodDays: number;
  dailyAverage: number;
}

// グラフ用データ型
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
  color?: string;
}

export interface PieChartDataPoint {
  name: string;
  value: number;
  fill: string;
  percentage: number;
}

export interface BarChartDataPoint {
  name: string;
  value: number;
  fill?: string;
  label?: string;
}

// フィルター用選択肢
export interface SelectOption {
  value: string;
  label: string;
}

// API応答型
export interface AnalyticsResponse<T> {
  data: T;
  meta?: {
    total: number;
    page?: number;
    pageSize?: number;
    hasMore?: boolean;
  };
}

// エラー型
export interface AnalyticsError {
  code: string;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: Record<string, any>;
}

// 集計クエリオプション
export interface AggregationOptions {
  groupBy: 'day' | 'week' | 'month' | 'staff' | 'menu';
  orderBy: 'date' | 'amount' | 'count';
  order: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// 売上トレンド分析用
export interface SalesTrend {
  period: string;
  amount: number;
  bookings: number;
  growthRate: number;
  seasonalIndex?: number;
}

// パフォーマンス指標
export interface PerformanceMetrics {
  topStaff: StaffSalesData[];
  topMenus: MenuSalesData[];
  peakDays: DailySalesData[];
  trends: SalesTrend[];
  summary: SalesSummary;
}


// スタッフ別売上分析用
export interface StaffSalesSummary {
    totalAmount: number;
    totalBookings: number;
    averageAmount: number;
    periodDays: number;
    dailyAverage: number;
    topStaff: StaffSalesData | null;
    activeStaffCount: number;
  
}

export interface StaffSalesRanking {
  id: string;
  name: string;
  value: number;
  percentage: number;
  rank: number;
}

export interface StaffSalesOption {
  id: string;
  name: string;
}

export interface StaffSalesPerformanceComparison {
  
    topPerformers: StaffSalesData[];
    averagePerformance: {
      averageAmount: number;
      averageBookings: number;
    };
    performanceDistribution: {
      high: number; // 平均以上
      medium: number; // 平均の50-100%
      low: number; // 平均の50%未満
    }
  }

