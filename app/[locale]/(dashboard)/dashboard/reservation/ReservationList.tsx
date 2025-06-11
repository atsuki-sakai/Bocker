'use client'

import React, { useState, useMemo, useCallback, memo, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { useTimelineData, useReservationBars } from '@/hooks/useTimelineData'
import type {
  StaffTimelineData,
  ReservationWithDetails,
  TimeSlot,
  ReservationBar,
} from '@/hooks/useTimelineData'
import { RESERVATION_COLORS } from '@/hooks/useTimelineData'
import { Loading } from '@/components/common'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CalendarDays, Clock, User, ChevronLeft, ChevronRight, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatTimestamp,
  convertTimestampToHour,
  convertTimestampToDateString,
} from '@/lib/schedules'
import { format, addDays, subDays, isWeekend } from 'date-fns'
import { formatDate } from '@/lib/formatDate'
import type { SupportedLocale } from '@/lib/dateLocale'
import Image from 'next/image'

// 1スロット（10分）の幅(px) - 隙間をなくすために調整
const SLOT_WIDTH = 32

// ■ メモ化されたコンポーネント
const TimelineHeader = memo(({ timeSlots }: { timeSlots: TimeSlot[] }) => {
  const t = useTranslations('reservations')
  return (
    <div className="flex sticky top-0 z-20 bg-background shadow-sm border-b border-border">
      {/* スタッフ名カラムのヘッダー */}
      <div className="sticky left-0 z-30 bg-background border-r border-border w-20 md:w-40 p-3 flex items-center justify-center font-bold text-muted-foreground">
        <User className="w-4 h-4 mr-2" />
        <span className="hidden md:block">{t('staff')}</span>
      </div>

      {/* 時間スロットヘッダー */}
      <div className="flex">
        {timeSlots.map((slot) => {
          return (
            <div
              key={slot.index}
              className={cn(
                'relative h-12 text-xs flex items-center justify-center transition-colors bg-secondary',
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

    const enhancedColor =
      RESERVATION_COLORS[reservation.status as keyof typeof RESERVATION_COLORS] ||
      RESERVATION_COLORS.confirmed

    return (
      <div
        className={cn(
          'absolute top-0 h-full rounded cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg',
          'text-xs flex items-center px-2 gap-1 border',
          enhancedColor,
          'shadow-sm hover:shadow-md'
        )}
        style={{
          left: `${startColumn * SLOT_WIDTH + 1}px`, // 少し右にずらして視覚的な間隔を作る
          width: `${spanColumns * SLOT_WIDTH - 4}px`, // 間隔調整を改善
          zIndex: 20,
        }}
        onClick={() => onReservationClick(reservation)}
        title={`${reservation.customer_name} (${convertTimestampToHour(reservation.start_time_unix)} - ${convertTimestampToHour(reservation.end_time_unix)})`}
      >
        {getStatusIcon(reservation.status)}
        <span className="truncate font-medium">{reservation.customer_name ?? t('nameNotSet')}</span>
        {/* 時間表示（幅が十分な場合のみ） */}
        {spanColumns > 6 && (
          <span className="ml-auto text-xs opacity-75">
            {convertTimestampToHour(reservation.start_time_unix)}
          </span>
        )}
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
          'flex  transition-colors hover:border-active border-b border-border last:border-b'
        )}
      >
        {/* スタッフ名（左端固定） */}
        <div className="sticky left-0 z-30 bg-background border-r border-border w-20 md:w-40 p-2 md:p-4 flex h-full items-center">
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
        <div className="relative flex-1 bg-background">
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

    const enhancedColor =
      RESERVATION_COLORS[reservation.status as keyof typeof RESERVATION_COLORS] ||
      RESERVATION_COLORS.confirmed

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t('detail')}
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
      <Card className="flex items-center justify-between gap-4 px-2 py-1 bg-active-foreground border-active">
        <div className="text-xs text-active font-medium">{t('totalReservations')}</div>
        <div className="text-sm font-bold text-active">
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
    return (
      <div className="p-4 space-y-3">
        {reservations.map((reservation) => {
          const enhancedColor =
            RESERVATION_COLORS[reservation.status as keyof typeof RESERVATION_COLORS] ||
            RESERVATION_COLORS.confirmed

          return (
            <Card
              key={reservation._id}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-l-4"
              style={{
                borderLeftColor: enhancedColor.includes('emerald')
                  ? '#008724FF'
                  : enhancedColor.includes('amber')
                    ? '#f59e0b'
                    : '#6b7280',
              }}
              onClick={() => onReservationClick(reservation)}
            >
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="font-semibold text-primary flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {reservation.customer_name}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="font-semibold">{t('assignedStaff')}</span>{' '}
                      {reservation.staff_name}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(reservation.start_time_unix, { useJST: true })} -
                      {formatTimestamp(reservation.end_time_unix, { useJST: true })}
                    </div>
                  </div>
                  <Badge className={cn('px-3 py-1 rounded-full', enhancedColor)}>
                    {t(`statuses.${reservation.status}`)}
                  </Badge>
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
export default function ReservationForm() {
  const t = useTranslations('reservations')
  const locale = useLocale() as SupportedLocale
  // ■ ステート管理
  const { tenantId, orgId, ready } = useTenantAndOrganization()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithDetails | null>(
    null
  )
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline')
  const [dateLabel, setDateLabel] = useState('')

  // ■ データ取得（最適化されたカスタムフック使用）
  const targetDateStr = format(selectedDate, 'yyyy-MM-dd')
  const { staffTimelineData, timeSlots, totalReservations, isLoading } = useTimelineData({
    tenantId,
    orgId,
    date: targetDateStr,
    ready,
  })

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

  // ■ 日付フォーマット
  useEffect(() => {
    const formatSelectedDate = async () => {
      const formatted = await formatDate(selectedDate, 'PPP', locale)
      setDateLabel(formatted)
    }
    formatSelectedDate()
  }, [selectedDate, locale])

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
    <div className="h-fit bg-background w-full py-2">
      {/* ヘッダー部分 */}
      <div className="sticky top-0 z-30 w-full bg-background backdrop-blur-sm border-b-2 border-border space-y-4 shadow-sm">
        {/* 日付選択とビュー切り替え */}
        <div className="flex flex-col md:flex-row items-center justify-between w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4 w-full">
              <div className="flex items-center gap-2 w-full">
                <Button variant="outline" size="sm" onClick={() => handleDateChange(-1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 border-2 rounded-xl shadow-sm',
                    isWeekendDate
                      ? 'bg-muted border-muted-foreground'
                      : 'bg-background border-border'
                  )}
                >
                  <CalendarDays className="w-4 h-4 text-link-foreground" />
                  <span className="text-xs md:text-base font-bold text-primary">{dateLabel}</span>
                  {isWeekendDate && (
                    <span className="text-xs text-destructive font-medium">{t('weekend')}</span>
                  )}
                </div>
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

        {/* 統計情報 */}
        <StatsCards totalReservations={totalReservations} />
      </div>

      {/* メインコンテンツ */}
      <div className="overflow-hidden">
        <Tabs value={viewMode} className="w-full">
          <TabsContent value="timeline" className="m-0">
            <div className="overflow-auto  bg-background">
              <div className="min-w-max">
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
