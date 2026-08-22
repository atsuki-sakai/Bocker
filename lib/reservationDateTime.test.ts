import { describe, expect, it } from 'vitest'
import {
  formatReservationDateInJapan,
  formatReservationDateTimeInJapan,
  formatReservationDateWithWeekdayInJapan,
  formatReservationTimeInJapan,
  formatReservationTimeRangeInJapan,
} from './reservationDateTime'

describe('reservationDateTime', () => {
  const start = Date.UTC(2026, 7, 21, 15, 30)
  const end = Date.UTC(2026, 7, 21, 17, 0)

  it('UTCの日付境界をまたいでも日本時間の日付を返す', () => {
    expect(formatReservationDateInJapan(start)).toBe('2026年08月22日')
    expect(formatReservationDateWithWeekdayInJapan(start)).toBe('2026年08月22日（土曜日）')
  })

  it('日本時間の時刻と時間帯を返す', () => {
    expect(formatReservationTimeInJapan(start)).toBe('00:30')
    expect(formatReservationTimeRangeInJapan(start, end)).toBe('00:30〜02:00')
    expect(formatReservationDateTimeInJapan(start)).toBe('2026年08月22日 00:30')
  })

  it('不正な日時を拒否する', () => {
    expect(() => formatReservationTimeInJapan(Number.NaN)).toThrow('Invalid reservation date/time')
  })
})
