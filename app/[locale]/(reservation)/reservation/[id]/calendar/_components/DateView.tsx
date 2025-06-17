'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { ja } from 'date-fns/locale'
import { startOfToday } from 'date-fns'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { TimeRange } from '@/lib/types'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { Loader2, AlertCircle } from 'lucide-react'
import { useQuery, usePaginatedQuery } from 'convex/react'
import { Loading } from '@/components/common'

type DateViewProps = {
  tenantId: Id<'tenant'>
  orgId: Id<'organization'>
  selectedDate: Date | null
  selectedStaff: Doc<'staff'> | null
  totalMinutes: number
  selectedTime: TimeRange | null
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
  onChangeDateAction,
  onChangeTimeAction,
}: DateViewProps) => {
  const { showErrorToast } = useErrorHandler()
  const [availableTimes, setAvailableTimes] = useState<TimeRange[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate || startOfToday())

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
    selectedStaff
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
    selectedStaff
      ? {
          tenant_id: tenantId,
          org_id: orgId,
          staff_id: selectedStaff._id,
        }
      : 'skip'
  )

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onChangeDateAction(date)
    }
  }

  const handleTimeSelect = (time: TimeRange) => {
    // 楽観的UI: 即座に選択を反映
    onChangeTimeAction(time)
  }

  // スタッフまたは日付が変更された時のみ利用可能時間を取得
  useEffect(() => {
    if (!selectedStaff || !selectedDate) return
    setIsLoading(true)
    fetchQuery(api.reservation.query.calculateReservationTime, {
      tenant_id: tenantId,
      org_id: orgId,
      staff_id: selectedStaff._id,
      date: selectedDate
        .toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        .replace(/\//g, '-'),
      duration_min: totalMinutes,
    })
      .then(setAvailableTimes)
      .catch((err) => showErrorToast(err))
      .finally(() => setIsLoading(false))
  }, [tenantId, orgId, selectedStaff, selectedDate, totalMinutes, showErrorToast])

  if (staffExceptionDatesLoading || organizationExceptionDates === undefined) {
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
    ...(staffWeekSchedule?.filter((s) => !s.is_open).map((s) => weekdayToIndex[s.day_of_week!]) ??
      []),
  ]
  const uniqueClosedDayIndices = Array.from(new Set(closedDayIndices))

  // 過去の日付とサロン・スタッフの例外日および曜日の休みを無効化する日付/曜日配列を作成
  const disabledDates = [
    // 当日以前を選択不可
    { before: startOfToday() },
    ...organizationExceptionDates.map((e) => new Date(e.date!)),
    ...staffExceptionDates.map((e) => new Date(e.date!)),
    { dayOfWeek: uniqueClosedDayIndices },
  ]

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
      <p className="text-muted-foreground mb-4 text-sm">ご希望の日付と時間を選択してください。</p>
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
