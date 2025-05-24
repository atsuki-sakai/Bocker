/**
 * ■ 責任範囲
 *   - 効率的な予約データ取得（複合インデックス最適利用）
 *   - is_archive考慮で論理削除レコードを自動除外
 *   - フロント・管理画面用途に応じた柔軟なフィルタ/ソート/ページネーション
 * 
 * ■ 非責任範囲
 *   - 同時間帯重複排除
 *   - 同時利用席数チェック
 *   - 業務バリデーション
 *   → これらは必ずmutation/helpers（checkDoubleBooking）側で担保すること
 * ---------------------------------------------------------------
 */

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

/**
 * 予約IDによる単一予約取得
 * - 主に詳細画面や個別予約表示用途
 * - 論理削除(is_archive)は考慮しないため利用時は注意
 * - 取得のみで、重複や席数バリデーションはmutation側で実施
 * データ取得専用でバリデーションはmutationで担保
 */
export const getById = query({
  args: {
    id: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * 指定テナント・組織・予約ステータスでの予約一覧取得
 * - 管理画面/予約カレンダー等の一覧用途
 * - is_archive: false のみ対象
 * - target_status指定で柔軟なフィルタ
 * - ページネーション・昇降順指定可
 * - 重複/席数バリデーションはmutation/helpersで必須
 * データ取得専用でバリデーションはmutationで担保
 */
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


/**
 * 顧客IDからの予約一覧取得
 * - 顧客マイページや予約履歴画面用途
 * - is_archive: false のみ対象
 * - 昇降順・ページネーション対応
 * - バリデーション/競合判定はmutationで担保
 * データ取得専用でバリデーションはmutationで担保
 */
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

/**
 * スタッフIDによる予約一覧取得
 * - スタッフ毎の予約確認・シフト管理等の用途
 * - is_archive: false のみ対象
 * - バリデーション/重複管理はmutationで担保
 * データ取得専用でバリデーションはmutationで担保
 */
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


/**
 * ステータス指定での予約一覧取得
 * - キャンセル/未完了/完了等の抽出用途
 * - 論理削除は未考慮なので利用時は注意
 * - 業務ロジックはmutation側で担保
 * データ取得専用でバリデーションはmutationで担保
 */
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

/**
 * 日付指定による予約一覧取得
 * - 特定日付の予約確認・日次集計等に活用
 * - is_archive: false のみ対象
 * - 認証必須
 * - 重複/バリデーションはmutationで担保
 * データ取得専用でバリデーションはmutationで担保
 */
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
      .withIndex('by_tenant_org_date_status_archive', (q) =>
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

/**
 * スタッフID＋日付での予約一覧取得
 * - シフト表や日次確認用途
 * - is_archive: false のみ対象
 * - 認証必須
 * - 重複/席数判定はmutation/helpersで
 * データ取得専用でバリデーションはmutationで担保
 */
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

/**
 * 顧客ID＋日付での予約取得
 * - マイページでの本日予約確認等に利用
 * - is_archive: false のみ抽出
 * - 認証必須
 * - 重複排除はmutationで担保
 * データ取得専用でバリデーションはmutationで担保
 */
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
 * サロン・スタッフ・日付から当日の予約受付可能時間帯を算出
 * - サロン・スタッフ・例外休業を考慮し予約枠を算出
 * - 重複・席数・既存予約考慮はmutation/helpersに委譲
 * - 本関数は「予約可能な時間帯」の情報のみ返す
 * データ取得専用でバリデーションはmutationで担保
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
 * スタッフの例外スケジュール取得
 * - is_all_day指定で終日・部分取得
 * - 予約バリデーションや重複判定はmutationで必須
 * - 取得専用
 * データ取得専用でバリデーションはmutationで担保
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
 * スタッフの当日予約（confirmedのみ）を取得
 * - スケジュールやダッシュボード向け
 * - 予約バリデーションはmutation側で担保
 * データ取得専用でバリデーションはmutationで担保
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
 * 指定スタッフ・日付・施術時間で予約可能スロットを計算
 * - 空き枠計算ロジックの中心
 * - 実際の予約確保や重複排除はmutation/helpersで厳格管理
 * - 本関数は「計算上の予約可能スロット」提示のみ
 * データ取得専用でバリデーションはmutationで担保
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


/**
 * Supabaseアーカイブ連携用クエリ
 * - 完了済み予約のバッチ同期用
 * - 取得・ページネーションのみでバリデーションは行わない
 * データ取得専用でバリデーションはmutationで担保
 */
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
