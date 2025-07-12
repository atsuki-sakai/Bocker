'use client'

import { useState, useCallback, useEffect } from 'react'
import { subDays } from 'date-fns'
import { DashboardSection } from '@/components/common'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { MenuSalesRepository } from '@/services/supabase/repositories/analytics/MenuSalesRepository'
import {
  FilterOptions,
  MenuSalesData,
  SalesSummary,
  RankingData,
  BarChartDataPoint,
  SelectOption,
} from '@/services/supabase/repositories/analytics/types'
import { AnalyticsFilters } from '@/components/analytics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  TrendingUpIcon,
  DollarSignIcon,
  ShoppingCartIcon,
  UserIcon,
  BarChart3Icon,
  PieChartIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Link } from '@/i18n/navigation'

interface MenuAnalyticsSummary extends SalesSummary {
  topMenu: MenuSalesData | null
  activeMenuCount: number
}

interface MenuPerformanceAnalysis {
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

interface PriceTierAnalysis {
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

const CHART_COLORS = [
  'oklch(var(--chart-1))',
  'oklch(var(--chart-2))',
  'oklch(var(--chart-3))',
  'oklch(var(--chart-4))',
  'oklch(var(--chart-5))',
]

const PERFORMANCE_COLORS = {
  high: '#10b981', // 成功カラー（高性能）
  medium: '#f59e0b', // 警告カラー（中性能）
  low: '#ef4444', // 危険カラー（低性能）
}

export default function MenuAnalyticsPage() {
  const { tenantId, orgId } = useTenantAndOrganization()
  const [filters, setFilters] = useState<FilterOptions>({
    tenantId: tenantId || '',
    orgId: orgId || '',
    dateRange: {
      from: subDays(new Date(), 30),
      to: subDays(new Date(), 1), // 昨日までに変更
    },
    menuIds: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [summary, setSummary] = useState<MenuAnalyticsSummary | null>(null)
  const [menuRanking, setMenuRanking] = useState<RankingData[]>([])
  const [chartData, setChartData] = useState<BarChartDataPoint[]>([])
  const [menuOptions, setMenuOptions] = useState<SelectOption[]>([])
  const [performanceAnalysis, setPerformanceAnalysis] = useState<MenuPerformanceAnalysis | null>(
    null
  )
  const [priceTierAnalysis, setPriceTierAnalysis] = useState<PriceTierAnalysis | null>(null)

  const fetchData = useCallback(async () => {
    if (!filters.tenantId || !filters.orgId || !filters.dateRange?.from || !filters.dateRange?.to) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('[MenuAnalyticsPage] Fetching data with filters:', filters)

      const repository = new MenuSalesRepository()

      // Fetch all data in parallel
      const [
        summaryData,
        rankingData,
        chartDataResult,
        menuOptionsData,
        performanceData,
        priceTierData,
      ] = await Promise.all([
        repository.getMenuSummary(filters),
        repository.getMenuRanking(filters, 10),
        repository.getChartData(filters, 10),
        repository.getMenuOptions(filters.tenantId, filters.orgId),
        repository.getMenuPerformanceAnalysis(filters),
        repository.getPriceTierAnalysis(filters),
      ])

      console.log('[MenuAnalyticsPage] Data fetched successfully:', {
        summaryData,
        rankingData: rankingData.length,
        chartData: chartDataResult.length,
        menuOptions: menuOptionsData.length,
        performanceData,
        priceTierData,
      })

      setSummary(summaryData)
      setMenuRanking(rankingData)
      setChartData(chartDataResult)
      setMenuOptions(menuOptionsData)
      setPerformanceAnalysis(performanceData)
      setPriceTierAnalysis(priceTierData)
    } catch (err) {
      console.error('[MenuAnalyticsPage] Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    if (tenantId && orgId && filters.tenantId !== tenantId) {
      setFilters((prev) => ({
        ...prev,
        tenantId,
        orgId,
      }))
    }
  }, [tenantId, orgId, filters.tenantId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters)
  }

  const handleRefresh = () => {
    fetchData()
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount)
  }

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ja-JP').format(num)
  }

  const getPerformanceDistributionData = () => {
    if (!performanceAnalysis) return []

    const { performanceDistribution } = performanceAnalysis
    return [
      { name: '高性能', value: performanceDistribution.high, color: PERFORMANCE_COLORS.high },
      { name: '中性能', value: performanceDistribution.medium, color: PERFORMANCE_COLORS.medium },
      { name: '低性能', value: performanceDistribution.low, color: PERFORMANCE_COLORS.low },
    ].filter((item) => item.value > 0)
  }

  // 性能レベル別のメニューリストを取得
  const getMenusByPerformance = () => {
    if (!performanceAnalysis) return { high: [], medium: [], low: [] }

    const averageAmount = performanceAnalysis.averagePerformance.averageAmount
    const menus = performanceAnalysis.topPerformers

    const high = menus.filter((menu) => menu.total_amount >= averageAmount)
    const medium = menus.filter(
      (menu) => menu.total_amount >= averageAmount * 0.5 && menu.total_amount < averageAmount
    )
    const low = menus.filter((menu) => menu.total_amount < averageAmount * 0.5)

    return { high, medium, low }
  }

  const getPriceTierChartData = () => {
    if (!priceTierAnalysis) return []

    return priceTierAnalysis.priceTiers.map((tier, index) => ({
      name: `${tier.tier}\n(${tier.priceRange})`,
      revenue: tier.totalAmount,
      bookings: tier.bookingCount,
      menuCount: tier.menuCount,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))
  }

  if (error) {
    return (
      <DashboardSection
        title="メニュー別売り上げ分析"
        backLink="/dashboard"
        backLinkTitle="ダッシュボード"
      >
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </DashboardSection>
    )
  }

  return (
    <DashboardSection
      title="メニュー別売り上げ分析"
      backLink="/dashboard"
      backLinkTitle="ダッシュボード"
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <AnalyticsFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              menuOptions={menuOptions}
              loading={loading}
              showStaffFilter={false}
              showMenuFilter={true}
            />
            <div className="absolute top-2 right-2">
              <div className="flex items-end">
                <Button onClick={handleRefresh} variant="outline" size="sm">
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                  更新
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総売上</CardTitle>
              <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(summary?.totalAmount || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">期間中の総メニュー売上</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総予約数</CardTitle>
              <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatNumber(summary?.totalBookings || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">期間中の総メニュー予約数</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均客単価</CardTitle>
              <UserIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(summary?.averageAmount || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">1予約あたりの平均売上</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">アクティブメニュー数</CardTitle>
              <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatNumber(summary?.activeMenuCount || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">売上のあるメニュー数</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Menu */}
        {summary?.topMenu && performanceAnalysis && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUpIcon className="h-5 w-5" />
                パフォーマンス分析サマリー
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* トップメニュー */}
                <div className="p-4 bg-palette-1 border border-palette-1 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUpIcon className="h-5 w-5 text-palette-1-foreground" />
                      <h4 className="font-semibold text-palette-1-foreground">売上No.1メニュー</h4>
                    </div>
                    <Badge variant="default" className="bg-pop text-pop-foreground">
                      No.1
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold text-palette-1-foreground mb-2">
                    {summary.topMenu.menu_name}
                  </h3>
                  <div className="space-y-1 text-sm text-palette-1-foreground">
                    <p>
                      <strong>売上:</strong> {formatCurrency(summary.topMenu.total_amount)}
                    </p>
                    <p>
                      <strong>予約数:</strong> {formatNumber(summary.topMenu.booking_count)}件
                    </p>
                    <p>
                      <strong>平均単価:</strong> {formatCurrency(summary.topMenu.average_amount)}
                    </p>
                  </div>
                </div>

                {/* 平均売上 */}
                <div className="p-4 bg-palette-2 border border-palette-2 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSignIcon className="h-5 w-5 text-palette-2-foreground" />
                    <h4 className="font-semibold text-palette-2-foreground">平均売上</h4>
                  </div>
                  <p className="text-2xl font-bold text-palette-2-foreground mb-1">
                    {formatCurrency(performanceAnalysis.averagePerformance.averageAmount)}
                  </p>
                  <p className="text-sm text-palette-2-foreground">1メニューあたりの平均売上</p>
                </div>

                {/* 平均予約数 */}
                <div className="p-4 bg-palette-3 border border-palette-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingCartIcon className="h-5 w-5 text-palette-3-foreground" />
                    <h4 className="font-semibold text-palette-3-foreground">平均予約数</h4>
                  </div>
                  <p className="text-2xl font-bold text-palette-3-foreground mb-1">
                    {formatNumber(performanceAnalysis.averagePerformance.averageBookings)}
                  </p>
                  <p className="text-sm text-palette-3-foreground">1メニューあたりの平均予約数</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Menu Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3Icon className="h-5 w-5" />
                メニュー別売上ランキング
              </CardTitle>
              <CardDescription>トップ10メニューの売上実績</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px]" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => formatCurrency(value)}
                      tick={{ fill: '#374151', fontSize: 10 }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={80}
                      tick={{ fill: '#374151', fontSize: 6, fontWeight: 'bold' }}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), '売上']}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                      }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  データがありません
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                メニューパフォーマンス分布
              </CardTitle>
              <CardDescription>売上実績による性能分類</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px]" />
              ) : performanceAnalysis && getPerformanceDistributionData().length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* メニューリスト */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">📊 パフォーマンス別メニュー</h4>
                    {(() => {
                      const menusByPerformance = getMenusByPerformance()
                      return (
                        <div className="space-y-3 max-h-54 overflow-y-auto">
                          {/* 高性能メニュー */}
                          {menusByPerformance.high.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-3 h-3 rounded-full bg-success"></div>
                                <span className="text-xs font-medium">
                                  高性能 ({menusByPerformance.high.length}件)
                                </span>
                              </div>
                              <div className="space-y-1">
                                {menusByPerformance.high.slice(0, 2).map((menu, index) => (
                                  <div
                                    key={index}
                                    className="flex justify-between items-center p-1.5 bg-palette-3 rounded text-xs"
                                  >
                                    <span className="font-medium text-palette-3-foreground truncate text-xs">
                                      {menu.menu_name || 'メニュー名不明'}
                                    </span>
                                    <span className="text-palette-3-foreground ml-1 text-xs">
                                      {formatCurrency(menu.total_amount)}
                                    </span>
                                  </div>
                                ))}
                                {menusByPerformance.high.length > 2 && (
                                  <div className="text-xs text-muted-foreground text-center">
                                    +{menusByPerformance.high.length - 2}件
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 中性能メニュー */}
                          {menusByPerformance.medium.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-3 h-3 rounded-full bg-warning"></div>
                                <span className="text-xs font-medium">
                                  中性能 ({menusByPerformance.medium.length}件)
                                </span>
                              </div>
                              <div className="space-y-1">
                                {menusByPerformance.medium.slice(0, 2).map((menu, index) => (
                                  <div
                                    key={index}
                                    className="flex justify-between items-center p-1.5 bg-palette-1 rounded text-xs"
                                  >
                                    <span className="font-medium text-palette-1-foreground truncate text-xs">
                                      {menu.menu_name || 'メニュー名不明'}
                                    </span>
                                    <span className="text-palette-1-foreground ml-1 text-xs">
                                      {formatCurrency(menu.total_amount)}
                                    </span>
                                  </div>
                                ))}
                                {menusByPerformance.medium.length > 2 && (
                                  <div className="text-xs text-muted-foreground text-center">
                                    +{menusByPerformance.medium.length - 2}件
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 低性能メニュー */}
                          {menusByPerformance.low.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-3 h-3 rounded-full bg-destructive"></div>
                                <span className="text-xs font-medium">
                                  低性能 ({menusByPerformance.low.length}件)
                                </span>
                              </div>
                              <div className="space-y-1">
                                {menusByPerformance.low.slice(0, 2).map((menu, index) => (
                                  <div
                                    key={index}
                                    className="flex justify-between items-center p-1.5 bg-destructive-foreground rounded text-xs"
                                  >
                                    <span className="font-medium text-destructive truncate text-xs">
                                      {menu.menu_name || 'メニュー名不明'}
                                    </span>
                                    <span className="text-destructive ml-1 text-xs">
                                      {formatCurrency(menu.total_amount)}
                                    </span>
                                  </div>
                                ))}
                                {menusByPerformance.low.length > 2 && (
                                  <div className="text-xs text-muted-foreground text-center">
                                    +{menusByPerformance.low.length - 2}件
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>

                  {/* 円グラフ */}
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={getPerformanceDistributionData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) =>
                          `${name}: ${value}件 (${((percent ?? 0) * 100).toFixed(1)}%)`
                        }
                        outerRadius={40}
                        fill="#8884d8"
                        fontSize={8}
                        dataKey="value"
                      >
                        {getPerformanceDistributionData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [value, 'メニュー数']}
                        labelStyle={{ color: 'oklch(var(--foreground))' }}
                        contentStyle={{
                          backgroundColor: 'oklch(var(--card))',
                          border: '1px solid oklch(var(--border))',
                          borderRadius: '6px',
                          color: 'oklch(var(--card-foreground))',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  データがありません
                </div>
              )}

              {/* 分類ルールの説明 */}
              {performanceAnalysis &&
                getPerformanceDistributionData().length > 0 &&
                (() => {
                  const menusByPerformance = getMenusByPerformance()
                  return (
                    <div className="mt-4">
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                          <AccordionTrigger>
                            <h4 className="text-sm font-medium">
                              📊 パフォーマンス分類ルールと見方について
                            </h4>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3">
                              {/* 高性能メニュー */}
                              {menusByPerformance.high.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: '#10b981' }}
                                    ></div>
                                    <span className="text-sm font-medium">
                                      高性能メニュー ({menusByPerformance.high.length}件)
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-2">
                                    平均売上以上のメニュー（売上貢献度が高い人気商品）
                                  </p>
                                </div>
                              )}

                              {/* 中性能メニュー */}
                              {menusByPerformance.medium.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: '#f59e0b' }}
                                    ></div>
                                    <span className="text-sm font-medium">
                                      中性能メニュー ({menusByPerformance.medium.length}件)
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-2">
                                    平均売上の50-100%のメニュー（標準的な売上）
                                  </p>
                                </div>
                              )}

                              {/* 低性能メニュー */}
                              {menusByPerformance.low.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: '#ef4444' }}
                                    ></div>
                                    <span className="text-sm font-medium">
                                      低性能メニュー ({menusByPerformance.low.length}件)
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-2">
                                    平均売上の50%未満のメニュー（改善検討対象）
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                              💡 <strong>活用方法</strong>:
                              高性能メニューは積極的にプロモーション、低性能メニューは価格見直しや提供方法の改善を検討してください。
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  )
                })()}
            </CardContent>
          </Card>
        </div>

        {/* Price Tier Analysis */}
        {priceTierAnalysis && priceTierAnalysis.priceTiers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSignIcon className="h-5 w-5" />
                価格帯別分析
              </CardTitle>
              <CardDescription>メニューの価格帯別パフォーマンス</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-4">価格帯別実績</h4>
                  {loading ? (
                    <Skeleton className="h-[200px]" />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={getPriceTierChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fill: '#374151', fontSize: 12 }} />
                        <YAxis
                          tickFormatter={(value) => formatCurrency(value)}
                          tick={{ fill: '#374151', fontSize: 10 }}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            if (name === 'revenue') return [formatCurrency(value), '売上']
                            if (name === 'bookings') return [value, '予約数']
                            return [value, name]
                          }}
                          labelStyle={{ color: '#374151' }}
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                          }}
                        />
                        <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {/* チャートの見方説明 */}
                  <div className="mt-4 p-3 bg-muted border border-muted rounded-lg">
                    <h5 className="text-sm font-medium text-muted-foreground mb-2">
                      📊 グラフの見方
                    </h5>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>
                        <strong>縦軸（金額）:</strong> 各価格帯での総売上金額
                      </p>
                      <p>
                        <strong>横軸（価格帯）:</strong>{' '}
                        低価格帯（～￥5,000）、中価格帯（￥5,000-10,000）、高価格帯（￥10,000～）
                      </p>
                      <p>
                        <strong>棒の高さ:</strong> 高いほどその価格帯での売上が多い
                      </p>
                      <p>
                        <strong>活用方法:</strong>{' '}
                        売上の高い価格帯に注力したメニュー開発や、売上の少ない価格帯の改善策を検討できます
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-4">💡 価格戦略インサイト</h4>
                  <div className="space-y-4">
                    <div className="p-4 bg-palette-3 border border-palette-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-palette-3-foreground rounded-full"></div>
                        <span className="text-sm font-medium text-palette-3-foreground">
                          売上No.1価格帯
                        </span>
                      </div>
                      <div className="text-lg font-bold text-palette-3-foreground mb-1">
                        {priceTierAnalysis.insights.mostProfitableTier}
                      </div>
                      <p className="text-xs text-palette-3-foreground">
                        最も高い売上を上げている価格帯です。この価格帯のメニューを増やすか、他の価格帯をこのレベルに引き上げることを検討してください。
                      </p>
                    </div>

                    <div className="p-4 bg-palette-2 border border-palette-2 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-palette-2-foreground rounded-full"></div>
                        <span className="text-sm font-medium text-palette-2-foreground">
                          人気No.1価格帯
                        </span>
                      </div>
                      <div className="text-lg font-bold text-palette-2-foreground mb-1">
                        {priceTierAnalysis.insights.mostPopularTier}
                      </div>
                      <p className="text-xs text-palette-2-foreground">
                        最も予約数が多い価格帯です。お客様に受け入れられやすい価格設定の参考にしてください。
                      </p>
                    </div>

                    <div className="p-4 bg-palette-1 border border-palette-1 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-palette-1-foreground rounded-full"></div>
                        <span className="text-sm font-medium text-palette-1-foreground">
                          全メニュー価格の平均
                        </span>
                      </div>
                      <div className="text-lg font-bold text-palette-1-foreground mb-1">
                        {formatCurrency(priceTierAnalysis.insights.averageMenuPrice)}
                      </div>
                      <p className="text-xs text-palette-1-foreground">
                        サロン全体のメニュー価格平均です。新メニューの価格設定の基準として活用してください。
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong>💼 戦略提案:</strong>{' '}
                      売上No.1と人気No.1が異なる場合は、人気価格帯のメニューを売上の高い価格帯にアップグレードする施策を検討してみてください。
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Menu Ranking Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3Icon className="h-5 w-5" />
              メニュー売上詳細ランキング
            </CardTitle>
            <CardDescription>全メニューの売上実績一覧</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : menuRanking.length > 0 ? (
              <div className="space-y-3">
                {menuRanking.map((item, index) => (
                  <Link className="block" key={item.id} href={`/dashboard/menu/${item.id}`}>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={index < 3 ? 'default' : 'secondary'}>{index + 1}位</Badge>
                        <div>
                          <h4 className="font-semibold">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            シェア: {item.percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(item.value)}</div>
                        <div className="text-sm text-muted-foreground">
                          {index < 3 && <TrendingUpIcon className="h-4 w-4 inline mr-1" />}
                          トップランク
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">データがありません</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardSection>
  )
}
