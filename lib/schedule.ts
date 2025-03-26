/**
 * 指定された分単位の間隔の倍数を計算し、最大180分以内のリストを返す関数
 * @param interval - 分単位の間隔（例: 5, 10）
 * @returns 180分以下の倍数（分単位）のリスト
 *
 * 使用例:
 * console.log(getMinuteMultiples(30, 360)); // 例: [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360]
 */

function getMinuteMultiples(interval: number, maxMin?: number): number[] {
  const max = maxMin ?? 180;
  const result: number[] = [];

  // 1から順にintervalの倍数を計算し、max以下のものをリストに追加する
  for (let i = 1; i * interval <= max; i++) {
    result.push(i * interval);
  }

  return result;
}

/**
 * 現在の日付の指定時刻のUNIXタイムスタンプ（ミリ秒単位）を返す関数
 * @param startHour - 開始時間の文字列（例: "09:00"）
 * @param endHour - 終了時間の文字列（例: "18:00"）
 * @returns オブジェクト { startUnix, endUnix }。引数が指定されない場合は null を返す
 *
 * 使用例:
 * const timestamps = getUnixTimestamps("09:00", "18:00");
 * console.log(timestamps); // 例: { startUnix: 1680000000000, endUnix: 1680032400000 }
 */

function getUnixTimestamps(
  startHour?: string,
  endHour?: string
): { startUnix: number | null; endUnix: number | null } {
  // 今日の日付情報を取得
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 月は0〜11で管理
  const date = today.getDate();

  let startUnix: number | null = null;
  let endUnix: number | null = null;

  // startHourが指定されている場合、"HH:mm"形式の文字列から時・分を抽出し、当日の日時オブジェクトを作成
  if (startHour) {
    const [startH, startM] = startHour.split(':').map(Number);
    const startDate = new Date(year, month, date, startH, startM, 0);
    // ミリ秒単位のタイムスタンプを返す
    startUnix = startDate.getTime();
  }

  // endHourが指定されている場合、同様に処理
  if (endHour) {
    const [endH, endM] = endHour.split(':').map(Number);
    const endDate = new Date(year, month, date, endH, endM, 0);
    endUnix = endDate.getTime();
  }

  return { startUnix, endUnix };
}
