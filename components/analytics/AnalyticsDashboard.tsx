"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Calendar, TrendingUp, Users, ShoppingBag, DollarSign, Filter, RefreshCw } from 'lucide-react';
import { addDays, subDays, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import { DateRangeSelector, PeriodComparisonSelector, type DateRange } from './DateRangeSelector';
import { SummaryCard, SummaryCardGrid } from './SummaryCard';
import { SalesChart, ChartGrid, type ChartDataPoint } from './SalesChart';

export interface AnalyticsData {
  dailySales: {
    summary: {
      totalAmount: number;
      totalBookings: number;
      averageAmount: number;
      periodDays: number;
      dailyAverage: number;
    };
    chartData: ChartDataPoint[];
    comparisonData?: ChartDataPoint[];
    change?: {
      amount: number;
      bookings: number;
      average: number;
    };
  };
  staffSales: {
    summary: {
      totalAmount: number;
      totalBookings: number;
      averageAmount: number;
      topStaff: {
        staff_name: string;
        total_amount: number;
        booking_count: number;
      } | null;
      activeStaffCount: number;
    };
    chartData: ChartDataPoint[];
    rankingData: Array<{
      name: string;
      value: number;
      percentage: number;
      rank: number;
    }>;
  };
  menuSales: {
    summary: {
      totalAmount: number;
      totalBookings: number;
      averageAmount: number;
      topMenu: {
        menu_name: string;
        total_amount: number;
        booking_count: number;
      } | null;
      activeMenuCount: number;
    };
    chartData: ChartDataPoint[];
    rankingData: Array<{
      name: string;
      value: number;
      percentage: number;
      rank: number;
    }>;
  };
}

export interface AnalyticsDashboardProps {
  tenantId: string;
  orgId: string;
  initialData?: AnalyticsData;
  onDataLoad?: (range: DateRange, comparisonType: string) => Promise<AnalyticsData>;
  className?: string;
}

/**
 * 分析ダッシュボードメインコンポーネント
 * 期間絞り込み機能付きの包括的な売上分析画面
 */
export function AnalyticsDashboard({
  tenantId,
  orgId,
  initialData,
  onDataLoad,
  className = ''
}: AnalyticsDashboardProps) {
  // 状態管理
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 29),
    to: new Date()
  });
  
  const [comparisonType, setComparisonType] = useState<'previous' | 'same_period_last_year' | 'custom'>('previous');
  const [customComparisonRange, setCustomComparisonRange] = useState<DateRange>();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(initialData || null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // データ読み込み処理
  const loadData = useCallback(async (force = false) => {
    if (!onDataLoad || (loading && !force)) return;
    
    setLoading(true);
    try {
      const newData = await onDataLoad(dateRange, comparisonType);
      setData(newData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Analytics data load error:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, comparisonType, onDataLoad, loading]);

  // 期間変更時のデータ再読み込み
  useEffect(() => {
    loadData();
  }, [dateRange, comparisonType]);

  // 手動更新
  const handleRefresh = () => {
    loadData(true);
  };

  // 期間変更ハンドラー
  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
  };

  // サマリーカードデータの生成
  const generateSummaryCards = () => {
    if (!data) return [];

    const { dailySales, staffSales, menuSales } = data;

    return [
      {
        id: 'total-sales',
        title: '総売上',
        value: dailySales.summary.totalAmount,
        icon: <DollarSign className="h-4 w-4" />,
        valueFormatter: (value: number) => `¥${value.toLocaleString()}`,
        change: data.dailySales.change ? {
          value: data.dailySales.change.amount,
          label: '前期間比',
          period: '前期間'
        } : undefined,
        details: [
          { label: '期間', value: `${dailySales.summary.periodDays}日間` },
          { label: '日平均', value: `¥${dailySales.summary.dailyAverage.toLocaleString()}` }
        ]
      },
      {
        id: 'total-bookings',
        title: '総予約数',
        value: dailySales.summary.totalBookings,
        icon: <Calendar className="h-4 w-4" />,
        change: data.dailySales.change ? {
          value: data.dailySales.change.bookings,
          label: '前期間比',
          period: '前期間'
        } : undefined,
        details: [
          { label: '期間', value: `${dailySales.summary.periodDays}日間` },
          { label: '日平均', value: `${Math.round(dailySales.summary.totalBookings / dailySales.summary.periodDays)}件` }
        ]
      },
      {
        id: 'average-booking',
        title: '平均単価',
        value: dailySales.summary.averageAmount,
        icon: <TrendingUp className="h-4 w-4" />,
        valueFormatter: (value: number) => `¥${value.toLocaleString()}`,
        change: data.dailySales.change ? {
          value: data.dailySales.change.average,
          label: '前期間比',
          period: '前期間'
        } : undefined
      },
      {
        id: 'active-staff',
        title: 'アクティブスタッフ',
        value: staffSales.summary.activeStaffCount,
        icon: <Users className="h-4 w-4" />,
        subtitle: staffSales.summary.topStaff ? 
          `トップ: ${staffSales.summary.topStaff.staff_name}` : undefined,
        details: staffSales.summary.topStaff ? [
          { 
            label: 'トップ売上', 
            value: `¥${staffSales.summary.topStaff.total_amount.toLocaleString()}` 
          },
          { 
            label: 'トップ予約数', 
            value: `${staffSales.summary.topStaff.booking_count}件` 
          }
        ] : undefined
      }
    ];
  };

  // チャートデータの生成
  const generateCharts = () => {
    if (!data) return [];

    return [
      {
        id: 'daily-sales-trend',
        title: '日別売上推移',
        type: 'area' as const,
        data: data.dailySales.chartData,
        comparisonData: data.dailySales.comparisonData,
        showComparison: !!data.dailySales.comparisonData,
        showTrend: true,
        height: 300
      },
      {
        id: 'staff-sales-ranking',
        title: 'スタッフ別売上',
        type: 'bar' as const,
        data: data.staffSales.chartData,
        height: 300,
        showLegend: false
      }
    ];
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* ヘッダー部分 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">売上分析</h1>
          <p className="text-muted-foreground">
            リアルタイム売上データの詳細分析
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* 最終更新時刻 */}
          <Badge variant="outline" className="text-xs">
            更新: {format(lastUpdated, 'HH:mm')}
          </Badge>
          
          {/* 手動更新ボタン */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            更新
          </Button>
        </div>
      </div>

      {/* フィルター部分 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            分析条件
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 期間選択 */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">分析期間</label>
              <DateRangeSelector
                value={dateRange}
                onChange={handleDateRangeChange}
                className="w-full"
              />
            </div>
            
            <div className="lg:w-80">
              <label className="text-sm font-medium mb-2 block">期間比較</label>
              <PeriodComparisonSelector
                currentRange={dateRange}
                comparisonType={comparisonType}
                onComparisonTypeChange={setComparisonType}
                customComparisonRange={customComparisonRange}
                onCustomComparisonRangeChange={setCustomComparisonRange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* メインコンテンツ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="daily">日別分析</TabsTrigger>
          <TabsTrigger value="staff">スタッフ分析</TabsTrigger>
          <TabsTrigger value="menu">メニュー分析</TabsTrigger>
        </TabsList>

        {/* 概要タブ */}
        <TabsContent value="overview" className="space-y-6">
          {/* サマリーカード */}
          <SummaryCardGrid
            cards={generateSummaryCards()}
            loading={loading}
            columns={4}
          />

          {/* チャートグリッド */}
          <ChartGrid
            charts={generateCharts()}
            loading={loading}
            columns={2}
          />
        </TabsContent>

        {/* 日別分析タブ */}
        <TabsContent value="daily" className="space-y-6">
          <div className="grid gap-6">
            <SalesChart
              title="日別売上推移（詳細）"
              type="area"
              data={data?.dailySales.chartData || []}
              comparisonData={data?.dailySales.comparisonData}
              showComparison={!!data?.dailySales.comparisonData}
              showTrend={true}
              height={400}
              loading={loading}
            />
            
            <div className="grid gap-6 md:grid-cols-2">
              <SalesChart
                title="日別予約数"
                type="bar"
                data={data?.dailySales.chartData || []}
                valueFormatter={(value) => `${value}件`}
                height={300}
                loading={loading}
              />
              
              <SalesChart
                title="日別平均単価"
                type="line"
                data={data?.dailySales.chartData || []}
                height={300}
                loading={loading}
              />
            </div>
          </div>
        </TabsContent>

        {/* スタッフ分析タブ */}
        <TabsContent value="staff" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <SalesChart
              title="スタッフ別売上ランキング"
              type="bar"
              data={data?.staffSales.chartData || []}
              height={400}
              loading={loading}
            />
            
            <SalesChart
              title="スタッフ売上分布"
              type="pie"
              data={data?.staffSales.chartData || []}
              height={400}
              showLegend={true}
              loading={loading}
            />
          </div>

          {/* スタッフランキング詳細 */}
          {data?.staffSales.rankingData && (
            <Card>
              <CardHeader>
                <CardTitle>スタッフランキング詳細</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.staffSales.rankingData.slice(0, 10).map((staff, index) => (
                    <div key={staff.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{staff.rank}</Badge>
                        <span className="font-medium">{staff.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">¥{staff.value.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">{staff.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* メニュー分析タブ */}
        <TabsContent value="menu" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <SalesChart
              title="メニュー別売上ランキング"
              type="bar"
              data={data?.menuSales.chartData || []}
              height={400}
              loading={loading}
            />
            
            <SalesChart
              title="メニュー売上分布"
              type="pie"
              data={data?.menuSales.chartData || []}
              height={400}
              showLegend={true}
              loading={loading}
            />
          </div>

          {/* メニューランキング詳細 */}
          {data?.menuSales.rankingData && (
            <Card>
              <CardHeader>
                <CardTitle>メニューランキング詳細</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.menuSales.rankingData.slice(0, 10).map((menu, index) => (
                    <div key={menu.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{menu.rank}</Badge>
                        <span className="font-medium">{menu.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">¥{menu.value.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">{menu.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AnalyticsDashboard;