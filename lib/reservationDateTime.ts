export const RESERVATION_TIME_ZONE = 'Asia/Tokyo'

type DateTimeInput = Date | number

const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: RESERVATION_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const dateWithWeekdayFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: RESERVATION_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'long',
})

const timeFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: RESERVATION_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const toValidDate = (value: DateTimeInput): Date => {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Invalid reservation date/time')
  }

  return date
}

const getDateParts = (value: DateTimeInput, withWeekday: boolean) => {
  const formatter = withWeekday ? dateWithWeekdayFormatter : dateFormatter
  return Object.fromEntries(
    formatter
      .formatToParts(toValidDate(value))
      .map(({ type, value: partValue }) => [type, partValue])
  )
}

export const formatReservationDateInJapan = (value: DateTimeInput): string => {
  const parts = getDateParts(value, false)
  return `${parts.year}年${parts.month}月${parts.day}日`
}

export const formatReservationDateWithWeekdayInJapan = (value: DateTimeInput): string => {
  const parts = getDateParts(value, true)
  return `${parts.year}年${parts.month}月${parts.day}日（${parts.weekday}）`
}

export const formatReservationTimeInJapan = (value: DateTimeInput): string =>
  timeFormatter.format(toValidDate(value))

export const formatReservationTimeRangeInJapan = (
  start: DateTimeInput,
  end: DateTimeInput
): string => `${formatReservationTimeInJapan(start)}〜${formatReservationTimeInJapan(end)}`

export const formatReservationDateTimeInJapan = (value: DateTimeInput): string =>
  `${formatReservationDateInJapan(value)} ${formatReservationTimeInJapan(value)}`
