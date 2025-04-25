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
    checkAuth(ctx);

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
    checkAuth(ctx);
    validateReservation(args);
    return await ctx.db
      .query('reservation')
      .withIndex('by_staff_id', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('staffId', args.staffId)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

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
    checkAuth(ctx);
    validateReservation(args);

    const reservations = await ctx.db
      .query('reservation')
      .withIndex('by_status', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('status', args.status || 'confirmed')
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);

    return reservations;
  },
});

export const findBySalonIdAndStaffId = query({
  args: {
    salonId: v.id('salon'),
    staffId: v.id('staff'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const reservations = await ctx.db
      .query('reservation')
      .withIndex('by_staff_id', (q) =>
        q.eq('salonId', args.salonId).eq('staffId', args.staffId).eq('isArchive', false)
      )
      .filter((q) => q.gt(q.field('startTime_unix'), Date.now() / 1000))
      .order('desc')
      .paginate(args.paginationOpts);

    return reservations;
  },
});

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
    checkAuth(ctx);
    validateReservation(args);
    return await ctx.db
      .query('reservation')
      .withIndex('by_status', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('status', args.status)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

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
    checkAuth(ctx);
    validateReservation(args);
    return await ctx.db
      .query('reservation')
      .withIndex('by_salon_start', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('isArchive', args.includeArchive || false)
          .eq('startTime_unix', args.startTime_unix)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

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
    checkAuth(ctx);
    validateReservation(args);
    return await ctx.db
      .query('reservation')
      .withIndex('by_staff_date', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('staffId', args.staffId)
          .eq('isArchive', args.includeArchive || false)
          .eq('startTime_unix', args.startTime_unix)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

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
    checkAuth(ctx);
    validateReservation(args);
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
      .paginate(args.paginationOpts);
  },
});

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
    validateReservation(args);
    checkAuth(ctx);
    return await ctx.db
      .query('reservation')
      .withIndex('by_status', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('status', args.status)
          .eq('isArchive', args.includeArchive || false)
      )
      .order(args.sort || 'desc')
      .paginate(args.paginationOpts);
  },
});

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
    const targetDate = validateDateStrToDate(args.date, 'findAvailableTimeSlots');
    const dayOfWeek = getDayOfWeek(targetDate);

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
      .first();
    if (!salonWeekSchedule) {
      throw throwConvexError({
        title: `サロンは${dayOfWeek}曜日は営業していません`,
        message: `サロンは${dayOfWeek}曜日は営業していません`,
        severity: 'low',
        code: 'INVALID_ARGUMENT',
        callFunc: 'findAvailableTimeSlots',
        status: 400,
        details: { salonId: args.salonId, staffId: args.staffId, date: args.date },
      });
    }
    if (!salonWeekSchedule.startHour || !salonWeekSchedule.endHour) {
      throw throwConvexError({
        title: `サロンの${dayOfWeek}曜日の営業時間が設定されていません`,
        message: `サロンの${dayOfWeek}曜日の営業時間が設定されていません`,
        severity: 'low',
        code: 'INVALID_ARGUMENT',
        callFunc: 'findAvailableTimeSlots',
        status: 400,
        details: {
          salonId: args.salonId,
          staffId: args.staffId,
          date: args.date,
        },
      });
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
      .first();
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
      });
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
      .first();
    if (!staffWeekSchedule) {
      throw throwConvexError({
        title: 'スタッフの営業時間が見つかりません',
        message: 'スタッフの営業時間が見つかりません',
        severity: 'low',
        code: 'INVALID_ARGUMENT',
        callFunc: 'findAvailableTimeSlots',
        status: 400,
        details: { salonId: args.salonId, staffId: args.staffId, date: args.date },
      });
    }
    if (!staffWeekSchedule.isOpen) {
      throw throwConvexError({
        title: `${dayOfWeek}は出勤していません`,
        message: `${dayOfWeek}は出勤していません`,
        severity: 'low',
        code: 'INVALID_ARGUMENT',
        callFunc: 'findAvailableTimeSlots',
        status: 400,
        details: {
          salonId: args.salonId,
          staffId: args.staffId,
          date: args.date,
        },
      });
    }

    const salonStart = convertHourToUnixTimestamp(salonWeekSchedule.startHour, args.date);
    const salonEnd = convertHourToUnixTimestamp(salonWeekSchedule.endHour, args.date);

    const staffStart = staffWeekSchedule?.startHour
      ? convertHourToUnixTimestamp(staffWeekSchedule?.startHour, args.date)
      : Number.MIN_SAFE_INTEGER;
    const staffEnd = staffWeekSchedule?.endHour
      ? convertHourToUnixTimestamp(staffWeekSchedule?.endHour, args.date)
      : Number.MAX_SAFE_INTEGER;

    // サロン開始時刻とスタッフ開始時刻のうち、遅い方を採用
    const resultStart = Math.max(salonStart!, staffStart!);
    // サロン終了時刻とスタッフ終了時刻のうち、早い方を採用
    const resultEnd = Math.min(salonEnd!, staffEnd!);

    // 予約できる時間の範囲の開始時刻と終了時刻を文字列に変換
    const startHour = convertTimeStampToHour(resultStart);
    const endHour = convertTimeStampToHour(resultEnd);

    return {
      startHour,
      endHour,
    };
  },
});

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
    validateDateStrToDate(args.date, 'findStaffSchedules');

    let staffSchedules;
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
        .collect();
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
        .collect();
    }

    return staffSchedules.map((staffSchedule) => {
      return {
        date: staffSchedule.date,
        isAllDay: staffSchedule.isAllDay,
        type: staffSchedule.type,
        startTime: staffSchedule.startTime_unix!,
        endTime: staffSchedule.endTime_unix!,
      };
    });
  },
});

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
    validateDateStrToDate(args.date, 'findStaffReservations');

    // 引数の date に対応する日の予約を UNIX タイム範囲で取得
    const startOfDay = convertHourToUnixTimestamp('00:00', args.date);
    const endOfDay = convertHourToUnixTimestamp('23:59', args.date);

    const startOfDaySec = Math.floor(startOfDay!);
    const endOfDaySec = Math.floor(endOfDay!);
    const reservationSchedules = await ctx.db
      .query('reservation')
      .withIndex('by_staff_date', (q) =>
        q
          .eq('salonId', args.salonId)
          .eq('staffId', args.staffId)
          .eq('isArchive', false)
          .gte('startTime_unix', startOfDaySec)
          .lt('startTime_unix', endOfDaySec)
      )
      .collect();

    return reservationSchedules.map((reservationSchedule) => {
      return {
        date: args.date,
        isAllDay: false,
        type: 'reservation',
        startTime: reservationSchedule.startTime_unix,
        endTime: reservationSchedule.endTime_unix,
      };
    });
  },
});

// --- ユーティリティ関数としてファイル下部にまとめる ---
function subtractScheduleFromAvailable(
  available: TimeRange,
  staffSchedules: TimeRange[]
): TimeRange[] {
  // 初期スロットは受付可能時間のみ
  let slots: TimeRange[] = [available];
  for (const sched of staffSchedules) {
    const scStart = toMinutes(sched.startHour);
    const scEnd = toMinutes(sched.endHour);
    const nextSlots: TimeRange[] = [];
    for (const slot of slots) {
      const avStart = toMinutes(slot.startHour);
      const avEnd = toMinutes(slot.endHour);
      if (scEnd <= avStart || scStart >= avEnd) {
        nextSlots.push(slot);
        continue;
      }
      if (avStart < scStart) {
        nextSlots.push({
          startHour: slot.startHour,
          endHour: toHourString(scStart),
        });
      }
      if (scEnd < avEnd) {
        nextSlots.push({
          startHour: toHourString(scEnd),
          endHour: slot.endHour,
        });
      }
    }
    slots = nextSlots;
  }
  return slots;
}

function computeNextAlignedStart(
  minNextStart: number,
  durationMin: number,
  maxStart: number
): number | null {
  const kStart = Math.ceil(minNextStart / 60);
  const candStart = kStart * 60;
  const kEnd = Math.ceil((minNextStart + durationMin) / 60);
  const candEnd = kEnd * 60 - durationMin;
  const candidates: number[] = [];
  if (candStart >= minNextStart) candidates.push(candStart);
  if (candEnd >= minNextStart) candidates.push(candEnd);
  if (candidates.length === 0) return null;
  const next = Math.min(...candidates);
  return next <= maxStart ? next : null;
}

function generateTimeSlotsWithAlignment(
  availableTimeSlot: TimeRange,
  durationMin: number,
  includeTrailing: boolean = false,
  minSlotSize: number = 60
): TimeRange[] {
  const { startHour, endHour } = availableTimeSlot;
  const windowStart = toMinutes(startHour);
  const windowEnd = toMinutes(endHour);
  const windowLen = windowEnd - windowStart;
  if (windowLen < durationMin) return [];

  let result: TimeRange[] = [];
  result.push({
    startHour: toHourString(windowStart),
    endHour: toHourString(windowStart + durationMin),
  });
  let lastStart = windowStart;
  while (true) {
    const minNext = lastStart + durationMin;
    const aligned = computeNextAlignedStart(minNext, durationMin, windowEnd - durationMin);
    if (aligned === null) break;
    result.push({
      startHour: toHourString(aligned),
      endHour: toHourString(aligned + durationMin),
    });
    lastStart = aligned;
  }
  if (includeTrailing) {
    const backStart = windowEnd - durationMin;
    if (backStart >= windowStart && !result.some((r) => toMinutes(r.startHour) === backStart)) {
      result.push({
        startHour: toHourString(backStart),
        endHour: toHourString(windowEnd),
      });
    }
  }
  const filtered = result.filter((slot) => {
    const startMin = toMinutes(slot.startHour);
    const endMin = toMinutes(slot.endHour);
    if (startMin === windowStart || endMin === windowEnd) return true;
    const beforeGap = startMin - windowStart;
    const afterGap = windowEnd - endMin;
    return beforeGap >= minSlotSize && afterGap >= minSlotSize;
  });
  return filtered;
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
    validateDateStrToDate(args.date, 'calculateReservationTime');

    // findAvailableTimeSlots, findStaffSchedules, findStaffReservations を直接呼び出し
    const availableTimeSlots = await ctx.runQuery(api.reservation.query.findAvailableTimeSlots, {
      salonId: args.salonId,
      staffId: args.staffId,
      date: args.date,
    });

    const staffAllDaySchedules = await ctx.runQuery(api.reservation.query.findStaffSchedules, {
      salonId: args.salonId,
      staffId: args.staffId,
      date: args.date,
      isAllDay: true,
    });

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
      });
    }

    const staffSchedules = await ctx.runQuery(api.reservation.query.findStaffSchedules, {
      salonId: args.salonId,
      staffId: args.staffId,
      date: args.date,
      isAllDay: false,
    });

    const staffReservations = await ctx.runQuery(api.reservation.query.findStaffReservations, {
      salonId: args.salonId,
      staffId: args.staffId,
      date: args.date,
    });

    console.log('予約受付可能時間: ', availableTimeSlots);
    console.log('スタッフの予約: ', staffReservations.length);

    staffReservations.map((reservation) => {
      console.log(
        'スタッフの予約: ',
        formatJpTime(reservation.startTime!) + ' 〜 ' + formatJpTime(reservation.endTime!)
      );
    });

    const allSchedules = [
      ...staffSchedules.map((schedule) => ({
        startHour: formatJpTime(schedule.startTime),
        endHour: formatJpTime(schedule.endTime),
      })),
      ...staffReservations.map((reservation) => ({
        startHour: formatJpTime(reservation.startTime!),
        endHour: formatJpTime(reservation.endTime!),
      })),
    ];

    const subtractedSchedules = subtractScheduleFromAvailable(
      availableTimeSlots,
      allSchedules.map((schedule) => ({
        startHour: schedule.startHour,
        endHour: schedule.endHour,
      }))
    );

    console.log('予約可能な時間枠: ', subtractedSchedules);

    const subtractedSchedulesWithStep = subtractedSchedules.map((schedule) => {
      const timeSlots = generateTimeSlotsWithAlignment(schedule, args.durationMin, true);
      return timeSlots;
    });
    // 結果を一つの配列にまとめて返す
    return subtractedSchedulesWithStep.flat();
  },
});
