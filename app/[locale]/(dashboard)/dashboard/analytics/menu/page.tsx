'use client'

import { toast } from 'sonner'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { Loader2, RefreshCwIcon, DollarSign, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { startOfMonth, endOfMonth } from 'date-fns'
import { Award, BarChart3, HelpCircle, PieChart as PieChartIcon } from 'lucide-react'
import type {
  SalesSummary,
  RankingData,
  MenuSalesData,
} from '@/services/supabase/repositories/analytics/types'

// エンタープライズレベルの型定義
type EnterpriseMenuSummary = SalesSummary & {
  topMenu: MenuSalesData | null
  activeMenuCount: number
}

type MenuPerformanceAnalysis = {
  topPerformers: MenuSalesData[]
  averagePerformance: {
    averageAmount: number
    averageBookings: number
  }
  performanceDistribution: {
    high: number
    medium: number
    low: number
  }
  popularityTrend: {
    menu_id: string
    menu_name: string
    booking_trend: number
    revenue_trend: number
  }[]
}

type PriceTierAnalysis = {
  priceTiers: {
    tier: string
    priceRange: string
    menuCount: number
    totalAmount: number
    averageAmount: number
    bookingCount: number
  }[]
  insights: {
    mostProfitableTier: string
    mostPopularTier: string
    averageMenuPrice: number
  }
}

import { DashboardSection } from '@/components/common'
import {
  BarChart,
  PieChart,
  AnalyticsFilters,
  SummaryCard,
  SummaryCardGrid,
  type FilterOptions,
} from '@/components/analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { MenuSalesRepository } from '@/services/supabase/repositories/analytics'

// 初期フィルター設定（日本時間での現在月のデータのみ取得、月次パーティション対応）
const getInitialFilters = (tenantId: string, orgId: string): FilterOptions => {
  // 日本時間（JST: UTC+9）で現在の日時を取得
  const now = new Date()
  const jstOffset = 9 * 60 * 60 * 1000 // 9時間をミリ秒に変換
  const nowJST = new Date(now.getTime() + jstOffset)

  // 日本時間での現在月の1日を取得
  const currentMonthStart = startOfMonth(nowJST)

  // 日本時間での該当月の最終日を取得
  const currentMonthEnd = endOfMonth(nowJST)

  console.log('[Menu Analytics] Initial date range setup:', {
    nowJST: nowJST.toISOString(),
    currentMonthStart: currentMonthStart.toISOString(),
    currentMonthEnd: currentMonthEnd.toISOString(),
    timezone: 'JST (UTC+9)',
  })

  return {
    dateRange: {
      from: currentMonthStart,
      to: currentMonthEnd,
    },
    tenantId,
    orgId,
  }
}

/**
 * メニュー別売上分析ページ - エンタープライズレベル
 */
export default function MenuAnalyticsPage() {
  const { tenantId, orgId, isLoaded } = useTenantAndOrganization()

  // 状態管理
  const [filters, setFilters] = useState<FilterOptions | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isInterval, setIsInterval] = useState(false)
  const { showErrorToast } = useErrorHandler()

  // データ状態（エンタープライズレベル対応）
  const [menuSummary, setMenuSummary] = useState<EnterpriseMenuSummary | null>(null)
  const [menuRanking, setMenuRanking] = useState<RankingData[]>([])
  const [performanceAnalysis, setPerformanceAnalysis] = useState<MenuPerformanceAnalysis | null>(
    null
  )
  const [priceTierAnalysis, setPriceTierAnalysis] = useState<PriceTierAnalysis | null>(null)

  // リポジトリインスタンス
  const repository = useMemo(() => {
    if (!tenantId || !orgId) return null
    return new MenuSalesRepository()
  }, [tenantId, orgId])

  // 初期フィルター設定
  useEffect(() => {
    if (tenantId && orgId && !filters) {
      setFilters(getInitialFilters(tenantId, orgId))
    }
  }, [tenantId, orgId, filters])

  // エンタープライズレベルのデータ取得（3,000店舗対応）
  const fetchData = useCallback(async () => {
    if (!repository || !filters) return

    setLoading(true)
    setError(null)

    const startTime = performance.now()

    try {
      console.log('[Enterprise] Starting menu analytics data fetch for tenant:', {
        tenantId: filters.tenantId,
        orgId: filters.orgId,
        dateRange: {
          from: filters.dateRange.from.toISOString().split('T')[0],
          to: filters.dateRange.to.toISOString().split('T')[0],
        },
        menuCount: filters.menuIds?.length || 0,
      })

      // 並列実行でパフォーマンス最適化（大規模SaaS向け）
      const [summaryResult, rankingResult, performanceResult, priceTierResult] = await Promise.all([
        repository.getMenuSummary(filters).catch((err) => {
          console.error('[Enterprise] Menu summary fetch failed:', err)
          throw new Error(`売上サマリー取得エラー: ${err.message}`)
        }),
        repository.getMenuRanking(filters, 15).catch((err) => {
          console.error('[Enterprise] Menu ranking fetch failed:', err)
          throw new Error(`ランキング取得エラー: ${err.message}`)
        }),
        repository.getMenuPerformanceAnalysis(filters).catch((err) => {
          console.error('[Enterprise] Performance analysis fetch failed:', err)
          throw new Error(`パフォーマンス分析エラー: ${err.message}`)
        }),
        repository.getPriceTierAnalysis(filters).catch((err) => {
          console.error('[Enterprise] Price tier analysis fetch failed:', err)
          throw new Error(`価格帯分析エラー: ${err.message}`)
        }),
      ])

      const executionTime = performance.now() - startTime
      console.log('[Enterprise] Menu analytics data fetch completed:', {
        executionTime: Math.round(executionTime),
        summaryData: {
          totalAmount: summaryResult.totalAmount,
          totalBookings: summaryResult.totalBookings,
          activeMenuCount: summaryResult.activeMenuCount,
        },
        rankingCount: rankingResult.length,
        performanceMetrics: performanceResult,
        priceTierInsights: priceTierResult.insights,
      })

      // エンタープライズレベルのデータ検証
      if (summaryResult.totalAmount < 0 || summaryResult.totalBookings < 0) {
        throw new Error('データ整合性エラー: 負の値が検出されました')
      }

      setMenuSummary(summaryResult as EnterpriseMenuSummary)
      setMenuRanking(rankingResult)
      setPerformanceAnalysis(performanceResult)
      setPriceTierAnalysis(priceTierResult)

      // パフォーマンス監視（3,000店舗運用向け）
      if (executionTime > 5000) {
        console.warn('[Enterprise] Performance warning: Data fetch took longer than 5 seconds:', {
          executionTime,
          tenantId: filters.tenantId,
          dataSize: {
            menuCount: rankingResult.length,
            dateRange: Math.ceil(
              (filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) /
                (1000 * 60 * 60 * 24)
            ),
          },
        })
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'メニュー分析データの取得に失敗しました'
      setError(errorMessage)

      // エンタープライズレベルのエラーログ
      console.error('[Enterprise] Menu analytics fetch error:', {
        error: err,
        tenantId: filters.tenantId,
        orgId: filters.orgId,
        executionTime: performance.now() - startTime,
        timestamp: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }, [repository, filters])

  // フィルター変更時のデータ再取得
  useEffect(() => {
    if (filters && repository) {
      fetchData()
    }
  }, [filters, repository, fetchData])

  const REFRESH_INTERVAL = 5000 // 5秒
  const handleRefresh = async () => {
    if (isRefreshing || isInterval) return
    try {
      setIsRefreshing(true)
      await fetchData()
      toast.success('データを更新しました')
    } catch (err) {
      showErrorToast(err)
    } finally {
      setIsRefreshing(false)
      setIsInterval(true)
      setTimeout(() => {
        setIsInterval(false)
      }, REFRESH_INTERVAL)
    }
  }

  const buttonText = useMemo(() => {
    if (isRefreshing) return '更新中...'
    if (isInterval) return '待機中'
    return '更新'
  }, [isRefreshing, isInterval])

  // ローディング表示
  if (!isLoaded || !tenantId || !orgId) {
    return (
      <DashboardSection
        title="メニュー別売上分析"
        backLink="/dashboard"
        backLinkTitle="ダッシュボード"
      >
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
      <DashboardSection
        title="メニュー別売上分析"
        backLink="/dashboard"
        backLinkTitle="ダッシュボード"
      >
        <div>フィルターを初期化中...</div>
      </DashboardSection>
    )
  }

  // 重要指標のサマリーカード
  const summaryCards = [
    {
      id: 'top-menu',
      title: '売上No.1メニュー',
      value: performanceAnalysis?.topPerformers?.[0]?.total_amount || 0,
      icon: <Award className="w-4 h-4" />,
      valueFormatter: (value: string | number) => `¥${Number(value).toLocaleString()}`,
      subtitle: `🏆 ${performanceAnalysis?.topPerformers?.[0]?.menu_name || '集計中...'}`,
    },
    {
      id: 'average-menu-amount',
      title: 'メニュー平均売上',
      value: performanceAnalysis?.averagePerformance?.averageAmount || 0,
      icon: <BarChart3 className="w-4 h-4" />,
      valueFormatter: (value: string | number) => `¥${Number(value).toLocaleString()}`,
      subtitle: `この値を上回れば平均以上`,
    },
    {
      id: 'average-price-tier',
      title: '平均メニュー価格',
      value: priceTierAnalysis?.insights?.averageMenuPrice || 0,
      icon: <DollarSign className="w-4 h-4" />,
      valueFormatter: (value: string | number) => `¥${Number(value).toLocaleString()}`,
      subtitle: `価格設定の基準値`,
    },
    {
      id: 'active-menu-count',
      title: 'アクティブメニュー数',
      value: menuSummary?.activeMenuCount || 0,
      icon: <Package className="w-4 h-4" />,
      valueFormatter: (value: string | number) => `${Number(value)}品目`,
      subtitle: `売上実績のあるメニュー`,
    },
  ]

  // パフォーマンス分布用のパイチャートデータ
  const performanceDistributionData = performanceAnalysis
    ? [
        {
          name: '平均以上',
          value: performanceAnalysis.performanceDistribution.high,
          fill: '#10b981',
          percentage:
            (performanceAnalysis.performanceDistribution.high /
              (performanceAnalysis.performanceDistribution.high +
                performanceAnalysis.performanceDistribution.medium +
                performanceAnalysis.performanceDistribution.low)) *
            100,
        },
        {
          name: '平均の50-100%',
          value: performanceAnalysis.performanceDistribution.medium,
          fill: '#f59e0b',
          percentage:
            (performanceAnalysis.performanceDistribution.medium /
              (performanceAnalysis.performanceDistribution.high +
                performanceAnalysis.performanceDistribution.medium +
                performanceAnalysis.performanceDistribution.low)) *
            100,
        },
        {
          name: '平均の50%未満',
          value: performanceAnalysis.performanceDistribution.low,
          fill: '#ef4444',
          percentage:
            (performanceAnalysis.performanceDistribution.low /
              (performanceAnalysis.performanceDistribution.high +
                performanceAnalysis.performanceDistribution.medium +
                performanceAnalysis.performanceDistribution.low)) *
            100,
        },
      ].filter((item) => item.value > 0)
    : []

  // 価格帯別パフォーマンスデータ
  const priceTierChartData =
    priceTierAnalysis?.priceTiers.map((tier, index) => ({
      name: tier.tier,
      revenue: tier.totalAmount,
      bookings: tier.bookingCount,
      menuCount: tier.menuCount,
      fill: ['#3b82f6', '#10b981', '#f59e0b'][index] || '#64748b',
    })) || []

  return (
    <DashboardSection
      title="メニュー別売上分析"
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
        <div className="relative">
          <AnalyticsFilters
            filters={filters}
            onFiltersChange={setFilters}
            loading={loading}
            showStaffFilter={false}
            showMenuFilter={true}
            type="monthly"
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
        <SummaryCardGrid
          cards={summaryCards.map((card, index) => ({
            ...card,
            id: `summary-card-${index}`,
          }))}
          loading={loading}
          columns={1}
        />

        {/* タブ式のダッシュボード */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-fit flex justify-center gap-4">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="pricing">価格帯分析</TabsTrigger>
            <TabsTrigger value="performance">パフォーマンス</TabsTrigger>
          </TabsList>

          {/* 概要タブ */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* メニュー売上ランキング */}
              <BarChart
                data={menuRanking.slice(0, 10).map((item) => ({
                  name: item.name,
                  value: item.value,
                  label: `¥${item.value.toLocaleString()}`,
                }))}
                title="メニュー売上ランキング（Top 10）"
                description="期間内の売上額でソートされたメニューランキング"
                height={400}
                horizontal={true}
                maxBars={10}
              />

              {/* 詳細ランキング */}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    メニュー売上詳細ランキング
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">全メニューの売上実績一覧</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {menuRanking.length > 0 ? (
                      menuRanking.map((menu, index) => (
                        <div
                          key={`menu-ranking-${menu.id}-${index}`}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={index < 3 ? 'default' : 'secondary'}
                              className={`w-8 h-8 flex items-center justify-center rounded-full ${
                                index === 0
                                  ? 'bg-blue-600 text-blue-100'
                                  : index === 1
                                    ? 'bg-emerald-600 text-emerald-100'
                                    : index === 2
                                      ? 'bg-yellow-600 text-yellow-200'
                                      : ''
                              }`}
                            >
                              {index + 1}
                            </Badge>
                            <div>
                              <p className="font-bold">{menu.name}</p>
                              <p className="text-xs font-semibold text-accent-2">
                                {(() => {
                                  // performanceAnalysisから該当メニューの予約数を取得
                                  const menuDetail = performanceAnalysis?.topPerformers?.find(
                                    (performer) => performer.menu_name === menu.name
                                  )
                                  const bookings = menuDetail?.booking_count || 0
                                  const amount = menuDetail?.total_amount || menu.value

                                  // 予約数が0の場合の処理
                                  if (bookings === 0) {
                                    return `予約データなし`
                                  }

                                  // 平均単価を計算
                                  const avgAmount = Math.round(amount / bookings)
                                  return `${bookings}件の注文 | 平均単価 - ¥${avgAmount.toLocaleString()}`
                                })()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">¥{menu.value.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">
                              売り上げ全体の<strong>{menu.percentage.toFixed(1)}%</strong>
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="min-h-96 flex items-center justify-center pt-4">
                        <p className="text-center text-muted-foreground text-sm">
                          データがありません
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          {/* 価格帯分析タブ */}
          <TabsContent value="pricing" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 価格帯別売上チャート */}
              {priceTierChartData.length > 0 && (
                <BarChart
                  data={priceTierChartData.map((tier) => ({
                    name: tier.name,
                    value: tier.revenue,
                    label: `¥${tier.revenue.toLocaleString()}`,
                  }))}
                  title="価格帯別売上実績"
                  description="価格帯ごとの売上パフォーマンス"
                  height={300}
                />
              )}

              {/* 価格戦略インサイト */}
              {priceTierAnalysis && priceTierAnalysis.insights.mostProfitableTier && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <PieChartIcon className="w-5 h-5" />
                      価格戦略インサイト
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">価格設定の最適化提案</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-link border border-link-foreground rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="w-6 h-6 text-link-foreground" />{' '}
                          <span className="text-sm font-medium">売上No.1価格帯</span>
                        </div>
                        <div className="text-lg font-bold mb-1">
                          {priceTierAnalysis.insights.mostProfitableTier}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          最も高い売上を上げている価格帯です。この価格帯のメニューを増やすことを検討してください。
                        </p>
                      </div>

                      <div className="p-4 bg-neon-foreground border border-neon rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-neon rounded-full"></div>
                          <span className="text-sm font-medium">人気No.1価格帯</span>
                        </div>
                        <div className="text-lg font-bold mb-1">
                          {priceTierAnalysis.insights.mostPopularTier}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          最も予約数が多い価格帯です。お客様に受け入れられやすい価格設定の参考にしてください。
                        </p>
                      </div>

                      <div className="p-4 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          <strong>💼 戦略提案:</strong>
                          {priceTierAnalysis.insights.mostProfitableTier !==
                          priceTierAnalysis.insights.mostPopularTier
                            ? ' 人気価格帯のメニューを売上の高い価格帯にアップグレードする施策を検討してみてください。'
                            : ' 売上No.1と人気No.1が一致しており、バランスの良い価格設定です。'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 価格帯詳細テーブル */}
            {priceTierAnalysis && priceTierAnalysis.priceTiers.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">価格帯別詳細データ</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">価格帯</th>
                          <th className="text-right p-2">メニュー数</th>
                          <th className="text-right p-2">総売上</th>
                          <th className="text-right p-2">予約数</th>
                          <th className="text-right p-2">平均売上</th>
                        </tr>
                      </thead>
                      <tbody>
                        {priceTierAnalysis.priceTiers.map((tier, index) => (
                          <tr key={index} className={`border-b`}>
                            <td className="p-2">
                              <div>
                                <div
                                  className={`font-medium  ${index === 0 ? 'text-link-foreground' : index === 1 ? 'text-neon' : 'text-warning-foreground'}`}
                                >
                                  {tier.tier}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {tier.priceRange}
                                </div>
                              </div>
                            </td>
                            <td className="text-right p-2">{tier.menuCount}品目</td>
                            <td className="text-right p-2">¥{tier.totalAmount.toLocaleString()}</td>
                            <td className="text-right p-2">{tier.bookingCount}件</td>
                            <td className="text-right p-2">
                              ¥{tier.averageAmount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="min-h-56 flex items-center justify-center pt-4 bg-background border border-border  rounded-lg">
                <p className="text-center text-muted-foreground text-sm">データがありません</p>
              </div>
            )}
          </TabsContent>

          {/* パフォーマンス分析タブ */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* メニューパフォーマンス統計 */}
              {performanceAnalysis && performanceAnalysis.performanceDistribution.high > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">メニューパフォーマンス統計</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      メニュー全体の売上パフォーマンス分析
                    </p>
                  </CardHeader>
                  <CardContent>
                    <TooltipProvider>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-muted/30 rounded-lg">
                          <p className="text-2xl font-bold text-chart-1">
                            {performanceAnalysis.performanceDistribution.high}
                          </p>
                          <div className="flex items-center justify-center gap-1">
                            <p className="text-sm text-muted-foreground">平均以上のメニュー</p>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="w-3 h-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">平均売上を上回る成績のメニュー数</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        <div className="text-center p-4 bg-muted/30 rounded-lg">
                          <p className="text-2xl font-bold text-chart-3">
                            ¥{menuSummary?.averageAmount?.toLocaleString() || '0'}
                          </p>
                          <div className="flex items-center justify-center gap-1">
                            <p className="text-sm text-muted-foreground">平均客単価</p>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="w-3 h-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">全体の平均客単価（売上÷予約数）</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        <div className="text-center p-4 bg-muted/30 rounded-lg">
                          <p className="text-2xl font-bold text-chart-4">
                            {(() => {
                              const avgAmount =
                                performanceAnalysis?.averagePerformance?.averageAmount || 1
                              const topMenu =
                                performanceAnalysis?.topPerformers?.[0]?.total_amount || 0
                              const differencePercent = (
                                ((topMenu - avgAmount) / avgAmount) *
                                100
                              ).toFixed(1)
                              return `+${differencePercent}%`
                            })()}
                          </p>
                          <div className="flex items-center justify-center gap-1">
                            <p className="text-sm text-muted-foreground">売上格差指標</p>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="w-3 h-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">トップメニューが平均より高い売上の割合</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        <div className="text-center p-4 bg-muted/30 rounded-lg">
                          <p className="text-2xl font-bold text-chart-5">
                            {performanceAnalysis?.averagePerformance?.averageBookings?.toFixed(1) ||
                              '0'}
                            件
                          </p>
                          <div className="flex items-center justify-center gap-1">
                            <p className="text-sm text-muted-foreground">メニュー平均予約数</p>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="w-3 h-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  メニュー一品あたりの平均予約数（人気度の目安）
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    </TooltipProvider>
                  </CardContent>
                </Card>
              ) : (
                <div className="min-h-96 flex items-center justify-center pt-4 bg-background border border-border  rounded-lg">
                  <p className="text-center text-muted-foreground text-sm">データがありません</p>
                </div>
              )}

              {/* パフォーマンス分布 */}
              {performanceDistributionData.length > 0 && (
                <PieChart
                  data={performanceDistributionData}
                  title="メニューパフォーマンス分布"
                  description="平均売上を基準とした分布"
                  height={400}
                  innerRadius={60}
                  showLabels={true}
                  showPercentage={true}
                  valueFormatter={(value) => `${value}品目`}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardSection>
  )
}