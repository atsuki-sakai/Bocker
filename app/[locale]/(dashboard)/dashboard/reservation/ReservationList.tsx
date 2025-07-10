'use client'

import { useState, useMemo } from 'react'
import { useLocale } from 'next-intl'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { useOrganizationReservations } from '@/hooks/useOrganizationReservations'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { ja, enUS } from 'date-fns/locale'
import { Calendar as CalendarIcon, User } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Shuffle } from 'lucide-react'
import { Loading } from '@/components/common'

// 予約ステータスの表示設定
const statusConfig = {
  confirmed: { label: '予約受付済み', color: 'bg-info' },
  pending: { label: '保留中', color: 'bg-warning-foreground' },
  completed: { label: '完了', color: 'bg-success' },
  cancelled: { label: 'キャンセル', color: 'bg-destructive' },
  refunded: { label: '返金済み', color: 'bg-muted' },
} as const

// 支払いステータスの表示設定
const paymentStatusConfig = {
  pending: { label: '未払い', color: 'bg-warning-foreground text-warning' },
  completed: { label: '支払済み', color: 'bg-success text-success-foreground' },
  paid: { label: '支払済み', color: 'bg-success text-success-foreground' },
  failed: { label: '失敗', color: 'bg-destructive text-destructive-foreground' },
  refunded: { label: '返金済み', color: 'bg-muted text-muted-foreground' },
} as const

export default function ReservationList() {
  const locale = useLocale()
  const { tenantId, orgId } = useTenantAndOrganization()
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedStaff, setSelectedStaff] = useState<string>('all')

  // 実際の検索で使用する日付範囲（本日から1週間）
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekLater = new Date(today)
    weekLater.setDate(weekLater.getDate() + 6) // 7日後（本日含む）
    weekLater.setHours(23, 59, 59, 999)
    return {
      from: today,
      to: weekLater,
    }
  })

  // カレンダーで選択中の一時的な日付範囲
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange)

  // カレンダーポップオーバーの開閉状態を管理
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // 日付範囲を文字列に変換
  const startDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  const endDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined

  console.log('[ReservationCollection] Date range processing:', {
    dateRange,
    startDate,
    endDate,
    fromHours: dateRange?.from?.getHours(),
    fromMinutes: dateRange?.from?.getMinutes(),
    toHours: dateRange?.to?.getHours(),
    toMinutes: dateRange?.to?.getMinutes(),
  })

  // 日付範囲適用の処理
  const handleApplyDateRange = () => {
    // 単一日付が選択された場合、endDateも同じ日付に設定
    if (tempDateRange?.from && !tempDateRange?.to) {
      setDateRange({
        from: tempDateRange.from,
        to: tempDateRange.from,
      })
    } else {
      setDateRange(tempDateRange)
    }
    setIsCalendarOpen(false)
  }

  // 日付範囲リセットの処理（本日から1週間）
  const handleResetDateRange = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekLater = new Date(today)
    weekLater.setDate(weekLater.getDate() + 6) // 7日後（本日含む）
    weekLater.setHours(23, 59, 59, 999)
    const defaultRange = {
      from: today,
      to: weekLater,
    }
    setTempDateRange(defaultRange)
    setDateRange(defaultRange)
    setIsCalendarOpen(false)
  }

  // 組織レベルの予約データを取得
  const { reservations, isLoading, loadMore, totalCount, hasMore } = useOrganizationReservations({
    tenantId: tenantId || '',
    orgId: orgId || '',
    status: selectedStatus,
    startDate,
    endDate,
    pageSize: 20,
  })

  // スタッフリストを予約データから抽出
  const staffList = useMemo(() => {
    const uniqueStaff = reservations
      .map((r) => ({ id: r.staffId, name: r.staffName }))
      .filter(
        (staff, index, self) => staff.id && self.findIndex((s) => s.id === staff.id) === index
      )
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    return uniqueStaff
  }, [reservations])

  // スタッフフィルターを適用した予約リスト
  const filteredReservations = useMemo(() => {
    if (selectedStaff === 'all') {
      return reservations
    }
    return reservations.filter((r) => r.staffId === selectedStaff)
  }, [reservations, selectedStaff])

  // 予約行データをフォーマット
  const formatReservationDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return format(date, 'yyyy/MM/dd', { locale: locale === 'ja' ? ja : enUS })
  }

  const formatReservationTime = (startTimestamp: number, endTimestamp: number): string => {
    const startTime = format(new Date(startTimestamp), 'HH:mm')
    const endTime = format(new Date(endTimestamp), 'HH:mm')
    return `${startTime}-${endTime}`
  }

  // ローディング表示
  if (isLoading && reservations.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">予約一覧</h1>
        <div className="space-y-4">
          <Loading />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100vh]">
      <div className="flex w-fit gap-2 items-end mb-4 ">
        <CardTitle className="text-sm font-medium">予約数</CardTitle>
        <div className="text-2xl font-bold text-accent-2 flex items-end gap-2">
          {totalCount} <small className="text-sm text-muted-foreground">件</small>
        </div>
      </div>

      {/* フィルター */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">期間</label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'yyyy/MM/dd')} -{' '}
                          {format(dateRange.to, 'yyyy/MM/dd')}
                        </>
                      ) : (
                        format(dateRange.from, 'yyyy/MM/dd')
                      )
                    ) : (
                      <span>期間を選択</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 " align="start">
                  <div className="p-3">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={tempDateRange?.from}
                      selected={tempDateRange}
                      onSelect={setTempDateRange}
                      numberOfMonths={2}
                      locale={locale === 'ja' ? ja : enUS}
                    />
                    <div className="flex justify-between pt-3 border-t gap-2">
                      <Button variant="outline" onClick={handleResetDateRange} size="sm">
                        リセット
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsCalendarOpen(false)}
                          size="sm"
                        >
                          キャンセル
                        </Button>
                        <Button onClick={handleApplyDateRange} size="sm">
                          適用
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="w-full md:w-48">
              <label className="text-sm font-medium mb-2 block">ステータス</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="ステータスを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="confirmed">予約受付済み</SelectItem>
                  <SelectItem value="pending">保留中</SelectItem>
                  <SelectItem value="completed">完了</SelectItem>
                  <SelectItem value="cancelled">キャンセル</SelectItem>
                  <SelectItem value="refunded">返金済み</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <label className="text-sm font-medium mb-2 block">担当スタッフ</label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="スタッフを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {staffList.map((staff) => (
                    <SelectItem key={staff.id || 'free'} value={staff.id || 'free'}>
                      {staff.name || '指名フリー'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 予約一覧 */}
      <div className="rounded-md border overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted text-muted-foreground">
              <TableHead className="px-4 text-nowrap w-fit">顧客名</TableHead>
              <TableHead className="px-4 text-nowrap w-fit">予約日時</TableHead>
              <TableHead className="px-4 text-nowrap w-fit">担当スタッフ</TableHead>
              <TableHead className="px-4 text-nowrap w-fit">ステータス</TableHead>
              <TableHead className="px-4 text-nowrap w-fit">支払い</TableHead>
              <TableHead className="w-[100px]">詳細</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReservations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  該当する予約が見つかりませんでした。
                </TableCell>
              </TableRow>
            ) : (
              filteredReservations.map((reservation) => (
                <TableRow key={reservation.id} className="hover:bg-muted">
                  {/* 顧客名 */}
                  <TableCell className="font-medium px-4">
                    <span className="text-nowrap">{reservation.customerName}</span>
                  </TableCell>

                  {/* 予約日時 */}
                  <TableCell className="px-4">
                    <div className="text-sm">
                      <div className="font-medium">
                        {formatReservationDate(reservation.startTimeUnix)}
                      </div>
                      <div className="text-accent-2 tracking-wide text-sm font-semibold">
                        {formatReservationTime(reservation.startTimeUnix, reservation.endTimeUnix)}
                      </div>
                    </div>
                  </TableCell>

                  {/* 担当スタッフ */}
                  <TableCell className="px-4">
                    <div className="flex items-center gap-2 text-sm">
                      {reservation.isFreeNomination ? (
                        <Shuffle
                          size={14}
                          className="min-w-6 min-h-6 text-palette-5-foreground bg-palette-5 rounded-full p-1"
                        />
                      ) : (
                        <User
                          size={14}
                          className="text-muted-foreground bg-muted min-w-6 min-h-6 p-1 rounded-full"
                        />
                      )}
                      <p>{reservation.staffName}</p>
                    </div>
                  </TableCell>

                  {/* ステータス */}
                  <TableCell className="px-4">
                    <Badge
                      className={`${statusConfig[reservation.status as keyof typeof statusConfig]?.color || 'bg-muted'} text-white text-nowrap`}
                    >
                      {statusConfig[reservation.status as keyof typeof statusConfig]?.label ||
                        reservation.status}
                    </Badge>
                  </TableCell>

                  {/* 支払いステータス */}
                  <TableCell className="px-4">
                    {reservation.paymentStatus ? (
                      <Badge
                        variant="outline"
                        className={`${
                          paymentStatusConfig[
                            reservation.paymentStatus as keyof typeof paymentStatusConfig
                          ]?.color || 'bg-muted-foreground'
                        }`}
                      >
                        <span className="text-nowrap px-2">
                          {' '}
                          {paymentStatusConfig[
                            reservation.paymentStatus as keyof typeof paymentStatusConfig
                          ]?.label || reservation.paymentStatus}
                        </span>
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  {/* 詳細ボタン */}
                  <TableCell className="px-4">
                    <Link href={`/dashboard/reservation/${reservation.id}`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        詳細を見る
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* もっと読み込む */}
      {hasMore && (
        <div className="text-center py-4">
          <Button onClick={loadMore} disabled={isLoading} variant="outline">
            {isLoading ? 'Loading...' : 'もっと見る'}
          </Button>
        </div>
      )}
    </div>
  )
}
