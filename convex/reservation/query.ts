import { paginationOptsValidator } from 'convex/server';
import { reservationStatusType } from '@/convex/types';
import { checkAuth } from '@/convex/utils/auth';
import { api } from '@/convex/_generated/api';
import { query } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { validateDateStrFormat, validateRequiredNumber, validateStringLength } from '@/convex/utils/validations';
import { convertHourToTimestamp, formatTimestamp,hourToMinutes, convertTimestampToHour, getDayOfWeek, toHourString } from '@/lib/schedules';
import { TimeRange } from '@/lib/types';
import { validateDateStrToDate, validateNumberLength } from '@/convex/utils/validations';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { ConvexError } from 'convex/values';

export const getById = query({
  args: {
    id: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// TenantIDとOrgIDから予約一覧を取得
export const list = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    pagination_opts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    target_status: v.optional(reservationStatusType),
  },
  handler: async (ctx, args) => {
    validateStringLength(args.org_id, 'org_id');
    const reservationQuery = await ctx.db
      .query('reservation')
      .withIndex('by_tenant_org_status_date_start_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('status', args.target_status ? args.target_status : 'confirmed')
      )
      .filter((q) => q.eq(q.field('is_archive'), false))

    return reservationQuery.order(args.sort || 'desc').paginate(args.pagination_opts)
  },
})


// 顧客IDから予約一覧を取得
export const listByCustomerId = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    customer_id: v.string(),
    pagination_opts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc')))
  },
  handler: async (ctx, args) => {
    validateStringLength(args.customer_id, 'customer_id');
    validateStringLength(args.org_id, 'org_id');

    const reservationQuery = await ctx.db
      .query('reservation')
      .withIndex('by_tenant_org_customer_date_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('customer_id', args.customer_id)
      )
      .filter((q) => q.eq(q.field('is_archive'), false))

      return reservationQuery.order(args.sort || 'asc')
      .paginate(args.pagination_opts);
  },
});

// スタッフIDから予約一覧を取得
export const listByStaffId = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    staff_id: v.id('staff'),
    pagination_opts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
  },
  handler: async (ctx, args) => {
    validateStringLength(args.org_id, 'org_id');

    const reservationQuery = await ctx.db
      .query('reservation')
      .withIndex('by_tenant_org_staff_date_status_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('staff_id', args.staff_id)
      )
      .filter((q) => q.eq(q.field('is_archive'), false))

    return reservationQuery.order(args.sort || 'desc').paginate(args.pagination_opts)
  },
})


// ステータスから予約一覧を取得
export const listByStatus = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    status: reservationStatusType,
    pagination_opts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
  },
  handler: async (ctx, args) => {
    validateStringLength(args.org_id, 'org_id');

    return await ctx.db
      .query('reservation')
      .withIndex('by_tenant_org_status_date_start_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('status', args.status)
      )
      .order(args.sort || 'desc')
      .paginate(args.pagination_opts)
  },
})

// 日付から予約一覧を取得
export const listByDate = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    date: v.string(),
    pagination_opts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc')))
  },
  handler: async (ctx, args) => {
    checkAuth(ctx);
    validateStringLength(args.org_id, 'org_id');
    validateDateStrFormat(args.date, 'date');
    return await ctx.db
      .query('reservation')
      .withIndex('by_tenant_org_date_start_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('date', args.date)
      )
      .filter((q) => q.eq(q.field('is_archive'), false))
      .order(args.sort || 'desc')
      .paginate(args.pagination_opts)
  },
})

// スタッフIDと日付から予約一覧を取得
export const listByStaffAndDate = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    staff_id: v.id('staff'),
    date: v.string(),
    pagination_opts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc')))
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateDateStrFormat(args.date, 'date');
    validateStringLength(args.org_id, 'org_id');
    return await ctx.db
      .query('reservation')
      .withIndex('by_tenant_org_staff_date_status_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('staff_id', args.staff_id)
          .eq('date', args.date)
      )
      .filter((q) => q.eq(q.field('is_archive'), false))
      .order(args.sort || 'desc')
      .paginate(args.pagination_opts)
  },
})

// 顧客IDと日付から予約一覧を取得
export const findByCustomerAndDate = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    customer_id: v.string(),
    date: v.string(),
    pagination_opts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    includeArchive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateStringLength(args.customer_id, 'customer_id');
    validateStringLength(args.org_id, 'org_id');
    validateDateStrFormat(args.date, 'date');
    return await ctx.db
      .query('reservation')
      .withIndex('by_tenant_org_customer_date_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('customer_id', args.customer_id)
          .eq('date', args.date)
          .eq('is_archive', false)
      )
      .order(args.sort || 'desc')
      .paginate(args.pagination_opts)
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
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    staff_id: v.id('staff'),
    date: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    // 共通日付バリデーション
    const targetDate = validateDateStrToDate(args.date, 'findAvailableTimeSlots')
    const dayOfWeek = getDayOfWeek(targetDate)
    const dayOfWeekJa = getDayOfWeek(targetDate, true)

    const tenantReservationConfig = await ctx.db
      .query('reservation_config')
      .withIndex('by_tenant_org_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_archive', false))
      .first()

    const todayFirstLaterMinutes = tenantReservationConfig?.today_first_later_minutes
      ? tenantReservationConfig.today_first_later_minutes * 60 * 1000
      : 30 * 60 * 1000 // 未設定の場合は30分後から予約可能

    // 1. サロンの週間スケジュール取得
    const tenantWeekSchedule = await ctx.db
      .query('week_schedule')
      .withIndex('by_tenant_org_week_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq(
            'day_of_week',
            dayOfWeek as
              | 'monday'
              | 'tuesday'
              | 'wednesday'
              | 'thursday'
              | 'friday'
              | 'saturday'
              | 'sunday'
          )
          .eq('is_archive', false)
      ).filter((q) => q.eq(q.field('is_open'), true))
      .first()
    if (!tenantWeekSchedule) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'findAvailableTimeSlots',
        message: `サロンは${dayOfWeekJa}曜日は営業していません`,
        code: 'BAD_REQUEST',
        status: 400,
        details: {
          ...args,
        },
      });
    }
    if (!tenantWeekSchedule.start_hour || !tenantWeekSchedule.end_hour) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'findAvailableTimeSlots',
        message: `サロンの${dayOfWeekJa}曜日の営業時間が設定されていません`,
        code: 'BAD_REQUEST',
        status: 400,
        details: {
          ...args,
          date: args.date,
        },
      })
    }

    // 2. サロンの例外スケジュール (休業日) チェック
    const tenantException = await ctx.db
      .query('exception_schedule')
      .withIndex('by_tenant_org_date_type_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('date', args.date)
          .eq('type', 'holiday')
          .eq('is_archive', false)
      )
      .first()
    if (tenantException) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'findAvailableTimeSlots',
        message: `サロンの臨時休業日です: ${args.date}`,
        code: 'BAD_REQUEST',
        status: 400,
        details: {
          ...args
        },
      })
    }

    // 3. スタッフの営業時間取得
    const staffWeekSchedule = await ctx.db
      .query('staff_week_schedule')
      .withIndex('by_tenant_org_staff_week_open_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('staff_id', args.staff_id)
          .eq(
            'day_of_week',
            dayOfWeek as
              | 'monday'
              | 'tuesday'
              | 'wednesday'
              | 'thursday'
              | 'friday'
              | 'saturday'
              | 'sunday'
          )
          .eq('is_open', true)
          .eq('is_archive', false)
      )
      .first()
    if (!staffWeekSchedule) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'findAvailableTimeSlots',
        message: 'スタッフの営業時間が見つかりません',
        code: 'BAD_REQUEST',
        status: 400,
        details: {
          ...args
        },
      })
    }
    if (!staffWeekSchedule.is_open) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'findAvailableTimeSlots',
        message: `スタッフは${dayOfWeekJa}出勤していません。別の曜日を選択してください。`,
        code: 'BAD_REQUEST',
        status: 400,
        details: {
          ...args
        },
      })
    }

    const salonStart = convertHourToTimestamp(tenantWeekSchedule.start_hour, args.date)
    const salonEnd = convertHourToTimestamp(tenantWeekSchedule.end_hour, args.date)

    const staffStart = staffWeekSchedule?.start_hour
      ? convertHourToTimestamp(staffWeekSchedule?.start_hour, args.date)
      : Number.MIN_SAFE_INTEGER
    const staffEnd = staffWeekSchedule?.end_hour
      ? convertHourToTimestamp(staffWeekSchedule?.end_hour, args.date)
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
    const startHour = convertTimestampToHour(resultStart)
    const endHour = convertTimestampToHour(resultEnd)

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
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    staff_id: v.id('staff'),
    date: v.string(), // "YYYY-MM-DD"
    is_all_day: v.boolean(),
  },
  handler: async (ctx, args) => {
    // 共通日付バリデーション
    validateDateStrFormat(args.date, 'findStaffSchedules')
    validateStringLength(args.org_id, 'org_id')

    let staffSchedules
    if (args.is_all_day) {
      staffSchedules = await ctx.db
        .query('staff_exception_schedule')
        .withIndex('by_tenant_org_staff_date_archive', (q) =>
          q
            .eq('tenant_id', args.tenant_id)
            .eq('org_id', args.org_id)
            .eq('staff_id', args.staff_id)
            .eq('date', args.date)
            .eq('is_archive', false)
        )
        .filter((q) => q.eq(q.field('is_all_day'), true))
        .collect()
    } else {
      staffSchedules = await ctx.db
        .query('staff_exception_schedule')
        .withIndex('by_tenant_org_staff_date_archive', (q) =>
          q
            .eq('tenant_id', args.tenant_id)
            .eq('org_id', args.org_id)
            .eq('staff_id', args.staff_id)
            .eq('date', args.date)
        ).filter((q) => q.eq(q.field('is_all_day'), false))
        .collect()
    }

    return staffSchedules.map((staffSchedule) => {
      return {
        date: staffSchedule.date,
        is_all_day: staffSchedule.is_all_day,
        type: staffSchedule.type,
        start_time_unix: staffSchedule.start_time_unix!,
        end_time_unix: staffSchedule.end_time_unix!,
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
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    staff_id: v.id('staff'),
    date: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    // 共通日付バリデーション
    validateDateStrToDate(args.date, 'findStaffReservations')
    validateStringLength(args.org_id, 'org_id')


    // 引数の date に対応する日の予約を UNIX タイム範囲で取得
    const startOfDay = convertHourToTimestamp('00:00', args.date)
    const endOfDay = convertHourToTimestamp('23:59', args.date)

    const startOfDaySec = Math.floor(startOfDay!)
    const endOfDaySec = Math.floor(endOfDay!)

    if (startOfDaySec === null || endOfDaySec === null) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'findStaffReservations',
        message: '日付形式が不正です',
        code: 'BAD_REQUEST',
        status: 400,
        details: {
          ...args
        },
      })
    }
    const staffReservationSchedules = await ctx.db
      .query('reservation')
      .withIndex('by_tenant_org_staff_date_status_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('staff_id', args.staff_id)
          .eq('date', args.date)
          .eq('status', 'confirmed')
          .eq('is_archive', false)
      )
      .filter((q) => q.gte(q.field('start_time_unix'), startOfDaySec))
      .filter((q) => q.lt(q.field('start_time_unix'), endOfDaySec))
      .collect()

    return staffReservationSchedules.map((reservationSchedule) => {
      return {
        date: args.date,
        is_all_day: false,
        type: 'reservation',
        start_time_unix: reservationSchedule.start_time_unix!,
        end_time_unix: reservationSchedule.end_time_unix!,
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
    const scStart = hourToMinutes(sched.startHour)
    const scEnd = hourToMinutes(sched.endHour)
    const nextSlots: TimeRange[] = []
    for (const slot of slots) {
      const avStart = hourToMinutes(slot.startHour)
      const avEnd = hourToMinutes(slot.endHour)
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
  const windowStart = hourToMinutes(startHour)
  const windowEnd = hourToMinutes(endHour)
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
    const alreadyExists = result.some((r) => hourToMinutes(r.startHour) === backStart)
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
    const startMin = hourToMinutes(slot.startHour)
    const endMin = hourToMinutes(slot.endHour)
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
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    staff_id: v.id('staff'),
    date: v.string(), // "YYYY-MM-DD"
    duration_min: v.number(), // 50分などの施術時間 数値のみ
  },
  handler: async (ctx, args): Promise<TimeRange[]> => {
    // 共通日付バリデーション
    validateDateStrToDate(args.date, 'calculateReservationTime')
    validateStringLength(args.org_id, 'org_id')

    // findAvailableTimeSlots, findStaffSchedules, findStaffReservations を直接呼び出し
    const availableTimeSlots = await ctx.runQuery(api.reservation.query.findAvailableTimeSlots, {
      tenant_id: args.tenant_id,
      org_id: args.org_id,
      staff_id: args.staff_id,
      date: args.date,
    })

    const staffAllDaySchedules = await ctx.runQuery(api.reservation.query.findStaffSchedules, {
      tenant_id: args.tenant_id,
      org_id: args.org_id,
      staff_id: args.staff_id,
      date: args.date,
      is_all_day: true,
    })

    if (staffAllDaySchedules.length > 0) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'calculateReservationTime',
        status: 400,
        message: 'スタッフには終日のスケジュールがあります。予約受け付けできません。',
        code: 'BAD_REQUEST',
        details: {
          tenant_id: args.tenant_id,
          org_id: args.org_id,
          staff_id: args.staff_id,
          date: args.date,
        },
      })
    }

    const reservationConfig = await ctx.runQuery(api.organization.reservation_config.query.findByTenantAndOrg, {
      tenant_id: args.tenant_id,
      org_id: args.org_id,
    })

    const staffSchedules = await ctx.runQuery(api.reservation.query.findStaffSchedules, {
      tenant_id: args.tenant_id,
      org_id: args.org_id,
      staff_id: args.staff_id,
      date: args.date,
      is_all_day: false,
    })

    const staffReservations = await ctx.runQuery(api.reservation.query.findStaffReservations, {
      tenant_id: args.tenant_id,
      org_id: args.org_id,
      staff_id: args.staff_id,
      date: args.date,
    })

    const allSchedules = [
      ...staffSchedules.map((schedule) => ({
        startHour: formatTimestamp(schedule.start_time_unix,{useJST: true}),
        endHour: formatTimestamp(schedule.end_time_unix,{useJST: true}),
      })),
      ...staffReservations.map((reservation) => ({
        startHour: formatTimestamp(reservation.start_time_unix,{useJST: true}),
        endHour: formatTimestamp(reservation.end_time_unix,{useJST: true}),
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
        args.duration_min,
        true,
        reservationConfig?.reservation_interval_minutes
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
    tenant_id: v.id('tenant'),
    org_id: v.string(),
    date: v.string(), // "YYYY-MM-DD"
    start_time_unix: v.number(), // 予約開始 UNIX 秒
    end_time_unix: v.number(), // 予約終了 UNIX 秒
  },
  handler: async (ctx, args) => {
    validateStringLength(args.org_id, 'org_id')
    validateDateStrToDate(args.date, 'countAvailableSheetInTimeRange')
    validateNumberLength(args.start_time_unix, 'start_time_unix')
    validateNumberLength(args.end_time_unix, 'end_time_unix')

    // 1. 組織設定から同時予約可能席数を取得
    const reservationConfig = await ctx.db
      .query('reservation_config')
      .withIndex('by_tenant_org_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_archive', false))
      .first()

    const availableSheet = reservationConfig?.available_sheet ?? null // null → 上限無し

    // 2. 指定時間帯と重複する予約を取得
    //    (予約開始 < 検索終了) かつ (予約終了 > 検索開始) で重複判定
    const overlapping = await ctx.db
      .query('reservation')
      .withIndex('by_tenant_org_status_date_start_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('status', 'confirmed')
          .eq('date', args.date)
          .eq('is_archive', false)
      )
      .filter((q) => q.gte(q.field('start_time_unix'), args.start_time_unix))
      .filter((q) => q.lt(q.field('end_time_unix'), args.end_time_unix))
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

export const syncReservationToSupabase = query({
  args: {
    // paginate が期待するカーソルの型に変更
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { cursor, limit = 5000 }) => {
    
    let queryBuilder = ctx.db.query("reservation").withIndex("status_start_time_archive", q => 
      q
      .eq("status", "completed")
      .lt("start_time_unix", new Date().getTime())
    );
    // ページネーションを適用
    // cursor が null または undefined の場合、最初のページから取得
    const page = await queryBuilder.paginate({
      numItems: limit,
      cursor: cursor ?? null, // cursor が undefined の場合は null を渡す
    });
    const reservations = page.page;

    // 次カーソル
    const nextCursor = page.isDone ? null : page.continueCursor;

    // 完了判定
    const isDone = page.isDone;

    return { reservations, nextCursor, isDone };
  },
});


export const checkDoubleBooking = query({
  args: {
    tenant_id: v.id('tenant'), // テナントID
    org_id: v.string(), // 組織ID
    staff_id: v.id('staff'), // スタッフID 予約がないか確認したいスタッフの_id
    date: v.string(), // 予約がないか確認したい日付
    start_time_unix: v.number(), // 予約がないか確認したい時間の範囲の開始時間
    end_time_unix: v.number(), // 予約がないか確認したい時間の範囲の終了時間
  },
  handler: async (ctx, args) => {
    validateStringLength(args.org_id, 'org_id')
    validateRequiredNumber(args.start_time_unix, 'start_time_unix')
    validateRequiredNumber(args.end_time_unix, 'end_time_unix')

    // Add date range filtering if possible
    const reservations = await ctx.db
      .query('reservation')
      .withIndex('by_tenant_org_staff_date_status_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('staff_id', args.staff_id)
          .eq('date', args.date)
          .eq('status', 'confirmed')
          .eq('is_archive', false)
      )
      .filter((q) => q.gte(q.field('start_time_unix'), args.start_time_unix))
      .filter((q) => q.lt(q.field('end_time_unix'), args.end_time_unix))
      .first()
    if (reservations) {
      return {
        isOverlapping: true,
        overlappingReservation: reservations,
      };
    }
    return { isOverlapping: false };
  },
})