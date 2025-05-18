'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parseISO, isValid } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ReservationDateFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialFrom = searchParams.get('from')
  const initialTo = searchParams.get('to')

  const [fromDate, setFromDate] = React.useState<Date | undefined>(
    initialFrom && isValid(parseISO(initialFrom)) ? parseISO(initialFrom) : undefined
  )
  const [toDate, setToDate] = React.useState<Date | undefined>(
    initialTo && isValid(parseISO(initialTo)) ? parseISO(initialTo) : undefined
  )
  const [fromInput, setFromInput] = React.useState(initialFrom || '')
  const [toInput, setToInput] = React.useState(initialTo || '')

  React.useEffect(() => {
    setFromInput(fromDate ? format(fromDate, 'yyyy-MM-dd') : '')
  }, [fromDate])

  React.useEffect(() => {
    setToInput(toDate ? format(toDate, 'yyyy-MM-dd') : '')
  }, [toDate])

  const handleApplyFilter = () => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))

    if (fromDate) {
      current.set('from', format(fromDate, 'yyyy-MM-dd'))
    } else {
      current.delete('from')
    }
    if (toDate) {
      current.set('to', format(toDate, 'yyyy-MM-dd'))
    } else {
      current.delete('to')
    }
    current.set('page', '1') // Reset to first page
    const search = current.toString()
    const query = search ? `?${search}` : ''
    router.push(`/dashboard/reservations${query}`)
  }

  const handleClearFilter = () => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    current.delete('from')
    current.delete('to')
    current.set('page', '1')
    const search = current.toString()
    const query = search ? `?${search}` : ''
    router.push(`/dashboard/reservations${query}`)
    setFromDate(undefined)
    setToDate(undefined)
  }

  const handleDateInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<Date | undefined>>,
    inputSetter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const val = e.target.value
    inputSetter(val)
    if (isValid(parseISO(val))) {
      setter(parseISO(val))
    } else {
      setter(undefined)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-end sm:gap-3">
      <div className="grid w-full gap-2">
        <Label htmlFor="from-date">開始日</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="from-date"
              variant={'outline'}
              className={cn(
                'justify-start text-left font-normal',
                !fromDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {fromInput ? fromInput : <span>日付を選択</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fromDate}
              onSelect={(date) => {
                setFromDate(date)
                if (date) setFromInput(format(date, 'yyyy-MM-dd'))
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Input
          type="date"
          value={fromInput}
          onChange={(e) => handleDateInputChange(e, setFromDate, setFromInput)}
          className="hidden" // Show on small screens
        />
      </div>
      <div className="grid w-full gap-2">
        <Label htmlFor="to-date">終了日</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="to-date"
              variant={'outline'}
              className={cn(
                'justify-start text-left font-normal',
                !toDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {toInput ? toInput : <span>日付を選択</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={toDate}
              onSelect={(date) => {
                setToDate(date)
                if (date) setToInput(format(date, 'yyyy-MM-dd'))
              }}
              disabled={(date) => (fromDate ? date < fromDate : false)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Input
          type="date"
          value={toInput}
          onChange={(e) => handleDateInputChange(e, setToDate, setToInput)}
          min={fromInput}
          className="hidden" // Show on small screens
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={handleApplyFilter} className="w-full sm:w-auto">
          適用
        </Button>
        <Button onClick={handleClearFilter} variant="ghost" className="w-full sm:w-auto">
          クリア
        </Button>
      </div>
    </div>
  )
}
