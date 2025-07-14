"use client";

import { Button } from '@/components/ui/button'
import { RefreshCwIcon, Loader2 } from 'lucide-react'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { subDays, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  Calendar,
  TrendingUp,
  TrendingUpDown,
  Banknote,
  Activity,
  TrendingDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { DashboardSection } from '@/components/common'

import {
  LineChart,
  BarChart,
  AnalyticsFilters,
  SummaryCard,
  SummaryCardGrid,
  type FilterOptions,
} from '@/components/analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { DailySalesRepository } from '@/services/supabase/repositories/analytics'
import type {
  SalesSummary,
  PeriodComparisonData,
  ChartDataPoint,
} from '@/services/supabase/repositories/analytics/types'
import { Badge } from '@/components/ui/badge'

// 初期フィルター設定（過去30日間、未来の日付は除外）
const getInitialFilters = (tenantId: string, orgId: string): FilterOptions => ({
  dateRange: {
    from: subDays(new Date(), 29),
    to: subDays(new Date(), 1), // 昨日までに変更
  },
  tenantId,
  orgId,
})

// 曜日別パフォーマンス分析用の型定義
type WeekdayPerformance = {
  dayOfWeek: number
  dayName: string
  totalAmount: number
  bookingCount: number
  averageAmount: number
  // 追加の分析データ
  totalAmountPercentage: number
  bookingCountPercentage: number
  averageAmountPercentage: number
  rank: number
  isHighest: boolean
  isLowest: boolean
}

// 月別データ分析用の型定義
type MonthlyData = {
  month: string
  monthName: string
  totalAmount: number
  bookingCount: number
  averageAmount: number
  // 追加の分析データ
  totalAmountPercentage: number
  bookingCountPercentage: number
  averageAmountPercentage: number
  rank: number
  isHighest: boolean
  isLowest: boolean
  growthRate?: number
}

// 基本的な売上データ型
type BasicSalesData = {
  totalAmount: number
  bookingCount: number
  averageAmount: number
  dayOfWeek?: number
  dayName?: string
  month?: string
  monthName?: string
}

// 曜日別分析サマリー用の型定義
type WeekdayAnalysisSummary = {
  totalAverage: number
  bookingAverage: number
  amountAverage: number
  bestItem: WeekdayPerformance | null
  worstItem: WeekdayPerformance | null
}

// 月別分析サマリー用の型定義
type MonthlyAnalysisSummary = {
  totalAverage: number
  bookingAverage: number
  amountAverage: number
  bestItem: MonthlyData | null
  worstItem: MonthlyData | null
}

/**
 * 日別売上分析ページ
 */
export default function DailyAnalyticsPage() {
  const { tenantId, orgId, isLoaded } = useTenantAndOrganization()

  // 状態管理
  const [filters, setFilters] = useState<FilterOptions | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isInterval, setIsInterval] = useState(false)
  const { showErrorToast } = useErrorHandler()

  // データ状態
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null)
  const [trendData, setTrendData] = useState<ChartDataPoint[]>([])
  const [weekdayPerformance, setWeekdayPerformance] = useState<WeekdayPerformance[]>([])
  const [monthlyData, setMonthlySales] = useState<MonthlyData[]>([])
  const [periodComparison, setPeriodComparison] = useState<PeriodComparisonData | null>(null)

  // リポジトリインスタンス
  const repository = useMemo(() => {
    if (!tenantId || !orgId) return null
    return new DailySalesRepository()
  }, [tenantId, orgId])

  // 曜日別分析データを計算
  const calculateWeekdayAnalysis = useCallback((data: BasicSalesData[]): WeekdayPerformance[] => {
    if (!data || data.length === 0) return []

    const totalAmount = data.reduce((sum, item) => sum + item.totalAmount, 0)
    const totalBookings = data.reduce((sum, item) => sum + item.bookingCount, 0)
    const totalAverage = data.reduce((sum, item) => sum + item.averageAmount, 0) / data.length

    // ランキング付けのためのソート
    const sortedByAmount = [...data].sort((a, b) => b.totalAmount - a.totalAmount)

    return data.map((item) => ({
      dayOfWeek: item.dayOfWeek || 0,
      dayName: item.dayName || '',
      totalAmount: item.totalAmount,
      bookingCount: item.bookingCount,
      averageAmount: item.averageAmount,
      totalAmountPercentage: totalAmount > 0 ? (item.totalAmount / totalAmount) * 100 : 0,
      bookingCountPercentage: totalBookings > 0 ? (item.bookingCount / totalBookings) * 100 : 0,
      averageAmountPercentage: totalAverage > 0 ? (item.averageAmount / totalAverage) * 100 : 0,
      rank: sortedByAmount.findIndex((sorted) => sorted.dayOfWeek === item.dayOfWeek) + 1,
      isHighest:
        item.totalAmount === Math.max(...data.map((d) => d.totalAmount)) && item.totalAmount > 0,
      isLowest:
        item.totalAmount === Math.min(...data.map((d) => d.totalAmount)) &&
        data.some((d) => d.totalAmount > 0),
    }))
  }, [])

  // 月別分析データを計算
  const calculateMonthlyAnalysis = useCallback((data: BasicSalesData[]): MonthlyData[] => {
    if (!data || data.length === 0) return []

    const totalAmount = data.reduce((sum, item) => sum + item.totalAmount, 0)
    const totalBookings = data.reduce((sum, item) => sum + item.bookingCount, 0)
    const totalAverage = data.reduce((sum, item) => sum + item.averageAmount, 0) / data.length

    // ランキング付けのためのソート
    const sortedByAmount = [...data].sort((a, b) => b.totalAmount - a.totalAmount)

    return data.map((item, index) => {
      // 成長率の計算（前月比）
      const growthRate =
        index > 0
          ? ((item.totalAmount - data[index - 1].totalAmount) / data[index - 1].totalAmount) * 100
          : 0

      return {
        month: item.month || '',
        monthName: item.monthName || '',
        totalAmount: item.totalAmount,
        bookingCount: item.bookingCount,
        averageAmount: item.averageAmount,
        totalAmountPercentage: totalAmount > 0 ? (item.totalAmount / totalAmount) * 100 : 0,
        bookingCountPercentage: totalBookings > 0 ? (item.bookingCount / totalBookings) * 100 : 0,
        averageAmountPercentage: totalAverage > 0 ? (item.averageAmount / totalAverage) * 100 : 0,
        rank: sortedByAmount.findIndex((sorted) => sorted.month === item.month) + 1,
        isHighest:
          item.totalAmount === Math.max(...data.map((d) => d.totalAmount)) && item.totalAmount > 0,
        isLowest:
          item.totalAmount === Math.min(...data.map((d) => d.totalAmount)) &&
          data.some((d) => d.totalAmount > 0),
        growthRate: index > 0 ? growthRate : undefined,
      }
    })
  }, [])

  // 曜日別分析サマリーを計算
  const weekdayAnalysis = useMemo((): WeekdayAnalysisSummary => {
    if (!weekdayPerformance || weekdayPerformance.length === 0) {
      return {
        totalAverage: 0,
        bookingAverage: 0,
        amountAverage: 0,
        bestItem: null,
        worstItem: null,
      }
    }

    const totalAverage =
      weekdayPerformance.reduce((sum, item) => sum + item.totalAmount, 0) /
      weekdayPerformance.length
    const bookingAverage =
      weekdayPerformance.reduce((sum, item) => sum + item.bookingCount, 0) /
      weekdayPerformance.length
    const amountAverage =
      weekdayPerformance.reduce((sum, item) => sum + item.averageAmount, 0) /
      weekdayPerformance.length

    const bestItem = weekdayPerformance.find((item) => item.isHighest) || null
    const worstItem = weekdayPerformance.find((item) => item.isLowest) || null

    return {
      totalAverage,
      bookingAverage,
      amountAverage,
      bestItem,
      worstItem,
    }
  }, [weekdayPerformance])

  // 月別分析サマリーを計算
  const monthlyAnalysis = useMemo((): MonthlyAnalysisSummary => {
    if (!monthlyData || monthlyData.length === 0) {
      return {
        totalAverage: 0,
        bookingAverage: 0,
        amountAverage: 0,
        bestItem: null,
        worstItem: null,
      }
    }

    const totalAverage =
      monthlyData.reduce((sum, item) => sum + item.totalAmount, 0) / monthlyData.length
    const bookingAverage =
      monthlyData.reduce((sum, item) => sum + item.bookingCount, 0) / monthlyData.length
    const amountAverage =
      monthlyData.reduce((sum, item) => sum + item.averageAmount, 0) / monthlyData.length

    const bestItem = monthlyData.find((item) => item.isHighest) || null
    const worstItem = monthlyData.find((item) => item.isLowest) || null

    return {
      totalAverage,
      bookingAverage,
      amountAverage,
      bestItem,
      worstItem,
    }
  }, [monthlyData])

  // 初期フィルター設定
  useEffect(() => {
    if (tenantId && orgId && !filters) {
      setFilters(getInitialFilters(tenantId, orgId))
    }
  }, [tenantId, orgId, filters])

  // データ取得
  const fetchData = useCallback(async () => {
    if (!repository || !filters) return

    setLoading(true)
    setError(null)

    try {
      const [summaryResult, trendResult, weekdayResult, monthlyResult, comparisonResult] =
        await Promise.all([
          repository.getSalesSummary(filters),
          repository.getSalesTrend(filters),
          repository.getWeekdayPerformance(filters),
          repository.getMonthlySales(filters),
          repository.getPeriodComparison(filters),
        ])

      setSalesSummary(summaryResult)
      setTrendData(trendResult)
      setWeekdayPerformance(calculateWeekdayAnalysis(weekdayResult))
      setMonthlySales(calculateMonthlyAnalysis(monthlyResult))
      setPeriodComparison(comparisonResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析データの取得に失敗しました')
      console.error('Analytics data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [repository, filters, calculateWeekdayAnalysis, calculateMonthlyAnalysis])

  console.log('salesSummary', salesSummary)
  console.log('trendData', trendData)
  console.log('weekdayPerformance', weekdayPerformance)
  console.log('monthlyData', monthlyData)
  console.log('periodComparison', periodComparison)

  // インターバル時間（ミリ秒）
  const REFRESH_INTERVAL = 5000 // 5秒

  // データ更新とインターバル制御
  const handleRefresh = useCallback(async () => {
    if (isRefreshing || isInterval) return

    setIsRefreshing(true)
    try {
      await fetchData()
      toast.success('データを更新しました')
    } catch (err) {
      console.error('Refresh error:', err)
      showErrorToast(err)
    } finally {
      setIsRefreshing(false)
      // インターバル開始
      setIsInterval(true)
      setTimeout(() => {
        setIsInterval(false)
      }, REFRESH_INTERVAL)
    }
  }, [fetchData, isRefreshing, isInterval, showErrorToast])

  // ボタンのテキストを決定
  const buttonText = useMemo(() => {
    if (isRefreshing) return '更新中...'
    if (isInterval) return '待機中'
    return '更新'
  }, [isRefreshing, isInterval])

  // フィルター変更時のデータ再取得
  useEffect(() => {
    if (filters && repository) {
      fetchData()
    }
  }, [filters, repository, fetchData])

  // ローディング表示
  if (!isLoaded || !tenantId || !orgId) {
    return (
      <DashboardSection title="日別売上分析" backLink="/dashboard" backLinkTitle="ダッシュボード">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <SummaryCard key={i} title="" value="" loading={true} />
            ))}
          </div>
        </div>
      </DashboardSection>
    )
  }

  // フィルターがまだ設定されていない場合
  if (!filters) {
    return (
      <DashboardSection title="日別売上分析" backLink="/dashboard" backLinkTitle="ダッシュボード">
        <div>フィルターを初期化中...</div>
      </DashboardSection>
    )
  }

  // サマリーカードデータ
  const summaryCards = [
    {
      id: 'total-amount',
      title: '総売上',
      value: salesSummary?.totalAmount || 0,
      icon: <Banknote className="w-4 h-4" />,
      valueFormatter: (value: string | number) => `¥${Number(value).toLocaleString()}`,
      change: periodComparison
        ? {
            value: periodComparison.growth.amount_percentage,
            label: '前期間比',
          }
        : undefined,
    },
    {
      id: 'total-bookings',
      title: '総予約数',
      value: salesSummary?.totalBookings || 0,
      icon: <Calendar className="w-4 h-4" />,
      change: periodComparison
        ? {
            value: periodComparison.growth.booking_percentage,
            label: '前期間比',
          }
        : undefined,
    },
    {
      id: 'average-amount',
      title: '平均客単価',
      value: salesSummary?.averageAmount || 0,
      icon: <TrendingUp className="w-4 h-4" />,
      valueFormatter: (value: string | number) => `¥${Number(value).toLocaleString()}`,
      change: periodComparison
        ? {
            value: periodComparison.growth.average_percentage,
            label: '前期間比',
          }
        : undefined,
    },
    {
      id: 'daily-average',
      title: '1日平均売上',
      value: salesSummary?.dailyAverage || 0,
      icon: <Activity className="w-4 h-4" />,
      valueFormatter: (value: string | number) => `¥${Number(value).toLocaleString()}`,
      subtitle: `${salesSummary?.periodDays || 0}日間の平均`,
    },
  ]

  console.log('growth', periodComparison?.growth)
  console.log('current', periodComparison?.current)
  console.log('previous', periodComparison?.previous)

  return (
    <DashboardSection title="日別売上分析" backLink="/dashboard" backLinkTitle="ダッシュボード">
      <div className="space-y-6">
        {/* エラー表示 */}
        {error && (
          <Alert className="border-destructive">
            <AlertDescription className="text-destructive">{error}</AlertDescription>
          </Alert>
        )}

        <div className="relative">
          {/* フィルター */}
          <AnalyticsFilters
            filters={filters}
            onFiltersChange={setFilters}
            loading={loading}
            showStaffFilter={false}
            showMenuFilter={false}
          />
          <div className="absolute top-2 right-2">
            <div className="flex items-end">
              <Button
                onClick={handleRefresh}
                variant={!isRefreshing && !isInterval ? 'default' : 'outline'}
                size="sm"
                disabled={isRefreshing || isInterval}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                )}
                {buttonText}
              </Button>
            </div>
          </div>
        </div>

        {/* サマリーカード */}
        <SummaryCardGrid cards={summaryCards} loading={loading} columns={1} />

        {/* メインコンテンツ */}
        <Tabs defaultValue="trend" className="space-y-4">
          <TabsList className="flex w-fit overflow-x-auto space-x-2 p-1">
            <TabsTrigger value="trend">売上推移</TabsTrigger>
            <TabsTrigger value="weekday">曜日別分析</TabsTrigger>
            <TabsTrigger value="monthly">月別分析</TabsTrigger>
          </TabsList>

          {/* 売上推移タブ */}
          <TabsContent value="trend" className="space-y-4">
            <LineChart
              data={trendData}
              title="日別売上推移"
              description={`${format(filters.dateRange.from, 'M月d日', { locale: ja })} 〜 ${format(filters.dateRange.to, 'M月d日', { locale: ja })} の売上トレンドを表示`}
              height={400}
              showGrid={true}
              valueFormatter={(value) => `¥${value.toLocaleString()}`}
              labelFormatter={(label) => label}
            />

            {/* 期間比較カード */}
            {periodComparison && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="relative">
                  <CardHeader>
                    <CardTitle className="text-lg">前期間との比較</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-around gap-4">
                    <div className="flex flex-col justify-between items-center">
                      <span className="font-bold text-lg">
                        ¥{periodComparison.previous.total_amount.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground">前期間売上</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <TrendingUpDown className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col justify-between items-center">
                      <span className="font-bold text-lg">
                        ¥{periodComparison.current.total_amount.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground">現期間売上</span>
                    </div>
                  </CardContent>
                  <Badge variant="outline" className="absolute top-2 right-2">
                    <span className="text-sm ">成長率 </span>
                    <span
                      className={`font-semibold text-lg ${
                        periodComparison.growth.amount_percentage >= 0
                          ? 'text-accent-2'
                          : 'text-destructive'
                      }`}
                    >
                      {periodComparison.growth.amount_percentage >= 0 ? '+' : ''}
                      {periodComparison.growth.amount_percentage.toFixed(1)}%
                    </span>
                  </Badge>
                </Card>

                <Card className="relative">
                  <CardHeader>
                    <CardTitle className="text-lg">予約数比較</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-around gap-4">
                    <div className="flex flex-col justify-between items-center">
                      <span className="font-bold text-lg">
                        {periodComparison.previous.booking_count.toLocaleString()}件
                      </span>
                      <span className="text-sm text-muted-foreground">前期間予約数</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <TrendingUpDown className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col justify-between items-center">
                      <span className="font-bold text-lg">
                        {periodComparison.current.booking_count.toLocaleString()}件
                      </span>
                      <span className="text-sm text-muted-foreground">現期間予約数</span>
                    </div>
                  </CardContent>
                  <Badge variant="outline" className="absolute top-2 right-2">
                    <span className="text-sm text-muted-foreground">成長率 </span>
                    <span
                      className={`font-semibold text-lg ${
                        periodComparison.growth.booking_percentage >= 0
                          ? 'text-accent-2'
                          : 'text-destructive'
                      }`}
                    >
                      {periodComparison.growth.booking_percentage >= 0 ? '+' : ''}
                      {periodComparison.growth.booking_percentage.toFixed(1)}%
                    </span>
                  </Badge>
                </Card>
              </div>
            )}

            {/* 売上トレンド戦略インサイト */}
            {periodComparison &&
              salesSummary &&
              periodComparison.growth.amount_percentage !== 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      売上トレンド戦略インサイト
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      期間売上パフォーマンスの最適化提案
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 成長率分析 */}
                      <div className="p-4 bg-palette-1/10 border border-palette-1/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-palette-1 rounded-full"></div>
                          <span className="text-sm font-medium">売上成長率評価</span>
                        </div>
                        <div className="text-lg font-bold mb-1">
                          {periodComparison.growth.amount_percentage >= 0 ? '+' : ''}
                          {periodComparison.growth.amount_percentage.toFixed(1)}%
                          <span className="text-sm text-muted-foreground ml-2">前期間比</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(() => {
                            const growth = periodComparison.growth.amount_percentage
                            if (growth >= 15) {
                              return '非常に優秀な成長率です。現在の施策を継続し、更なる拡大を目指しましょう。'
                            } else if (growth >= 5) {
                              return '良好な成長率です。安定的な成長を維持しつつ、新たな成長機会を模索してください。'
                            } else if (growth >= 0) {
                              return '横ばいの傾向です。マーケティング施策やサービス改善で成長促進を図りましょう。'
                            } else if (growth >= -10) {
                              return '軽微な減少傾向です。顧客満足度向上やリピート率改善に注力してください。'
                            } else {
                              return '大幅な減少傾向です。緊急対策として価格戦略やサービス品質の見直しが必要です。'
                            }
                          })()}
                        </p>
                      </div>
                      {/* 売上安定性指標 */}
                      <div className="p-4 bg-palette-2/10 border border-palette-2/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-palette-2 rounded-full"></div>
                          <span className="text-sm font-medium">売上安定性指標</span>
                        </div>
                        <div className="text-lg font-bold mb-1">
                          {(() => {
                            const dailyAvg = salesSummary.dailyAverage || 0
                            const totalAmount = salesSummary.totalAmount || 0
                            const days = salesSummary.periodDays || 1
                            const expectedTotal = dailyAvg * days
                            const stabilityScore =
                              expectedTotal > 0
                                ? Math.min(100, Math.round((totalAmount / expectedTotal) * 100))
                                : 0
                            return `${stabilityScore}点`
                          })()}
                          <span className="text-sm text-muted-foreground ml-1">/100点</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(() => {
                            const dailyAvg = salesSummary.dailyAverage || 0
                            const totalAmount = salesSummary.totalAmount || 0
                            const days = salesSummary.periodDays || 1
                            const expectedTotal = dailyAvg * days
                            const stabilityScore =
                              expectedTotal > 0
                                ? Math.min(100, Math.round((totalAmount / expectedTotal) * 100))
                                : 0

                            if (stabilityScore >= 95) {
                              return '非常に安定した売上パターンです。予測可能性が高く、計画的な事業運営が可能です。'
                            } else if (stabilityScore >= 85) {
                              return '安定した売上傾向です。季節要因や曜日要因を考慮した運営最適化を検討してください。'
                            } else if (stabilityScore >= 70) {
                              return '中程度の変動があります。売上の波を平準化する施策が効果的です。'
                            } else {
                              return '売上変動が大きいです。予約管理やスタッフ配置の最適化で安定化を図りましょう。'
                            }
                          })()}
                        </p>
                      </div>
                      {/* 収益性評価 */}
                      <div className="p-4 bg-palette-3/10 border border-palette-3/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-palette-3 rounded-full"></div>
                          <span className="text-sm font-medium">収益性評価</span>
                        </div>
                        <div className="text-lg font-bold mb-1">
                          ¥{salesSummary.averageAmount?.toLocaleString() || '0'}
                          <span className="text-sm text-muted-foreground ml-1">（客単価）</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(() => {
                            const avgAmount = salesSummary.averageAmount || 0
                            const bookingGrowth = periodComparison.growth.booking_percentage
                            const amountGrowth = periodComparison.growth.amount_percentage

                            if (avgAmount >= 10000) {
                              return 'プレミアム価格帯の維持に成功しています。高付加価値サービスの継続的な提供を心がけてください。'
                            } else if (avgAmount >= 7000) {
                              return '適正な客単価レベルです。サービス品質の向上でさらなる単価向上を目指しましょう。'
                            } else if (avgAmount >= 5000 && amountGrowth > bookingGrowth) {
                              return '客単価向上の傾向が見られます。アップセル戦略が効果的に機能しています。'
                            } else if (avgAmount >= 5000) {
                              return '標準的な客単価です。オプションメニューやパッケージ化で単価向上を図りましょう。'
                            } else {
                              return '客単価に改善余地があります。価格戦略の見直しとサービス価値の向上が必要です。'
                            }
                          })()}
                        </p>
                      </div>
                      {/* 総合戦略提案 */}
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          <strong>💼 総合戦略提案:</strong>
                          {(() => {
                            const amountGrowth = periodComparison.growth.amount_percentage
                            const bookingGrowth = periodComparison.growth.booking_percentage
                            const dailyAvg = salesSummary.dailyAverage || 0

                            if (amountGrowth >= 10 && bookingGrowth >= 5) {
                              return ' 売上・予約数ともに好調な成長を示しています。現在の成功要因を分析し、スケールアップ戦略を検討してください。'
                            } else if (amountGrowth > bookingGrowth && amountGrowth > 0) {
                              return ' 客単価向上が売上成長を牽引しています。既存顧客へのアップセル・クロスセル施策を強化し、新規顧客獲得にも注力しましょう。'
                            } else if (bookingGrowth > amountGrowth && bookingGrowth > 0) {
                              return ' 予約数増加が成長の要因です。顧客満足度向上と単価向上施策で、質的成長への転換を目指しましょう。'
                            } else if (amountGrowth < 0 && bookingGrowth < 0) {
                              return ' 全体的な減少傾向が見られます。顧客分析を実施し、サービス改善・価格見直し・マーケティング強化を包括的に進めてください。'
                            } else if (dailyAvg >= 50000) {
                              return ' 高い日別売上を維持しています。この水準を安定化させ、効率的な運営体制の構築に注力してください。'
                            } else {
                              return ' 成長機会の特定と実行が重要です。市場分析・競合調査を実施し、差別化戦略を明確にしてください。'
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
          </TabsContent>

          {/* 曜日別分析タブ */}
          <TabsContent value="weekday" className="space-y-4">
            <BarChart
              data={weekdayPerformance.map((item) => ({
                name: item.dayName,
                value: item.totalAmount,
                bookingCount: item.bookingCount,
                label: `¥${item.totalAmount.toLocaleString()}`,
              }))}
              title="曜日別売上分析"
              description={`${format(filters.dateRange.from, 'M月d日', { locale: ja })} 〜 ${format(filters.dateRange.to, 'M月d日', { locale: ja })} の曜日別売上パフォーマンス`}
              height={400}
              showGrid={true}
              valueFormatter={(value) => `¥${value.toLocaleString()}`}
              labelFormatter={(label) => label}
            />

            {/* 曜日別パフォーマンスサマリー */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="border border-border rounded-lg p-3 bg-link text-link-foreground">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  <h3 className="text-lg  font-semibold">最高パフォーマンス</h3>
                </div>
                <div className="p-4">
                  {weekdayAnalysis.bestItem ? (
                    <div className="space-y-2">
                      <p className="text-2xl font-bold">{weekdayAnalysis.bestItem.dayName}</p>
                      <p className="text-lg font-semibold text-link-foreground">
                        ¥{weekdayAnalysis.bestItem.totalAmount.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        全体の
                        <strong className="">
                          {weekdayAnalysis.bestItem.totalAmountPercentage.toFixed(1)}
                        </strong>
                        %
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">データがありません</p>
                  )}
                </div>
              </div>

              <div className="border border-border rounded-lg p-3 bg-destructive-foreground text-destructive">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                  <h3 className="text-lg font-semibold">最低パフォーマンス</h3>
                </div>
                <div className="p-4">
                  {weekdayAnalysis.worstItem ? (
                    <div className="space-y-2">
                      <p className="text-2xl font-bold">{weekdayAnalysis.worstItem.dayName}</p>
                      <p className="text-lg font-semibold text-destructive">
                        ¥{weekdayAnalysis.worstItem.totalAmount.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        全体の
                        <strong>
                          {weekdayAnalysis.worstItem.totalAmountPercentage.toFixed(1)}
                        </strong>
                        %
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">データがありません</p>
                  )}
                </div>
              </div>

              <div className="border border-border rounded-lg p-3 bg-accent-2-foreground text-accent-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-accent-2" />
                  <h3 className="text-lg font-semibold">平均パフォーマンス</h3>
                </div>
                <div className="p-4">
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">
                      ¥{weekdayAnalysis.totalAverage.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      予約数平均:{' '}
                      <strong className="">{weekdayAnalysis.bookingAverage.toFixed(1)}</strong> 件
                    </p>
                    <p className="text-sm text-muted-foreground">
                      客単価平均: ¥
                      <strong className="">
                        {Math.floor(weekdayAnalysis.amountAverage).toLocaleString()}
                      </strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 曜日別詳細テーブル */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">曜日別詳細データ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-nowrap">
                        <th className="text-right p-2">ランキング</th>
                        <th className="text-left p-2">曜日</th>
                        <th className="text-right p-2">売上合計</th>
                        <th className="text-right p-2">予約数</th>
                        <th className="text-right p-2">平均売上</th>
                        <th className="text-right p-2">売上比率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekdayPerformance.map((item, index) => (
                        <tr
                          key={index}
                          className={`border-b text-nowrap ${item.isHighest ? 'bg-link' : item.isLowest ? 'bg-destructive-foreground' : ''}`}
                        >
                          <td className="p-2 w-10 text-center">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                item.rank === 1
                                  ? 'bg-link text-link-foreground font-bold'
                                  : item.rank === 2
                                    ? 'bg-neon-foreground text-neon font-bold'
                                    : item.rank === 3
                                      ? 'bg-warning text-warning-foreground font-bold'
                                      : item.isLowest
                                        ? 'bg-destructive-foreground text-destructive font-bold'
                                        : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {item.rank}位
                            </span>
                          </td>
                          <td
                            className={`p-2 font-medium ${item.isHighest ? 'text-link-foreground' : item.isLowest ? 'text-destructive' : ''}`}
                          >
                            {item.dayName}
                          </td>
                          <td className="p-2 text-right">¥{item.totalAmount.toLocaleString()}</td>
                          <td className="p-2 text-right">{item.bookingCount}件</td>
                          <td className="p-2 text-right">¥{item.averageAmount.toLocaleString()}</td>
                          <td className="p-2 text-right">
                            {item.totalAmountPercentage.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 曜日別運営戦略インサイト */}
            {weekdayAnalysis.bestItem && weekdayAnalysis.worstItem && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    曜日別運営戦略インサイト
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    曜日パターンを活用した運営最適化提案
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 最強曜日分析 */}
                    <div className="p-4 bg-palette-1/10 border border-palette-1/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-palette-1 rounded-full"></div>
                        <span className="text-sm font-medium">売上No.1曜日</span>
                      </div>
                      <div className="text-lg font-bold mb-1">
                        {weekdayAnalysis.bestItem.dayName}
                        <span className="text-sm text-muted-foreground ml-2">
                          （¥{weekdayAnalysis.bestItem.totalAmount.toLocaleString()}）
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const bestDay = weekdayAnalysis.bestItem.dayName
                          const percentage = weekdayAnalysis.bestItem.totalAmountPercentage

                          if (percentage >= 20) {
                            return `${bestDay}は週売上の${percentage.toFixed(1)}%を占める主力曜日です。スタッフ配置を厚くし、特別メニューの提供を検討してください。`
                          } else if (percentage >= 15) {
                            return `${bestDay}は安定した売上を見込める重要曜日です。予約枠の拡大やプロモーション強化で更なる売上向上を目指しましょう。`
                          } else {
                            return `${bestDay}が最高パフォーマンスですが、曜日間の差は比較的小さいです。全体的な底上げ施策が効果的です。`
                          }
                        })()}
                      </p>
                    </div>

                    {/* 改善対象曜日分析 */}
                    <div className="p-4 bg-palette-2/10 border border-palette-2/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-palette-2 rounded-full"></div>
                        <span className="text-sm font-medium">改善対象曜日</span>
                      </div>
                      <div className="text-lg font-bold mb-1">
                        {weekdayAnalysis.worstItem.dayName}
                        <span className="text-sm text-muted-foreground ml-2">
                          （¥{weekdayAnalysis.worstItem.totalAmount.toLocaleString()}）
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const worstDay = weekdayAnalysis.worstItem.dayName
                          const bestAmount = weekdayAnalysis.bestItem.totalAmount
                          const worstAmount = weekdayAnalysis.worstItem.totalAmount
                          const gap = ((bestAmount - worstAmount) / bestAmount) * 100

                          if (gap >= 40) {
                            return `${worstDay}は最高曜日と比べて${gap.toFixed(1)}%低い売上です。特別割引やイベント開催で集客向上を図りましょう。`
                          } else if (gap >= 20) {
                            return `${worstDay}は改善余地があります。ターゲット層に合わせたサービス提供や営業時間調整を検討してください。`
                          } else {
                            return `${worstDay}も安定した売上を確保しています。微調整により全体パフォーマンスの向上が期待できます。`
                          }
                        })()}
                      </p>
                    </div>

                    {/* 曜日別効率性スコア */}
                    <div className="p-4 bg-palette-3/10 border border-palette-3/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-palette-3 rounded-full"></div>
                        <span className="text-sm font-medium">曜日別効率性スコア</span>
                      </div>
                      <div className="text-lg font-bold mb-1">
                        {(() => {
                          const bestAmount = weekdayAnalysis.bestItem.totalAmount
                          const worstAmount = weekdayAnalysis.worstItem.totalAmount
                          const avgAmount = weekdayAnalysis.totalAverage
                          const efficiencyScore =
                            avgAmount > 0 ? Math.round((worstAmount / bestAmount) * 100) : 0
                          return `${efficiencyScore}点`
                        })()}
                        <span className="text-sm text-muted-foreground ml-1">/100点</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const bestAmount = weekdayAnalysis.bestItem.totalAmount
                          const worstAmount = weekdayAnalysis.worstItem.totalAmount
                          const efficiencyScore = Math.round((worstAmount / bestAmount) * 100)

                          if (efficiencyScore >= 80) {
                            return '曜日間の売上バランスが良好です。安定した週間運営ができており、リスク分散も図れています。'
                          } else if (efficiencyScore >= 60) {
                            return '中程度の曜日格差があります。低パフォーマンス曜日の改善で全体売上の底上げが可能です。'
                          } else if (efficiencyScore >= 40) {
                            return '曜日格差が大きいです。集中的な改善施策により大幅な売上向上の機会があります。'
                          } else {
                            return '極端な曜日格差があります。運営体制の根本的見直しと戦略的な改善計画が必要です。'
                          }
                        })()}
                      </p>
                    </div>

                    {/* 総合運営提案 */}
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        <strong>💼 曜日別運営提案:</strong>
                        {(() => {
                          const bestDay = weekdayAnalysis.bestItem.dayName
                          const worstDay = weekdayAnalysis.worstItem.dayName
                          const bestAmount = weekdayAnalysis.bestItem.totalAmount
                          const worstAmount = weekdayAnalysis.worstItem.totalAmount
                          const gap = ((bestAmount - worstAmount) / bestAmount) * 100

                          if (bestDay.includes('土') || bestDay.includes('日')) {
                            return ` 週末（${bestDay}）が最高パフォーマンスです。週末特別メニューの充実と平日割引キャンペーンで集客バランスを最適化しましょう。`
                          } else if (worstDay.includes('月') || worstDay.includes('火')) {
                            return ` 週初め（${worstDay}）の売上改善が重要です。月曜・火曜限定のお得なプランや、週末予約者への平日誘導施策を実施してください。`
                          } else if (gap >= 30) {
                            return ` ${bestDay}と${worstDay}の差が大きいです（${gap.toFixed(1)}%差）。${worstDay}の特別施策により週間売上の大幅改善が期待できます。`
                          } else {
                            return ` 比較的安定した曜日パターンです。${bestDay}の成功要因を他曜日にも横展開し、全体最適化を図りましょう。`
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 月別分析タブ */}
          <TabsContent value="monthly" className="space-y-4">
            <BarChart
              data={monthlyData.map((item) => ({
                name: item.monthName,
                value: item.totalAmount,
                label: `¥${item.totalAmount.toLocaleString()}`,
              }))}
              title="月別売上分析"
              description={`${format(filters.dateRange.from, 'M月d日', { locale: ja })} 〜 ${format(filters.dateRange.to, 'M月d日', { locale: ja })} の月別売上パフォーマンス`}
              height={400}
              showGrid={true}
            />

            {/* 月別パフォーマンスサマリー */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="border border-border rounded-lg p-3 bg-link text-link-foreground">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">最高パフォーマンス</h3>
                </div>
                <div className="p-4">
                  {monthlyAnalysis.bestItem ? (
                    <div className="space-y-2">
                      <p className="text-2xl font-bold">{monthlyAnalysis.bestItem.monthName}</p>
                      <p className="text-lg font-semibold text-link-foreground">
                        ¥{monthlyAnalysis.bestItem.totalAmount.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        全体の{monthlyAnalysis.bestItem.totalAmountPercentage.toFixed(1)}%
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">データがありません</p>
                  )}
                </div>
              </div>

              <div className="border border-border rounded-lg p-3 bg-destructive-foreground text-destructive">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                  <h3 className="text-lg font-semibold">最低パフォーマンス</h3>
                </div>
                <div className="p-4">
                  {monthlyAnalysis.worstItem ? (
                    <div className="space-y-2">
                      <p className="text-2xl font-bold">{monthlyAnalysis.worstItem.monthName}</p>
                      <p className="text-lg font-semibold text-destructive">
                        ¥{monthlyAnalysis.worstItem.totalAmount.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        全体の{monthlyAnalysis.worstItem.totalAmountPercentage.toFixed(1)}%
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">データがありません</p>
                  )}
                </div>
              </div>

              <div className="border border-border rounded-lg p-3 bg-accent-2-foreground text-accent-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-accent-2" />
                  <h3 className="text-lg font-semibold">平均パフォーマンス</h3>
                </div>
                <div className="p-4">
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">
                      ¥{monthlyAnalysis.totalAverage.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      平均予約数: <strong>{monthlyAnalysis.bookingAverage.toLocaleString()}</strong>{' '}
                      件
                    </p>
                    <p className="text-sm text-muted-foreground">
                      平均客単価: <strong>¥{monthlyAnalysis.amountAverage.toLocaleString()}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 月別詳細テーブル */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">月別詳細データ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-nowrap">
                        <th className="text-left p-2">月</th>
                        <th className="text-right p-2">売上合計</th>
                        <th className="text-right p-2">予約数</th>
                        <th className="text-right p-2">平均客単価</th>
                        <th className="text-right p-2">売上比率</th>
                        <th className="text-right p-2">成長率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map((item, index) => (
                        <tr
                          key={index}
                          className={`border-b text-nowrap ${item.isHighest ? 'bg-link text-link-foreground' : item.isLowest ? 'bg-destructive-foreground text-destructives' : ''}`}
                        >
                          <td className="p-2 font-medium">{item.monthName}</td>
                          <td className="p-2 text-right">¥{item.totalAmount.toLocaleString()}</td>
                          <td className="p-2 text-right">{item.bookingCount}件</td>
                          <td className="p-2 text-right">¥{item.averageAmount.toLocaleString()}</td>
                          <td className="p-2 text-right">
                            {item.totalAmountPercentage.toFixed(1)}%
                          </td>
                          <td className="p-2 text-right">
                            {item.growthRate !== undefined ? (
                              <span
                                className={`${item.growthRate >= 0 ? 'text-link-foreground' : 'text-destructive'}`}
                              >
                                {item.growthRate >= 0 ? '+' : ''}
                                {item.growthRate.toFixed(1)}%
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 月別成長戦略インサイト */}
            {monthlyAnalysis.bestItem && monthlyAnalysis.worstItem && monthlyData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    月別成長戦略インサイト
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    月次トレンドを活用した中長期戦略提案
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 最高月間パフォーマンス */}
                    <div className="p-4 bg-palette-1/10 border border-palette-1/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-palette-1 rounded-full"></div>
                        <span className="text-sm font-medium">売上No.1月</span>
                      </div>
                      <div className="text-lg font-bold mb-1">
                        {monthlyAnalysis.bestItem.monthName}
                        <span className="text-sm text-muted-foreground ml-2">
                          （¥{monthlyAnalysis.bestItem.totalAmount.toLocaleString()}）
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const bestMonth = monthlyAnalysis.bestItem.monthName
                          const percentage = monthlyAnalysis.bestItem.totalAmountPercentage

                          if (bestMonth.includes('12') || bestMonth.includes('11')) {
                            return `年末商戦期（${bestMonth}）が最高パフォーマンスです。次年度の年末施策を更に強化し、この成功パターンを継続しましょう。`
                          } else if (bestMonth.includes('3') || bestMonth.includes('4')) {
                            return `新年度・春シーズン（${bestMonth}）が好調です。新生活需要を捉えた春キャンペーンの拡充を検討してください。`
                          } else if (percentage >= 15) {
                            return `${bestMonth}が年間売上の${percentage.toFixed(1)}%を占める重要月です。この月の成功要因を他月にも展開しましょう。`
                          } else {
                            return `${bestMonth}が最高実績ですが、月間格差は比較的小さいです。通年での安定成長戦略が効果的です。`
                          }
                        })()}
                      </p>
                    </div>

                    {/* 改善対象月分析 */}
                    <div className="p-4 bg-palette-2/10 border border-palette-2/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-palette-2 rounded-full"></div>
                        <span className="text-sm font-medium">強化対象月</span>
                      </div>
                      <div className="text-lg font-bold mb-1">
                        {monthlyAnalysis.worstItem.monthName}
                        <span className="text-sm text-muted-foreground ml-2">
                          （¥{monthlyAnalysis.worstItem.totalAmount.toLocaleString()}）
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const worstMonth = monthlyAnalysis.worstItem.monthName
                          const bestAmount = monthlyAnalysis.bestItem.totalAmount
                          const worstAmount = monthlyAnalysis.worstItem.totalAmount
                          const gap = ((bestAmount - worstAmount) / bestAmount) * 100

                          if (worstMonth.includes('1') || worstMonth.includes('2')) {
                            return `年始・冬季（${worstMonth}）の売上改善が重要です。新年キャンペーンや冬季限定メニューの導入を検討してください。`
                          } else if (worstMonth.includes('8') || worstMonth.includes('9')) {
                            return `夏季・初秋（${worstMonth}）の強化が必要です。夏休み需要の取り込みや秋の準備キャンペーンを実施しましょう。`
                          } else if (gap >= 30) {
                            return `${worstMonth}は最高月と${gap.toFixed(1)}%の差があります。季節特性を活かした特別施策で大幅改善の余地があります。`
                          } else {
                            return `${worstMonth}も一定の実績を維持しています。小幅な改善施策で全体的な売上底上げが期待できます。`
                          }
                        })()}
                      </p>
                    </div>

                    {/* 成長トレンド評価 */}
                    <div className="p-4 bg-palette-3/10 border border-palette-3/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-palette-3 rounded-full"></div>
                        <span className="text-sm font-medium">成長トレンド評価</span>
                      </div>
                      <div className="text-lg font-bold mb-1">
                        {(() => {
                          const monthsWithGrowth = monthlyData.filter(
                            (item) => item.growthRate !== undefined && item.growthRate > 0
                          ).length
                          const totalMonthsWithRate = monthlyData.filter(
                            (item) => item.growthRate !== undefined
                          ).length
                          const growthConsistency =
                            totalMonthsWithRate > 0
                              ? Math.round((monthsWithGrowth / totalMonthsWithRate) * 100)
                              : 0
                          return `${growthConsistency}%`
                        })()}
                        <span className="text-sm text-muted-foreground ml-1">成長一貫性</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const monthsWithGrowth = monthlyData.filter(
                            (item) => item.growthRate !== undefined && item.growthRate > 0
                          ).length
                          const totalMonthsWithRate = monthlyData.filter(
                            (item) => item.growthRate !== undefined
                          ).length
                          const growthConsistency =
                            totalMonthsWithRate > 0
                              ? Math.round((monthsWithGrowth / totalMonthsWithRate) * 100)
                              : 0

                          if (growthConsistency >= 70) {
                            return '優秀な成長一貫性を示しています。現在の戦略を継続し、更なる拡大投資を検討してください。'
                          } else if (growthConsistency >= 50) {
                            return '安定した成長トレンドです。成長期の要因分析と成功パターンの横展開が効果的です。'
                          } else if (growthConsistency >= 30) {
                            return '波のある成長パターンです。成長阻害要因の特定と対策により安定化を図りましょう。'
                          } else {
                            return '成長トレンドに課題があります。市場環境・競合状況・内部要因の包括的な見直しが必要です。'
                          }
                        })()}
                      </p>
                    </div>

                    {/* 総合月次戦略 */}
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        <strong>💼 月次成長戦略:</strong>
                        {(() => {
                          const avgGrowthRate =
                            monthlyData
                              .filter((item) => item.growthRate !== undefined)
                              .reduce((sum, item) => sum + (item.growthRate || 0), 0) /
                            monthlyData.filter((item) => item.growthRate !== undefined).length

                          const bestAmount = monthlyAnalysis.bestItem.totalAmount
                          const worstAmount = monthlyAnalysis.worstItem.totalAmount
                          const seasonalVariation = ((bestAmount - worstAmount) / bestAmount) * 100

                          if (avgGrowthRate >= 5) {
                            return ` 平均成長率${avgGrowthRate.toFixed(1)}%の良好なトレンドです。この成長を持続させるため、成功要因の体系化と再現可能な仕組み作りに投資しましょう。`
                          } else if (seasonalVariation >= 40) {
                            return ` 季節変動が大きい（${seasonalVariation.toFixed(1)}%差）ビジネスパターンです。閑散期の底上げと繁忙期の最大化を両輪とした年間戦略が重要です。`
                          } else if (avgGrowthRate >= 0) {
                            return ` 安定した月次推移を示しています。既存顧客の深耕と新規開拓のバランスを取りながら、着実な成長を目指しましょう。`
                          } else {
                            return ` 月次トレンドに改善余地があります。四半期単位での短期集中施策と、年間を通じた中長期戦略の両方が必要です。`
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardSection>
  )
}