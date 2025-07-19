'use client'

import { useState, useMemo, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { useOrganizationReservations } from '@/hooks/useOrganizationReservations'
import { useReservationExport } from '@/hooks/useReservationExport'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { XIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Calendar as CalendarIcon, User, DownloadIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { Shuffle, Loader2 } from 'lucide-react'
import { Loading } from '@/components/common'
import { useErrorHandler } from '@/hooks/useErrorHandler'

// 予約ステータスの表示設定
const statusConfig = {
  confirmed: { label: '予約受付済み', color: 'bg-info-foreground' },
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
  const router = useRouter()
  const { tenantId, orgId, role } = useTenantAndOrganization()
  const { showErrorToast } = useErrorHandler()
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedStaff, setSelectedStaff] = useState<string>('all')
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all')
  const [isCsvCalendarOpen, setIsCsvCalendarOpen] = useState(false)
  // CSVエクスポート用のstate
  const [csvStartDate, setCsvStartDate] = useState('')
  const [csvEndDate, setCsvEndDate] = useState('')
  const [csvStatus, setCsvStatus] = useState('all')
  const [openCsvDialog, setOpenCsvDialog] = useState(false)

  // データ更新の状態管理
  const [isInterval, setIsInterval] = useState(false)
  const [intervalTime, setIntervalTime] = useState(10)

  // CSVエクスポートフック
  const { exportToCsv, isExporting, isValidPeriod, maxDate, minDate } = useReservationExport({
    tenantId: tenantId || '',
    orgId: orgId || '',
    status: csvStatus,
    startDate: csvStartDate,
    endDate: csvEndDate,
  })

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
  const { reservations, isLoading, loadMore, hasMore } = useOrganizationReservations({
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

  // 顧客リストを予約データから抽出
  const customerList = useMemo(() => {
    // 顧客IDでグループ化して最適な名前を選択
    const customerMap = new Map<string, string>()

    reservations.forEach((r) => {
      if (!r.customerUid || !r.customerName) return

      const currentName = customerMap.get(r.customerUid)

      // まだ名前が設定されていない場合は設定
      if (!currentName) {
        customerMap.set(r.customerUid, r.customerName)
        return
      }

      // 現在の名前がEmailでない場合は変更しない
      const isCurrentEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentName)
      if (!isCurrentEmail) return

      // 新しい名前がEmailでない場合は置き換える
      const isNewEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.customerName)
      if (!isNewEmail) {
        customerMap.set(r.customerUid, currentName + ' / ' + r.customerName)
      }
    })

    const uniqueCustomers = Array.from(customerMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))

    console.log('[ReservationList] Unique customers:', uniqueCustomers)
    return uniqueCustomers
  }, [reservations])

  console.log('[ReservationList] Customer list:', customerList)

  // スタッフと顧客フィルターを適用した予約リスト
  const filteredReservations = useMemo(() => {
    let filtered = reservations

    // スタッフフィルター
    if (selectedStaff !== 'all') {
      filtered = filtered.filter((r) => r.staffId === selectedStaff)
    }

    // 顧客フィルター
    if (selectedCustomer !== 'all') {
      filtered = filtered.filter((r) => r.customerUid === selectedCustomer)
    }

    return filtered
  }, [reservations, selectedStaff, selectedCustomer])

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

  // インターバル時間（ミリ秒）
  const REFRESH_INTERVAL = 10000 // 20秒

  // データ更新とインターバル制御
  const handleExportToCsv = useCallback(async () => {
    if (isExporting || isInterval) return

    try {
      await exportToCsv()
    } catch (err) {
      console.error('Refresh error:', err)
      showErrorToast(err)
    } finally {
      // インターバル開始
      setIsInterval(true)
      setOpenCsvDialog(false)
      setIntervalTime(REFRESH_INTERVAL / 1000)
      const interval = setInterval(() => {
        setIntervalTime((prev) => prev - 1)
      }, 1000)
      setTimeout(() => {
        setIsInterval(false)
        clearInterval(interval)
      }, REFRESH_INTERVAL)
    }
  }, [exportToCsv, isExporting, isInterval, showErrorToast])

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
      <div className="flex justify-between items-center mb-4">
        <div className="flex w-fit gap-2 items-end">
          <CardTitle className="text-sm font-medium">予約数</CardTitle>
          <div className="text-2xl font-bold text-accent-2 flex items-end gap-2">
            {filteredReservations.length}{' '}
            <small className="text-sm text-muted-foreground">件</small>
          </div>
        </div>

        {(role === 'admin' || role === 'owner') && (
          <Dialog open={openCsvDialog} onOpenChange={setOpenCsvDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 mt-2">
                <DownloadIcon className="h-4 w-4" />
                予約データをダウンロード
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>予約データCSV出力</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 p-4">
                <p className="text-sm text-muted-foreground">
                  指定期間の予約データを全件CSVファイルでダウンロードできます
                  <small>(※現在最大3ヶ月)</small>
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>期間選択</Label>
                    <Popover open={isCsvCalendarOpen} onOpenChange={setIsCsvCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !csvStartDate && !csvEndDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {csvStartDate && csvEndDate ? (
                            <>
                              {format(new Date(csvStartDate), 'yyyy/MM/dd')} -{' '}
                              {format(new Date(csvEndDate), 'yyyy/MM/dd')}
                            </>
                          ) : csvStartDate ? (
                            format(new Date(csvStartDate), 'yyyy/MM/dd')
                          ) : (
                            <span>期間を選択してください</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0"
                        align="start"
                      >
                        <div className="flex flex-col max-h-[85vh] min-w-[320px] animate-in fade-in-0 zoom-in-95 duration-200">
                          {/* ヘッダー */}
                          <div className="flex items-center justify-between p-3 border-b">
                            <h4 className="font-medium text-sm">期間を選択</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsCsvCalendarOpen(false)}
                              className="h-8 w-8 p-0 hover:bg-muted"
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* カレンダーコンテンツ */}
                          <div className="overflow-y-auto flex-1">
                            <div className="p-3">
                              <Calendar
                                initialFocus
                                mode="range"
                                selected={{
                                  from: csvStartDate ? new Date(csvStartDate) : undefined,
                                  to: csvEndDate ? new Date(csvEndDate) : undefined,
                                }}
                                onSelect={(dateRange) => {
                                  if (dateRange?.from) {
                                    setCsvStartDate(format(dateRange.from, 'yyyy-MM-dd'))
                                  } else {
                                    setCsvStartDate('')
                                  }
                                  if (dateRange?.to) {
                                    setCsvEndDate(format(dateRange.to, 'yyyy-MM-dd'))
                                  } else if (dateRange?.from && !dateRange?.to) {
                                    // 単一日付選択の場合、終了日も同じに設定
                                    setCsvEndDate(format(dateRange.from, 'yyyy-MM-dd'))
                                  } else {
                                    setCsvEndDate('')
                                  }
                                }}
                                disabled={(date) => {
                                  const min = new Date(minDate)
                                  const max = new Date(maxDate)
                                  return date < min || date > max
                                }}
                                numberOfMonths={1}
                                locale={locale === 'ja' ? ja : enUS}
                              />
                            </div>
                          </div>

                          {/* フッター */}
                          <div className="border-t p-3">
                            <div className="flex justify-between items-center">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setCsvStartDate('')
                                  setCsvEndDate('')
                                }}
                                size="sm"
                                className="transition-all duration-200 hover:scale-105"
                              >
                                クリア
                              </Button>
                              <Button
                                onClick={() => setIsCsvCalendarOpen(false)}
                                size="sm"
                                className="transition-all duration-200 hover:scale-105"
                              >
                                完了
                              </Button>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="csv-status-filter">ステータス</Label>
                  <Select value={csvStatus} onValueChange={setCsvStatus}>
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

                {!isValidPeriod && csvStartDate && csvEndDate && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive">期間は最大3ヶ月間まで指定可能です</p>
                  </div>
                )}

                <Button
                  onClick={handleExportToCsv}
                  disabled={
                    !isValidPeriod || isExporting || !csvStartDate || !csvEndDate || isInterval
                  }
                  className="w-full"
                >
                  {isExporting || isInterval ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      インターバル中 残り
                      {intervalTime === 0 ? REFRESH_INTERVAL / 1000 : intervalTime}秒
                    </>
                  ) : (
                    <>
                      <DownloadIcon className="h-4 w-4 mr-2" />
                      予約データをCSVでダウンロード
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
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
            <div className="w-full md:w-48">
              <label className="text-sm font-medium mb-2 block">顧客名</label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="顧客を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {customerList.map((customer) => (
                    <SelectItem key={customer.id || 'none'} value={customer.id || 'none'}>
                      {customer.name || '名前なし'}
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
            <TableRow className="bg-neon-foreground">
              <TableHead className="px-4 text-nowrap w-fit text-neon">顧客名</TableHead>
              <TableHead className="px-4 text-nowrap w-fit text-neon">予約日時</TableHead>
              <TableHead className="px-4 text-nowrap w-fit text-neon">担当スタッフ</TableHead>
              <TableHead className="px-4 text-nowrap w-fit text-neon">ステータス</TableHead>
              <TableHead className="px-4 text-nowrap w-fit text-neon">支払い</TableHead>
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
                <TableRow
                  key={reservation.id}
                  className="hover:bg-secondary cursor-pointer"
                  onClick={() => router.push(`/dashboard/reservation/${reservation.id}`)}
                >
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
