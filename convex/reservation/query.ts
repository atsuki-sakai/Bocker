import { paginationOptsValidator } from 'convex/server';
import { reservationStatusType } from '@/services/convex/shared/types/common';
import { validateReservation } from '@/services/convex/shared/utils/validation';
import { checkAuth } from '@/services/convex/shared/utils/auth';
import { api } from '@/convex/_generated/api';
import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { convertHourToUnixTimestamp, convertTimeStampToHour, formatJpTime } from '@/lib/schedule';
import { throwConvexError } from '@/lib/error';
import { getDayOfWeek } from '@/lib/schedule';
import { TimeRange } from '@/lib/type';
import { toMinutes, toHourString } from '@/lib/schedule';
import { validateDateStrToDate } from '@/services/convex/shared/utils/validation';

// 顧客IDから予約一覧を取得
export const findByCustomerId = query({
  args: {
    customerId: v.id('customer'),
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateReservation(args);
    return await ctx.db
      .query('reservation')
      .withIndex('by_customer_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('customerId', args.customerId)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'asc')
      .paginate(args.paginationOpts);
  },
});

export const getById = query({
  args: {
    reservationId: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx, true)

    return await ctx.db.get(args.reservationId);
  },
});
// スタッフIDから予約一覧を取得
export const findByStaffId = query({
  args: {
    staffId: v.id('staff'),
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateReservation(args)
    return await ctx.db
      .query('reservation')
      .withIndex('by_staff_id_status', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('staffId', args.staffId)
          .eq('isArchive', args.includeArchive || false)
          .eq('status', 'confirmed')
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts)
  },
})

// サロンIDから予約一覧を取得
export const findBySalonId = query({
  args: {
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    status: v.optional(reservationStatusType),
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateReservation(args)

    const reservations = await ctx.db
      .query('reservation')
      .withIndex('by_status', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('status', args.status || 'confirmed')
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts)

    return reservations
  },
})

export const findBySalonIdAndStaffId = query({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const reservations = await ctx.db
      .query('reservation')
      .withIndex('by_staff_id_status', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('staffId', args.staffId)
          .eq('isArchive', false)
          .eq('status', 'confirmed')
      )
      .filter((q) => q.gt(q.field('startTime_unix'), Date.now() / 1000))
      .order('desc')
      .paginate(args.paginationOpts)

    return reservations
  },
})

// ステータスから予約一覧を取得
export const findByStatus = query({
  args: {
    status: reservationStatusType,
    salonId: v.id('salon'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateReservation(args)
    return await ctx.db
      .query('reservation')
      .withIndex('by_status', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('status', args.status)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts)
  },
})

// サロンIDと日付から予約一覧を取得
export const findBySalonAndDate = query({
  args: {
    salonId: v.id('salon'),
    startTime_unix: v.number(),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateReservation(args)
    return await ctx.db
      .query('reservation')
      .withIndex('by_salon_status_start', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('isArchive', args.includeArchive || false)
          .eq('status', 'confirmed')
          .eq('startTime_unix', args.startTime_unix)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts)
  },
})

// スタッフIDと日付から予約一覧を取得
export const findByStaffAndDate = query({
  args: {
    staffId: v.id('staff'),
    salonId: v.id('salon'),
    startTime_unix: v.number(),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateReservation(args)
    return await ctx.db
      .query('reservation')
      .withIndex('by_staff_date_status', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('staffId', args.staffId)
          .eq('isArchive', args.includeArchive || false)
          .eq('status', 'confirmed')
          .eq('startTime_unix', args.startTime_unix)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts)
  },
})

// 顧客IDと日付から予約一覧を取得
export const findByCustomerAndDate = query({
  args: {
    customerId: v.id('customer'),
    salonId: v.id('salon'),
    startTime_unix: v.number(),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateReservation(args)
    return await ctx.db
      .query('reservation')
      .withIndex('by_customer_date', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('customerId', args.customerId)
          .eq('isArchive', args.includeArchive || false)
          .eq('startTime_unix', args.startTime_unix)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts)
  },
})

// サロンIDとステータスから予約一覧を取得
export const findBySalonAndStatus = query({
  args: {
    salonId: v.id('salon'),
    status: reservationStatusType,
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    validateReservation(args)
    checkAuth(ctx)
    return await ctx.db
      .query('reservation')
      .withIndex('by_status', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('status', args.status)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts)
  },
})

/**
 * サロン・スタッフ・日付から、その日の予約受付可能時間帯を取得するクエリハンドラ。
 * サロンとスタッフの営業日毎の営業時間を取得し、その時間帯から予約可能な時間帯を計算して返す。
 * @param ctx  Convex のクエリコンテキスト
 * @param args.salonId  対象サロンの ID
 * @param args.staffId  対象スタッフの ID
 * @param args.date     取得対象の日付（"YYYY-MM-DD"）
 * @returns           { startHour: string, endHour: string }
 *                      startHour: 受付開始時刻 ("HH:mm")
 *                      endHour:   受付終了時刻 ("HH:mm")
 * @throws  日付形式不正、サロン未設定、非営業日、例外休業日、スタッフ非出勤など
 */
export const findAvailableTimeSlots = query({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
    date: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    // 共通日付バリデーション
    const targetDate = validateDateStrToDate(args.date, 'findAvailableTimeSlots')
    const dayOfWeek = getDayOfWeek(targetDate)
    const dayOfWeekJa = getDayOfWeek(targetDate, true)

    const salonScheduleConfig = await ctx.db
      .query('salon_schedule_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId))
      .first()

    const todayFirstLaterMinutes = salonScheduleConfig?.todayFirstLaterMinutes
      ? salonScheduleConfig.todayFirstLaterMinutes * 60 * 1000
      : 30 * 60 * 1000 // 本日の場合、30分後から予約可能

    // 1. サロンの週間スケジュール取得
    const salonWeekSchedule = await ctx.db
      .query('salon_week_schedule')
      .withIndex('by_salon_week_is_open_day_of_week', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq(
            'dayOfWeek',
            dayOfWeek as
              | 'monday'
              | 'tuesday'
              | 'wednesday'
              | 'thursday'
              | 'friday'
              | 'saturday'
              | 'sunday'
          )
          .eq('isOpen', true)
          .eq('isArchive', false)
      )
      .first()
    if (!salonWeekSchedule) {
      throw throwConvexError({
        title: `サロンは${dayOfWeekJa}曜日は営業していません`,
        message: `サロンは${dayOfWeekJa}曜日は営業していません`,
        severity: 'low',
        code: 'INVALID_ARGUMENT',
        callFunc: 'findAvailableTimeSlots',
        status: 400,
        details: { salonId: args.salonId, staffId: args.staffId, date: args.date },
      })
    }
    if (!salonWeekSchedule.startHour || !salonWeekSchedule.endHour) {
      throw throwConvexError({
        title: `サロンの${dayOfWeekJa}曜日の営業時間が設定されていません`,
        message: `サロンの${dayOfWeekJa}曜日の営業時間が設定されていません`,
        severity: 'low',
        code: 'INVALID_ARGUMENT',
        callFunc: 'findAvailableTimeSlots',
        status: 400,
        details: {
          salonId: args.salonId,
          staffId: args.staffId,
          date: args.date,
        },
      })
    }

    // 2. サロンの例外スケジュール (休業日) チェック
    const salonException = await ctx.db
      .query('salon_schedule_exception')
      .withIndex('by_salon_date_type', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('date', args.date)
          .eq('type', 'holiday')
          .eq('isArchive', false)
      )
      .first()
    if (salonException) {
      throw throwConvexError({
        title: `サロンの臨時休業日です: ${args.date}`,
        message: `サロンの臨時休業日です: ${args.date}`,
        severity: 'low',
        code: 'INVALID_ARGUMENT',
        callFunc: 'findAvailableTimeSlots',
        status: 400,
        details: {
          salonId: args.salonId,
          staffId: args.staffId,
          date: args.date,
        },
      })
    }

    // 3. スタッフの営業時間取得
    const staffWeekSchedule = await ctx.db
      .query('staff_week_schedule')
      .withIndex('by_salon_id_staff_id_day_of_week', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('staffId', args.staffId)
          .eq(
            'dayOfWeek',
            dayOfWeek as
              | 'monday'
              | 'tuesday'
              | 'wednesday'
              | 'thursday'
              | 'friday'
              | 'saturday'
              | 'sunday'
          )
          .eq('isArchive', false)
      )
      .first()
    if (!staffWeekSchedule) {
      throw throwConvexError({
        title: 'スタッフの営業時間が見つかりません',
        message: 'スタッフの営業時間が見つかりません',
        severity: 'low',
        code: 'INVALID_ARGUMENT',
        callFunc: 'findAvailableTimeSlots',
        status: 400,
        details: { salonId: args.salonId, staffId: args.staffId, date: args.date },
      })
    }
    if (!staffWeekSchedule.isOpen) {
      throw throwConvexError({
        title: `スタッフは${dayOfWeekJa}出勤していません。別の曜日を選択してください。`,
        message: `スタッフは${dayOfWeekJa}出勤していません。別の曜日を選択してください。`,
        severity: 'low',
        code: 'INVALID_ARGUMENT',
        callFunc: 'findAvailableTimeSlots',
        status: 400,
        details: {
          salonId: args.salonId,
          staffId: args.staffId,
          date: args.date,
        },
      })
    }

    const salonStart = convertHourToUnixTimestamp(salonWeekSchedule.startHour, args.date)
    const salonEnd = convertHourToUnixTimestamp(salonWeekSchedule.endHour, args.date)

    const staffStart = staffWeekSchedule?.startHour
      ? convertHourToUnixTimestamp(staffWeekSchedule?.startHour, args.date)
      : Number.MIN_SAFE_INTEGER
    const staffEnd = staffWeekSchedule?.endHour
      ? convertHourToUnixTimestamp(staffWeekSchedule?.endHour, args.date)
      : Number.MAX_SAFE_INTEGER

    // サロン開始時刻とスタッフ開始時刻のうち、遅い方を採用
    let resultStart = Math.max(salonStart!, staffStart!)
    // 現在時刻を日本時間にシフト
    const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
    // 本日かどうか判定（日本時間ベース）
    if (
      jstNow.getUTCFullYear() === targetDate.getFullYear() &&
      jstNow.getUTCMonth() === targetDate.getMonth() &&
      jstNow.getUTCDate() === targetDate.getDate()
    ) {
      // 現在時刻＋待機時間を10分刻みに丸め
      const rawNextLater = Date.now() + todayFirstLaterMinutes
      const stepMs = 10 * 60 * 1000
      const alignedNextLater = Math.ceil(rawNextLater / stepMs) * stepMs
      resultStart = Math.max(resultStart, alignedNextLater)
    }
    // サロン終了時刻とスタッフ終了時刻のうち、早い方を採用
    const resultEnd = Math.min(salonEnd!, staffEnd!)

    // 予約できる時間の範囲の開始時刻と終了時刻を文字列に変換
    const startHour = convertTimeStampToHour(resultStart)
    const endHour = convertTimeStampToHour(resultEnd)

    return {
      startHour,
      endHour,
    }
  },
})

/**
 * 指定サロン・スタッフ・日付のスタッフスケジュールを取得するクエリハンドラ。
 *
 *
 * @param ctx  Convex のクエリコンテキスト
 * @param args.salonId   対象サロンの ID
 * @param args.staffId   対象スタッフの ID
 * @param args.date      取得対象の日付（"YYYY-MM-DD"）
 * @param args.isAllDay  true: 終日のスケジュールのみ、false: 部分スケジュールのみ
 * @returns             Array<{
 *                        date: string,
 *                        isAllDay: boolean,
 *                        type: string,
 *                        startTime: number,  // UNIX タイムスタンプ（秒単位）
 *                        endTime:   number
 *                      }>
 * @throws              日付形式不正
 */
export const findStaffSchedules = query({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
    date: v.string(), // "YYYY-MM-DD"
    isAllDay: v.boolean(),
  },
  handler: async (ctx, args) => {
    // 共通日付バリデーション
    validateDateStrToDate(args.date, 'findStaffSchedules')

    let staffSchedules
    if (args.isAllDay) {
      staffSchedules = await ctx.db
        .query('staff_schedule')
        .withIndex('by_salon_staff_date_all_day', (q) =>
          q
            .eq('salonId', args.salonId)
            .eq('staffId', args.staffId)
            .eq('date', args.date)
            .eq('isAllDay', true)
        )
        .collect()
    } else {
      staffSchedules = await ctx.db
        .query('staff_schedule')
        .withIndex('by_salon_staff_date_all_day', (q) =>
          q
            .eq('salonId', args.salonId)
            .eq('staffId', args.staffId)
            .eq('date', args.date)
            .eq('isAllDay', false)
        )
        .collect()
    }

    return staffSchedules.map((staffSchedule) => {
      return {
        date: staffSchedule.date,
        isAllDay: staffSchedule.isAllDay,
        type: staffSchedule.type,
        startTime: staffSchedule.startTime_unix!,
        endTime: staffSchedule.endTime_unix!,
      }
    })
  },
})

/**
 * 指定サロン・スタッフ・日付の予約データを取得するクエリハンドラ。
 *
 * @param ctx     Convex のクエリコンテキスト
 * @param args    { salonId: string, staffId: string, date: string }
 * @param args.date  取得対象の日付（"YYYY-MM-DD"）
 * @returns       Array<{
 *                  date:     string,
 *                  isAllDay: boolean,       // 常に false
 *                  type:     'reservation',
 *                  startTime: number,       // UNIX タイムスタンプ（秒単位）
 *                  endTime:   number
 *                }>
 * @throws        日付形式不正
 */
export const findStaffReservations = query({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
    date: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    // 共通日付バリデーション
    validateDateStrToDate(args.date, 'findStaffReservations')

    // 引数の date に対応する日の予約を UNIX タイム範囲で取得
    const startOfDay = convertHourToUnixTimestamp('00:00', args.date)
    const endOfDay = convertHourToUnixTimestamp('23:59', args.date)

    const startOfDaySec = Math.floor(startOfDay!)
    const endOfDaySec = Math.floor(endOfDay!)
    const reservationSchedules = await ctx.db
      .query('reservation')
      .withIndex('by_staff_date_status', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('staffId', args.staffId)
          .eq('isArchive', false)
          .eq('status', 'confirmed')
          .gte('startTime_unix', startOfDaySec)
          .lt('startTime_unix', endOfDaySec)
      )
      .collect()

    return reservationSchedules.map((reservationSchedule) => {
      return {
        date: args.date,
        isAllDay: false,
        type: 'reservation',
        startTime: reservationSchedule.startTime_unix,
        endTime: reservationSchedule.endTime_unix,
      }
    })
  },
})

// --- ユーティリティ関数としてファイル下部にまとめる ---
function subtractScheduleFromAvailable(
  available: TimeRange,
  staffSchedules: TimeRange[]
): TimeRange[] {
  // 初期スロットは受付可能時間のみ
  let slots: TimeRange[] = [available]
  for (const sched of staffSchedules) {
    const scStart = toMinutes(sched.startHour)
    const scEnd = toMinutes(sched.endHour)
    const nextSlots: TimeRange[] = []
    for (const slot of slots) {
      const avStart = toMinutes(slot.startHour)
      const avEnd = toMinutes(slot.endHour)
      if (scEnd <= avStart || scStart >= avEnd) {
        nextSlots.push(slot)
        continue
      }
      if (avStart < scStart) {
        nextSlots.push({
          startHour: slot.startHour,
          endHour: toHourString(scStart),
        })
      }
      if (scEnd < avEnd) {
        nextSlots.push({
          startHour: toHourString(scEnd),
          endHour: slot.endHour,
        })
      }
    }
    slots = nextSlots
  }
  return slots
}

function computeNextAlignedStart(
  minNextStart: number,
  durationMin: number,
  maxStart: number,
  stepMin: number // ← 追加: アライメントの間隔（例 30 分）
): number | null {
  const kStart = Math.ceil(minNextStart / stepMin)
  const candStart = kStart * stepMin
  const kEnd = Math.ceil((minNextStart + durationMin) / stepMin)
  const candEnd = kEnd * stepMin - durationMin
  const candidates: number[] = []
  if (candStart >= minNextStart) candidates.push(candStart)
  if (candEnd >= minNextStart) candidates.push(candEnd)
  if (candidates.length === 0) return null
  const next = Math.min(...candidates)
  return next <= maxStart ? next : null
}

function generateTimeSlotsWithAlignment(
  availableTimeSlot: TimeRange,
  durationMin: number,
  includeTrailing: boolean = false,
  minSlotSize: number = 60
): TimeRange[] {
  // ───────────────────────────────────────────────────────────────
  //  予約可能なウィンドウ（availableTimeSlot）から、施術時間 durationMin
  //  をピッタリ充填できる時間スロット一覧を生成する。
  //
  //  例）
  //    availableTimeSlot: { 10:00 ~ 16:00 }, durationMin: 90
  //      → 10:00~11:30, 11:30~13:00, 13:00~14:30, 14:30~16:00
  //
  //  オプション:
  //    includeTrailing : 最後に「余り」を強制的に入れるか
  //    minSlotSize     : スロットのアライメント間隔（例 30 分）兼ギャップ判定
  // ───────────────────────────────────────────────────────────────
  const { startHour, endHour } = availableTimeSlot

  // HH:mm 文字列 → 分数に変換
  const windowStart = toMinutes(startHour)
  const windowEnd = toMinutes(endHour)
  const windowLen = windowEnd - windowStart
  // 予約ウィンドウ自体が施術時間より短ければスロット 0
  if (windowLen < durationMin) return []

  // === 1. 最初のスロット（ウィンドウ開始から durationMin 分） ===
  const result: TimeRange[] = [
    {
      startHour: toHourString(windowStart),
      endHour: toHourString(windowStart + durationMin),
    },
  ]

  // lastStart: 直近でスロット開始に採用した minutes 値
  let lastStart = windowStart

  // === 2. 前回スロット開始から durationMin 以上空けて、
  //        かつ minSlotSize 分単位に「良い感じ」で揃った次の開始時刻を探す ===
  while (true) {
    const minNext = lastStart + minSlotSize // 次スロットが始められる最短分
    // minSlotSize 分単位の「揃った」時刻を算出（helper）
    const aligned = computeNextAlignedStart(
      minNext,
      durationMin,
      windowEnd - durationMin,
      minSlotSize
    )
    if (aligned === null) break // もう置けない
    result.push({
      startHour: toHourString(aligned),
      endHour: toHourString(aligned + durationMin),
    })
    lastStart = aligned
  }

  // === 3. includeTrailing が true のとき、末尾ギリギリのスロットも追加 ===
  if (includeTrailing) {
    const backStart = windowEnd - durationMin
    const alreadyExists = result.some((r) => toMinutes(r.startHour) === backStart)
    if (backStart >= windowStart && !alreadyExists) {
      result.push({
        startHour: toHourString(backStart),
        endHour: toHourString(windowEnd),
      })
    }
  }

  // === 4. スロットをフィルタ：
  //       ・ウィンドウの端を含むものは常に残す
  //       ・それ以外は、前後ギャップが minSlotSize 以上あるものだけ残す
  const filtered = result.filter((slot) => {
    const startMin = toMinutes(slot.startHour)
    const endMin = toMinutes(slot.endHour)
    if (startMin === windowStart || endMin === windowEnd) return true
    const beforeGap = startMin - windowStart
    const afterGap = windowEnd - endMin
    return beforeGap >= minSlotSize && afterGap >= minSlotSize
  })

  return filtered
}

/**
 * 予約可能時間帯とスタッフ予定・既存予約をもとに、
 * 与えられた施術時間で予約可能な時間スロットのリストを返す。
 *
 * @param ctx          Convex のクエリコンテキスト
 * @param args.salonId   対象サロンの ID
 * @param args.staffId   対象スタッフの ID
 * @param args.date      対象日付 ("YYYY-MM-DD")
 * @param args.durationMin  施術時間（分）
 * @returns            TimeRange[] （予約可能スロットの配列）
 * @throws             日付形式不正、終日スケジュールあり
 */
export const calculateReservationTime = query({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
    date: v.string(), // "YYYY-MM-DD"
    durationMin: v.number(), // 50分などの施術時間 数値のみ
  },
  handler: async (ctx, args): Promise<TimeRange[]> => {
    // 共通日付バリデーション
    validateDateStrToDate(args.date, 'calculateReservationTime')

    // findAvailableTimeSlots, findStaffSchedules, findStaffReservations を直接呼び出し
    const availableTimeSlots = await ctx.runQuery(api.reservation.query.findAvailableTimeSlots, {
      salonId: args.salonId,
      staffId: args.staffId,
      date: args.date,
    })

    const staffAllDaySchedules = await ctx.runQuery(api.reservation.query.findStaffSchedules, {
      salonId: args.salonId,
      staffId: args.staffId,
      date: args.date,
      isAllDay: true,
    })

    if (staffAllDaySchedules.length > 0) {
      throw throwConvexError({
        title: 'スタッフには終日のスケジュールがあります。予約受け付けできません。',
        message: 'スタッフには終日のスケジュールがあります。予約受け付けできません。',
        severity: 'low',
        code: 'INVALID_ARGUMENT',
        callFunc: 'calculateReservationTime',
        status: 400,
        details: {
          salonId: args.salonId,
          staffId: args.staffId,
          date: args.date,
        },
      })
    }

    const salonScheduleConfig = await ctx.runQuery(api.salon.schedule.query.findBySalonId, {
      salonId: args.salonId,
    })

    const staffSchedules = await ctx.runQuery(api.reservation.query.findStaffSchedules, {
      salonId: args.salonId,
      staffId: args.staffId,
      date: args.date,
      isAllDay: false,
    })

    const staffReservations = await ctx.runQuery(api.reservation.query.findStaffReservations, {
      salonId: args.salonId,
      staffId: args.staffId,
      date: args.date,
    })

    const allSchedules = [
      ...staffSchedules.map((schedule) => ({
        startHour: formatJpTime(schedule.startTime),
        endHour: formatJpTime(schedule.endTime),
      })),
      ...staffReservations.map((reservation) => ({
        startHour: formatJpTime(reservation.startTime!),
        endHour: formatJpTime(reservation.endTime!),
      })),
    ]

    const subtractedSchedules = subtractScheduleFromAvailable(
      availableTimeSlots,
      allSchedules.map((schedule) => ({
        startHour: schedule.startHour,
        endHour: schedule.endHour,
      }))
    )

    const subtractedSchedulesWithStep = subtractedSchedules.map((schedule) => {
      const timeSlots = generateTimeSlotsWithAlignment(
        schedule,
        args.durationMin,
        true,
        salonScheduleConfig?.reservationIntervalMinutes
      )
      return timeSlots
    })

    return subtractedSchedulesWithStep.flat()
  },
})

// 指定した時間帯に重複している予約件数を取得し、
// 同時利用可能席数(availableSheet)を超えている場合はエラーを返す
export const countAvailableSheetInTimeRange = query({
  args: {
    salonId: v.id('salon'),
    startTime: v.number(), // 予約開始 UNIX 秒
    endTime: v.number(), // 予約終了 UNIX 秒
  },
  handler: async (ctx, args) => {
    // 1. サロン設定から同時予約可能席数を取得
    const salonConfig = await ctx.db
      .query('salon_schedule_config')
      .withIndex('by_salon_id', (q) => q.eq('salonId', args.salonId).eq('isArchive', false))
      .first()

    const availableSheet = salonConfig?.availableSheet ?? null // null → 上限無し

    // 2. 指定時間帯と重複する予約を取得
    //    (予約開始 < 検索終了) かつ (予約終了 > 検索開始) で重複判定
    const overlapping = await ctx.db
      .query('reservation')
      .withIndex('by_salon_status_start', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('isArchive', false)
          .eq('status', 'confirmed')
          .lt('startTime_unix', args.endTime)
      )
      .filter((q) => q.gt(q.field('endTime_unix'), args.startTime))
      .collect()

    const overlapCount = overlapping.length

    // 3. 上限を超えていれば「利用不可」を返す
    const isAvailable =
      availableSheet === null || availableSheet === 0 || overlapCount < availableSheet

    // 4. 結果を返却（エラーはスローしない）
    return {
      operationCount: overlapCount,
      availableSheet,
      isAvailable, // ← 追加フィールド
    }
  },
})

