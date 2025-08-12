'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { ja } from 'date-fns/locale'
import { startOfToday, format, addDays, isSameDay } from 'date-fns'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { TimeRange } from '@/lib/types'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { Loader2, AlertCircle } from 'lucide-react'
import { useQuery, usePaginatedQuery } from 'convex/react'
import { Loading } from '@/components/common'
import { parseISO } from 'date-fns'
import { toast } from 'sonner'

type DateViewProps = {
  tenantId: Id<'tenant'>
  orgId: Id<'organization'>
  selectedDate: Date | null
  selectedStaff: Doc<'staff'> | 'free' | null
  totalMinutes: number
  selectedTime: TimeRange | null
  selectedMenuIds: Id<'menu'>[]
  selectedOptionIds: Id<'option'>[]
  onChangeDateAction: (date: Date) => void
  onChangeTimeAction: (time: TimeRange) => void
}

export const DateView = ({
  tenantId,
  orgId,
  selectedDate,
  selectedStaff,
  totalMinutes,
  selectedTime,
  selectedMenuIds,
  selectedOptionIds,
  onChangeDateAction,
  onChangeTimeAction,
}: DateViewProps) => {
  const { showErrorToast } = useErrorHandler()
  const [availableTimes, setAvailableTimes] = useState<TimeRange[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate || startOfToday())
  const [isFreenomination, setIsFreenomination] = useState(selectedStaff === 'free')

  // 予約設定を取得
  const reservationConfig = useQuery(api.organization.reservation_config.query.findByTenantAndOrg, {
    tenant_id: tenantId,
    org_id: orgId,
  })

  const organizationExceptionDates = useQuery(
    api.organization.exception_schedule.query.displayExceptionSchedule,
    {
      tenant_id: tenantId,
      org_id: orgId,
      date: new Date()
        .toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        .replace(/\//g, '-'),
      take: 30,
    }
  )

  const organizationWeeekSchedule = useQuery(
    api.organization.week_schedule.query.getAllByTenantAndOrg,
    {
      tenant_id: tenantId,
      org_id: orgId,
    }
  )

  const { results: staffExceptionDates, isLoading: staffExceptionDatesLoading } = usePaginatedQuery(
    api.staff.exception_schedule.query.listByTenantOrgStaff,
    selectedStaff && selectedStaff !== 'free'
      ? {
          tenant_id: tenantId,
          org_id: orgId,
          staff_id: selectedStaff._id,
          is_all_day: true,
        }
      : 'skip',
    {
      initialNumItems: 30,
    }
  )

  const staffWeekSchedule = useQuery(
    api.staff.week_schedule.query.getByTenantOrgStaff,
    selectedStaff && selectedStaff !== 'free'
      ? {
          tenant_id: tenantId,
          org_id: orgId,
          staff_id: selectedStaff._id,
        }
      : 'skip'
  )

  // カレンダーで選択された日付を処理
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return

    // 選択した日付をそのまま親へ渡す (00:00 ローカルタイム)
    onChangeDateAction(date)
  }

  const handleTimeSelect = (time: TimeRange) => {
    if (!selectedDate) return

    // スタッフ指名時のみ、重複予約の上限チェックを事前に実施
    const validateAndSelect = async () => {
      // フリー指名の場合はスキップ（統合計算で除外済み）
      console.log('selectedStaff', selectedStaff)
      if (selectedStaff && selectedStaff !== 'free' && !isFreenomination) {
        console.log('free')
        const startDateTime = new Date(selectedDate)
        const [sh, sm] = time.startHour.split(':').map(Number)
        startDateTime.setHours(sh, sm, 0, 0)
        const endDateTime = new Date(selectedDate)
        const [eh, em] = time.endHour.split(':').map(Number)
        endDateTime.setHours(eh, em, 0, 0)

        try {
          const isConflict = await fetchQuery(api.reservation.query.checkDoubleBooking, {
            tenant_id: tenantId,
            org_id: orgId,
            staff_id: selectedStaff._id,
            date: format(selectedDate, 'yyyy-MM-dd'),
            start_time_unix: startDateTime.getTime(),
            end_time_unix: endDateTime.getTime(),
          })

          if (isConflict) {
            toast.error('この時間帯の最大同時予約数は上限です。別の時間を選択してください。')
            return
          }
        } catch (err) {
          showErrorToast(err)
          return
        }
      }

      // 重複がない場合のみ反映
      onChangeTimeAction(time)
    }

    validateAndSelect()
  }

  // スタッフまたは日付が変更された時のみ利用可能時間を取得
  useEffect(() => {
    if (!selectedStaff || !selectedDate) {
      setAvailableTimes([])
      return
    }

    // メニューが選択されていない場合は空き時間を計算できない
    if (selectedStaff === 'free' && selectedMenuIds.length === 0) {
      setAvailableTimes([])
      setIsFreenomination(true)
      return
    }

    setIsLoading(true)

    // 指名フリーの場合は統合空き時間を取得
    if (selectedStaff === 'free') {
      fetchQuery(api.reservation.query.calculateIntegratedAvailableTimes, {
        tenant_id: tenantId,
        org_id: orgId,
        menu_ids: selectedMenuIds,
        option_ids: selectedOptionIds,
        date: format(selectedDate, 'yyyy-MM-dd'),
      })
        .then((result) => {
          console.log('result', result)
          console.log('result.available', result.available)
          console.log('result.timeSlots', result.timeSlots)
          if (result.available && result.timeSlots) {
            // 統合スロットをTimeRange形式に変換
            const timeRanges = result.timeSlots.map((slot) => ({
              startHour: slot.start, // "14:00"
              endHour: slot.end, // "15:00"
            }))

            setAvailableTimes(timeRanges)
          } else {
            setAvailableTimes([])
          }
        })
        .catch((err) => {
          showErrorToast(err)
          setAvailableTimes([])
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      // 通常のスタッフ指名の場合
      fetchQuery(api.reservation.query.calculateReservationTime, {
        tenant_id: tenantId,
        org_id: orgId,
        staff_id: selectedStaff._id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        duration_min: totalMinutes,
      })
        .then(setAvailableTimes)
        .catch((err) => {
          showErrorToast(err)
          setAvailableTimes([])
        })
        .finally(() => setIsLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tenantId,
    orgId,
    selectedStaff,
    selectedDate,
    totalMinutes,
    selectedMenuIds,
    selectedOptionIds,
  ])

  // フリー指名の場合はstaffExceptionDatesLoadingを無視
  const isActuallyLoading =
    (selectedStaff !== 'free' && staffExceptionDatesLoading) ||
    organizationExceptionDates === undefined ||
    reservationConfig === undefined ||
    reservationConfig === null

  if (isActuallyLoading) {
    return <Loading />
  }

  // サロンとスタッフの曜日毎の休みを判定し、無効化する曜日インデックスを取得
  const weekdayToIndex: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  }
  const closedDayIndices = [
    ...(organizationWeeekSchedule
      ?.filter((s) => !s.is_open)
      .map((s) => weekdayToIndex[s.day_of_week!]) ?? []),
    // FIXME: 指名フリーの場合もスタッフの休みとサロンの休みは除外する様に変更する
    // 指名フリーの場合はスタッフの休みは考慮しない（複数スタッフから選ぶため）
    ...(selectedStaff === 'free'
      ? []
      : (staffWeekSchedule?.filter((s) => !s.is_open).map((s) => weekdayToIndex[s.day_of_week!]) ??
        [])),
  ]
  const uniqueClosedDayIndices = Array.from(new Set(closedDayIndices))

  // 予約可能な最大日付を計算
  const maxReservationDate = addDays(
    startOfToday(),
    reservationConfig?.reservation_limit_days || 30
  )

  // 過去の日付とサロン・スタッフの例外日および曜日の休みを無効化する日付/曜日配列を作成
  const disabledDates = [
    // 予約制限日以降を選択不可
    { after: maxReservationDate },
    ...organizationExceptionDates.map((e) => parseISO(e.date!)),
    // 指名フリーの場合はスタッフの例外日は考慮しない
    ...(selectedStaff === 'free' ? [] : staffExceptionDates.map((e) => parseISO(e.date!))),
    { dayOfWeek: uniqueClosedDayIndices },
  ]

  // 当日予約が許可されていない場合は、当日も無効化
  if (reservationConfig?.allow_today_reservation === false) {
    disabledDates.push(startOfToday())
  } else {
    // 許可されている場合は、過去の日付のみ無効化
    disabledDates.push({ before: startOfToday() })
  }

  // ガード: フラグがfalseかつ selectedDate が今日ならリセット
  useEffect(() => {
    if (
      reservationConfig?.allow_today_reservation === false &&
      selectedDate &&
      isSameDay(selectedDate, startOfToday())
    ) {
      onChangeDateAction(undefined as any)
    }
  }, [reservationConfig, selectedDate, onChangeDateAction])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
        <Loader2 className="w-10 h-10 animate-spin text-neon" />
        <p className="text-xs text-muted-foreground mt-2">予約可能時間を取得中...</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-base">日時を選択</h2>
      <p className="text-muted-foreground mb-4 text-sm">
        ご希望の日付と時間を選択してください。
        {reservationConfig?.reservation_limit_days && (
          <span className="block mt-1">
            ※ {reservationConfig.reservation_limit_days}日先まで予約可能です
          </span>
        )}
      </p>
      <div></div>
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/2 flex flex-col justify-center items-center">
          <h3 className="text-lg font-medium mb-2">日付</h3>
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={handleDateSelect}
            disabled={disabledDates}
            locale={ja}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            className="border rounded-md p-3"
          />
          {reservationConfig?.allow_today_reservation === false && (
            <p className="text-sm text-center text-red-500 mt-2">
              当日予約はお電話にてお問い合わせください。
            </p>
          )}
        </div>

        {selectedDate && (
          <div className="md:w-1/2">
            <h3 className="text-lg font-medium mb-2">時間</h3>
            {availableTimes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>この日は予約可能な時間がありません</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {availableTimes.map((time, index) => (
                  <Button
                    key={index}
                    variant={
                      selectedTime?.startHour === time.startHour &&
                      selectedTime?.endHour === time.endHour
                        ? 'default'
                        : 'outline'
                    }
                    onClick={() => handleTimeSelect(time)}
                    className={`text-sm ${
                      selectedTime?.startHour === time.startHour &&
                      selectedTime?.endHour === time.endHour
                        ? 'bg-neon-foreground text-neon '
                        : 'bg-muted'
                    }`}
                  >
                    {time.startHour.toString()} ~ {time.endHour.toString()}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
