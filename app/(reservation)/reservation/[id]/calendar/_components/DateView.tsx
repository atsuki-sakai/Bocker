'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { ja } from 'date-fns/locale'
import { startOfToday } from 'date-fns'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { useParams } from 'next/navigation'
import { TimeRange } from '@/lib/type'
import { handleErrorToMsg } from '@/lib/error'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useQuery, usePaginatedQuery } from 'convex/react'
import { Loading } from '@/components/common'

type DateViewProps = {
  selectedDate: Date | null
  selectedStaff: Doc<'staff'> | null
  totalMinutes: number
  selectedTime: TimeRange | null
  onChangeDateAction: (date: Date) => void
  onChangeTimeAction: (time: TimeRange) => void
}

export const DateView = ({
  selectedDate,
  selectedStaff,
  totalMinutes,
  selectedTime,
  onChangeDateAction,
  onChangeTimeAction,
}: DateViewProps) => {
  const params = useParams()
  const salonId = params.id as Id<'salon'>
  const [availableTimes, setAvailableTimes] = useState<TimeRange[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const salonExceptionDates = useQuery(
    api.schedule.salon_exception.query.displayExceptionSchedule,
    {
      salonId: salonId,
      dateString: new Date()
        .toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        .replace(/\//g, '-'),
      take: 10,
    }
  )

  const salonWeeekSchedule = useQuery(api.schedule.salon_week_schedule.query.getAllBySalonId, {
    salonId: salonId,
  })

  const { results: staffExceptionDates, isLoading: staffExceptionDatesLoading } = usePaginatedQuery(
    api.schedule.staff_exception.query.listBySalonAndStaffId,
    selectedStaff
      ? {
          salonId: salonId,
          staffId: selectedStaff._id,
          isAllDay: true,
        }
      : 'skip',
    {
      initialNumItems: 30,
    }
  )

  const staffWeekSchedule = useQuery(
    api.schedule.staff_week_schedule.query.getBySalonAndStaffId,
    selectedStaff
      ? {
          salonId: salonId,
          staffId: selectedStaff._id,
        }
      : 'skip'
  )

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onChangeDateAction(date)
    }
  }

  const handleTimeSelect = (time: TimeRange) => {
    // 単純に親コンポーネントに選択された TimeRange を通知
    onChangeTimeAction(time)
  }

  useEffect(() => {
    if (!selectedStaff || !selectedDate) return
    setIsLoading(true)
    fetchQuery(api.reservation.query.calculateReservationTime, {
      salonId,
      staffId: selectedStaff._id,
      date: selectedDate
        .toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        .replace(/\//g, '-'),
      durationMin: totalMinutes,
    })
      .then(setAvailableTimes)
      .catch((err) => toast.error(handleErrorToMsg(err)))
      .finally(() => setIsLoading(false))
  }, [salonId, selectedStaff, selectedDate, totalMinutes])

  if (staffExceptionDatesLoading || salonExceptionDates === undefined) {
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
    ...(salonWeeekSchedule?.filter((s) => !s.isOpen).map((s) => weekdayToIndex[s.dayOfWeek!]) ??
      []),
    ...(staffWeekSchedule?.filter((s) => !s.isOpen).map((s) => weekdayToIndex[s.dayOfWeek!]) ?? []),
  ]
  const uniqueClosedDayIndices = Array.from(new Set(closedDayIndices))

  // 過去の日付とサロン・スタッフの例外日および曜日の休みを無効化する日付/曜日配列を作成
  const disabledDates = [
    // 当日以前を選択不可
    { before: startOfToday() },
    ...salonExceptionDates.map((e) => new Date(e.date!)),
    ...staffExceptionDates.map((e) => new Date(e.date!)),
    { dayOfWeek: uniqueClosedDayIndices },
  ]

  console.log('disabledDates', disabledDates)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-xs text-gray-600 mt-2">予約可能時間を取得中...</p>
      </div>
    )
  }

  console.log('salonWeeekSchedule', salonWeeekSchedule)
  console.log('staffWeekSchedule', staffWeekSchedule)

  return (
    <div>
      <h2 className="text-base">日時を選択</h2>
      <p className="text-gray-600 mb-4 text-sm">ご希望の日付と時間を選択してください。</p>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/2 flex flex-col justify-center items-center">
          <h3 className="text-lg font-medium mb-2">日付</h3>
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={handleDateSelect}
            disabled={disabledDates}
            locale={ja}
            className="border rounded-md p-3"
          />
        </div>

        {selectedDate && (
          <div className="md:w-1/2">
            <h3 className="text-lg font-medium mb-2">時間</h3>
            <div className="grid grid-cols-3 gap-2">
              {availableTimes.map((time, index) => (
                <Button
                  key={index}
                  variant={'outline'}
                  onClick={() => handleTimeSelect(time)}
                  className={`text-sm ${selectedTime?.startHour === time.startHour && selectedTime?.endHour === time.endHour ? 'bg-blue-700 text-white hover:bg-blue-600 hover:text-white' : ''}`}
                >
                  {time.startHour.toString()} ~ {time.endHour.toString()}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}