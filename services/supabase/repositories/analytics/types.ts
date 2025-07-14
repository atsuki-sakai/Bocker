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

// パーティション対応期間フィルタ
export interface PartitionAwareFilterOptions extends FilterOptions {
  usePartitions?: boolean; // パーティションテーブルを使用するか
  aggregationLevel?: 'daily' | 'monthly'; // 集計レベル
  comparisonType?: 'previous_period' | 'same_period_last_year' | 'custom';
  customComparisonRange?: DateRange;
}

// 期間別集計オプション
export interface PeriodAggregationOptions {
  groupBy: 'day' | 'week' | 'month' | 'staff' | 'menu';
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  includeEmpty?: boolean; // 空の期間も含めるか
  fillGaps?: boolean; // データの欠損を0で埋めるか
  orderBy?: 'date' | 'amount' | 'count' | 'average'; // ソート基準
  order?: 'asc' | 'desc'; // ソート順序
  limit?: number; // 取得件数制限
  offset?: number; // オフセット
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

// 週次売上データ
export interface WeeklySalesData {
  week_start_date: string; // YYYY-MM-DD形式（月曜日）
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
  weeklyAverage?: number; // 週次平均（週次集計時のみ）
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
    aggregationLevel?: string;
    groupBy?: string;
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
}

// RPC関数の戻り値型定義（修正版）
export interface RpcStaffSalesRow {
  staff_id: string;
  staff_name: string | null; // NULLABLEに修正
  total_amount: string | number; // PostgreSQL NUMERIC型は文字列として返される場合がある
  booking_count: string | number | bigint; // SUM関数の結果でBIGINTとして返される場合がある
  average_amount: string | number; // 🔧 新規追加: 平均単価
  last_booking_date: string | null; // NULLABLEに修正
  created_at: string;
  updated_at: string;
}

export interface RpcMenuSalesRow {
  menu_id: string;
  menu_name: string | null; // NULLABLEに修正
  total_amount: string | number;
  booking_count: string | number | bigint; // SUM関数の結果でBIGINTとして返される場合がある
  average_amount: string | number; // 🔧 新規追加: 平均単価
  created_at: string;
  updated_at: string;
}

export interface RpcDailySalesRow {
  business_date: string;
  total_amount: string | number;
  booking_count: string | number;
  created_at: string;
  updated_at: string;
}

export interface RpcWeeklySalesRow {
  week_start_date: string;
  total_amount: string | number;
  booking_count: string | number;
  created_at: string;
  updated_at: string;
}

export interface RpcPeriodComparisonRow {
  current_total_amount: string | number;
  current_booking_count: string | number;
  current_average_amount: string | number;
  previous_total_amount: string | number;
  previous_booking_count: string | number;
  previous_average_amount: string | number;
  amount_growth_percentage: string | number;
  booking_growth_percentage: string | number;
  average_growth_percentage: string | number;
}

// RPC関数パラメータ型定義
export interface RpcAggregatedStaffSalesParams {
  p_tenant_id: string;
  p_org_id: string;
  p_date_from: string;
  p_date_to: string;
  p_staff_ids?: string[] | null;
  p_limit?: number;
}

export interface RpcAggregatedMenuSalesParams {
  p_tenant_id: string;
  p_org_id: string;
  p_date_from: string;
  p_date_to: string;
  p_menu_ids?: string[] | null;
}

export interface RpcAggregatedDailySalesParams {
  p_tenant_id: string;
  p_org_id: string;
  p_date_from: string;
  p_date_to: string;
}

export interface RpcAggregatedWeeklySalesParams {
  p_tenant_id: string;
  p_org_id: string;
  p_date_from: string;
  p_date_to: string;
}

export interface RpcPeriodComparisonParams {
  p_tenant_id: string;
  p_org_id: string;
  p_current_date_from: string;
  p_current_date_to: string;
  p_previous_date_from: string;
  p_previous_date_to: string;
}

