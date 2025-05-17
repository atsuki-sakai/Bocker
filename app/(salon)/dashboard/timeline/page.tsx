// カレンダーの日付表示部分を修正し、予約がある日には特別なマークを表示する
'use client';

import { ChevronLeft, ChevronRight, Ellipsis, Loader2 } from 'lucide-react'
import { DashboardSection } from '@/components/common'
import { useSalon } from '@/hooks/useSalon'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { useStablePaginatedQuery } from '@/hooks/useStablePaginatedQuery'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'
import { useRef, useState, useEffect, useMemo } from 'react'
import {
  startOfWeek as startOfWeekFns,
  endOfWeek as endOfWeekFns,
  format,
  isSameDay,
  isToday,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { Id, Doc } from '@/convex/_generated/dataModel'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePaginatedQuery } from 'convex/react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { useRouter, useSearchParams } from 'next/navigation'

export default function TimelinePage() {
  const { salonId } = useSalon()
  const router = useRouter()
  const searchParams = useSearchParams()

  // クエリパラメータから初期値を取得
  const initialStaffId = searchParams.get('staffId') as Id<'staff'> | null
  const initialDate = searchParams.get('date') ? new Date(searchParams.get('date')!) : new Date()
  const initialViewMode =
    searchParams.get('viewMode') === 'day' || searchParams.get('viewMode') === 'week'
      ? (searchParams.get('viewMode') as 'week' | 'day')
      : 'week'

  const containerOffset = useRef<HTMLDivElement | null>(null)
  const [selectedStaffId, setSelectedStaffId] = useState<Id<'staff'> | null>(initialStaffId)
  const [currentDate, setCurrentDate] = useState<Date>(
    initialViewMode === 'week' ? initialDate : new Date()
  )
  const [selectedDate, setSelectedDate] = useState<Date>(
    initialViewMode === 'day' ? initialDate : new Date()
  )
  const [viewMode, setViewMode] = useState<'week' | 'day'>(initialViewMode)

  const [currentReservations, setCurrentReservations] = useState<Doc<'reservation'>[]>([])
  const [currentSchedules, setCurrentSchedules] = useState<Doc<'staff_schedule'>[]>([])

  // FIXME: 100件ずつ取得しているので、100件以上の予約がある場合は、ページネーションを実装する
  const { results: reservations, isLoading: isReservationsLoading } = useStablePaginatedQuery(
    api.reservation.query.findBySalonIdAndStaffId,
    salonId && selectedStaffId
      ? {
          salonId,
          staffId: selectedStaffId,
        }
      : 'skip',
    {
      initialNumItems: 100,
    }
  )

  const { results: staffSchedules } = useStablePaginatedQuery(
    api.schedule.staff_exception.query.listBySalonAndStaffId,
    salonId && selectedStaffId
      ? {
          salonId,
          staffId: selectedStaffId,
        }
      : 'skip',
    {
      initialNumItems: 100,
    }
  )

  console.log('staffSchedules', staffSchedules)
  useEffect(() => {
    if (staffSchedules) {
      setCurrentSchedules(staffSchedules)
    }
  }, [staffSchedules])

  const staffs = usePaginatedQuery(
    api.staff.core.query.getStaffListBySalonId,
    salonId
      ? {
          salonId,
        }
      : 'skip',
    {
      initialNumItems: 50,
    }
  )

  // 曜日の配列（日本語）
  const weekDays: string[] = ['月', '火', '水', '木', '金', '土', '日']
  const weekDaysFull: string[] = [
    '月曜日',
    '火曜日',
    '水曜日',
    '木曜日',
    '金曜日',
    '土曜日',
    '日曜日',
  ]

  // ビューモードに応じたカラム数クラス（SP/PC 共通）
  const gridColsClass = viewMode === 'week' ? 'grid-cols-8' : 'grid-cols-1'

  // SP 週表示時は横スクロール出来る様に最小幅を確保し、PC では自動調整
  const timelineContainerWidthClass = viewMode === 'week' ? 'min-w-[720px] md:min-w-0' : 'w-full'

  // 現在の週の日付を計算
  const getDaysOfWeek = (): Date[] => {
    const days: Date[] = []
    const day = new Date(startOfWeekFns(currentDate, { weekStartsOn: 1 }))

    for (let i = 0; i < 7; i++) {
      days.push(new Date(day))
      day.setDate(day.getDate() + 1)
    }

    return days
  }

  const daysOfWeek = getDaysOfWeek()

  // 予約のある日を特定する関数
  const datesWithReservations = useMemo(() => {
    if (!currentReservations || currentReservations.length === 0) return {}

    const dates: Record<string, boolean> = {}

    currentReservations.forEach((reservation) => {
      // startTime_unix はミリ秒のタイムスタンプなので、そのまま使用
      const startTime = new Date(reservation.startTime_unix!)
      const dateKey = format(startTime, 'yyyy-MM-dd')
      dates[dateKey] = true
    })

    return dates
  }, [currentReservations])

  // 当日に予約があるかをチェックする関数
  const hasReservationsOnDate = (date: Date): boolean => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return !!datesWithReservations[dateKey]
  }

  const renderSchedules = () => {
    if (!currentSchedules) return null
    return currentSchedules.map((schedule) => {
      const startTime = new Date(schedule.startTime_unix!)
      // ビュー外のスケジュールは表示しない
      if (viewMode === 'week') {
        if (
          startTime < startOfWeekFns(currentDate, { weekStartsOn: 1 }) ||
          startTime > endOfWeekFns(currentDate, { weekStartsOn: 1 })
        )
          return null
      } else {
        if (!isSameDay(startTime, selectedDate)) return null
      }
      const endTime = new Date(schedule.endTime_unix!)
      // 全日スケジュール
      if (schedule.isAllDay) {
        // 全日スケジュール: 00:00から23:59まで赤く表示
        const dayIndex = (new Date(schedule.startTime_unix!).getDay() + 6) % 7
        const colStart = viewMode === 'week' ? dayIndex + 2 : 1
        return (
          <li
            key={`sched-${schedule._id}`}
            className="relative flex]"
            style={{
              gridColumn: `${colStart} / span 1`,
              gridRow: `2 / span 576`,
            }}
          >
            <div className="absolute inset-1 bg-palette-4 opacity-75 rounded-md">
              <p className="text-xs p-2 font-bold text-center text-palette-4-foreground">
                {schedule.isAllDay ? '終日' : 'スケジュール'}
              </p>
              <p className="text-xs p-2 text-center text-palette-4-foreground">
                {schedule.notes ? `(${schedule.notes})` : ''}
              </p>
            </div>
          </li>
        )
      }
      // 部分スケジュール（赤く表示）
      const dayIndex = (startTime.getDay() + 6) % 7
      const colStart = viewMode === 'week' ? dayIndex + 2 : 1
      const startRow = startTime.getHours() * 24 + Math.floor(startTime.getMinutes() / 2.5) + 2
      const totalMinutes = (endTime.getTime() - startTime.getTime()) / 60000
      const rowSpan = Math.ceil(totalMinutes / 2.5)
      return (
        <li
          key={`sched-${schedule._id}`}
          className="relative mt-px flex"
          style={{
            gridRow: `${startRow} / span ${rowSpan}`,
            gridColumn: `${colStart} / span 1`,
          }}
        >
          <div className="absolute inset-1 bg-palette-4 opacity-75 rounded-md flex items-start justify-center p-2 overflow-scroll">
            <p className="text-xs text-start text-palette-4-foreground">
              {schedule.isAllDay ? '全日' : 'スケジュール'}
              {schedule.isAllDay
                ? '00:00 - 24:00'
                : `${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}`}
            </p>
          </div>
        </li>
      )
    })
  }

  const renderReservations = () => {
    if (!currentReservations) return null

    return currentReservations.map((reservation) => {
      // startTime_unix, endTime_unix はミリ秒のタイムスタンプなので、そのまま使用
      const startTime = new Date(reservation.startTime_unix!)
      const endTime = new Date(reservation.endTime_unix!)

      // 週表示の場合は週内の予約を全て表示
      // 日表示の場合は選択された日付の予約のみを表示
      if (viewMode === 'week') {
        if (
          startTime < startOfWeekFns(currentDate, { weekStartsOn: 1 }) ||
          startTime > endOfWeekFns(currentDate, { weekStartsOn: 1 })
        )
          return null
      } else {
        // 選択された日付と同じ日付かどうかをチェック
        if (!isSameDay(startTime, selectedDate)) return null
      }

      // 日本の曜日（月曜始まり）に合わせて調整
      let dayOfWeek = startTime.getDay() - 1 // 0が月曜、6が日曜
      if (dayOfWeek < 0) dayOfWeek = 6 // 日曜日の場合

      // 週表示のときは各曜日の列に配置
      // 日表示のときは1列目に配置
      const colStart = viewMode === 'week' ? dayOfWeek + 2 : 1

      const hours = startTime.getHours()
      const minutes = startTime.getMinutes()
      const startRow = hours * 24 + Math.floor(minutes / 2.5) + 2

      const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60)
      const rowSpan = Math.ceil(totalMinutes / 2.5)

      return (
        <li
          key={reservation._id}
          className="relative mt-px flex"
          style={{
            gridRow: `${startRow} / span ${rowSpan}`,
            gridColumn: `${colStart} / span 1`,
          }}
        >
          <Link
            href={`/dashboard/reservation/${reservation._id}`}
            className="group absolute z-0 inset-1 flex flex-col overflow-y-auto rounded-md bg-palette-5 p-2 text-xs/5 hover:opacity-80 transition-opacity duration-200"
          >
            <p className="order-1 font-semibold text-palette-5-foreground">
              {reservation.staffName}
            </p>
            <p className="text-palette-5-foreground group-hover:text-palette-5-foreground">
              <time dateTime={startTime.toISOString()}>
                {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
              </time>
            </p>
            <p className="mt-1 text-palette-5-foreground">
              ¥{reservation.totalPrice?.toLocaleString()}
            </p>
          </Link>
        </li>
      )
    })
  }

  // 24時間分の時間表示を生成する関数
  const renderTimeSlots = () => {
    const slots: React.ReactNode[] = []

    for (let i = 0; i < 24; i++) {
      const hour = i
      const ampm = hour < 12 ? '午前' : '午後'
      const hour12 = hour % 12 === 0 ? 12 : hour % 12

      slots.push(
        <div key={`hour-${i}`}>
          <div className="sticky left-0 z-20 -mt-2.5 -ml-14 w-14 pr-2 text-right text-xs/5 text-gray-400 text-nowrap">
            {ampm}
            {hour12}時
          </div>
        </div>
      )
      slots.push(<div key={`hour-half-${i}`} />)
    }

    return slots
  }

  // クエリパラメータを更新する関数
  const updateQueryParams = (params: {
    staffId?: Id<'staff'> | null
    date?: Date
    viewMode?: 'week' | 'day'
  }) => {
    const sp = new URLSearchParams(searchParams.toString())
    if (params.staffId !== undefined) {
      if (params.staffId) sp.set('staffId', params.staffId)
      else sp.delete('staffId')
    }
    if (params.date !== undefined) {
      if (params.date) sp.set('date', params.date.toISOString())
      else sp.delete('date')
    }
    if (params.viewMode !== undefined) {
      sp.set('viewMode', params.viewMode)
    }
    router.replace(`?${sp.toString()}`)
  }

  // スタッフ選択時
  const handleStaffChange = (value: Id<'staff'>) => {
    setSelectedStaffId(value)
    updateQueryParams({ staffId: value })
  }

  // 日付選択時
  const handleDateChange = (date: Date) => {
    if (viewMode === 'week') {
      setCurrentDate(date)
      updateQueryParams({ date, viewMode: 'week' })
    } else {
      setSelectedDate(date)
      updateQueryParams({ date, viewMode: 'day' })
    }
  }

  // ビューモード切替時
  const handleViewModeToggle = () => {
    const newMode = viewMode === 'week' ? 'day' : 'week'
    setViewMode(newMode)
    updateQueryParams({ viewMode: newMode, date: newMode === 'week' ? currentDate : selectedDate })
  }

  // 前の日/週へ移動
  const moveToPrevious = (): void => {
    if (viewMode === 'week') {
      const newDate = new Date(currentDate)
      newDate.setDate(currentDate.getDate() - 7)
      setCurrentDate(newDate)
      updateQueryParams({ date: newDate, viewMode: 'week' })
    } else {
      const newDate = new Date(selectedDate)
      newDate.setDate(selectedDate.getDate() - 1)
      setSelectedDate(newDate)
      updateQueryParams({ date: newDate, viewMode: 'day' })
    }
  }

  // 次の日/週へ移動
  const moveToNext = (): void => {
    if (viewMode === 'week') {
      const newDate = new Date(currentDate)
      newDate.setDate(currentDate.getDate() + 7)
      setCurrentDate(newDate)
      updateQueryParams({ date: newDate, viewMode: 'week' })
    } else {
      const newDate = new Date(selectedDate)
      newDate.setDate(selectedDate.getDate() + 1)
      setSelectedDate(newDate)
      updateQueryParams({ date: newDate, viewMode: 'day' })
    }
  }

  // 今日/今週へ移動
  const moveToToday = (): void => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
    updateQueryParams({ date: new Date(), viewMode })
  }

  // 予約データの更新
  useEffect(() => {
    if (reservations) {
      setCurrentReservations(reservations)
    }
  }, [reservations])

  return (
    <DashboardSection backLink="/dashboard/timeline" backLinkTitle="タイムラインに戻る">
      <div className="flex h-full flex-col">
        <div className="sticky bg-background z-10 md:pt-5">
          <header className="flex flex-none items-center justify-between border-b border-border md:px-6 pb-2">
            <h1 className="text-sm md:text-lg font-semibold text-primary">
              {viewMode === 'week' ? (
                <time
                  className="flex flex-col md:flex-row items-center justify-center gap-1"
                  dateTime={`${format(startOfWeekFns(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')}/${format(endOfWeekFns(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')}`}
                >
                  <span className="font-bold text-base md:text-xl">
                    {format(startOfWeekFns(currentDate, { weekStartsOn: 1 }), 'yyyy年MM月dd日', {
                      locale: ja,
                    })}
                  </span>
                  <div className=" text-muted-foreground text-xs">から</div>
                  <span className="font-bold text-base md:text-xl">
                    {format(endOfWeekFns(currentDate, { weekStartsOn: 1 }), 'yyyy年MM月dd日', {
                      locale: ja,
                    })}
                  </span>
                </time>
              ) : (
                <time dateTime={format(selectedDate, 'yyyy-MM-dd')}>
                  {format(selectedDate, 'yyyy年MM月dd日', { locale: ja })}
                  <div className="md:hidden ml-2 inline-block text-muted-foreground text-xs">
                    ({weekDaysFull[selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1]})
                  </div>
                </time>
              )}
            </h1>
            <div className="flex flex-col gap-2">
              <div className="md:hidden flex flex-col gap-2 items-end justify-end">
                <div className="w-fit min-w-[180px]">
                  <Select value={selectedStaffId ?? ''} onValueChange={handleStaffChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="スタッフを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffs.results?.map((staff) => (
                        <SelectItem key={staff._id} value={staff._id}>
                          {staff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center">
                <div className="relative flex items-center rounded-md bg-background shadow-xs md:items-stretch">
                  <button
                    type="button"
                    className="flex h-9 w-12 items-center justify-center rounded-l-md border-y border-l border-border pr-1 text-muted-foreground hover:text-primary focus:relative md:w-9 md:pr-0 md:hover:bg-muted"
                    onClick={moveToPrevious}
                  >
                    <span className="sr-only">{viewMode === 'week' ? '前週' : '前日'}</span>
                    <ChevronLeft className="size-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="hidden border-y border-border px-3.5 text-sm font-semibold text-primary hover:bg-muted focus:relative md:block"
                    onClick={moveToToday}
                  >
                    今日
                  </button>
                  <span className="relative -mx-px h-5 w-px bg-border md:hidden" />
                  <button
                    type="button"
                    className="flex h-9 w-12 items-center justify-center rounded-r-md border-y border-r border-border pl-1 text-primary hover:text-primary focus:relative md:w-9 md:pl-0 md:hover:bg-muted"
                    onClick={moveToNext}
                  >
                    <span className="sr-only">{viewMode === 'week' ? '次週' : '翌日'}</span>
                    <ChevronRight className="size-5" aria-hidden="true" />
                  </button>
                </div>
                {/* ビューモード切替ボタン（PC表示専用） */}
                <button
                  type="button"
                  onClick={handleViewModeToggle}
                  className="ml-4 hidden md:inline-flex items-center rounded-md border border-border bg-background px-3.5 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-muted"
                >
                  {viewMode === 'day' ? '週表示' : '日表示'}
                </button>
                <div className="hidden md:ml-4 md:flex md:flex-col md:items-center">
                  <Select value={selectedStaffId ?? ''} onValueChange={handleStaffChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="スタッフを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffs.results?.map((staff) => (
                        <SelectItem key={staff._id} value={staff._id}>
                          {staff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Menu as="div" className="relative ml-6 md:hidden">
                  <MenuButton className="-mx-2 flex items-center rounded-full border border-transparent p-2 text-muted-foreground hover:text-primary">
                    <span className="sr-only">メニューを開く</span>
                    <Ellipsis className="size-5" aria-hidden="true" />
                  </MenuButton>

                  <MenuItems
                    transition
                    className="absolute right-0 z-20 mt-3 w-36 origin-top-right divide-y divide-border overflow-hidden rounded-md bg-background shadow-lg ring-1 ring-black/5 focus:outline-hidden data-closed:scale-95 data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                  >
                    <div className="py-1">
                      <MenuItem>
                        <a
                          href="#"
                          className="block px-4 py-2 text-sm text-muted-foreground data-focus:bg-muted data-focus:text-primary data-focus:outline-hidden"
                          onClick={moveToToday}
                        >
                          今日へ移動
                        </a>
                      </MenuItem>
                      <MenuItem>
                        <Link
                          href="#"
                          className="block px-4 py-2 text-sm text-muted-foreground data-focus:bg-muted data-focus:text-primary data-focus:outline-hidden"
                          onClick={handleViewModeToggle}
                        >
                          {viewMode === 'day' ? '週表示に切り替え' : '日表示に切り替え'}
                        </Link>
                      </MenuItem>
                    </div>
                  </MenuItems>
                </Menu>
              </div>
            </div>
          </header>
        </div>
        {reservations && reservations.length > 0 ? (
          <div className="flex h-full flex-col">
            <ScrollArea className="relative h-[calc(100vh-15rem)]">
              <div className="flex flex-auto flex-col">
                {/* 日付ヘッダー部分（モバイル） - 日本語化 */}
                {viewMode === 'week' && (
                  <div
                    className={`grid h-20 border-b border-border ${gridColsClass} bg-background ${timelineContainerWidthClass}`}
                    style={{ gridTemplateRows: '1.75rem repeat(576, minmax(0, 1fr)) auto' }}
                  >
                    <div className="min-w-[56px]"></div>
                    {daysOfWeek.map((date, index) => {
                      const dateIsToday = isToday(date)
                      const isSelected = date.toDateString() === selectedDate.toDateString()
                      const hasReservations = hasReservationsOnDate(date)
                      return (
                        <button
                          key={index}
                          type="button"
                          className="flex flex-col items-center pt-2 pb-3 bg-background"
                          onClick={() => {
                            handleDateChange(date)
                          }}
                        >
                          <div className="flex items-center justify-center">
                            {weekDays[index]}{' '}
                            {hasReservations && (
                              <span className="ml-1 w-1.5 h-1.5 bg-active text-active-foreground rounded-full" />
                            )}
                          </div>
                          <span
                            className={`mt-1 flex size-8 items-center justify-center py-3 ${
                              dateIsToday
                                ? 'rounded-full bg-active font-semibold text-active-foreground'
                                : isSelected
                                  ? 'rounded-full bg-active font-semibold text-active-foreground'
                                  : hasReservations
                                    ? 'font-semibold text-active ring-1 ring-active bg-active-foreground rounded-full'
                                    : 'font-semibold text-active'
                            }`}
                          >
                            {date.getDate()}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
                {viewMode === 'day' && (
                  <div className="grid grid-cols-1 text-sm/6 text-muted-foreground sm:hidden">
                    <div className="flex justify-center items-center pt-2 pb-3">
                      <span className="font-medium">
                        {weekDaysFull[selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1]}
                      </span>
                      {hasReservationsOnDate(selectedDate) && (
                        <span className="ml-2 bg-active text-active-foreground px-2 py-0.5 rounded-full text-xs font-medium">
                          予約あり
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className={`flex flex-none flex-col ${timelineContainerWidthClass}`}>
                  <div className="flex flex-auto">
                    <div className="grid flex-auto grid-cols-1 grid-rows-1">
                      {/* 時間の行 - 24時間分に修正 */}
                      <div
                        className={`col-start-1 col-end-2 row-start-1 grid divide-y divide-border`}
                        style={{ gridTemplateRows: 'repeat(48, minmax(3.5rem, 1fr))' }}
                      >
                        <div ref={containerOffset} className="row-end-1 h-7"></div>
                        {renderTimeSlots()}
                      </div>

                      {/* gridの線 - 境界線を追加 */}
                      <div
                        className={`col-start-1 col-end-2 row-start-1 ${
                          viewMode === 'week' ? 'grid' : 'hidden'
                        } grid-rows-1 divide-x divide-border ${gridColsClass}`}
                      >
                        {viewMode === 'week' ? (
                          <>
                            <div className="col-start-1 row-span-full border-r border-border" />
                            <div className="col-start-2 row-span-full border-r border-border" />
                            <div className="col-start-3 row-span-full border-r border-border" />
                            <div className="col-start-4 row-span-full border-r border-border" />
                            <div className="col-start-5 row-span-full border-r border-border" />
                            <div className="col-start-6 row-span-full border-r border-border" />
                            <div className="col-start-7 row-span-full border-r border-border" />
                            <div className="col-start-8 row-span-full w-8 hidden sm:block" />
                          </>
                        ) : (
                          <div className="col-start-1 row-span-full border-r border-border" />
                        )}
                      </div>

                      {/* イベント表示エリア */}
                      <ol
                        className={`col-start-1 col-end-2 row-start-1 grid ${gridColsClass}`}
                        style={{ gridTemplateRows: '1.75rem repeat(576, minmax(0, 1fr)) auto' }}
                      >
                        <div className="w-[56px]"></div>
                        {renderSchedules()}
                        {renderReservations()}
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
              {viewMode === 'week' && <ScrollBar orientation="horizontal" />}
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </div>
        ) : isReservationsLoading && selectedStaffId ? (
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-center h-full pt-24 py-12 px-4 sm:px-6 lg:px-8">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            </div>
          </div>
        ) : reservations.length === 0 && selectedStaffId ? (
          <div className="flex-1 overflow-y-auto bg-muted rounded-md mt-4">
            <div className="flex items-center justify-center h-full py-12 px-4 sm:px-6 lg:px-8">
              <p className="text-muted-foreground text-sm">予約がありません。</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-muted rounded-md mt-4">
            <div className="flex items-center justify-center h-full py-12 px-4 sm:px-6 lg:px-8">
              <p className="text-muted-foreground text-sm">
                右上のプルダウンからスタッフを選択して予約を表示してください。
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardSection>
  )
}
