'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Calendar, Clock, User, Receipt, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { getSupabaseAdminService } from '@/services/supabase/SupabaseService'
import { ReservationRepository } from '@/services/supabase/repositories/reservation/ReservationRepository'
import type { RowType } from '@/services/supabase/SupabaseService'
import type { IntegratedReservation } from '@/hooks/useIntegratedReservations'
import { toast } from 'sonner'
import type {
  ReservationMenu,
  ReservationOption,
  ReservationStatus,
  ReservationPaymentStatus,
  PaymentMethod,
} from '@/convex/types'

interface ReservationDetailPageClientProps {
  orgId: string
  customerUid: string
  reservationId: string
  tenantId: string
  sessionOrgId: string
}

export function ReservationDetailPageClient({ 
  orgId, 
  customerUid, 
  reservationId, 
  tenantId, 
  sessionOrgId 
}: ReservationDetailPageClientProps) {
  const router = useRouter()
  const [reservationData, setReservationData] = useState<IntegratedReservation | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Convexから予約データを取得（IDがk...の形式の場合）
  const isConvexId = reservationId.startsWith('k')
  const convexData = useQuery(
    api.reservation.query.getWithDetailById,
    isConvexId
      ? {
          id: reservationId as Id<'reservation'>,
        }
      : 'skip'
  )

  // SupabaseまたはConvexからデータを取得
  useEffect(() => {
    async function fetchReservationData() {
      // Convexデータがある場合
      if (isConvexId && convexData) {
        if (!convexData.reservation) {
          toast.error('予約が見つかりません')
          router.push(`/customer/${orgId}/${customerUid}/reservation`)
          return
        }

        // 顧客IDの確認
        if (convexData.reservation.customer_id !== customerUid) {
          toast.error('この予約にアクセスする権限がありません')
          router.push(`/customer/${orgId}/${customerUid}/reservation`)
          return
        }

        const res = convexData.reservation
        const detail = convexData.reservationDetail

        setReservationData({
          id: res._id,
          source: 'convex',
          tenantId: res.tenant_id,
          orgId: res.org_id,
          customerId: res.customer_id || '',
          staffId: res.staff_id,
          customerName: res.customer_name,
          staffName: res.staff_name,
          status: res.status,
          paymentStatus: res.payment_status,
          date: res.date,
          startTimeUnix: res.start_time_unix,
          endTimeUnix: res.end_time_unix,
          createdAt: new Date(res._creationTime),
          detail: detail
            ? {
                menus: detail.menus || undefined,
                options: detail.options || undefined,
                totalPrice: detail.total_price || undefined,
                paymentMethod: detail.payment_method,
                couponId: detail.coupon_id || undefined,
                couponDiscount: detail.coupon_discount || undefined,
                usePoints: detail.use_points || undefined,
                notes: detail.notes || undefined,
              }
            : undefined,
          convexData: res,
        })
        setIsLoading(false)
        return
      }

      // SupabaseのUUID形式の場合
      if (!isConvexId) {
        try {
          const supabaseAdmin = getSupabaseAdminService()
          const reservationRepo = new ReservationRepository(supabaseAdmin)

          // UIDで予約を取得
          const reservation = await reservationRepo.findByUid(reservationId)

          if (!reservation) {
            toast.error('予約が見つかりません')
            router.push(`/customer/${orgId}/${customerUid}/reservation`)
            return
          }

          // 顧客IDの確認
          if (reservation.customer_id !== customerUid) {
            toast.error('この予約にアクセスする権限がありません')
            router.push(`/customer/${orgId}/${customerUid}/reservation`)
            return
          }

          // 予約詳細を取得
          const supabaseService = getSupabaseAdminService()
          const { data: details } = await supabaseService.listRecords('reservation_detail', {
            filters: {
              _convex_reservation_id: reservation._convex_id,
            } as Partial<RowType<'reservation_detail'>>,
            pageSize: 1,
          })

          const detail = details?.[0] || null

          setReservationData({
            id: reservation.uid,
            source: 'supabase',
            tenantId: reservation.tenant_id,
            orgId: reservation.org_id,
            customerId: reservation.customer_id || '',
            staffId: reservation.staff_id,
            customerName: reservation.customer_name,
            staffName: reservation.staff_name,
            status: reservation.status,
            paymentStatus: reservation.payment_status,
            date: reservation.date,
            startTimeUnix: Number(reservation.start_time_unix),
            endTimeUnix: Number(reservation.end_time_unix),
            createdAt: new Date(reservation.created_at),
            detail: detail
              ? {
                  menus: (detail.menus as ReservationMenu[]) || undefined,
                  options: (detail.options as ReservationOption[]) || undefined,
                  totalPrice: detail.total_price || undefined,
                  paymentMethod: detail.payment_method,
                  couponId: detail.coupon_id || undefined,
                  couponDiscount: detail.coupon_discount || undefined,
                  usePoints: detail.use_points || undefined,
                  notes: detail.notes || undefined,
                }
              : undefined,
            supabaseData: {
              reservation,
              detail,
            },
          })
        } catch (error) {
          console.error('[ReservationDetailPageClient] Error fetching reservation:', error)
          toast.error('予約の取得に失敗しました')
          router.push(`/customer/${orgId}/${customerUid}/reservation`)
        } finally {
          setIsLoading(false)
        }
      }
    }

    if (!isConvexId) {
      fetchReservationData()
    } else if (isConvexId && convexData !== undefined) {
      fetchReservationData()
    }
  }, [reservationId, customerUid, orgId, router, isConvexId, convexData])

  // ステータスの表示
  const getStatusDisplay = (
    status: ReservationStatus
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

  // 支払い方法の表示
  const getPaymentMethodDisplay = (method: PaymentMethod): string => {
    switch (method) {
      case 'cash':
        return '現金'
      case 'credit_card':
        return 'クレジットカード'
      case 'all':
        return '店舗支払いのみ・クレジットカード'
      default:
        return '未設定'
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!reservationData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">予約が見つかりません</p>
        <Link href={`/customer/${orgId}/${customerUid}/reservation`}>
          <Button variant="outline" className="mt-4">
            予約一覧に戻る
          </Button>
        </Link>
      </div>
    )
  }

  const statusDisplay = getStatusDisplay(reservationData.status as ReservationStatus)
  const paymentStatusDisplay = getPaymentStatusDisplay(
    reservationData.paymentStatus as ReservationPaymentStatus
  )
  const totalPrice = reservationData.detail?.totalPrice || 0
  const couponDiscount = reservationData.detail?.couponDiscount || 0
  const usePoints = reservationData.detail?.usePoints || 0
  const finalPrice = totalPrice - couponDiscount - usePoints

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4">
        <Link href={`/customer/${orgId}/${customerUid}/reservation`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="text-2xl font-bold text-primary">予約詳細</h2>
      </div>

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>予約情報</span>
            <div className="flex items-center space-x-2">
              <Badge variant={statusDisplay.variant}>{statusDisplay.label}</Badge>
              <Badge variant={paymentStatusDisplay.variant}>{paymentStatusDisplay.label}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 日時 */}
          <div className="flex items-start space-x-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">予約日時</p>
              <p className="font-medium">
                {format(new Date(reservationData.startTimeUnix), 'yyyy年M月d日 (E)', {
                  locale: ja,
                })}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(reservationData.startTimeUnix), 'HH:mm')} -
                {format(new Date(reservationData.endTimeUnix), 'HH:mm')}
              </p>
            </div>
          </div>

          {/* スタッフ */}
          <div className="flex items-start space-x-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">担当スタッフ</p>
              <p className="font-medium">{reservationData.staffName}</p>
            </div>
          </div>

          {/* 作成日時 */}
          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">予約作成日時</p>
              <p className="font-medium">
                {format(reservationData.createdAt, 'yyyy年M月d日 HH:mm', { locale: ja })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* メニュー・オプション情報 */}
      {reservationData.detail && (
        <Card>
          <CardHeader>
            <CardTitle>施術内容</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* メニュー */}
            {reservationData.detail.menus && reservationData.detail.menus.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">メニュー</p>
                <div className="space-y-2">
                  {reservationData.detail.menus.map((menu, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span>
                        {menu.name} × {menu.quantity}
                      </span>
                      <span>¥{(menu.price * menu.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* オプション */}
            {reservationData.detail.options && reservationData.detail.options.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">オプション</p>
                <div className="space-y-2">
                  {reservationData.detail.options.map((option, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span>
                        {option.name} × {option.quantity}
                      </span>
                      <span>¥{(option.price * option.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 備考 */}
            {reservationData.detail.notes && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">備考</p>
                <p className="text-primary">{reservationData.detail.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 料金情報 */}
      {reservationData.detail && totalPrice > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Receipt className="h-5 w-5" />
              <span>料金詳細</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>小計</span>
                <span>¥{totalPrice.toLocaleString()}</span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>クーポン割引</span>
                  <span>-¥{couponDiscount.toLocaleString()}</span>
                </div>
              )}

              {usePoints > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>ポイント利用</span>
                  <span>-¥{usePoints.toLocaleString()}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between font-bold text-lg">
                <span>合計</span>
                <span>¥{finalPrice.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>支払い方法</span>
                <span>
                  {getPaymentMethodDisplay(reservationData.detail.paymentMethod as PaymentMethod)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}