"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { subDays } from 'date-fns';
import { Calendar, TrendingUp, Banknote, Activity } from 'lucide-react';

import { DashboardSection } from "@/components/common";
import { 
  LineChart, 
  BarChart,
  AnalyticsFilters, 
  SummaryCard, 
  SummaryCardGrid,
  type FilterOptions 
} from '@/components/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization';
import { DailySalesRepository } from '@/services/supabase/repositories/analytics';
import type { 
  SalesSummary, 
  PeriodComparisonData, 
  ChartDataPoint 
} from '@/services/supabase/repositories/analytics/types';

// 初期フィルター設定（過去30日間）
const getInitialFilters = (tenantId: string, orgId: string): FilterOptions => ({
  dateRange: {
    from: subDays(new Date(), 29),
    to: new Date()
  },
  tenantId,
  orgId
});

type WeekdayPerformance = {
  dayOfWeek: number;
  dayName: string;
  totalAmount: number;
  bookingCount: number;
  averageAmount: number;
};

type MonthlyData = {
  month: string;
  monthName: string;
  totalAmount: number;
  bookingCount: number;
  averageAmount: number;
};

/**
 * 日別売上分析ページ
 */
export default function DailyAnalyticsPage() {
  const { tenantId, orgId, isLoaded } = useTenantAndOrganization();
  
  // 状態管理
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // データ状態
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [trendData, setTrendData] = useState<ChartDataPoint[]>([]);
  const [weekdayPerformance, setWeekdayPerformance] = useState<WeekdayPerformance[]>([]);
  const [monthlyData, setMonthlySales] = useState<MonthlyData[]>([]);
  const [periodComparison, setPeriodComparison] = useState<PeriodComparisonData | null>(null);

  // リポジトリインスタンス
  const repository = useMemo(() => {
    if (!tenantId || !orgId) return null;
    return new DailySalesRepository();
  }, [tenantId, orgId]);

  // 初期フィルター設定
  useEffect(() => {
    if (tenantId && orgId && !filters) {
      setFilters(getInitialFilters(tenantId, orgId));
    }
  }, [tenantId, orgId, filters]);

  // データ取得
  const fetchData = useCallback(async () => {
    if (!repository || !filters) return;

    setLoading(true);
    setError(null);

    try {
      const [
        summaryResult,
        trendResult,
        weekdayResult,
        monthlyResult,
        comparisonResult
      ] = await Promise.all([
        repository.getSalesSummary(filters),
        repository.getSalesTrend(filters),
        repository.getWeekdayPerformance(filters),
        repository.getMonthlySales(filters),
        repository.getPeriodComparison(filters)
      ]);

      setSalesSummary(summaryResult);
      setTrendData(trendResult);
      setWeekdayPerformance(weekdayResult);
      setMonthlySales(monthlyResult);
      setPeriodComparison(comparisonResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析データの取得に失敗しました');
      console.error('Analytics data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [repository, filters]);

  // フィルター変更時のデータ再取得
  useEffect(() => {
    if (filters && repository) {
      fetchData();
    }
  }, [filters, repository, fetchData]);

  // ローディング表示
  if (!isLoaded || !tenantId || !orgId) {
    return (
      <DashboardSection title="日別売上分析" backLink="/dashboard" backLinkTitle="ダッシュボード">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <SummaryCard
                key={i}
                title=""
                value=""
                loading={true}
              />
            ))}
          </div>
        </div>
      </DashboardSection>
    );
  }

  // フィルターがまだ設定されていない場合
  if (!filters) {
    return (
      <DashboardSection title="日別売上分析" backLink="/dashboard" backLinkTitle="ダッシュボード">
        <div>フィルターを初期化中...</div>
      </DashboardSection>
    );
  }

  // サマリーカードデータ
  const summaryCards = [
    {
      id: 'total-amount',
      title: '総売上',
      value: salesSummary?.totalAmount || 0,
      icon: <Banknote className="w-4 h-4" />,
      valueFormatter: (value: string | number) => `¥${Number(value).toLocaleString()}`,
      change: periodComparison ? {
        value: periodComparison.growth.amount_percentage,
        label: '前期間比'
      } : undefined
    },
    {
      id: 'total-bookings',
      title: '総予約数',
      value: salesSummary?.totalBookings || 0,
      icon: <Calendar className="w-4 h-4" />,
      change: periodComparison ? {
        value: periodComparison.growth.booking_percentage,
        label: '前期間比'
      } : undefined
    },
    {
      id: 'average-amount',
      title: '平均客単価',
      value: salesSummary?.averageAmount || 0,
      icon: <TrendingUp className="w-4 h-4" />,
      valueFormatter: (value: string | number) => `¥${Number(value).toLocaleString()}`,
      change: periodComparison ? {
        value: periodComparison.growth.average_percentage,
        label: '前期間比'
      } : undefined
    },
    {
      id: 'daily-average',
      title: '1日平均売上',
      value: salesSummary?.dailyAverage || 0,
      icon: <Activity className="w-4 h-4" />,
      valueFormatter: (value: string | number) => `¥${Number(value).toLocaleString()}`,
      subtitle: `${salesSummary?.periodDays || 0}日間の平均`
    }
  ];

  return (
    <DashboardSection title="日別売上分析" backLink="/dashboard" backLinkTitle="ダッシュボード">
      <div className="space-y-6">
        {/* エラー表示 */}
        {error && (
          <Alert className="border-destructive">
            <AlertDescription className="text-destructive">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* フィルター */}
        <AnalyticsFilters
          filters={filters}
          onFiltersChange={setFilters}
          loading={loading}
          showStaffFilter={false}
          showMenuFilter={false}
        />

        {/* サマリーカード */}
        <SummaryCardGrid
          cards={summaryCards}
          loading={loading}
          columns={4}
        />

        {/* メインコンテンツ */}
        <Tabs defaultValue="trend" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trend">売上推移</TabsTrigger>
            <TabsTrigger value="weekday">曜日別分析</TabsTrigger>
            <TabsTrigger value="monthly">月別分析</TabsTrigger>
          </TabsList>

          {/* 売上推移タブ */}
          <TabsContent value="trend" className="space-y-4">
            <LineChart
              data={trendData}
              title="日別売上推移"
              description="選択期間の売上トレンドを表示"
              height={400}
              showGrid={true}
              valueFormatter={(value) => `¥${value.toLocaleString()}`}
              labelFormatter={(label) => label}
            />

            {/* 期間比較カード */}
            {periodComparison && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">前期間との比較</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">現期間売上</span>
                      <span className="font-medium">
                        ¥{periodComparison.current.total_amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">前期間売上</span>
                      <span className="font-medium">
                        ¥{periodComparison.previous.total_amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">成長率</span>
                      <span className={`font-medium ${
                        periodComparison.growth.amount_percentage >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {periodComparison.growth.amount_percentage >= 0 ? '+' : ''}
                        {periodComparison.growth.amount_percentage.toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">予約数比較</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">現期間予約数</span>
                      <span className="font-medium">
                        {periodComparison.current.booking_count.toLocaleString()}件
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">前期間予約数</span>
                      <span className="font-medium">
                        {periodComparison.previous.booking_count.toLocaleString()}件
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">成長率</span>
                      <span className={`font-medium ${
                        periodComparison.growth.booking_percentage >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {periodComparison.growth.booking_percentage >= 0 ? '+' : ''}
                        {periodComparison.growth.booking_percentage.toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* 曜日別分析タブ */}
          <TabsContent value="weekday" className="space-y-4">
            <BarChart
              data={weekdayPerformance.map(item => ({
                name: item.dayName,
                value: item.totalAmount,
                label: `¥${item.totalAmount.toLocaleString()}`
              }))}
              title="曜日別売上分析"
              description="曜日ごとの売上パフォーマンス"
              height={400}
              showGrid={true}
            />

            {/* 曜日別詳細テーブル */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">曜日別詳細データ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">曜日</th>
                        <th className="text-right p-2">売上合計</th>
                        <th className="text-right p-2">予約数</th>
                        <th className="text-right p-2">平均売上</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekdayPerformance.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2 font-medium">{item.dayName}曜日</td>
                          <td className="p-2 text-right">¥{item.totalAmount.toLocaleString()}</td>
                          <td className="p-2 text-right">{item.bookingCount}件</td>
                          <td className="p-2 text-right">¥{item.averageAmount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 月別分析タブ */}
          <TabsContent value="monthly" className="space-y-4">
            <BarChart
              data={monthlyData.map(item => ({
                name: item.monthName,
                value: item.totalAmount,
                label: `¥${item.totalAmount.toLocaleString()}`
              }))}
              title="月別売上分析"
              description="月ごとの売上推移"
              height={400}
              showGrid={true}
            />

            {/* 月別詳細テーブル */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">月別詳細データ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">月</th>
                        <th className="text-right p-2">売上合計</th>
                        <th className="text-right p-2">予約数</th>
                        <th className="text-right p-2">平均客単価</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2 font-medium">{item.monthName}</td>
                          <td className="p-2 text-right">¥{item.totalAmount.toLocaleString()}</td>
                          <td className="p-2 text-right">{item.bookingCount}件</td>
                          <td className="p-2 text-right">¥{item.averageAmount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardSection>
  );
}