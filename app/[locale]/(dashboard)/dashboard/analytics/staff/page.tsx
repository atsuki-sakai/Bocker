"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { subDays } from 'date-fns';
import { Users, TrendingUp, Award, BarChart3, Star, Activity } from 'lucide-react';
import type { 
  StaffSalesSummary, 
  StaffSalesRanking, 
  StaffSalesPerformanceComparison,
  SelectOption,
  PeriodComparisonData,
  StaffSalesData
} from '@/services/supabase/repositories/analytics/types';
import type { SummaryCardProps } from '@/components/analytics/SummaryCard';
import { DashboardSection } from "@/components/common";
import { 
  BarChart,
  PieChart,
  AnalyticsFilters, 
  SummaryCard, 
  SummaryCardGrid,
  type FilterOptions 
} from '@/components/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization';
import { StaffSalesRepository } from '@/services/supabase/repositories/analytics';

// 初期フィルター設定（過去30日間）
const getInitialFilters = (tenantId: string, orgId: string): FilterOptions => ({
  dateRange: {
    from: subDays(new Date(), 29),
    to: new Date()
  },
  tenantId,
  orgId
});

/**
 * スタッフ別売上分析ページ
 */
export default function StaffAnalyticsPage() {
  const { tenantId, orgId, isLoaded } = useTenantAndOrganization();
  
  // 状態管理
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // データ状態
  const [staffSummary, setStaffSummary] = useState<StaffSalesSummary | null>(null);
  const [staffRanking, setStaffRanking] = useState<StaffSalesRanking[]>([]);
  const [staffOptions, setStaffOptions] = useState<SelectOption[]>([]);
  const [performanceComparison, setPerformanceComparison] = useState<StaffSalesPerformanceComparison | null>(null);
  const [periodComparison, setPeriodComparison] = useState<PeriodComparisonData | null>(null);

  // リポジトリインスタンス
  const repository = useMemo(() => {
    if (!tenantId || !orgId) return null;
    return new StaffSalesRepository();
  }, [tenantId, orgId]);

  // 初期フィルター設定
  useEffect(() => {
    if (tenantId && orgId && !filters) {
      setFilters(getInitialFilters(tenantId, orgId));
    }
  }, [tenantId, orgId, filters]);

  // スタッフオプション取得
  useEffect(() => {
    const fetchStaffOptions = async () => {
      if (!repository || !tenantId || !orgId) return;
      
      try {
        const options = await repository.getStaffOptions(tenantId, orgId);
        setStaffOptions(options);
      } catch (err) {
        console.error('Failed to fetch staff options:', err);
      }
    };

    fetchStaffOptions();
  }, [repository, tenantId, orgId]);

  // データ取得
  const fetchData = useCallback(async () => {
    if (!repository || !filters) return;

    setLoading(true);
    setError(null);

    try {
      const [
        summaryResult,
        rankingResult,
        performanceResult,
        comparisonResult
      ] = await Promise.all([
        repository.getStaffSummary(filters),
        repository.getStaffRanking(filters, 15),
        repository.getStaffPerformanceComparison(filters),
        repository.getPeriodComparison(filters)
      ]);

      setStaffSummary(summaryResult);
      setStaffRanking(rankingResult);
      setPerformanceComparison(performanceResult);
      setPeriodComparison(comparisonResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'スタッフ分析データの取得に失敗しました');
      console.error('Staff analytics data fetch error:', err);
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
      <DashboardSection title="スタッフ別売上分析" backLink="/dashboard" backLinkTitle="ダッシュボード">
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
      <DashboardSection title="スタッフ別売上分析" backLink="/dashboard" backLinkTitle="ダッシュボード">
        <div>フィルターを初期化中...</div>
      </DashboardSection>
    );
  }

  // サマリーカードデータ
  const summaryCards: SummaryCardProps[] = [
    {
      title: '総売上',
      value: staffSummary?.totalAmount || 0,
      subtitle: '総売上',
      change: periodComparison ? {
        value: periodComparison.growth.amount_percentage,
        label: '前期間比'
      } : undefined,
      icon: <TrendingUp className="w-4 h-4" />,
      loading: false,
      className: '',
      valueFormatter: (value: number | string) => `¥${value.toLocaleString()}`,
      trend: periodComparison?.growth.amount_percentage && periodComparison.growth.amount_percentage >= 0 ? 'up' : 'down',
      variant: 'default',
      showComparison: true
    },
    {
      title: '活動スタッフ数',
      value: staffSummary?.activeStaffCount || 0,
      icon: <Users className="w-4 h-4" />,
      subtitle: '売上のあるスタッフ数',
      loading: false,
      className: '',
      valueFormatter: (value: number | string) => value.toLocaleString(),
      trend: 'neutral',
      variant: 'default',
      showComparison: true,
    },
    {
      title: 'トップスタッフ売上',
      value: staffSummary?.topStaff?.total_amount || 0,
      icon: <Award className="w-4 h-4" />,
      valueFormatter: (value: number | string) => `¥${value.toLocaleString()}`,
      subtitle: staffSummary?.topStaff?.staff_name || '-',
      loading: false,
      className: '',
      trend: 'neutral',
      variant: 'default',
      showComparison: true,
    },
    {
      title: 'スタッフ平均売上',
      value: staffSummary?.activeStaffCount && staffSummary.activeStaffCount > 0 ? 
        Math.round((staffSummary.totalAmount || 0) / staffSummary.activeStaffCount) : 0,
      icon: <Activity className="w-4 h-4" />,
      valueFormatter: (value: number | string) => `¥${value.toLocaleString()}`,
      subtitle: '1人あたりの平均売上',
      loading: false,
      className: '',
      trend: 'neutral',
      variant: 'default',
      showComparison: true,
    }
  ];

  // パフォーマンス分布用のパイチャートデータ
  const performanceDistributionData = performanceComparison ? [
    {
      name: '平均以上',
      value: performanceComparison.performanceDistribution.high,
      fill: '#10b981',
      percentage: performanceComparison.performanceDistribution.high / 
        (performanceComparison.performanceDistribution.high + 
         performanceComparison.performanceDistribution.medium + 
         performanceComparison.performanceDistribution.low) * 100
    },
    {
      name: '平均の50-100%',
      value: performanceComparison.performanceDistribution.medium,
      fill: '#f59e0b',
      percentage: performanceComparison.performanceDistribution.medium / 
        (performanceComparison.performanceDistribution.high + 
         performanceComparison.performanceDistribution.medium + 
         performanceComparison.performanceDistribution.low) * 100
    },
    {
      name: '平均の50%未満',
      value: performanceComparison.performanceDistribution.low,
      fill: '#ef4444',
      percentage: performanceComparison.performanceDistribution.low / 
        (performanceComparison.performanceDistribution.high + 
         performanceComparison.performanceDistribution.medium + 
         performanceComparison.performanceDistribution.low) * 100
    }
  ].filter(item => item.value > 0) : [];

  return (
    <DashboardSection
      title="スタッフ別売上分析"
      backLink="/dashboard"
      backLinkTitle="ダッシュボード"
    >
      <div className="space-y-6">
        {/* エラー表示 */}
        {error && (
          <Alert className="border-destructive">
            <AlertDescription className="text-destructive">{error}</AlertDescription>
          </Alert>
        )}

        {/* フィルター */}
        <AnalyticsFilters
          filters={filters}
          onFiltersChange={setFilters}
          staffOptions={staffOptions}
          loading={loading}
          showStaffFilter={true}
          showMenuFilter={false}
        />

        {/* サマリーカード */}
        <SummaryCardGrid
          cards={summaryCards.map((card, index) => ({
            ...card,
            id: `summary-card-${index}`,
          }))}
          loading={loading}
          columns={4}
        />

        {/* メインコンテンツ */}
        <Tabs defaultValue="ranking" className="space-y-4">
          <TabsList className="flex w-fit overflow-x-auto space-x-2 p-1">
            <TabsTrigger value="ranking">売上ランキング</TabsTrigger>
            <TabsTrigger value="performance">パフォーマンス分析</TabsTrigger>
            <TabsTrigger value="comparison">期間比較</TabsTrigger>
          </TabsList>

          {/* 売上ランキングタブ */}
          <TabsContent value="ranking" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 棒グラフ */}
              <BarChart
                data={staffRanking.slice(0, 10).map((item) => ({
                  name: item.name,
                  value: item.value,
                  label: `¥${item.value.toLocaleString()}`,
                }))}
                title="スタッフ売上ランキング（Top 10）"
                description="売上額でソートされたスタッフランキング"
                height={400}
                horizontal={true}
                maxBars={10}
              />

              {/* 詳細ランキングテーブル */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    詳細ランキング
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {staffRanking.map((staff, index) => (
                      <div
                        key={staff.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={index < 3 ? 'default' : 'secondary'}
                            className="w-8 h-8 flex items-center justify-center rounded-full"
                          >
                            {index + 1}
                          </Badge>
                          <div>
                            <p className="font-medium text-sm">{staff.name}</p>
                            <p className="text-xs text-muted-foreground">
                              シェア: {staff.percentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">¥{staff.value.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* パフォーマンス分析タブ */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* パフォーマンス分布 */}
              {performanceDistributionData.length > 0 && (
                <PieChart
                  data={performanceDistributionData}
                  title="スタッフパフォーマンス分布"
                  description="平均売上を基準とした分布"
                  height={400}
                  innerRadius={60}
                  showLabels={true}
                  showPercentage={true}
                  valueFormatter={(value) => `${value}人`}
                />
              )}

              {/* トップパフォーマー */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    トップパフォーマー
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performanceComparison?.topPerformers
                      ?.slice(0, 5)
                      .map((staff: StaffSalesData) => (
                        <div key={staff.staff_id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-sm">{staff.staff_name}</span>
                            <span className="text-sm">¥{staff.total_amount.toLocaleString()}</span>
                          </div>
                          <Progress
                            value={
                              performanceComparison.averagePerformance.averageAmount > 0
                                ? ((staff.total_amount /
                                    performanceComparison.averagePerformance.averageAmount) *
                                    100) /
                                  performanceComparison.topPerformers.length
                                : 0
                            }
                            className="h-2"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{staff.booking_count}件の予約</span>
                            <span>
                              全体の
                              {performanceComparison.averagePerformance.averageAmount > 0
                                ? (
                                    ((staff.total_amount /
                                      performanceComparison.averagePerformance.averageAmount) *
                                      100) /
                                    performanceComparison.topPerformers.length
                                  ).toFixed(0)
                                : 0}
                              %
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* パフォーマンス統計 */}
            {performanceComparison && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">パフォーマンス統計</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold text-chart-1">
                        {performanceComparison.performanceDistribution.high}
                      </p>
                      <p className="text-sm text-muted-foreground">平均以上のスタッフ</p>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold text-chart-2">
                        {performanceComparison.performanceDistribution.medium}
                      </p>
                      <p className="text-sm text-muted-foreground">平均的なスタッフ</p>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold">
                        ¥{performanceComparison.averagePerformance.averageAmount.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">平均売上</p>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold">
                        {Math.round(performanceComparison.averagePerformance.averageBookings)}
                      </p>
                      <p className="text-sm text-muted-foreground">平均予約数</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 期間比較タブ */}
          <TabsContent value="comparison" className="space-y-4">
            {periodComparison && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">売上比較</CardTitle>
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
                      <span className="text-sm text-muted-foreground">差額</span>
                      <span
                        className={`font-medium ${
                          periodComparison.current.total_amount >=
                          periodComparison.previous.total_amount
                            ? 'text-success'
                            : 'text-destructive'
                        }`}
                      >
                        {periodComparison.current.total_amount >=
                        periodComparison.previous.total_amount
                          ? '+'
                          : ''}
                        ¥
                        {(
                          periodComparison.current.total_amount -
                          periodComparison.previous.total_amount
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">成長率</span>
                      <span
                        className={`font-medium ${
                          periodComparison.growth.amount_percentage >= 0
                            ? 'text-success'
                            : 'text-destructive'
                        }`}
                      >
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
                      <span className="text-sm text-muted-foreground">差</span>
                      <span
                        className={`font-medium ${
                          periodComparison.current.booking_count >=
                          periodComparison.previous.booking_count
                            ? 'text-success'
                            : 'text-destructive'
                        }`}
                      >
                        {periodComparison.current.booking_count >=
                        periodComparison.previous.booking_count
                          ? '+'
                          : ''}
                        {(
                          periodComparison.current.booking_count -
                          periodComparison.previous.booking_count
                        ).toLocaleString()}
                        件
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">成長率</span>
                      <span
                        className={`font-medium ${
                          periodComparison.growth.booking_percentage >= 0
                            ? 'text-success'
                            : 'text-destructive'
                        }`}
                      >
                        {periodComparison.growth.booking_percentage >= 0 ? '+' : ''}
                        {periodComparison.growth.booking_percentage.toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardSection>
  )
}