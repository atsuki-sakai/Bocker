import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getCurrentUnixTime,
  convertDayOfWeek,
  getDayOfWeek,
  formatTimestamp,
  getMinuteMultiples,
  convertHourToTimestamp,
  convertTimestampToHour,
  hourToMinutes,
  toHourString,
  formatDate,
  formatDateToYYYYMMDD,
  formatDateDistance,
  formatDateDistanceToNow,
  formatDateRelative,
} from '../schedules'
import type { DayOfWeek, DayOfWeekJA } from '../../convex/types'

// Mock dependencies
vi.mock('../dateLocale', () => ({
  getIntlLocaleCode: vi.fn((locale: string) => {
    const localeCodes: Record<string, string> = {
      ja: 'ja-JP',
      en: 'en-US',
      th: 'th-TH',
      fr: 'fr-FR',
      zh: 'zh-CN',
      ko: 'ko-KR',
    }
    return localeCodes[locale] ?? localeCodes.en
  }),
  getDateFnsLocale: vi.fn().mockImplementation((locale: string) => {
    const mockLocales = {
      ja: { code: 'ja' },
      en: { code: 'en-US' },
      th: { code: 'th' },
      fr: { code: 'fr' },
      zh: { code: 'zh-CN' },
      ko: { code: 'ko' },
    }
    return Promise.resolve(mockLocales[locale as keyof typeof mockLocales] || mockLocales.en)
  }),
}))

vi.mock('../../convex/types', () => ({
  DAY_OF_WEEK_VALUES: [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ],
  DAY_OF_WEEK_VALUES_JA: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
}))

// Mock date-fns functions
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === 'yyyy-MM-dd') return '2024-06-15'
    if (formatStr === 'HH:mm') return '09:30'
    return '2024-06-15 09:30'
  }),
  formatDistance: vi.fn(() => '2 hours'),
  formatDistanceToNow: vi.fn(() => '2 hours ago'),
  formatRelative: vi.fn(() => 'today at 2:30 PM'),
}))

describe('schedules ライブラリ', () => {
  const fixedDate = new Date('2024-06-15T09:30:00.000Z')
  const fixedTimestamp = fixedDate.getTime()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getCurrentUnixTime function', () => {
    it('現在のUnixタイムスタンプを取得する', () => {
      vi.useFakeTimers()
      vi.setSystemTime(fixedDate)

      const timestamp = getCurrentUnixTime()
      expect(timestamp).toBe(fixedTimestamp)
    })

    it('指定時間を加算したタイムスタンプを取得する', () => {
      vi.useFakeTimers()
      vi.setSystemTime(fixedDate)

      const timestamp = getCurrentUnixTime(2) // 2時間加算
      expect(timestamp).toBe(fixedTimestamp + 2 * 3600 * 1000)
    })

    it('0時間加算でも正常動作する', () => {
      vi.useFakeTimers()
      vi.setSystemTime(fixedDate)

      const timestamp = getCurrentUnixTime(0)
      expect(timestamp).toBe(fixedTimestamp)
    })

    it('負の時間で過去のタイムスタンプを取得する', () => {
      vi.useFakeTimers()
      vi.setSystemTime(fixedDate)

      const timestamp = getCurrentUnixTime(-1) // 1時間前
      expect(timestamp).toBe(fixedTimestamp - 3600 * 1000)
    })
  })

  describe('convertDayOfWeek function', () => {
    it('英語の曜日を日本語に変換する', () => {
      expect(convertDayOfWeek('monday')).toBe('月曜日')
      expect(convertDayOfWeek('tuesday')).toBe('火曜日')
      expect(convertDayOfWeek('wednesday')).toBe('水曜日')
      expect(convertDayOfWeek('thursday')).toBe('木曜日')
      expect(convertDayOfWeek('friday')).toBe('金曜日')
      expect(convertDayOfWeek('saturday')).toBe('土曜日')
      expect(convertDayOfWeek('sunday')).toBe('日曜日')
    })

    it('英語ロケール指定で英語表記を返す', () => {
      expect(convertDayOfWeek('monday', 'en')).toBe('Monday')
      expect(convertDayOfWeek('friday', 'en')).toBe('Friday')
      expect(convertDayOfWeek('sunday', 'en')).toBe('Sunday')
    })

    it('日本語ロケール明示指定で日本語表記を返す', () => {
      expect(convertDayOfWeek('monday', 'ja')).toBe('月曜日')
      expect(convertDayOfWeek('saturday', 'ja')).toBe('土曜日')
    })

    it('不正な曜日でエラーをスローする', () => {
      expect(() => convertDayOfWeek('invalid' as DayOfWeek)).toThrow('Invalid day of week: invalid')
    })

    it('美容サロンの営業日確認', () => {
      // 一般的な美容サロンの営業日
      const businessDays: DayOfWeek[] = [
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ]
      const closedDay: DayOfWeek = 'monday' // 定休日

      businessDays.forEach((day) => {
        expect(convertDayOfWeek(day)).toMatch(/(火|水|木|金|土|日)曜日/)
      })
      expect(convertDayOfWeek(closedDay)).toBe('月曜日')
    })
  })

  describe('getDayOfWeek function', () => {
    it('日付から英語の曜日を取得する', () => {
      const monday = new Date('2024-06-17') // 月曜日
      const result = getDayOfWeek(monday) as DayOfWeek
      expect(result).toBe('monday')
    })

    it('日付から日本語の曜日を取得する', () => {
      const monday = new Date('2024-06-17')
      const result = getDayOfWeek(monday, true) as DayOfWeekJA
      expect(result).toBe('月曜日')
    })

    it('週末の曜日を正しく取得する', () => {
      const saturday = new Date('2024-06-15') // 土曜日
      const sunday = new Date('2024-06-16') // 日曜日

      expect(getDayOfWeek(saturday)).toBe('saturday')
      expect(getDayOfWeek(sunday)).toBe('sunday')
    })
  })

  describe('formatTimestamp function', () => {
    it('タイムスタンプを時刻のみでフォーマットする', () => {
      const timestamp = new Date('2024-06-15T09:30:00Z').getTime()
      const formatted = formatTimestamp(timestamp)
      expect(formatted).toMatch(/\d{2}:\d{2}/)
    })

    it('タイムスタンプを日付込みでフォーマットする', () => {
      const timestamp = new Date('2024-06-15T09:30:00Z').getTime()
      const formatted = formatTimestamp(timestamp, { includeDate: true })
      expect(formatted).toMatch(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}/)
    })

    it('UTCでフォーマットする', () => {
      const timestamp = new Date('2024-06-15T09:30:00Z').getTime()
      const formatted = formatTimestamp(timestamp, { useJST: false })
      expect(formatted).toMatch(/\d{2}:\d{2}/)
    })

    it('美容サロンの予約時刻表示', () => {
      // 営業時間内の予約時刻
      const appointmentTime = new Date('2024-06-15T10:00:00Z').getTime()
      const timeOnly = formatTimestamp(appointmentTime)
      const withDate = formatTimestamp(appointmentTime, { includeDate: true })

      expect(timeOnly).toMatch(/\d{2}:\d{2}/)
      expect(withDate).toMatch(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}/)
    })
  })

  describe('getMinuteMultiples function', () => {
    it('デフォルトで180分までの倍数を生成する', () => {
      const multiples = getMinuteMultiples(30)
      expect(multiples).toContain(0)
      expect(multiples).toContain(30)
      expect(multiples).toContain(60)
      expect(multiples).toContain(90)
      expect(multiples).toContain(120)
      expect(multiples).toContain(150)
      expect(multiples).toContain(180)
      expect(multiples).toHaveLength(7)
    })

    it('指定した最大分数までの倍数を生成する', () => {
      const multiples = getMinuteMultiples(15, 60)
      expect(multiples).toEqual([0, 15, 30, 45, 60])
    })

    it('0や負の間隔で5分刻みにフォールバックする', () => {
      const multiples = getMinuteMultiples(0, 20)
      expect(multiples).toEqual([0, 5, 10, 15, 20])
    })

    it('美容サロンの施術時間選択肢', () => {
      // カット: 30分刻み
      const cutOptions = getMinuteMultiples(30, 120)
      expect(cutOptions).toEqual([0, 30, 60, 90, 120])

      // カラーリング: 15分刻み
      const colorOptions = getMinuteMultiples(15, 180)
      expect(colorOptions).toContain(60) // 1時間
      expect(colorOptions).toContain(90) // 1.5時間
      expect(colorOptions).toContain(120) // 2時間
    })
  })

  describe('convertHourToTimestamp function', () => {
    it('時刻文字列をタイムスタンプに変換する', () => {
      const timestamp = convertHourToTimestamp('09:00')
      expect(timestamp).toBeTypeOf('number')
      expect(timestamp).not.toBeNull()
    })

    it('指定日付の時刻をタイムスタンプに変換する', () => {
      const timestamp = convertHourToTimestamp('10:30', '2024-06-15')
      expect(timestamp).toBeTypeOf('number')
      expect(timestamp).not.toBeNull()
    })

    it('空文字列でnullを返す', () => {
      const timestamp = convertHourToTimestamp('')
      expect(timestamp).toBeNull()
    })

    it('美容サロンの営業開始時刻変換', () => {
      const openingTime = convertHourToTimestamp('09:00', '2024-06-15')
      const closingTime = convertHourToTimestamp('19:00', '2024-06-15')

      expect(openingTime).toBeLessThan(closingTime!)
      expect(openingTime).toBeTypeOf('number')
      expect(closingTime).toBeTypeOf('number')
    })
  })

  describe('convertTimestampToHour function', () => {
    it('タイムスタンプを時刻文字列に変換する', () => {
      const timestamp = new Date('2024-06-15T09:30:00Z').getTime()
      const hour = convertTimestampToHour(timestamp)
      expect(hour).toMatch(/^\d{2}:\d{2}$/)
    })

    it('異なるタイムゾーンでの変換', () => {
      const timestamp = new Date('2024-06-15T09:30:00Z').getTime()
      const jstHour = convertTimestampToHour(timestamp, 'Asia/Tokyo')
      const utcHour = convertTimestampToHour(timestamp, 'UTC')

      expect(jstHour).toMatch(/^\d{2}:\d{2}$/)
      expect(utcHour).toMatch(/^\d{2}:\d{2}$/)
    })
  })

  describe('hourToMinutes function', () => {
    it('時刻を分単位に変換する', () => {
      expect(hourToMinutes('00:00')).toBe(0)
      expect(hourToMinutes('01:30')).toBe(90)
      expect(hourToMinutes('02:00')).toBe(120)
      expect(hourToMinutes('12:15')).toBe(735)
    })

    it('美容サロンの営業時間計算', () => {
      const openingTime = hourToMinutes('09:00') // 540分
      const closingTime = hourToMinutes('19:00') // 1140分
      const businessHours = closingTime - openingTime

      expect(businessHours).toBe(600) // 10時間 = 600分
    })
  })

  describe('toHourString function', () => {
    it('分単位を時刻文字列に変換する', () => {
      expect(toHourString(0)).toBe('00:00')
      expect(toHourString(90)).toBe('01:30')
      expect(toHourString(120)).toBe('02:00')
      expect(toHourString(735)).toBe('12:15')
    })

    it('美容サロンの施術時間表示', () => {
      expect(toHourString(30)).toBe('00:30') // カット30分
      expect(toHourString(90)).toBe('01:30') // カラー90分
      expect(toHourString(120)).toBe('02:00') // パーマ120分
    })
  })

  describe('formatDate function', () => {
    it('日付を指定フォーマットで表示する', async () => {
      const date = new Date('2024-06-15')
      const formatted = await formatDate(date, 'yyyy-MM-dd', 'ja')
      expect(formatted).toBe('2024-06-15')
    })

    it('異なるロケールでフォーマットする', async () => {
      const date = new Date('2024-06-15')
      const jaFormatted = await formatDate(date, 'yyyy-MM-dd', 'ja')
      const enFormatted = await formatDate(date, 'yyyy-MM-dd', 'en')

      expect(jaFormatted).toBeDefined()
      expect(enFormatted).toBeDefined()
    })
  })

  describe('formatDateToYYYYMMDD function', () => {
    it('日付をYYYY-MM-DD形式に変換する', () => {
      const date = new Date('2024-06-15T09:30:00Z')
      const formatted = formatDateToYYYYMMDD(date)
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('月末日付の変換', () => {
      const lastDay = new Date('2024-06-30T12:00:00') // Use local time to avoid timezone issues
      const formatted = formatDateToYYYYMMDD(lastDay)
      expect(formatted).toMatch(/^\d{4}-06-30$/)
    })
  })

  describe('formatDateDistance function', () => {
    it('日付間の距離を表示する', async () => {
      const date1 = new Date('2024-06-15')
      const date2 = new Date('2024-06-17')
      const distance = await formatDateDistance(date1, date2, 'ja')
      expect(distance).toBe('2 hours')
    })
  })

  describe('formatDateDistanceToNow function', () => {
    it('現在からの相対時間を表示する', async () => {
      const date = new Date('2024-06-15')
      const distance = await formatDateDistanceToNow(date, 'ja')
      expect(distance).toBe('2 hours ago')
    })

    it('接尾辞付きで表示する', async () => {
      const date = new Date('2024-06-15')
      const distance = await formatDateDistanceToNow(date, 'ja', { addSuffix: true })
      expect(distance).toBe('2 hours ago')
    })
  })

  describe('formatDateRelative function', () => {
    it('相対的な日付表示を生成する', async () => {
      const date = new Date('2024-06-15')
      const baseDate = new Date('2024-06-17')
      const relative = await formatDateRelative(date, baseDate, 'ja')
      expect(relative).toBe('today at 2:30 PM')
    })
  })

  describe('美容サロン業務における実用性', () => {
    it('予約時間の計算と表示', () => {
      // 10:00の予約で90分の施術
      const startTime = hourToMinutes('10:00') // 600分
      const duration = 90 // 90分
      const endTime = startTime + duration // 690分

      expect(toHourString(endTime)).toBe('11:30')
    })

    it('営業日の曜日チェック', () => {
      const businessDays = ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      const monday = new Date('2024-06-17') // 月曜日（定休日）
      const tuesday = new Date('2024-06-18') // 火曜日（営業日）

      const mondayName = getDayOfWeek(monday) as DayOfWeek
      const tuesdayName = getDayOfWeek(tuesday) as DayOfWeek

      expect(businessDays.includes(mondayName)).toBe(false)
      expect(businessDays.includes(tuesdayName)).toBe(true)
    })

    it('施術時間による料金計算の基準', () => {
      const serviceMinutes = [
        { name: 'カット', minutes: 30 },
        { name: 'カラー', minutes: 90 },
        { name: 'パーマ', minutes: 120 },
        { name: 'ヘッドスパ', minutes: 45 },
      ]

      serviceMinutes.forEach((service) => {
        const hours = toHourString(service.minutes)
        expect(hours).toMatch(/^\d{2}:\d{2}$/)
      })
    })

    it('予約枠の時間間隔設定', () => {
      // 30分間隔の予約枠
      const timeSlots = getMinuteMultiples(30, 600) // 10時間分
      const businessHours = timeSlots.filter((slot) => {
        const hours = Math.floor(slot / 60)
        return hours >= 9 && hours < 19 // 9:00-19:00
      })

      expect(businessHours).toContain(540) // 9:00 (540分 = 9時間)
      expect(businessHours.length).toBeGreaterThan(0)
    })
  })
})
