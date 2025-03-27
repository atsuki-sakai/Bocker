/**
 * 指定された分単位の間隔の倍数を計算し、最大180分以内のリストを返す関数
 * @param interval - 分単位の間隔（例: 5, 10）
 * @returns 180分以下の倍数（分単位）のリスト
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
 * @returns タイムスタンプ。引数が指定されない場合は null を返す
 *
 * 使用例:
 * const timestamp = convertHourToUnixTimestamp("09:00");
 * console.log(timestamp); // 例: 1680000000000
 */

export function convertHourToUnixTimestamp(hour: string): number | null {
  // 今日の日付情報を取得
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 月は0〜11で管理
  const date = today.getDate();
  let unixTimestamp: number | null = null;

  // startHourが指定されている場合、"HH:mm"形式の文字列から時・分を抽出し、当日の日時オブジェクトを作成
  if (hour) {
    const [startH, startM] = hour.split(':').map(Number);
    const startDate = new Date(year, month, date, startH, startM, 0);
    // ミリ秒単位のタイムスタンプを返す
    unixTimestamp = startDate.getTime();
  }

  return unixTimestamp;
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

