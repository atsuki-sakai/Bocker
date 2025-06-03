'use client'

import React, { useState, useMemo, useCallback, memo } from 'react'
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
import { ja } from 'date-fns/locale'
import Image from 'next/image'

// 1スロット（10分）の幅(px) - 隙間をなくすために調整
const SLOT_WIDTH = 32

// ■ メモ化されたコンポーネント
const TimelineHeader = memo(({ timeSlots }: { timeSlots: TimeSlot[] }) => (
  <div className="flex sticky top-0 z-20 bg-background shadow-sm border-b border-border">
    {/* スタッフ名カラムのヘッダー */}
    <div className="sticky left-0 z-30 bg-background border-r border-border w-40 p-3 flex items-center justify-center font-bold text-muted-foreground">
      <User className="w-4 h-4 mr-2" />
      スタッフ
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
))

TimelineHeader.displayName = 'TimelineHeader'

const ReservationBarComponent = memo(
  ({
    bar,
    onReservationClick,
  }: {
    bar: ReservationBar
    onReservationClick: (reservation: ReservationWithDetails) => void
  }) => {
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
        <span className="truncate font-medium">{reservation.customer_name ?? '名称未設定'}</span>
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
    // 予約データをバーに変換（最適化されたフック使用）
    const reservationBars = useReservationBars(staffData.reservations)

    return (
      <div
        className={cn(
          'flex  transition-colors hover:border-active border-b border-border last:border-b'
        )}
      >
        {/* スタッフ名（左端固定） */}
        <div className="sticky left-0 z-30 bg-background border-r border-border w-40 p-4 flex h-full items-center">
          <div className="flex items-center gap-3 w-full">
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
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-primary truncate">
                {staffData.staff.name}
              </div>
              <div className="text-xs text-link-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {reservationBars.length}件の予約
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
              予約詳細
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-primary">顧客名</label>
                <p className="text-sm text-primary mt-1 font-medium">{reservation.customer_name}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-primary">ステータス</label>
                <div className="mt-1">
                  <Badge className={cn('text-xs px-2 py-1 rounded-full', enhancedColor)}>
                    {reservation.status}
                  </Badge>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-primary">予約日時</label>
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
const StatsCards = memo(
  ({
    totalReservations,
    activeStaffCount,
  }: {
    totalReservations: number
    activeStaffCount: number
  }) => (
    <div className="flex gap-4 pb-4">
      <Card className="flex items-center justify-between gap-4 px-2 py-1 bg-palette-3 border-palette-3-foreground">
        <div className="text-xs text-palette-3-foreground font-medium">総予約数</div>
        <div className="text-sm font-bold text-palette-3-foreground">{totalReservations}件</div>
      </Card>
      <Card className="flex items-center justify-between gap-4 px-2 py-1 bg-active-foreground border-active">
        <div className="text-xs text-active font-medium">アクティブスタッフ</div>
        <div className="text-sm font-bold text-active">{activeStaffCount}名</div>
      </Card>
    </div>
  )
)

StatsCards.displayName = 'StatsCards'

// ■ 予約リストコンポーネント
const ReservationList = memo(
  ({
    reservations,
    onReservationClick,
  }: {
    reservations: ReservationWithDetails[]
    onReservationClick: (reservation: ReservationWithDetails) => void
  }) => (
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
                    <span className="font-semibold">担当スタッフ</span> {reservation.staff_name}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(reservation.start_time_unix, { useJST: true })} -
                    {formatTimestamp(reservation.end_time_unix, { useJST: true })}
                  </div>
                </div>
                <Badge className={cn('px-3 py-1 rounded-full', enhancedColor)}>
                  {reservation.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
)

ReservationList.displayName = 'ReservationList'

// ■ メインコンポーネント
export default function ReservationForm() {
  // ■ ステート管理
  const { tenantId, orgId, ready } = useTenantAndOrganization()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithDetails | null>(
    null
  )
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline')

  // ■ データ取得（最適化されたカスタムフック使用）
  const targetDateStr = format(selectedDate, 'yyyy-MM-dd')
  const { staffTimelineData, timeSlots, totalReservations, activeStaffCount, isLoading } =
    useTimelineData({
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
    <div className="h-fit bg-background py-2">
      {/* ヘッダー部分 */}
      <div className="sticky top-0 z-30 bg-background backdrop-blur-sm border-b-2 border-border space-y-4 shadow-sm">
        {/* 日付選択とビュー切り替え */}
        <div className="flex items-center justify-between ">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDateChange(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div
                className={cn(
                  'flex items-center gap-2 px-4 py-2 border-2 rounded-xl shadow-sm',
                  isWeekendDate ? 'bg-muted border-muted-foreground' : 'bg-background border-border'
                )}
              >
                <CalendarDays className="w-4 h-4 text-link-foreground" />
                <span className="font-bold text-primary">
                  {format(selectedDate, 'yyyy年MM月dd日(E)', { locale: ja })}
                </span>
                {isWeekendDate && (
                  <span className="text-xs text-destructive font-medium">土日</span>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => handleDateChange(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button variant="outline" onClick={() => setSelectedDate(new Date())}>
              今日
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Tabs
              value={viewMode}
              onValueChange={(value) => setViewMode(value as 'timeline' | 'list')}
            >
              <TabsList>
                <TabsTrigger value="timeline">タイムライン</TabsTrigger>
                <TabsTrigger value="list">リスト</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* 統計情報 */}
        <StatsCards totalReservations={totalReservations} activeStaffCount={activeStaffCount} />
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
