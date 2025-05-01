'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'

import { ja } from 'date-fns/locale'

type DateViewProps = {
  selectedDate: Date | null
  onChangeDateAction: (date: Date) => void
}

export const DateView = ({ selectedDate, onChangeDateAction }: DateViewProps) => {
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  // 仮の利用可能時間（実際のデータ取得はメインコンポーネントで行う）
  const availableTimes = [
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '12:00',
    '12:30',
    '13:00',
    '13:30',
    '14:00',
    '14:30',
    '15:00',
    '15:30',
    '16:00',
    '16:30',
    '17:00',
    '17:30',
  ]

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onChangeDateAction(date)
    }
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)

    if (selectedDate) {
      const [hours, minutes] = time.split(':').map(Number)
      const newDate = new Date(selectedDate)
      newDate.setHours(hours, minutes)
      onChangeDateAction(newDate)
    }
  }

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
            locale={ja}
            className="border rounded-md p-3"
          />
        </div>

        {selectedDate && (
          <div className="md:w-1/2">
            <h3 className="text-lg font-medium mb-2">時間</h3>
            <div className="grid grid-cols-3 gap-2">
              {availableTimes.map((time) => (
                <Button
                  key={time}
                  variant={selectedTime === time ? 'default' : 'outline'}
                  onClick={() => handleTimeSelect(time)}
                  className="text-sm"
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}