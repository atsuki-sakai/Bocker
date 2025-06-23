'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, User, CreditCard, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import Link from 'next/link'
import { useIntegratedReservations } from '@/hooks/useIntegratedReservations'
import { ReservationPaymentStatus, ReservationStatus } from '@/convex/types'

interface ReservationPageClientProps {
  orgId: string
  customerUid: string
  tenantId: string
  sessionOrgId: string
}

export function ReservationPageClient({ 
  orgId, 
  customerUid, 
  tenantId, 
  sessionOrgId 
}: ReservationPageClientProps) {
  const [selectedStatus, setSelectedStatus] = useState<ReservationStatus | 'all'>('all')

  // 統合フックを使用して予約データを取得
  const { reservations, isLoading, loadMore, hasMore } = useIntegratedReservations({
    tenantId,
    orgId: sessionOrgId,
    customerId: customerUid,
    status: selectedStatus,
    pageSize: 10,
  })

  // ステータスの表示
  const getStatusDisplay = (
    status: string
  ): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    switch (status) {
      case 'confirmed':
        return { label: '確定', variant: 'default' }
      case 'pending':
        return { label: '保留', variant: 'secondary' }
      case 'completed':
        return { label: '完了', variant: 'outline' }
      case 'cancelled':
        return { label: 'キャンセル', variant: 'destructive' }
      default:
        return { label: '不明', variant: 'outline' }
    }
  }

  // 支払いステータスの表示
  const getPaymentStatusDisplay = (
    status: ReservationPaymentStatus
  ): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    switch (status) {
      case 'paid':
        return { label: '支払済', variant: 'default' }
      case 'pending':
        return { label: '未払', variant: 'secondary' }
      case 'cancelled':
        return { label: '返金済', variant: 'outline' }
      case 'failed':
        return { label: '失敗', variant: 'destructive' }
      default:
        return { label: '未設定', variant: 'outline' }
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h2 className="text-2xl font-bold text-primary">予約履歴</h2>
        <p className="text-muted-foreground mt-1">過去と未来の予約を確認できます</p>
      </div>


      {/* ステータスフィルター */}
      <Tabs
        value={selectedStatus}
        onValueChange={(value) => setSelectedStatus(value as ReservationStatus | 'all')}
      >
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="all">すべて</TabsTrigger>
          <TabsTrigger value="confirmed">確定</TabsTrigger>
          <TabsTrigger value="pending">保留</TabsTrigger>
          <TabsTrigger value="completed">完了</TabsTrigger>
          <TabsTrigger value="cancelled">キャンセル</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus} className="mt-6">
          {isLoading && reservations.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : reservations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">予約履歴がありません</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reservations.map((reservation) => {
                const statusDisplay = getStatusDisplay(reservation.status)
                const paymentStatusDisplay = getPaymentStatusDisplay(
                  reservation.paymentStatus as ReservationPaymentStatus
                )
                const totalPrice = reservation.detail?.totalPrice || 0

                return (
                  <Card key={reservation.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-3 flex-1">
                          {/* 日時・ステータス */}
                          <div className="flex items-center space-x-3">
                            <Badge variant={statusDisplay.variant}>{statusDisplay.label}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(reservation.startTimeUnix), 'yyyy年M月d日 (E)', {
                                locale: ja,
                              })}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(reservation.startTimeUnix), 'HH:mm')} -
                              {format(new Date(reservation.endTimeUnix), 'HH:mm')}
                            </span>
                          </div>

                          {/* メニュー情報 */}
                          {reservation.detail?.menus && reservation.detail.menus.length > 0 && (
                            <div>
                              <p className="font-medium text-primary">
                                {reservation.detail.menus.map((menu) => menu.name).join('、')}
                              </p>
                              {reservation.detail.options &&
                                reservation.detail.options.length > 0 && (
                                  <p className="text-sm text-muted-foreground">
                                    オプション:{' '}
                                    {reservation.detail.options
                                      .map((option) => option.name)
                                      .join('、')}
                                  </p>
                                )}
                            </div>
                          )}

                          {/* スタッフ・支払い情報 */}
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <User className="h-4 w-4" />
                              <span>{reservation.staffName}</span>
                            </div>
                            {totalPrice > 0 && (
                              <div className="flex items-center space-x-1">
                                <CreditCard className="h-4 w-4" />
                                <span>¥{totalPrice.toLocaleString()}</span>
                              </div>
                            )}
                            <Badge variant={paymentStatusDisplay.variant} className="text-xs">
                              {paymentStatusDisplay.label}
                            </Badge>
                          </div>

                          {/* 備考 */}
                          {reservation.detail?.notes && (
                            <p className="text-sm text-muted-foreground italic">
                              {reservation.detail.notes}
                            </p>
                          )}
                        </div>

                        {/* 詳細リンク */}
                        <div className="ml-4">
                          <Link href={`/customer/${orgId}/${customerUid}/reservation/${reservation.id}`}>
                            <Button variant="outline" size="sm">
                              詳細
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {/* もっと読み込む */}
              {hasMore && (
                <div className="text-center py-4">
                  <Button variant="outline" onClick={loadMore} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        読み込み中...
                      </>
                    ) : (
                      'もっと見る'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}