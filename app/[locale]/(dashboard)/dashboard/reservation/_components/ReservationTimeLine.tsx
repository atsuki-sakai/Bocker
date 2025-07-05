'use client'
import { Link } from '@/i18n/navigation'
import React, { useState, useMemo, useCallback, memo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { useTimelineData, useReservationBars } from '@/hooks/useTimelineData'
import type {
  StaffTimelineData,
  ReservationWithDetails,
  TimeSlot,
  ReservationBar,
} from '@/hooks/useTimelineData'
import { RESERVATION_COLORS, FREE_NOMINATION_COLORS } from '@/hooks/useTimelineData'
import { Loading } from '@/components/common'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  CalendarDays,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Shuffle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatTimestamp,
  convertTimestampToHour,
  convertTimestampToDateString,
} from '@/lib/schedules'
import { format, addDays, subDays, isWeekend } from 'date-fns'
import { ja, enUS } from 'date-fns/locale'
import { useLocale } from 'next-intl'
import Image from 'next/image'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// 1スロット（10分）の幅(px) - 隙間をなくすために調整
const SLOT_WIDTH = 32

// ■ メモ化されたコンポーネント
const TimelineHeader = memo(({ timeSlots }: { timeSlots: TimeSlot[] }) => {
  const t = useTranslations('reservations')
  return (
    <div className="flex sticky top-0 z-30 bg-background shadow-sm border-b border-border">
      {/* スタッフ名カラムのヘッダー */}
      <div className="sticky left-0 z-40 bg-background border-r border-border w-20 md:w-40 p-3 flex items-center justify-center font-bold text-muted-foreground">
        <User className="w-4 h-4 mr-2" />
        <span className="hidden md:block text-sm">{t('staff')}</span>
      </div>

      {/* 時間スロットヘッダー */}
      <div className="flex">
        {timeSlots.map((slot) => {
          return (
            <div
              key={slot.index}
              className={cn(
                'relative h-12 text-xs flex items-center justify-center transition-colors bg-secondary z-10',
                // 太い線を削除し、通常のボーダーのみ使用
                slot.minutes % 60 === 0
                  ? 'w-24 border-l border-border font-semibold bg-background'
                  : 'w-24 border-l border-border/50'
              )}
            >
              {slot.minutes % 60 === 0 && (
                <span className="absolute left-1 top-1/2 -translate-y-1/2 whitespace-nowrap text-primary font-semibold">
                  {slot.timeLabel}
                </span>
              )}
              {/* 30分マーク */}
              {slot.minutes % 60 === 30 && (
                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                  {slot.timeLabel.split(':')[0]}:30
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})

TimelineHeader.displayName = 'TimelineHeader'

const ReservationBarComponent = memo(
  ({
    bar,
    onReservationClick,
  }: {
    bar: ReservationBar
    onReservationClick: (reservation: ReservationWithDetails) => void
  }) => {
    const t = useTranslations('reservations')
    const { reservation, startColumn, spanColumns } = bar

    // ステータスに基づいてアイコンを選択
    const getStatusIcon = (status: string) => {
      // フリー指名の場合は専用アイコンを表示
      if (reservation.is_free_nomination) {
        return <Shuffle className="w-3 h-3" />
      }

      switch (status) {
        case 'confirmed':
          return <UserCheck className="w-3 h-3" />
        case 'pending':
          return <Clock className="w-3 h-3" />
        case 'completed':
          return <UserCheck className="w-3 h-3" />
        default:
          return <User className="w-3 h-3" />
      }
    }

    const colorSet = reservation.is_free_nomination ? FREE_NOMINATION_COLORS : RESERVATION_COLORS
    const enhancedColor =
      colorSet[reservation.status as keyof typeof colorSet] || colorSet.confirmed

    return (
      <div
        className={cn(
          'absolute top-0 h-full rounded cursor-pointer',
          'text-xs flex items-center px-2 gap-1 border',
          enhancedColor
        )}
        style={{
          left: `${startColumn * SLOT_WIDTH + 1}px`, // 少し右にずらして視覚的な間隔を作る
          width: `${spanColumns * SLOT_WIDTH - 4}px`, // 間隔調整を改善
          zIndex: 20,
        }}
        onClick={() => onReservationClick(reservation)}
        title={`${reservation.is_free_nomination ? '[指名フリー] ' : ''}${reservation.customer_name} (${convertTimestampToHour(reservation.start_time_unix)} - ${convertTimestampToHour(reservation.end_time_unix)})`}
      >
        <div className="flex flex-col items-start gap-1 overflow-hidden">
          {reservation.is_free_nomination && (
            <span className="text-xs text-nowrap bg-purple-200 text-purple-800 px-1 rounded-full font-medium">
              指名フリー <small>(スタッフの変更可)</small>
            </span>
          )}
          <div className="flex items-center gap-1">
            {getStatusIcon(reservation.status)}
            <span className="truncate font-medium">
              {reservation.customer_name ?? t('nameNotSet')} 様
            </span>
          </div>
          {/* 時間表示（幅が十分な場合のみ） */}
          <div className="flex items-center justify-between w-full gap-1">
            {spanColumns > 6 && (
              <span className="text-xs opacity-75">
                {convertTimestampToHour(reservation.start_time_unix)}~
                {convertTimestampToHour(reservation.end_time_unix)}
              </span>
            )}
            <span className="text-xs opacity-75">{reservation.staff_name}</span>
          </div>
        </div>
      </div>
    )
  }
)

ReservationBarComponent.displayName = 'ReservationBarComponent'

const StaffTimelineRow = memo(
  ({
    staffData,
    timeSlots,
    onReservationClick,
  }: {
    staffData: StaffTimelineData
    timeSlots: TimeSlot[]
    selectedDate: Date
    onReservationClick: (reservation: ReservationWithDetails) => void
    isEven: boolean
  }) => {
    const t = useTranslations('reservations')
    // 予約データをバーに変換（最適化されたフック使用）
    const reservationBars = useReservationBars(staffData.reservations)

    return (
      <div
        className={cn(
          'flex z-30 transition-colors hover:border-accent-2 border-b border-border last:border-b h-full'
        )}
      >
        {/* スタッフ名（左端固定） */}
        <div className="sticky left-0 z-20 bg-background border-r border-border w-20 md:w-40 p-2 md:p-4 flex h-full items-center">
          <div className="flex flex-col md:flex-row items-center gap-3 w-full">
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center shadow-sm">
              {staffData.staff.images && staffData.staff.images.length > 0 ? (
                <Image
                  src={staffData.staff.images[0].thumbnail_url}
                  alt={staffData.staff.name}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <User className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0 w-full">
              <div className="font-semibold text-xs text-center  md:text-sm text-primary truncate">
                {staffData.staff.name}
              </div>
              <div className="text-xs text-link-foreground flex items-center gap-1">
                <Clock className="hidden md:block w-3 h-3" />
                {reservationBars.length}
                {t('reservationCount')}
              </div>
            </div>
          </div>
        </div>

        {/* タイムライン部分 */}
        <div className="relative flex-1 bg-background z-10">
          {/* 時間グリッド */}
          <div className="flex h-full">
            {timeSlots.map((slot) => {
              return (
                <div
                  key={slot.index}
                  className={cn(
                    'h-full transition-colors',
                    // 太い線を削除し、通常のボーダーのみ使用
                    slot.minutes % 60 === 0
                      ? 'w-24 border-l border-border'
                      : 'w-24 border-l border-border/50',

                    // 30分ごとに微妙な色の変化を追加
                    slot.minutes % 60 === 30 && 'bg-secondary'
                  )}
                />
              )
            })}
          </div>

          {/* 予約バー */}
          <div className="absolute inset-0">
            {reservationBars.map((bar, index) => (
              <ReservationBarComponent
                key={`${bar.reservation._id}-${index}`}
                bar={bar}
                onReservationClick={onReservationClick}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }
)

StaffTimelineRow.displayName = 'StaffTimelineRow'

// ■ 予約詳細ダイアログ
const ReservationDetailDialog = memo(
  ({
    reservation,
    isOpen,
    onClose,
  }: {
    reservation: ReservationWithDetails | null
    isOpen: boolean
    onClose: () => void
  }) => {
    const t = useTranslations('reservations')

    if (!reservation) return null

    const colorSet = reservation.is_free_nomination ? FREE_NOMINATION_COLORS : RESERVATION_COLORS
    const enhancedColor =
      colorSet[reservation.status as keyof typeof colorSet] || colorSet.confirmed

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reservation.is_free_nomination ? (
                <Shuffle className="w-5 h-5 text-purple-600" />
              ) : (
                <User className="w-5 h-5" />
              )}
              {t('detail')}
              {reservation.is_free_nomination && (
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium ml-2">
                  指名フリー
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-primary">{t('customerName')}</label>
                <p className="text-sm text-primary mt-1 font-medium">{reservation.customer_name}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-primary">{t('status')}</label>
                <div className="mt-1">
                  <Badge className={cn('text-xs px-2 py-1 rounded-full', enhancedColor)}>
                    {t(`statuses.${reservation.status}`)}
                  </Badge>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-primary">{t('dateTime')}</label>
              <div className="mt-1 p-3 bg-muted rounded-lg">
                <p className="text-sm text-primary flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  {convertTimestampToDateString(reservation.start_time_unix)}
                </p>
                <p className="text-sm text-primary flex items-center gap-2 mt-1">
                  <Clock className="w-4 h-4" />
                  {convertTimestampToHour(reservation.start_time_unix)} -{' '}
                  {convertTimestampToHour(reservation.end_time_unix)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-4">
              <Button asChild>
                <Link href={`/dashboard/reservation/${reservation._id}`}>{t('moreDetail')}</Link>
              </Button>
              {/* 顧客IDが存在する場合のみカルテリンクを表示 */}
              {reservation.customer_id && (
                <Button asChild>
                  <Link href={`/dashboard/carte/${reservation.customer_id}`}>カルテを確認する</Link>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }
)

ReservationDetailDialog.displayName = 'ReservationDetailDialog'

// ■ 統計情報コンポーネント
const StatsCards = memo(({ totalReservations }: { totalReservations: number }) => {
  const t = useTranslations('reservations')

  return (
    <div className="flex gap-4 pb-4">
      <Card className="flex items-center justify-between gap-4 px-2 py-1 bg-accent-2-foreground border-accent-2">
        <div className="text-xs text-accent-2 font-medium">{t('totalReservations')}</div>
        <div className="text-sm font-bold text-accent-2">
          {totalReservations}
          {t('count')}
        </div>
      </Card>
    </div>
  )
})

StatsCards.displayName = 'StatsCards'

// ■ 予約リストコンポーネント
const ReservationList = memo(
  ({
    reservations,
    onReservationClick,
  }: {
    reservations: ReservationWithDetails[]
    onReservationClick: (reservation: ReservationWithDetails) => void
  }) => {
    const t = useTranslations('reservations')

    // 予約を開始時間の早い順にソート
    const sortedReservations = [...reservations].sort((a, b) => {
      return a.start_time_unix - b.start_time_unix
    })

    return (
      <div className="p-4 space-y-3">
        {sortedReservations.map((reservation) => {
          const colorSet = reservation.is_free_nomination
            ? FREE_NOMINATION_COLORS
            : RESERVATION_COLORS
          const enhancedColor =
            colorSet[reservation.status as keyof typeof colorSet] || colorSet.confirmed

          // フリー指名用のボーダー色を設定
          const getBorderColor = () => {
            if (reservation.is_free_nomination) {
              return enhancedColor.includes('purple')
                ? 'palette-5'
                : enhancedColor.includes('orange')
                  ? 'palette-4'
                  : enhancedColor.includes('emerald')
                    ? 'palette-2'
                    : 'palette-5'
            }
            return enhancedColor.includes('emerald')
              ? 'palette-2'
              : enhancedColor.includes('amber')
                ? 'palette-4'
                : 'palette-5'
          }

          return (
            <Card
              key={reservation._id}
              className="cursor-pointer   border-l-4"
              style={{
                borderLeftColor: getBorderColor(),
              }}
              onClick={() => onReservationClick(reservation)}
            >
              <CardContent className="p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="font-semibold text-primary flex flex-wrap items-center gap-2">
                      {reservation.is_free_nomination ? (
                        <Shuffle className="w-4 h-4 text-palette-5 flex-shrink-0" />
                      ) : (
                        <User className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span className="break-all">{reservation.customer_name}</span>
                      {reservation.is_free_nomination && (
                        <span className="text-xs bg-palette-5-foreground text-palette-5 px-2 py-1 rounded-full font-medium whitespace-nowrap">
                          指名フリー
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-semibold">{t('assignedStaff')}</span>{' '}
                      <span className="break-all">{reservation.staff_name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span className="whitespace-nowrap">
                        {formatTimestamp(reservation.start_time_unix, { useJST: true })} -
                        {formatTimestamp(reservation.end_time_unix, { useJST: true })}
                      </span>
                    </div>
                  </div>
                  <div className="self-start sm:self-center">
                    <Badge
                      className={cn('px-3 py-1 rounded-full whitespace-nowrap', enhancedColor)}
                    >
                      {t(`statuses.${reservation.status}`)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }
)

ReservationList.displayName = 'ReservationList'

// ■ メインコンポーネント
export default function ReservationTimeLine() {
  const t = useTranslations('reservations')
  const locale = useLocale()
  // ■ ステート管理
  const { tenantId, orgId, ready } = useTenantAndOrganization()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithDetails | null>(
    null
  )

  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline')
  const [reservationCounts, setReservationCounts] = useState<{ date: string; count: number }[]>([])

  // ■ データ取得（最適化されたカスタムフック使用）
  const targetDateStr = format(selectedDate, 'yyyy-MM-dd')
  const { staffTimelineData, timeSlots, isLoading } = useTimelineData({
    tenantId,
    orgId,
    date: targetDateStr,
    ready,
  })

  // ■ 今日から2週間後までの予約件数を取得
  const today = useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0) // 時刻をリセット
    return date
  }, []) // 空の依存配列でコンポーネントマウント時のみ実行

  const twoWeeksLater = useMemo(() => addDays(today, 13), [today]) // 今日を含めて14日間
  const startDateStr = useMemo(() => format(today, 'yyyy-MM-dd'), [today])
  const endDateStr = useMemo(() => format(twoWeeksLater, 'yyyy-MM-dd'), [twoWeeksLater])

  const reservationCountsData = useQuery(
    api.reservation.query.getReservationCountsByDateRange,
    ready && tenantId && orgId
      ? {
          tenant_id: tenantId,
          org_id: orgId,
          start_date: startDateStr,
          end_date: endDateStr,
        }
      : 'skip'
  )

  // 全ての日付の予約件数データを生成（0件の日も含む）
  useEffect(() => {
    const allDates: { date: string; count: number }[] = []
    const dateCountMap = new Map<string, number>()

    // 予約データをマップに変換
    if (reservationCountsData) {
      reservationCountsData.forEach((item) => {
        dateCountMap.set(item.date, item.count)
      })
    }

    // 今日から14日間の全ての日付を生成
    for (let i = 0; i <= 13; i++) {
      // 今日を含めて14日間
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const dateStr = format(date, 'yyyy-MM-dd')
      allDates.push({
        date: dateStr,
        count: dateCountMap.get(dateStr) || 0,
      })
    }

    setReservationCounts(allDates)
  }, [reservationCountsData, today])

  // 表示用は30分単位
  const halfHourSlots = useMemo(
    () => timeSlots.filter((slot) => slot.minutes % 30 === 0),
    [timeSlots]
  )

  // ■ 全予約リストの計算（リストビュー用）
  const allReservations = useMemo(
    () => staffTimelineData.flatMap((staff) => staff.reservations),
    [staffTimelineData]
  )

  // ■ イベントハンドラー
  const handleReservationClick = useCallback((reservation: ReservationWithDetails) => {
    setSelectedReservation(reservation)
    setIsDetailDialogOpen(true)
  }, [])

  const handleDateChange = useCallback((days: number) => {
    setSelectedDate((prev) => (days > 0 ? addDays(prev, days) : subDays(prev, Math.abs(days))))
  }, [])

  const handleCloseDetailDialog = useCallback(() => {
    setIsDetailDialogOpen(false)
    setSelectedReservation(null)
  }, [])

  // ■ レンダリング
  if (!ready || isLoading) {
    return <Loading />
  }

  const isWeekendDate = isWeekend(selectedDate)

  return (
    <div className="h-fit bg-background w-full">
      {/* ヘッダー部分 */}
      <div className="w-full bg-background backdrop-blur-sm border-b-2 border-border space-y-4 shadow-sm">
        {/* 日付選択とビュー切り替え */}
        {/* 今日から2週間後までの予約件数を表示 */}
        <div className="px-4">
          <div className="flex items-center justify-start gap-2 mb-2">
            <h3 className="text-sm font-bold">予約状況（直近14日間）</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-neon rounded-full" />
                <span>予約あり</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {reservationCounts.map((item) => {
              const date = new Date(item.date)
              const dayOfWeek = format(date, 'E', { locale: locale === 'ja' ? ja : enUS })
              const isWeekend = date.getDay() === 0 || date.getDay() === 6
              const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
              const isSelected = format(date, 'yyyy-MM-dd') === targetDateStr

              return (
                <button
                  key={item.date}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    'flex flex-col items-center justify-center p-2 rounded-lg transition-all min-w-[52px] w-full ',
                    'border hover:border-primary/50 hover:shadow-sm',
                    isSelected && 'bg-link-foreground text-link border-link shadow-md',
                    isToday && !isSelected && 'border-primary font-semibold',
                    item.count > 0 && !isSelected && 'bg-neon-foreground border-neon',
                    isWeekend && !isSelected && 'text-destructive'
                  )}
                >
                  <span className="text-[10px] opacity-70">{dayOfWeek}</span>
                  <span className="text-sm font-medium">{format(date, 'd')}</span>
                  <div className="flex items-center justify-center gap-1">
                    {item.count > 0 && <div className="w-1.5 h-1.5 bg-neon rounded-full mt-0.5" />}
                    <span
                      className={cn(
                        'text-xs',
                        item.count > 0
                          ? 'font-bold'
                          : `text-muted-foreground opacity-50 ${isSelected ? 'text-muted' : ''}`
                      )}
                    >
                      {item.count}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between w-full px-4 pb-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4 w-full">
              <div className="flex items-center justify-end md:justify-start gap-2 w-full">
                <Button variant="outline" size="sm" onClick={() => handleDateChange(-1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {/* 予約がある日をマーカー付きで表示 */}
                <EnhancedDatePicker
                  value={selectedDate}
                  onChange={(date) => date && setSelectedDate(date)}
                  className={cn('w-fit', isWeekendDate && 'border-muted-foreground')}
                  reservationDates={reservationCounts
                    .filter((item) => item.count > 0)
                    .map((item) => item.date)}
                  reservationCounts={reservationCounts}
                />
                <Button variant="outline" size="sm" onClick={() => handleDateChange(1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-4 w-full md:mt-0 mt-4 ">
            <Button variant="outline" onClick={() => setSelectedDate(new Date())}>
              {t('today')}
            </Button>
            <div className="flex items-center gap-3">
              <Tabs
                value={viewMode}
                onValueChange={(value) => setViewMode(value as 'timeline' | 'list')}
              >
                <TabsList>
                  <TabsTrigger value="timeline">{t('timeline')}</TabsTrigger>
                  <TabsTrigger value="list">{t('list')}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="overflow-hidden">
        <Tabs value={viewMode} className="w-full">
          <TabsContent value="timeline" className="m-0">
            <div className="overflow-auto  bg-background pb-4">
              <div className="relative max-h-[calc(100vh-200px)] min-w-max">
                {/* タイムラインヘッダー */}
                <TimelineHeader timeSlots={halfHourSlots} />

                {/* スタッフ行 */}
                <div>
                  {staffTimelineData.map((staffData, index) => (
                    <StaffTimelineRow
                      key={staffData.staff._id}
                      staffData={staffData}
                      timeSlots={halfHourSlots}
                      selectedDate={selectedDate}
                      onReservationClick={handleReservationClick}
                      isEven={index % 2 === 0}
                    />
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="list" className="m-0">
            <ReservationList
              reservations={allReservations}
              onReservationClick={handleReservationClick}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* 予約詳細ダイアログ */}
      <ReservationDetailDialog
        reservation={selectedReservation}
        isOpen={isDetailDialogOpen}
        onClose={handleCloseDetailDialog}
      />
    </div>
  )
}

// ■ 拡張DatePickerコンポーネント（予約マーカー付き）
interface EnhancedDatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  className?: string
  reservationDates?: string[]
  reservationCounts?: { date: string; count: number }[]
}

function EnhancedDatePicker({
  value,
  onChange,
  className,
  reservationDates = [],
  reservationCounts = [],
}: EnhancedDatePickerProps) {
  const t = useTranslations('common')
  const locale = useLocale()
  const [isOpen, setIsOpen] = useState(false)

  // 予約データのマップを作成（日付→件数）
  const reservationCountMap = useMemo(() => {
    const map = new Map<string, number>()
    if (reservationCounts.length > 0) {
      // reservationCountsが渡された場合はそれを使用
      reservationCounts.forEach((item) => {
        if (item.count > 0) {
          map.set(item.date, item.count)
        }
      })
    } else {
      // 後方互換性のため、reservationDatesのみの場合
      reservationDates.forEach((dateStr) => {
        map.set(dateStr, 1)
      })
    }
    return map
  }, [reservationDates, reservationCounts])

  // カスタムDayContentコンポーネント
  const DayContent = (props: {
    date: Date
    displayMonth?: Date
    activeModifiers?: Record<string, boolean>
  }) => {
    const { date, activeModifiers } = props
    const dayNumber = format(date, 'd')
    const dateStr = format(date, 'yyyy-MM-dd')
    const hasReservation = reservationCountMap.has(dateStr)
    const count = reservationCountMap.get(dateStr) || 0

    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        <span className={cn(activeModifiers?.selected && 'text-primary-foreground')}>
          {dayNumber}
        </span>
        {hasReservation && count > 0 && (
          <span className="text-[7px] font-bold text-neon absolute top-0 right-0 bg-background rounded-full p-1.5 border border-neon h-3 w-3 flex items-center justify-center">
            {count}
          </span>
        )}
      </div>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-fit justify-start text-left font-normal h-9 bg-input',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          {value ? format(value, 'yyyy/MM/dd') : <span>{t('datePicker.selectDate')}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange?.(date)
            setIsOpen(false)
          }}
          initialFocus
          locale={locale === 'ja' ? ja : enUS}
          modifiers={{
            hasReservation: (date) => reservationCountMap.has(format(date, 'yyyy-MM-dd')),
          }}
          modifiersClassNames={{
            hasReservation: 'has-reservation',
          }}
          components={{
            DayContent,
          }}
          fromDate={new Date()}
          toDate={addDays(new Date(), 90)}
        />
      </PopoverContent>
    </Popover>
  )
}
