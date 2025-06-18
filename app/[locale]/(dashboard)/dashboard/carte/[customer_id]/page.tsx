'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { DashboardSection, Loading } from '@/components/common'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { useIntegratedReservations } from '@/hooks/useIntegratedReservations'
import { CustomerRepository } from '@/services/supabase/repositories'
import type { RowType } from '@/services/supabase/SupabaseService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ReservationMenu, ReservationOption } from '@/convex/types'
import {
  CalendarDays,
  User,
  Mail,
  Phone,
  CreditCard,
  ChevronDown,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
} from 'lucide-react'
import { format } from 'date-fns'
import { ja, enUS } from 'date-fns/locale'
import { toast } from 'sonner'
import type { SupportedLocale } from '@/lib/dateLocale'

type CartePageProps = {
  params: Promise<{
    customer_id: string
  }>
}

type CustomerWithDetails = {
  customer: RowType<'customer'> | null
  customerDetail: RowType<'customer_detail'> | null
  customerPoints: RowType<'customer_points'> | null
}

export default function CartePage({ params: paramsPromise }: CartePageProps) {
  const tCommon = useTranslations('common')
  const locale = useLocale() as SupportedLocale
  const { tenantId, orgId, isLoaded } = useTenantAndOrganization()

  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerData, setCustomerData] = useState<CustomerWithDetails | null>(null)
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(true)
  const [selectedTab, setSelectedTab] = useState('all')

  const customerRepo = useMemo(() => new CustomerRepository(), [])

  // paramsの解決
  useEffect(() => {
    paramsPromise.then((params) => {
      setCustomerId(params.customer_id)
    })
  }, [paramsPromise])

  // 顧客情報の取得
  const fetchCustomerData = useCallback(async () => {
    if (!tenantId || !orgId || !customerId || !isLoaded) return

    setIsLoadingCustomer(true)
    try {
      const completeData = await customerRepo.getCompleteCustomerData(customerId, tenantId, orgId)

      if (completeData.customer) {
        setCustomerData(completeData)
      } else {
        toast.error('顧客情報が見つかりません')
      }
    } catch (error) {
      console.error('Failed to fetch customer data:', error)
      toast.error('顧客情報の取得に失敗しました')
    } finally {
      setIsLoadingCustomer(false)
    }
  }, [tenantId, orgId, customerId, isLoaded, customerRepo])

  // 統合予約データの取得
  const {
    reservations,
    isLoading: isLoadingReservations,
    loadMore,
    hasMore,
    stats: reservationStats,
  } = useIntegratedReservations({
    tenantId: tenantId || '',
    orgId: orgId || '',
    customerId: customerId || '',
    status: selectedTab !== 'all' ? selectedTab : undefined,
    pageSize: 10,
  })

  // 初回データ取得
  useEffect(() => {
    if (customerId && tenantId && orgId && isLoaded) {
      fetchCustomerData()
    }
  }, [customerId, tenantId, orgId, isLoaded, fetchCustomerData])

  // 日付フォーマット
  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return '-'
    return format(new Date(timestamp), 'yyyy年MM月dd日 HH:mm', {
      locale: locale === 'ja' ? ja : enUS,
    })
  }

  // 金額フォーマット
  const formatPrice = (price: number | null) => {
    if (!price) return '¥0'
    return `¥${price.toLocaleString()}`
  }

  // ステータスバッジの取得
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <Badge className="bg-blue-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            確定
          </Badge>
        )
      case 'completed':
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            完了
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            キャンセル
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" />
            保留
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (!isLoaded || isLoadingCustomer) {
    return <Loading />
  }

  if (!customerData) {
    return (
      <DashboardSection
        title="顧客カルテ"
        backLink="/dashboard/carte"
        backLinkTitle="顧客検索に戻る"
      >
        <div className="text-center py-8 text-muted-foreground">顧客情報が見つかりません</div>
      </DashboardSection>
    )
  }

  return (
    <DashboardSection title="顧客カルテ" backLink="/dashboard/carte" backLinkTitle="顧客検索に戻る">
      <div className="space-y-6">
        {/* 顧客基本情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              顧客情報
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">氏名</span>
                  <p className="font-medium">
                    {customerData.customer?.last_name} {customerData.customer?.first_name}
                    {customerData.customer?.line_user_name && (
                      <span className="text-sm text-muted-foreground ml-2">
                        (LINE: {customerData.customer?.line_user_name})
                      </span>
                    )}
                  </p>
                </div>

                {customerData.customer?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{customerData.customer?.email}</span>
                  </div>
                )}

                {customerData.customer?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{customerData.customer?.phone}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {customerData.customerDetail?.birthday && (
                  <div>
                    <span className="text-sm text-muted-foreground">誕生日</span>
                    <p className="font-medium">
                      {format(new Date(customerData.customerDetail.birthday), 'yyyy年MM月dd日')}
                    </p>
                  </div>
                )}

                {customerData.customerPoints && (
                  <div>
                    <span className="text-sm text-muted-foreground">保有ポイント</span>
                    <p className="font-medium text-lg">
                      {customerData.customerPoints.total_points || 0} pt
                    </p>
                  </div>
                )}

                {customerData.customer?.tags && customerData.customer.tags.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">タグ</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {customerData.customer.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 予約統計情報 */}
        {reservationStats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{reservationStats.totalCount}</div>
                <p className="text-xs text-muted-foreground">総予約数</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {reservationStats.completedCount}
                </div>
                <p className="text-xs text-muted-foreground">完了</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">
                  {reservationStats.upcomingCount}
                </div>
                <p className="text-xs text-muted-foreground">予定</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">
                  {reservationStats.cancelledCount}
                </div>
                <p className="text-xs text-muted-foreground">キャンセル</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {formatPrice(reservationStats.totalAmount)}
                </div>
                <p className="text-xs text-muted-foreground">総売上</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 予約履歴 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              予約履歴
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">すべて</TabsTrigger>
                <TabsTrigger value="confirmed">確定</TabsTrigger>
                <TabsTrigger value="completed">完了</TabsTrigger>
                <TabsTrigger value="cancelled">キャンセル</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedTab} className="mt-4">
                {isLoadingReservations ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : reservations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">予約履歴がありません</div>
                ) : (
                  <div className="space-y-4">
                    {reservations.map((item) => (
                      <Card
                        key={item.id}
                        className="border-l-4 relative"
                        style={{
                          borderLeftColor:
                            item.status === 'completed'
                              ? '#22c55e'
                              : item.status === 'cancelled'
                                ? '#ef4444'
                                : item.status === 'confirmed'
                                  ? '#3b82f6'
                                  : '#6b7280',
                        }}
                      >
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {formatDate(item.startTimeUnix)}
                                </span>
                                {/* リアルタイムインジケーター */}
                                {item.source === 'convex' && (
                                  <Badge variant="secondary" className="gap-1 text-xs">
                                    <Zap className="w-3 h-3" />
                                    リアルタイム
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">担当: {item.staffName}</span>
                              </div>
                            </div>
                            {getStatusBadge(item.status)}
                          </div>

                          {item.detail && (
                            <div className="mt-3 space-y-2">
                              {/* メニュー情報 */}
                              {item.detail.menus &&
                                Array.isArray(item.detail.menus) &&
                                item.detail.menus.length > 0 && (
                                  <div>
                                    <span className="text-sm text-muted-foreground">メニュー:</span>
                                    <div className="mt-1">
                                      {(item.detail.menus as ReservationMenu[]).map(
                                        (menu: ReservationMenu, index: number) => (
                                          <Badge key={index} variant="outline" className="mr-1">
                                            {menu.name}
                                          </Badge>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                              {/* オプション情報 */}
                              {item.detail.options &&
                                Array.isArray(item.detail.options) &&
                                item.detail.options.length > 0 && (
                                  <div>
                                    <span className="text-sm text-muted-foreground">
                                      オプション:
                                    </span>
                                    <div className="mt-1">
                                      {(item.detail.options as ReservationOption[]).map(
                                        (option: ReservationOption, index: number) => (
                                          <Badge
                                            key={index}
                                            variant="secondary"
                                            className="mr-1 text-xs"
                                          >
                                            {option.name}
                                          </Badge>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                              {/* 料金情報 */}
                              <div className="flex items-center justify-between pt-2 border-t">
                                <div className="flex items-center gap-2">
                                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm">
                                    {item.detail.paymentMethod === 'cash'
                                      ? '現金'
                                      : 'クレジットカード'}
                                  </span>
                                </div>
                                <span className="font-semibold">
                                  {formatPrice(item.detail.totalPrice || 0)}
                                </span>
                              </div>

                              {/* 備考 */}
                              {item.detail.notes && (
                                <div className="text-sm text-muted-foreground">
                                  備考: {item.detail.notes}
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}

                    {hasMore && (
                      <div className="flex justify-center mt-6">
                        <Button
                          onClick={loadMore}
                          variant="outline"
                          className="gap-2"
                          disabled={!hasMore}
                        >
                          <span>{tCommon('loadMore')}</span>
                          {hasMore ? (
                            <ChevronDown size={16} />
                          ) : (
                            <RefreshCw size={16} className="animate-spin" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardSection>
  )
}
