// スケジュール関連の関数
// /app/lib/schedule.ts


const DAYS_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const DAYS_JA = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'] as const;
type DayOfWeekEN = typeof DAYS_EN[number];

/**
 * 現在の Unix タイムスタンプ（ミリ秒単位）を取得する
 *
 * @param addHours オプション。加算する時間（整数）を指定します。0 も有効です。
 * @returns 現在の Unix タイムスタンプ（ミリ秒単位）
 */
export function getCurrentUnixTime(addHours?: number): number {
  // Date.now() はすでにミリ秒単位のタイムスタンプを返す
  const currentTimeMs = Date.now();
  // addHours が指定されていれば、その分だけミリ秒に変換して加算
  return addHours !== undefined
    ? currentTimeMs + addHours * 3600 * 1000
    : currentTimeMs;
}


export function getDayOfWeek(date: Date, ja: boolean = false): DayOfWeekEN | typeof DAYS_JA[number] {
  const idx = date.getDay();
  return ja ? DAYS_JA[idx] : DAYS_EN[idx];
}

export function convertDayOfWeekToJa(dayOfWeek: DayOfWeekEN): typeof DAYS_JA[number] {
  const idx = DAYS_EN.indexOf(dayOfWeek);
  return idx >= 0 ? DAYS_JA[idx] : DAYS_JA[0];
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
  const step = interval > 0 ? interval : 5 // 0や負なら5分刻み
  const result: number[] = []
  for (let min = 0; min <= max; min += step) {
    result.push(min)
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
 * const timestamp = convertHourToUnixTimestamp("09:00", "2024-01-01");
 * console.log(timestamp); // 例: 1680000000000
 */

export function convertHourToTimestamp(hour: string, targetDate?: string): number | null {
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

export function convertTimestampToHour(
  unixTimestampMs: number,
  timeZone: string = 'Asia/Tokyo'
): string {
  return new Date(unixTimestampMs).toLocaleTimeString('ja-JP', {
    hour:   '2-digit',
    minute: '2-digit',
    timeZone,
  });
}


/**
 * タイムスタンプの時刻のみを "HH:mm" 形式の文字列に変換する関数
 * @param unixTimestamp - タイムスタンプ（ミリ秒単位）
 * @returns "HH:mm" 形式の文字列
 *
 * 使用例:
 * const hour = formatHourFromTimestamp(1680000000);
 * console.log(hour); // 例: "09:00"
 */
export function formatHourFromTimestamp(unixMs: number): string {
  return new Date(unixMs).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  });
}

/**
 * 既存のスタッフ予約から新規予約の作成が可能かチェックする関数
 * @param existingStaffReservations 既存の予約の配列
 * @param newStaffReservation 新規に予約したい時間帯
 * @returns 重複がなければ true、重複している場合は false を返す
 *
 * 重複の条件:
 * 2つの時間帯 [a, b] と [c, d] が重ならないための条件は、
 *   b <= c または d <= a
 * したがって、重なっている場合は !(b <= c || d <= a) として検出できます。
 */

export function canStaffReservation(
  existingStaffReservations: { start: number; end: number }[],
  newStaffReservation: { start: number; end: number }
): boolean {
  for (const reservation of existingStaffReservations) {
    if (newStaffReservation.start < reservation.end && newStaffReservation.end > reservation.start) {
      return false;
    }
  }
  return true;
}

/**
 * "HH:mm" 形式 → 分単位
 * hourToMinutes("02:00") = 120
 */
export function hourToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * 
 * 分 → "HH:mm" 形式
 * hourToMinutes(120) = "02:00" 
 */
export function toHourString(min: number): string {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, '0');
  const m = (min % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}
