'use client'

import { toast } from 'sonner'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { Loader2, RefreshCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { startOfMonth, endOfMonth } from 'date-fns'
import { Users, Award, BarChart3 } from 'lucide-react'
import type {
  SalesSummary,
  RankingData,
  PeriodComparisonData,
  StaffSalesData,
} from '@/services/supabase/repositories/analytics/types'

// エンタープライズレベルの型定義
type EnterpriseStaffSummary = SalesSummary & {
  topStaff: StaffSalesData | null
  activeStaffCount: number
}

type StaffPerformanceAnalysis = {
  topPerformers: StaffSalesData[]
  averagePerformance: {
    averageAmount: number
    averageBookings: number
    medianAmount: number
  }
  performanceDistribution: {
    high: number
    medium: number
    low: number
  }
  additionalStats: {
    topPerformerRatio: number
    averageBookingValue: number
    performanceVariance: number
    consistencyScore: number
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

import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { StaffSalesRepository } from '@/services/supabase/repositories/analytics'

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

  console.log('[Staff Analytics] Initial date range setup:', {
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
 * スタッフ別売上分析ページ
 */
export default function StaffAnalyticsPage() {
  const { tenantId, orgId, isLoaded } = useTenantAndOrganization()

  // 状態管理
  const [filters, setFilters] = useState<FilterOptions | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isInterval, setIsInterval] = useState(false)
  const { showErrorToast } = useErrorHandler()

  // データ状態（エンタープライズレベル対応）
  const [staffSummary, setStaffSummary] = useState<EnterpriseStaffSummary | null>(null)
  const [staffRanking, setStaffRanking] = useState<RankingData[]>([])
  const [performanceComparison, setPerformanceComparison] =
    useState<StaffPerformanceAnalysis | null>(null)
  const [periodComparison, setPeriodComparison] = useState<PeriodComparisonData | null>(null)

  // リポジトリインスタンス
  const repository = useMemo(() => {
    if (!tenantId || !orgId) return null
    return new StaffSalesRepository()
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
      console.log('[Enterprise] Starting staff analytics data fetch for tenant:', {
        tenantId: filters.tenantId,
        orgId: filters.orgId,
        dateRange: {
          from: filters.dateRange.from.toISOString().split('T')[0],
          to: filters.dateRange.to.toISOString().split('T')[0],
        },
        staffCount: filters.staffIds?.length || 0,
      })

      // 並列実行でパフォーマンス最適化（大規模SaaS向け）
      const [summaryResult, rankingResult, performanceResult, comparisonResult] = await Promise.all(
        [
          repository.getStaffSummary(filters).catch((err) => {
            console.error('[Enterprise] Staff summary fetch failed:', err)
            throw new Error(`売上サマリー取得エラー: ${err.message}`)
          }),
          repository.getStaffRanking(filters, 15).catch((err) => {
            console.error('[Enterprise] Staff ranking fetch failed:', err)
            throw new Error(`ランキング取得エラー: ${err.message}`)
          }),
          repository.getStaffPerformanceComparison(filters).catch((err) => {
            console.error('[Enterprise] Performance comparison fetch failed:', err)
            throw new Error(`パフォーマンス分析エラー: ${err.message}`)
          }),
          repository.getPeriodComparison(filters).catch((err) => {
            console.error('[Enterprise] Period comparison fetch failed:', err)
            throw new Error(`期間比較エラー: ${err.message}`)
          }),
          repository.getStaffSales(filters).catch((err) => {
            console.error('[Enterprise] Staff sales fetch failed:', err)
            throw new Error(`スタッフ売上取得エラー: ${err.message}`)
          }),
        ]
      )

      const executionTime = performance.now() - startTime
      console.log('[Enterprise] Staff analytics data fetch completed:', {
        executionTime: Math.round(executionTime),
        summaryData: {
          totalAmount: summaryResult.totalAmount,
          totalBookings: summaryResult.totalBookings,
          activeStaffCount: summaryResult.activeStaffCount,
        },
        rankingCount: rankingResult.length,
        performanceMetrics: performanceResult.additionalStats,
      })

      // エンタープライズレベルのデータ検証
      if (summaryResult.totalAmount < 0 || summaryResult.totalBookings < 0) {
        throw new Error('データ整合性エラー: 負の値が検出されました')
      }

      setStaffSummary(summaryResult as EnterpriseStaffSummary)
      setStaffRanking(rankingResult)
      setPerformanceComparison(performanceResult)
      setPeriodComparison(comparisonResult)

      // パフォーマンス監視（3,000店舗運用向け）
      if (executionTime > 5000) {
        console.warn('[Enterprise] Performance warning: Data fetch took longer than 5 seconds:', {
          executionTime,
          tenantId: filters.tenantId,
          dataSize: {
            staffCount: rankingResult.length,
            dateRange: Math.ceil(
              (filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) /
                (1000 * 60 * 60 * 24)
            ),
          },
        })
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'スタッフ分析データの取得に失敗しました'
      setError(errorMessage)

      // エンタープライズレベルのエラーログ
      console.error('[Enterprise] Staff analytics fetch error:', {
        error: err,
        tenantId: filters.tenantId,
        orgId: filters.orgId,
        executionTime: performance.now() - startTime,
        timestamp: new Date().toISOString(),
      })

      // Sentry連携想定（本番環境では有効化）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).Sentry.captureException(err, {
          tags: {
            component: 'StaffAnalytics',
            operation: 'dataFetch',
            tenantId: filters.tenantId,
          },
          extra: {
            filters,
            executionTime: performance.now() - startTime,
          },
        })
      }
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

  console.log('performanceComparison', performanceComparison?.topPerformers)

  // ローディング表示
  if (!isLoaded || !tenantId || !orgId) {
    return (
      <DashboardSection
        title="スタッフ別売上分析"
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
        title="スタッフ別売上分析"
        backLink="/dashboard"
        backLinkTitle="ダッシュボード"
      >
        <div>フィルターを初期化中...</div>
      </DashboardSection>
    )
  }

  console.log('periodComparison', periodComparison)

  // 基本的な2つの重要指標のみ表示
  const summaryCards = [
    {
      id: 'team-average-amount',
      title: 'スタッフ平均売上',
      value: performanceComparison?.averagePerformance?.averageAmount || 0,
      icon: <BarChart3 className="w-4 h-4" />,
      valueFormatter: (value: string | number) => `¥${Number(value).toLocaleString()}`,
      subtitle: `この値を上回れば平均以上`,
      change: periodComparison
        ? {
            value: periodComparison.growth.amount_percentage,
            label: '前期間比',
          }
        : undefined,
    },
    {
      id: 'team-average-amount',
      title: 'スタッフ平均予約数',
      value: performanceComparison?.averagePerformance?.averageBookings || 0,
      icon: <Users className="w-4 h-4" />,
      valueFormatter: (value: string | number) => `${Number(value).toLocaleString()}件`,
      subtitle: `この値を上回れば平均以上`,
      change: periodComparison
        ? {
            value: periodComparison.growth.booking_percentage,
            label: '前期間比',
          }
        : undefined,
    },
    {
      id: 'team-average-amount',
      title: '総予約数',
      value: staffSummary?.totalBookings ?? 0,
      valueFormatter: (value: string | number) => `${Number(value).toLocaleString()}件`,
      icon: <Users className="w-4 h-4" />,
    },
  ]

  console.log('staffSummary', staffSummary)
  console.log('performanceComparison', performanceComparison)

  // パフォーマンス分布用のパイチャートデータ
  const performanceDistributionData = performanceComparison
    ? [
        {
          name: '平均以上',
          value: performanceComparison.performanceDistribution.high,
          fill: '#10b981',
          percentage:
            (performanceComparison.performanceDistribution.high /
              (performanceComparison.performanceDistribution.high +
                performanceComparison.performanceDistribution.medium +
                performanceComparison.performanceDistribution.low)) *
            100,
        },
        {
          name: '平均の50-100%',
          value: performanceComparison.performanceDistribution.medium,
          fill: '#f59e0b',
          percentage:
            (performanceComparison.performanceDistribution.medium /
              (performanceComparison.performanceDistribution.high +
                performanceComparison.performanceDistribution.medium +
                performanceComparison.performanceDistribution.low)) *
            100,
        },
        {
          name: '平均の50%未満',
          value: performanceComparison.performanceDistribution.low,
          fill: '#ef4444',
          percentage:
            (performanceComparison.performanceDistribution.low /
              (performanceComparison.performanceDistribution.high +
                performanceComparison.performanceDistribution.medium +
                performanceComparison.performanceDistribution.low)) *
            100,
        },
      ].filter((item) => item.value > 0)
    : []

  console.log('staffSummary', staffSummary)
  console.log('staffRanking', staffRanking)
  console.log('performanceComparison', performanceComparison)
  console.log('periodComparison', periodComparison)

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
        <div className="relative">
          <AnalyticsFilters
            filters={filters}
            onFiltersChange={setFilters}
            loading={loading}
            showMenuFilter={false}
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
          columns={3}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 棒グラフ */}
          <BarChart
            data={staffRanking.slice(0, 10).map((item) => ({
              name: item.name,
              value: item.value,
              label: `¥${item.value.toLocaleString()}`,
            }))}
            title="スタッフ売上ランキング（Top 10）"
            description="期間内の売上額でソートされたスタッフランキング"
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
            <CardContent className="flex items-center justify-center">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {staffRanking.length > 0 ? (
                  staffRanking.map((staff, index) => (
                    <div
                      key={`staff-ranking-${staff.id}-${index}`}
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
                          <p className="font-bold">{staff.name}</p>
                          <p className="text-xs font-semibold  text-accent-2">
                            {(() => {
                              // performanceComparisonから該当スタッフの予約数を取得
                              const staffDetail = performanceComparison?.topPerformers?.find(
                                (performer) => performer.staff_name === staff.name
                              )
                              const bookings = staffDetail?.booking_count || 0
                              const amount = staffDetail?.total_amount || staff.value

                              // 予約数が0の場合の処理
                              if (bookings === 0) {
                                return `予約データなし`
                              }

                              // 平均客単価を計算
                              const avgAmount = Math.round(amount / bookings)
                              return `${bookings}件の施術 | 平均単価 - ¥${avgAmount.toLocaleString()}`
                            })()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">¥{staff.value.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          売り上げ全体の<strong>{staff.percentage.toFixed(1)}%</strong>
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="min-h-96 flex items-center justify-center pt-12">
                    <p className="text-center text-muted-foreground text-sm">データがありません</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* パフォーマンス分布チャート */}
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

          {/* チーム戦略インサイト */}
          {performanceComparison && staffRanking.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  チーム戦略インサイト
                </CardTitle>
                <p className="text-sm text-muted-foreground">スタッフパフォーマンスの最適化提案</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* トップパフォーマー分析 */}
                  <div className="p-4 bg-link border border-link-foreground rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-6 h-6 text-link-foreground" />{' '}
                      <span className="text-sm font-medium">売上No.1スタッフ</span>
                    </div>
                    <div className="text-lg font-bold mb-1 ">
                      {performanceComparison.topPerformers?.[0]?.staff_name}さん
                    </div>
                    <p className="text-sm text-accent mb-2 font-bold">
                      ¥{performanceComparison.topPerformers?.[0]?.total_amount?.toLocaleString()}（
                      {performanceComparison.topPerformers?.[0]?.booking_count}件の施術）
                    </p>
                    <p className="text-xs text-muted-foreground">
                      チームの売上を牽引しています。このスタッフの施術技術やサービス手法を他のスタッフと共有することを検討してください。
                    </p>
                  </div>

                  {/* チーム効率性分析 */}
                  <div className="p-4 bg-neon-foreground border border-neon rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-neon rounded-full"></div>
                      <span className="text-sm font-medium">チーム効率性スコア</span>
                    </div>
                    <div className="text-lg font-bold mb-1">
                      {(() => {
                        const highPerformers = performanceComparison.performanceDistribution.high
                        const totalStaff =
                          highPerformers +
                          performanceComparison.performanceDistribution.medium +
                          performanceComparison.performanceDistribution.low
                        const efficiencyScore =
                          totalStaff > 0 ? Math.round((highPerformers / totalStaff) * 100) : 0
                        return `${efficiencyScore}点`
                      })()}
                      <span className="text-sm text-muted-foreground ml-1">/100点</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const highPerformers = performanceComparison.performanceDistribution.high
                        const totalStaff =
                          highPerformers +
                          performanceComparison.performanceDistribution.medium +
                          performanceComparison.performanceDistribution.low
                        const efficiencyScore =
                          totalStaff > 0 ? Math.round((highPerformers / totalStaff) * 100) : 0

                        if (efficiencyScore >= 70) {
                          return '優秀なチーム効率性です。現在の体制を維持し、更なる成長に向けて投資を検討してください。'
                        } else if (efficiencyScore >= 50) {
                          return '平均的なチーム効率性です。研修やメンタリング制度の導入を検討してください。'
                        } else {
                          return 'チーム効率性に改善の余地があります。個別指導や技術向上支援が必要です。'
                        }
                      })()}
                    </p>
                  </div>

                  {/* 客単価戦略 */}
                  <div className="p-4 bg-warning border border-warning-foreground rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-warning-foreground rounded-full"></div>
                      <span className="text-sm font-medium">客単価最適化提案</span>
                    </div>
                    <div className="text-lg font-bold mb-1">
                      ¥{staffSummary?.averageAmount?.toLocaleString() || '0'}
                      <span className="text-sm text-muted-foreground ml-1">
                        （現在の平均客単価）
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const avgAmount = staffSummary?.averageAmount || 0
                        if (avgAmount >= 8000) {
                          return '高い客単価を維持しています。プレミアムサービスの拡充で更なる向上を目指しましょう。'
                        } else if (avgAmount >= 5000) {
                          return '平均的な客単価です。オプションメニューの提案やアップセル技術の向上で客単価向上を図りましょう。'
                        } else {
                          return '客単価に改善の余地があります。メニュー構成の見直しや価格戦略の再検討を推奨します。'
                        }
                      })()}
                    </p>
                  </div>

                  {/* 総合戦略提案 */}
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong>💼 総合戦略提案:</strong>
                      {(() => {
                        const highPerformers = performanceComparison.performanceDistribution.high
                        const mediumPerformers =
                          performanceComparison.performanceDistribution.medium
                        const lowPerformers = performanceComparison.performanceDistribution.low
                        const totalStaff = highPerformers + mediumPerformers + lowPerformers
                        const topStaffAmount =
                          performanceComparison.topPerformers?.[0]?.total_amount || 0
                        const avgAmount =
                          performanceComparison.averagePerformance?.averageAmount || 1
                        const performanceGap = ((topStaffAmount - avgAmount) / avgAmount) * 100

                        if (performanceGap > 50 && lowPerformers > 0) {
                          return ' スタッフ間の売上格差が大きいです。トップパフォーマーによるメンタリング制度の導入と、定期的なスキルアップ研修を実施することを推奨します。'
                        } else if (highPerformers >= totalStaff * 0.6) {
                          return ' 優秀なチーム構成です。現在の高いパフォーマンスを維持しながら、新人育成体制の強化で更なる成長を目指しましょう。'
                        } else if (mediumPerformers >= totalStaff * 0.6) {
                          return ' 安定したチーム構成です。中堅スタッフのスキルアップ支援と、モチベーション向上施策の実施を検討してください。'
                        } else {
                          return ' チーム全体のパフォーマンス向上が急務です。基礎技術研修の強化と、個別指導体制の確立を最優先で進めてください。'
                        }
                      })()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardSection>
  )
}
