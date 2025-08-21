import { useState, useCallback, useMemo } from 'react';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { ReservationRepository } from '@/services/supabase/repositories';
import { toast } from 'sonner';
import type { IntegratedReservation } from './useOrganizationReservations';
import type { ReservationStatus, ReservationMenu, ReservationOption } from '@/convex/types';
import type { RowType } from '@/services/supabase/SupabaseService';

type UseReservationExportOptions = {
  tenantId: string;
  orgId: string;
  status?: string;
  startDate?: string;
  endDate?: string;
};

type UseReservationExportReturn = {
  exportToCsv: () => Promise<void>
  isExporting: boolean
  maxDate: string
  minDate: string
}

/**
 * 予約データを全件取得してCSV出力するフック
 * 最大3ヶ月間の期間制限あり
 */
export function useReservationExport({
  tenantId,
  orgId,
  status,
  startDate,
  endDate,
}: UseReservationExportOptions): UseReservationExportReturn {
  const [isExporting, setIsExporting] = useState(false)

  const reservationRepo = useMemo(() => new ReservationRepository(), [])

  // Convexアクション（長時間実行用）
  const fetchAllConvexReservations = useAction(api.reservation.action.exportReservations)

  // 期間制限の計算（最大3ヶ月）
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 1) // 明日まで
  const minDate = new Date()
  minDate.setMonth(minDate.getMonth() - 3) // 3ヶ月前

  // ConvexとSupabaseから全件データを取得
  const fetchAllReservations = useCallback(async (): Promise<IntegratedReservation[]> => {
    if (!tenantId || !orgId || !startDate || !endDate) {
      throw new Error('必要なパラメータが不足しています')
    }
    const allReservations: IntegratedReservation[] = []

    try {
      // Convexから全件取得（アクション経由で大量データを効率的に取得）
      const convexData = await fetchAllConvexReservations({
        tenant_id: tenantId as Id<'tenant'>,
        org_id: orgId as Id<'organization'>,
        start_date: startDate,
        end_date: endDate,
        status_filter: status === 'all' ? undefined : (status as ReservationStatus),
      })

      console.log('[useReservationExport] Convex data:', convexData)

      // Convexデータを統合型に変換
      const convertedConvexData: IntegratedReservation[] = convexData.reservations.map(
        (res: Doc<'reservation'>, index: number) => ({
          id: res._id,
          source: 'convex' as const,
          tenantId: res.tenant_id,
          orgId: res.org_id,
          customerUid: res.customer_uid || '',
          staffId: res.staff_id,
          customerName: res.customer_name,
          staffName: res.staff_name,
          status: res.status,
          paymentStatus: res.payment_status,
          isFreeNomination: res.is_free_nomination ?? false,
          date: res.date,
          startTimeUnix: res.start_time_unix,
          endTimeUnix: res.end_time_unix,
          createdAt: new Date(res._creationTime),
          detail: convexData.details[index]
            ? {
                // Json型から適切な型にキャスト
                menus: Array.isArray(convexData.details[index].menus)
                  ? (convexData.details[index].menus as ReservationMenu[])
                  : [],
                options: Array.isArray(convexData.details[index].options)
                  ? (convexData.details[index].options as ReservationOption[])
                  : [],
                totalPrice:
                  typeof convexData.details[index].total_price === 'number'
                    ? convexData.details[index].total_price
                    : undefined,
                paymentMethod: convexData.details[index].payment_method,
                couponId: convexData.details[index].coupon_id || undefined,
                couponDiscount:
                  typeof convexData.details[index].coupon_discount === 'number'
                    ? convexData.details[index].coupon_discount
                    : undefined,
                usePoints:
                  typeof convexData.details[index].use_points === 'number'
                    ? convexData.details[index].use_points
                    : undefined,
                notes: convexData.details[index].notes || undefined,
              }
            : undefined,
        })
      )

      allReservations.push(...convertedConvexData)

      // Supabaseから最適化されたメソッドで全件取得
      const { data: supabaseData } = await reservationRepo.exportAllReservationsOptimized(
        tenantId,
        orgId,
        {
          status: status === 'all' ? undefined : status,
          startDate,
          endDate,
          batchSize: 10000, // 大量データ対応
        }
      )

      // Supabaseデータを統合型に変換（最適化版レスポンス対応）
      const convertedSupabaseData: IntegratedReservation[] = supabaseData
        .filter(
          (item: {
            reservation: RowType<'reservation'>
            detail: RowType<'reservation_detail'> | null
          }) => {
            if (status === 'all') return true
            if (status === 'confirmed' || status === 'pending') return false
            return item.reservation.status === status
          }
        )
        .map((item) => ({
          id: item.reservation.uid,
          source: 'supabase' as const,
          tenantId: item.reservation.tenant_id,
          orgId: item.reservation.org_id,
          customerUid: item.reservation.customer_uid || '',
          staffId: item.reservation.staff_id,
          customerName: item.reservation.customer_name,
          staffName: item.reservation.staff_name,
          status: item.reservation.status,
          paymentStatus: item.reservation.payment_status,
          isFreeNomination: item.reservation.is_free_nomination ?? false,
          date: item.reservation.date,
          startTimeUnix: Number(item.reservation.start_time_unix),
          endTimeUnix: Number(item.reservation.end_time_unix),
          createdAt: new Date(item.reservation.created_at),
          detail: item.detail
            ? {
                // Json型から適切な型にキャスト
                menus: Array.isArray(item.detail.menus)
                  ? (item.detail.menus as ReservationMenu[])
                  : [],
                options: Array.isArray(item.detail.options)
                  ? (item.detail.options as ReservationOption[])
                  : [],
                totalPrice:
                  typeof item.detail.total_price === 'number' ? item.detail.total_price : undefined,
                paymentMethod: item.detail.payment_method,
                couponId: item.detail.coupon_id || undefined,
                couponDiscount:
                  typeof item.detail.coupon_discount === 'number'
                    ? item.detail.coupon_discount
                    : undefined,
                usePoints:
                  typeof item.detail.use_points === 'number' ? item.detail.use_points : undefined,
                notes: item.detail.notes || undefined,
              }
            : undefined,
        }))

      allReservations.push(...convertedSupabaseData)
      // 重複除去
      const uniqueReservations = allReservations.reduce((acc, reservation) => {
        const isDuplicate = acc.some((existing) => {
          if (existing.source === 'convex' && reservation.source === 'supabase') {
            return existing.id === reservation.supabaseData?.reservation._convex_id
          }
          if (existing.source === 'supabase' && reservation.source === 'convex') {
            return existing.supabaseData?.reservation._convex_id === reservation.id
          }
          return false
        })

        if (!isDuplicate) {
          acc.push(reservation)
        }

        return acc
      }, [] as IntegratedReservation[])

      console.log('[useReservationExport] Unique reservations:', uniqueReservations)

      // 日時でソート
      return uniqueReservations.sort((a, b) => {
        const aTime = Number(a.startTimeUnix) || 0
        const bTime = Number(b.startTimeUnix) || 0
        return aTime - bTime
      })
    } catch (error) {
      console.error('Failed to fetch all reservations:', error)
      throw error
    }
  }, [tenantId, orgId, status, startDate, endDate, reservationRepo])

  // CSVを生成してダウンロード
  const generateCsv = useCallback(
    (reservations: IntegratedReservation[]): void => {
      const headers = [
        '予約ID',
        '顧客名',
        'スタッフ名',
        'ステータス',
        '支払いステータス',
        '予約日',
        '開始時間',
        '終了時間',
        'フリー指名',
        'メニュー',
        'オプション',
        '合計金額',
        '支払い方法',
        'クーポン割引',
        '使用ポイント',
        '備考',
        '作成日時',
      ]

      console.log('[useReservationExport] Reservations:', reservations)

      const csvContent = [
        headers.join(','),
        ...reservations.map((reservation) => {
          const menus =
            reservation.detail?.menus?.map((m) => `${m.name}(${m.quantity}個)`).join('; ') || ''

          const options =
            reservation.detail?.options?.map((o) => `${o.name}(${o.quantity}個)`).join('; ') || ''

          const startTime = new Date(reservation.startTimeUnix).toLocaleString('ja-JP')
          const endTime = new Date(reservation.endTimeUnix).toLocaleString('ja-JP')
          const createdAt = reservation.createdAt.toLocaleString('ja-JP')

          return [
            `"${reservation.id}"`,
            `"${reservation.customerName}"`,
            `"${reservation.staffName || ''}"`,
            `"${reservation.status}"`,
            `"${reservation.paymentStatus}"`,
            `"${reservation.date}"`,
            `"${startTime}"`,
            `"${endTime}"`,
            `"${reservation.isFreeNomination ? 'はい' : 'いいえ'}"`,
            `"${menus}"`,
            `"${options}"`,
            `"${reservation.detail?.totalPrice || ''}"`,
            `"${reservation.detail?.paymentMethod || ''}"`,
            `"${reservation.detail?.couponDiscount || ''}"`,
            `"${reservation.detail?.usePoints || ''}"`,
            `"${reservation.detail?.notes || ''}"`,
            `"${createdAt}"`,
          ].join(',')
        }),
      ].join('\n')

      // BOMを追加してUTF-8で保存
      const bom = '\uFEFF'
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `reservations_${startDate}_${endDate}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    [startDate, endDate]
  )

  // CSV出力メイン関数
  const exportToCsv = useCallback(async () => {
    setIsExporting(true)

    try {
      const reservations = await fetchAllReservations()

      if (reservations.length === 0) {
        toast.warning('指定期間に予約データがありません')
        return
      }

      console.log('[useReservationExport] Reservations:', reservations)

      generateCsv(reservations)
      toast.success(`${reservations.length}件の予約データをCSVで出力しました`)
    } catch (error) {
      console.error('CSV export failed:', error)
      toast.error('CSV出力に失敗しました')
    } finally {
      setIsExporting(false)
    }
  }, [fetchAllReservations, generateCsv, fetchAllConvexReservations])

  return {
    exportToCsv,
    isExporting,
    maxDate: maxDate.toISOString().split('T')[0],
    minDate: minDate.toISOString().split('T')[0],
  }
}