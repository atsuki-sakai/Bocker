// app/lib/schedule.ts

import { DAY_OF_WEEK_VALUES_JA, DayOfWeek, DayOfWeekJA } from './../convex/types'
import { format, formatDistance, formatDistanceToNow, formatRelative } from 'date-fns'
import { getDateFnsLocale, getIntlLocaleCode, SupportedLocale } from './dateLocale'
/**
 * 現在の Unix タイムスタンプ（ミリ秒単位）を取得する
 *
 * @param addHours オプション。加算する時間（整数）を指定します。0 も有効です。
 * @returns 現在の Unix タイムスタンプ（ミリ秒単位）
 */
export function getCurrentUnixTime(addHours?: number): number {
  // Date.now() はすでにミリ秒単位のタイムスタンプを返す
  const currentTimeMs = Date.now()
  // addHours が指定されていれば、その分だけミリ秒に変換して加算
  return addHours !== undefined ? currentTimeMs + addHours * 3600 * 1000 : currentTimeMs
}
export function convertDayOfWeek(week: DayOfWeek, locale?: SupportedLocale): string {
  const dayOffsets: Record<DayOfWeek, number> = {
    monday: 0,
    tuesday: 1,
    wednesday: 2,
    thursday: 3,
    friday: 4,
    saturday: 5,
    sunday: 6,
  }
  if (!(week in dayOffsets)) throw new Error(`Invalid day of week: ${week}`)
  const date = new Date(Date.UTC(2024, 0, 1 + dayOffsets[week]))

  return new Intl.DateTimeFormat(getIntlLocaleCode(locale ?? 'ja'), {
    weekday: 'long',
    timeZone: 'UTC',
  }).format(date)
}

/**
 * 指定された日付の曜日を英語または日本語で取得する
 * @param date - 日付オブジェクト
 * @param ja - 日本語で取得する場合はtrue、英語の場合はfalse（デフォルト）
 * @returns 曜日の文字列（英語: 'sunday', 'monday'等、日本語: '日曜日', '月曜日'等）
 */
export function getDayOfWeek(date: Date, ja: boolean = false): DayOfWeek | DayOfWeekJA {
  const jsIdx = date.getDay() // JavaScript標準: 0=日曜, 1=月曜, ..., 6=土曜

  if (ja) {
    // 日本語の場合はJavaScript標準のインデックスをそのまま使用
    return DAY_OF_WEEK_VALUES_JA[jsIdx]
  } else {
    // 英語の場合もJavaScript標準のインデックスをそのまま使用してマッピング
    // システム配列は [monday, tuesday, ..., sunday] だが、
    // JavaScriptの getDay() は [sunday=0, monday=1, ..., saturday=6] なので
    // 正しいマッピングを作成
    const dayMapping: DayOfWeek[] = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ]
    return dayMapping[jsIdx]
  }
}

/**
 * ミリ秒タイムスタンプをフォーマットして返します。
 *
 * @param timestampMs    ミリ秒単位のUNIXタイムスタンプ
 * @param options.useJST       true → 日本時間（Asia/Tokyo）、false → UTC
 * @param options.includeDate  true → 日付も含める（YYYY/MM/DD HH:mm）、false → 時刻だけ（HH:mm）
 */
export function formatTimestamp(
  timestampMs: number,
  options: {
    useJST?: boolean
    includeDate?: boolean
  } = {}
): string {
  const { useJST = true, includeDate = false } = options
  const locale = 'ja-JP'
  const timeZone = useJST ? 'Asia/Tokyo' : 'UTC'
  const date = new Date(timestampMs)

  // 時刻部分のみ HH:mm 形式
  const timeStr = date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  })

  if (!includeDate) {
    return timeStr // 例: "09:00"
  }

  // 日付部分のみ YYYY/MM/DD 形式
  const dateStr = date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  })

  // 結合して "YYYY/MM/DD HH:mm"
  return `${dateStr} ${timeStr}`
}

/**
 * 指定された分単位の間隔の倍数を計算し、最大180分以内のリストを返す関数
 * @param interval - 分単位の間隔（例: 5, 10）
 * @returns 指定された最大分以下の倍数（分単位）のリスト
 *
 * 使用例:
 * console.log(getMinuteMultiples(30, 360)); // 例: [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360]
 */
export function getMinuteMultiples(interval: number, maxMinute?: number): number[] {
  const max = maxMinute ?? 180
  const step = interval > 0 ? interval : 5 // 0や負なら5分刻み
  const result: number[] = []
  for (let min = 0; min <= max; min += step) {
    result.push(min)
  }
  return result
}

/**
 * 現在の日付の指定時刻のUNIXタイムスタンプ（ミリ秒単位）を返す関数
 * @param hour - 時間の文字列（例: "09:00"）
 * @param date - 日付の文字列（例: "2024-01-01"）
 * @returns タイムスタンプ。引数が指定されない場合は null を返す
 *
 * 使用例:
 * const timestamp = convertHourToUnixTimestamp("09:00");
 * console.log(timestamp); // 例: 1680000000000
 * const timestamp = convertHourToUnixTimestamp("09:00", "2024-01-01");
 * console.log(timestamp); // 例: 1680000000000
 */

export function convertHourToTimestamp(hour: string, targetDate?: string): number | null {
  if (!hour) return null
  const baseDate = targetDate ? new Date(targetDate) : new Date()
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const date = baseDate.getDate()
  const [h, m] = hour.split(':').map(Number)
  // 1. Construct UTC timestamp for the same Y/M/D H:M as if in UTC
  const utcMs = Date.UTC(year, month, date, h, m, 0)
  // 2. Subtract 9 hours (Tokyo offset) so that when formatted in Asia/Tokyo, it shows the intended H:M
  const jstMs = utcMs - 9 * 60 * 60 * 1000
  return jstMs
}

/**
 * UNIXタイムスタンプ（ミリ秒）をHH:mm形式の時刻文字列に変換する
 * @param unixTimestampMs - UNIXタイムスタンプ（ミリ秒単位）
 * @param timeZone - タイムゾーン（デフォルト: 'Asia/Tokyo'）
 * @returns HH:mm形式の時刻文字列
 */
export function convertTimestampToHour(
  unixTimestampMs: number,
  timeZone: string = 'Asia/Tokyo'
): string {
  return new Date(unixTimestampMs).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  })
}

/**
 * "HH:mm" 形式 → 分単位
 * hourToMinutes("02:00") = 120
 */
/**
 * HH:mm形式の時刻文字列を分単位の数値に変換する
 * @param hhmm - HH:mm形式の時刻文字列（例: "02:00"）
 * @returns 分単位の数値（例: 120）
 */
export function hourToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/**
 *
 * 分 → "HH:mm" 形式
 * hourToMinutes(120) = "02:00"
 */
/**
 * 分単位の数値をHH:mm形式の時刻文字列に変換する
 * @param min - 分単位の数値（例: 120）
 * @returns HH:mm形式の時刻文字列（例: "02:00"）
 */
export function toHourString(min: number): string {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, '0')
  const m = (min % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

export async function formatDate(
  date: Date,
  fmt: string,
  localeCode: SupportedLocale
): Promise<string> {
  const locale = await getDateFnsLocale(localeCode)
  return format(date, fmt, { locale })
}

/**
 * 日付をYYYY-MM-DD形式の文字列に変換（日本時間）
 * @param date 変換する日付
 * @returns YYYY-MM-DD形式の文字列
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function formatDateDistance(
  date: Date,
  baseDate: Date,
  localeCode: SupportedLocale
): Promise<string> {
  const locale = await getDateFnsLocale(localeCode)
  return formatDistance(date, baseDate, { locale })
}

export async function formatDateDistanceToNow(
  date: Date,
  localeCode: SupportedLocale,
  options?: { addSuffix?: boolean }
): Promise<string> {
  const locale = await getDateFnsLocale(localeCode)
  return formatDistanceToNow(date, { locale, ...options })
}

export async function formatDateRelative(
  date: Date,
  baseDate: Date,
  localeCode: SupportedLocale
): Promise<string> {
  const locale = await getDateFnsLocale(localeCode)
  return formatRelative(date, baseDate, { locale })
}
