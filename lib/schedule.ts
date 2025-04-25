// スケジュール関連の関数
// /app/lib/schedule.ts

/**
 * 現在のUnixタイムスタンプを取得
 * @param addHours 加算する時間
 * @returns 現在のUnixタイムスタンプ
 */
export function getCurrentUnixTime(addHours?: number) {
  return addHours ? Math.floor(Date.now() / 1000) + addHours * 3600 : Math.floor(Date.now() / 1000);
}

export function convertUnixTimeToDateString(unixmiliSec: number) {
  return new Date(unixmiliSec).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function getDayOfWeek(date: Date, ja: boolean = false): string {
  switch (date.getDay()) {
    case 0:
      return ja ? '日曜日' : 'sunday';
    case 1:
      return ja ? '月曜日' : 'monday';
    case 2:
      return ja ? '火曜日' : 'tuesday';
    case 3:
      return ja ? '水曜日' : 'wednesday';
    case 4:
      return ja ? '木曜日' : 'thursday';
    case 5:
      return ja ? '金曜日' : 'friday';
    case 6:
      return ja ? '土曜日' : 'saturday';
    default:
      return ja ? '日曜日' : 'sunday';
  }
}

export function convertDayOfWeekToJa(dayOfWeek: string): string {
  let week: string;
  switch (dayOfWeek) {
    case 'monday':
      week = '月曜日';
      break;
    case 'tuesday':
      week = '火曜日';
      break;
    case 'wednesday':
      week = '水曜日';
      break;
    case 'thursday':
      week = '木曜日';
      break;
    case 'friday':
      week = '金曜日';
      break;
    case 'saturday':
      week = '土曜日';
      break;
    case 'sunday':
      week = '日曜日';
      break;
    default:
      week = '日曜日';
      break;
  }
  return week;
}

// utils/time.ts
export function formatJpTime(unixmiliSec: number) {
  return new Date(unixmiliSec).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  });
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
    useJST?: boolean;
    includeDate?: boolean;
  } = {}
): string {
  const { useJST = true, includeDate = false } = options;
  const locale = 'ja-JP';
  const timeZone = useJST ? 'Asia/Tokyo' : 'UTC';
  const date = new Date(timestampMs);

  // 時刻部分のみ HH:mm 形式
  const timeStr = date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });

  if (!includeDate) {
    return timeStr; // 例: "09:00"
  }

  // 日付部分のみ YYYY/MM/DD 形式
  const dateStr = date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  });

  // 結合して "YYYY/MM/DD HH:mm"
  return `${dateStr} ${timeStr}`;
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
  const max = maxMinute ?? 180;
  const result: number[] = [];

  // 1から順にintervalの倍数を計算し、max以下のものをリストに追加する
  for (let i = 1; i * interval <= max; i++) {
    result.push(i * interval);
  }

  return result;
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
 */

export function convertHourToUnixTimestamp(hour: string, targetDate?: string): number | null {
  if (!hour) return null;
  const baseDate = targetDate ? new Date(targetDate) : new Date();
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const date = baseDate.getDate();
  const [h, m] = hour.split(':').map(Number);
  // 1. Construct UTC timestamp for the same Y/M/D H:M as if in UTC
  const utcMs = Date.UTC(year, month, date, h, m, 0);
  // 2. Subtract 9 hours (Tokyo offset) so that when formatted in Asia/Tokyo, it shows the intended H:M
  const jstMs = utcMs - 9 * 60 * 60 * 1000;
  return jstMs;
}

/**
 * タイムスタンプを "HH:mm" 形式の文字列に変換する関数
 * @param unixTimestamp - タイムスタンプ（ミリ秒単位）
 * @returns "HH:mm" 形式の文字列
 *
 * 使用例:
 * const hour = convertTimeStampToHour(1680000000000);
 * console.log(hour); // 例: "09:00"
 */
/**
 * タイムスタンプ（ミリ秒）を "HH:mm" 形式の文字列に変換する関数
 * @param unixMs - タイムスタンプ（ミリ秒単位）
 * @returns "HH:mm" 形式の文字列（日本時間）
 */
export function convertTimeStampToHour(unixMs: number): string {
  return new Date(unixMs).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  });
}

/**
 * 既存のスケジュールから新規スケジュールの作成が可能かチェックする関数
 * @param existingSchedules 既存のスケジュールの配列
 * @param newSchedule 新規にスケジュールしたい時間帯
 * @returns 重複がなければ true、重複している場合は false を返す
 *
 * 重複の条件:
 * 2つの時間帯 [a, b] と [c, d] が重ならないための条件は、
 *   b <= c または d <= a
 * したがって、重なっている場合は !(b <= c || d <= a) として検出できます。
 */

export function canScheduling(
  existingSchedules: { start: number; end: number }[],
  newSchedule: { start: number; end: number }
): boolean {
  for (const schedule of existingSchedules) {
    if (newSchedule.start < schedule.end && newSchedule.end > schedule.start) {
      return false;
    }
  }
  return true;
}

/**
 * "HH:mm" 形式 → 分単位
 */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * 分 → "HH:mm" 形式
 */
export function toHourString(min: number): string {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, '0');
  const m = (min % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}


