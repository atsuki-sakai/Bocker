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
import { AvailableStaff } from '@/hooks/usePriceCalculation';
import { Doc } from '@/convex/_generated/dataModel';
import { query } from '@/convex/_generated/server';
import { api, internal } from '@/convex/_generated/api';
import { v } from 'convex/values';

import { validateDateStrFormat, validateStringLength } from '@/convex/utils/validations';
import { 
  convertHourToTimestamp, 
  getDayOfWeek, 
  hourToMinutes, 
  toHourString,
  convertTimestampToHour
} from '@/lib/schedules';
import { TimeRange, IntegratedAvailabilityInfo } from '@/lib/types';
import { validateDateStrToDate } from '@/convex/utils/validations';
import { ConvexError } from 'convex/values';
import { getReservationWithDetail, checkReservationDoubleBooking, findBestAvailableStaffForTimeSlot } from './reservation.helpers';
import { internalQuery } from '@/convex/_generated/server';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { IntegratedTimeSlot, integratedTimeSlotType, DayOfWeek } from '@/convex/types';


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
 * リマインダー送信対象の予約を取得（内部使用専用）
 * - 指定時間範囲内に開始される予約受付済み予約を取得
 * - リマインダー未送信のものだけを対象
 * - is_archive: false のみ対象
 */
export const getReservationsForReminder = internalQuery({
  args: {
    startTimeFrom: v.number(), // 開始時刻の下限（Unix timestamp）
    startTimeTo: v.number(),   // 開始時刻の上限（Unix timestamp）
  },
  handler: async (ctx, args) => {
    // 予約受付済みで、指定時間範囲内に開始される予約を取得
    const reservations = await ctx.db
      .query('reservation')
      .withIndex('status_start_time_archive', (q) =>
        q.eq('status', 'confirmed')
      )
      .filter((q) =>
        q.and(
          q.eq(q.field('is_archive'), false),
          q.gte(q.field('start_time_unix'), args.startTimeFrom),
          q.lte(q.field('start_time_unix'), args.startTimeTo),
          // リマインダー未送信のものだけを対象
          q.or(
            q.eq(q.field('reminder_sent'), false),
            q.eq(q.field('reminder_sent'), undefined)
          )
        )
      )
      .collect();
    
    // 詳細情報を付加して返却
    const reservationsWithDetails = await Promise.all(
      reservations.map(async (reservation) => {
        const detail = await ctx.db
          .query('reservation_detail')
          .withIndex('by_reservation_archive', (q) =>
            q.eq('reservation_id', reservation._id).eq('is_archive', false)
          )
          .first();

        const org = await ctx.db.get(reservation.org_id)
        if (!org) {
          throw new ConvexError({
            message: "Organization not found",
            statusCode: ERROR_STATUS_CODE.NOT_FOUND,
            severity: ERROR_SEVERITY.ERROR,
            code: "ORG_NOT_FOUND",
            details: {
              org_id: reservation.org_id,
            },
          })
        }

        return {
          org_name: org?.org_name,
          reservation: reservation,
          menus: detail?.menus || [],
          options: detail?.options || [],
          extra_charge: detail?.extra_charge || 0,
          coupon_discount: detail?.coupon_discount || 0,
          use_points: detail?.use_points || 0,
          total_price: detail?.total_price || 0,
        };
      })
    );
    return reservationsWithDetails;
  },
});

export const getWithDetailById = query({
  args: {
    id: v.id('reservation'),
  },
  handler: async (ctx, args) => {
    return await getReservationWithDetail(ctx, args.id);
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
    org_id: v.id('organization'),
    paginationOpts: paginationOptsValidator,
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

    return reservationQuery.order(args.sort || 'desc').paginate(args.paginationOpts)
  },
})

/**
 * 組織レベルで全ステータスの予約一覧を取得
 * - 組織全体の予約管理画面用
 * - is_archive: false のみ対象
 * - 全ステータスまたは特定ステータスでフィルタ可能
 * - 日付範囲での絞り込み対応
 * データ取得専用でバリデーションはmutationで担保
 */
export const listOrganizationAllStatus = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    status_filter: v.optional(reservationStatusType),
    start_date: v.optional(v.string()),
    end_date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateStringLength(args.org_id, 'org_id');
    if (args.start_date) validateDateStrFormat(args.start_date, 'start_date');
    if (args.end_date) validateDateStrFormat(args.end_date, 'end_date');

    let reservationQuery = ctx.db
      .query('reservation')
      .withIndex('by_tenant_org_date_status_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
      )
      .filter((q) => q.eq(q.field('is_archive'), false));

    // ステータスフィルター
    if (args.status_filter) {
      reservationQuery = reservationQuery.filter((q) => q.eq(q.field('status'), args.status_filter));
    }

    // 日付範囲フィルター
    if (args.start_date && args.end_date) {
      reservationQuery = reservationQuery.filter((q) =>
        q.and(
          q.gte(q.field('date'), args.start_date!),
          q.lte(q.field('date'), args.end_date!)
        )
      );
    } else if (args.start_date) {
      reservationQuery = reservationQuery.filter((q) => q.gte(q.field('date'), args.start_date!));
    } else if (args.end_date) {
      reservationQuery = reservationQuery.filter((q) => q.lte(q.field('date'), args.end_date!));
    }

    return reservationQuery.order(args.sort || 'desc').paginate(args.paginationOpts);
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
    org_id: v.id('organization'),
    customer_id: v.string(),
    paginationOpts: paginationOptsValidator,
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
      .paginate(args.paginationOpts);
  },
});

/**
 * 顧客IDからの予約一覧を詳細情報付きで取得
 * - カルテ画面での予約履歴表示用途
 * - is_archive: false のみ対象
 * - 予約詳細も同時に取得
 * データ取得専用でバリデーションはmutationで担保
 */
export const listByCustomerIdWithDetails = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    customer_id: v.string(),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc')))
  },
  handler: async (ctx, args) => {
    validateStringLength(args.customer_id, 'customer_id');
    validateStringLength(args.org_id, 'org_id');

    const reservationQuery = ctx.db
      .query('reservation')
      .withIndex('by_tenant_org_customer_date_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('customer_id', args.customer_id)
      )
      .filter((q) => q.eq(q.field('is_archive'), false))
      .order(args.sort || 'desc');

    const paginatedReservations = await reservationQuery.paginate(args.paginationOpts);
    
    // 詳細情報を一括取得
    const reservationsWithDetails = await Promise.all(
      paginatedReservations.page.map(async (reservation) => {
        const detail = await ctx.db
          .query('reservation_detail')
          .withIndex('by_reservation_archive', (q) =>
            q.eq('reservation_id', reservation._id).eq('is_archive', false)
          )
          .first();
        return { reservation, detail };
      })
    );
    
    return {
      ...paginatedReservations,
      page: reservationsWithDetails
    };
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
    org_id: v.id('organization')  ,
    staff_id: v.id('staff'),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
  },
  handler: async (ctx, args) => {
    validateStringLength(args.org_id, 'org_id');

    const reservationQuery = ctx.db
      .query('reservation')
      .withIndex('by_tenant_org_staff_date_status_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('staff_id', args.staff_id)
      )
      .filter((q) => q.eq(q.field('is_archive'), false))

    return await reservationQuery.order(args.sort || 'desc').paginate(args.paginationOpts)
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
    org_id: v.id('organization'),
    status: reservationStatusType,
    paginationOpts: paginationOptsValidator,
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
      .paginate(args.paginationOpts)
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
    org_id: v.id('organization'),
    date: v.string(),
    paginationOpts: paginationOptsValidator,
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
      .paginate(args.paginationOpts)
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
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
    date: v.string(),
    paginationOpts: paginationOptsValidator,
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
      .paginate(args.paginationOpts)
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
    org_id: v.id('organization'),
    customer_id: v.string(),
    date: v.string(),
    paginationOpts: paginationOptsValidator,
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
      .paginate(args.paginationOpts)
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
    org_id: v.id('organization'),
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
              DayOfWeek
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
    org_id: v.id('organization'),
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
    org_id: v.id('organization'),
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
      
      // スケジュールがスロットと重ならない場合
      if (scEnd <= avStart || scStart >= avEnd) {
        nextSlots.push(slot)
        continue
      }
      
      // スロットの前半部分が残る場合
      if (avStart < scStart) {
        const newSlot = {
          startHour: slot.startHour,
          endHour: toHourString(scStart),
        }
        nextSlots.push(newSlot)
      }
      
      // スロットの後半部分が残る場合
      if (scEnd < avEnd) {
        const newSlot = {
          startHour: toHourString(scEnd),
          endHour: slot.endHour,
        }
        nextSlots.push(newSlot)
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
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
    date: v.string(), // "YYYY-MM-DD"
    duration_min: v.number(), // 50分などの施術時間 数値のみ
  },
  handler: async (ctx, args): Promise<TimeRange[]> => {
    // 共通日付バリデーション
    const targetDate = validateDateStrToDate(args.date, 'calculateReservationTime')
    validateStringLength(args.org_id, 'org_id')
    const dayOfWeek = getDayOfWeek(targetDate)
    const dayOfWeekJa = getDayOfWeek(targetDate, true)

    // 並列でデータを取得（パフォーマンス向上）
    const [tenantReservationConfig, tenantWeekSchedule, tenantException, staffWeekSchedule] = await Promise.all([
      // 1. 予約設定
      ctx.db
        .query('reservation_config')
        .withIndex('by_tenant_org_archive', (q) => 
          q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_archive', false)
        )
        .first(),
      
      // 2. サロンの週間スケジュール
      ctx.db
        .query('week_schedule')
        .withIndex('by_tenant_org_week_archive', (q) =>
          q
            .eq('tenant_id', args.tenant_id)
            .eq('org_id', args.org_id)
            .eq('day_of_week', dayOfWeek as DayOfWeek)
            .eq('is_archive', false)
        )
        .filter((q) => q.eq(q.field('is_open'), true))
        .first(),
      
      // 3. サロンの例外スケジュール
      ctx.db
        .query('exception_schedule')
        .withIndex('by_tenant_org_date_type_archive', (q) =>
          q
            .eq('tenant_id', args.tenant_id)
            .eq('org_id', args.org_id)
            .eq('date', args.date)
            .eq('type', 'holiday')
            .eq('is_archive', false)
        )
        .first(),
      
      // 4. スタッフの週間スケジュール
      ctx.db
        .query('staff_week_schedule')
        .withIndex('by_tenant_org_staff_week_open_archive', (q) =>
          q
            .eq('tenant_id', args.tenant_id)
            .eq('org_id', args.org_id)
            .eq('staff_id', args.staff_id)
            .eq('day_of_week', dayOfWeek as DayOfWeek)
            .eq('is_open', true)
            .eq('is_archive', false)
        )
        .first()
    ])

    // バリデーションチェック
    if (!tenantWeekSchedule) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'calculateReservationTime',
        message: `サロンは${dayOfWeekJa}曜日は営業していません`,
        code: 'BAD_REQUEST',
        status: 400,
        details: args,
      })
    }

    if (tenantException) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'calculateReservationTime',
        message: `サロンの臨時休業日です: ${args.date}`,
        code: 'BAD_REQUEST',
        status: 400,
        details: args,
      })
    }

    if (!staffWeekSchedule || !staffWeekSchedule.is_open) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'calculateReservationTime',
        message: `スタッフは${dayOfWeekJa}出勤していません`,
        code: 'BAD_REQUEST',
        status: 400,
        details: args,
      })
    }

    // 並列でスケジュールと予約を取得
    const [staffAllDaySchedules, staffSchedules, staffReservations] = await Promise.all([
      // 終日スケジュール
      ctx.db
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
        .collect(),
      
      // 部分スケジュール
      ctx.db
        .query('staff_exception_schedule')
        .withIndex('by_tenant_org_staff_date_archive', (q) =>
          q
            .eq('tenant_id', args.tenant_id)
            .eq('org_id', args.org_id)
            .eq('staff_id', args.staff_id)
            .eq('date', args.date)
            .eq('is_archive', false)
        )
        .filter((q) => q.eq(q.field('is_all_day'), false))
        .collect(),
      
      // 予約受付済み予約
      ctx.db
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
        .collect()
    ])

    if (staffAllDaySchedules.length > 0) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'calculateReservationTime',
        status: 400,
        message: 'スタッフには終日のスケジュールがあります。予約受け付けできません。',
        code: 'BAD_REQUEST',
        details: args,
      })
    }

    // 時間計算
    const todayFirstLaterMinutes = tenantReservationConfig?.today_first_later_minutes
      ? tenantReservationConfig.today_first_later_minutes * 60 * 1000
      : 30 * 60 * 1000

    const salonStart = convertHourToTimestamp(tenantWeekSchedule.start_hour!, args.date)
    const salonEnd = convertHourToTimestamp(tenantWeekSchedule.end_hour!, args.date)
    const staffStart = staffWeekSchedule?.start_hour
      ? convertHourToTimestamp(staffWeekSchedule.start_hour, args.date)
      : Number.MIN_SAFE_INTEGER
    const staffEnd = staffWeekSchedule?.end_hour
      ? convertHourToTimestamp(staffWeekSchedule.end_hour, args.date)
      : Number.MAX_SAFE_INTEGER

    let resultStart = Math.max(salonStart!, staffStart!)
    
    // 現在時刻を日本時間で取得して当日判定
    const nowJST = new Date(Date.now())
    const jstDateStr = nowJST.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Tokyo'
    }).replace(/\//g, '-')
    
    // targetDateの日付文字列（YYYY-MM-DD形式）と比較
    if (jstDateStr === args.date) {
      const rawNextLater = Date.now() + todayFirstLaterMinutes
      const stepMs = 10 * 60 * 1000
      const alignedNextLater = Math.ceil(rawNextLater / stepMs) * stepMs
      resultStart = Math.max(resultStart, alignedNextLater)
    }
    const resultEnd = Math.min(salonEnd!, staffEnd!)

    const availableTimeSlots = {
      startHour: convertTimestampToHour(resultStart),
      endHour: convertTimestampToHour(resultEnd),
    }
    
    // スケジュールを時刻文字列に変換
    const allSchedules = [
      ...staffSchedules.map((schedule) => ({
        startHour: convertTimestampToHour(schedule.start_time_unix!, 'Asia/Tokyo'),
        endHour: convertTimestampToHour(schedule.end_time_unix!, 'Asia/Tokyo'),
      })),
      ...staffReservations.map((reservation) => ({
        startHour: convertTimestampToHour(reservation.start_time_unix!, 'Asia/Tokyo'),
        endHour: convertTimestampToHour(reservation.end_time_unix!, 'Asia/Tokyo'),
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
        tenantReservationConfig?.reservation_interval_minutes
      )
      return timeSlots
    })

    const finalSlots = subtractedSchedulesWithStep.flat()
    
    
    return finalSlots
  },
})

/**
 * 指名フリー予約用：複数スタッフの統合空き時間を計算
 * @returns IntegratedAvailabilityInfo 統合された空き時間情報
 */
export const calculateIntegratedAvailableTimes = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    menu_ids: v.array(v.id('menu')),
    option_ids: v.array(v.id('option')),
    date: v.string(), // YYYY-MM-DD
  },
  returns: v.object({
    available: v.boolean(),
    timeSlots: v.array(integratedTimeSlotType),
    totalAvailableStaffs: v.number(),
  }),
  handler: async (ctx, args): Promise<IntegratedAvailabilityInfo> => {
    // 日付形式バリデーション
    if (!validateDateStrFormat(args.date)) {
      throw new ConvexError({
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.ERROR,
        message: '日付形式が正しくありません',
      });
    }

    // 1. 対応可能なスタッフを取得（認証チェックをスキップ）
    // 顧客予約フローからの呼び出しのため認証は不要
    const availableStaffs = await ctx.runQuery(
      internal.staff.query.findByAvailableStaffsInternal,
      {
        tenant_id: args.tenant_id,
        org_id: args.org_id,
        menu_ids: args.menu_ids,
      }
    );

    if (availableStaffs.length === 0) {
      return { 
        available: false, 
        timeSlots: [],
        totalAvailableStaffs: 0 
      };
    }

    // メニューとオプションの合計時間を計算（パフォーマンス最適化：並列取得）
    const [menus, options] = await Promise.all([
      // メニュー取得
      Promise.all(args.menu_ids.map(id => ctx.db.get(id))),
      // オプション取得
      args.option_ids.length > 0 
        ? Promise.all(args.option_ids.map(id => ctx.db.get(id)))
        : Promise.resolve([])
    ]);

    // null除外とアーカイブチェック
    const validMenus = menus.filter((menu): menu is NonNullable<typeof menu> => menu !== null && !menu.is_archive);
    const validOptions = options.filter((option): option is NonNullable<typeof option> => option !== null && !option.is_archive);

    const totalDuration = validMenus.reduce((sum, menu) => sum + (menu.duration_min || 0), 0) +
                         validOptions.reduce((sum, option) => sum + (option?.duration_min || 0), 0);

    // 2. 各スタッフの空き時間を並列で取得（エラーハンドリング付き）
    const staffAvailabilities = await Promise.all(
      availableStaffs.map(async (staff) => {
        try {
          const times = await ctx.runQuery(
            api.reservation.query.calculateReservationTime,
            {
              tenant_id: args.tenant_id,
              org_id: args.org_id,
              staff_id: staff._id,
              date: args.date,
              duration_min: totalDuration,
            }
          );
          return { 
            staff: {
              _id: staff._id,
              name: staff.name || '',
              priority: staff.priority || 0,
              extra_charge: staff.extra_charge || 0,
            }, 
            times 
          };
        } catch {
          // スタッフが休みの日などのエラーは無視して、空の時間枠を返す
          return {
            staff: {
              _id: staff._id,
              name: staff.name || '',
              priority: staff.priority || 0,
              extra_charge: staff.extra_charge || 0,
            },
            times: [] // 空の時間枠
          };
        }
      })
    );

    // 3. 時間帯ごとに統合（Map使用でO(n)で処理）
    const integratedSlots = new Map<string, IntegratedTimeSlot>();

    staffAvailabilities.forEach(({ staff, times }) => {
      if (times && times.length > 0) {
        times.forEach((timeRange: TimeRange) => {
          const key = `${timeRange.startHour}-${timeRange.endHour}`;
          const existing = integratedSlots.get(key);
          
          if (existing) {
            existing.availableStaffs.push({
              id: staff._id,
              name: staff.name,
              priority: staff.priority,
              extra_charge: staff.extra_charge,
            });
          } else {
            integratedSlots.set(key, {
              start: timeRange.startHour,
              end: timeRange.endHour,
              availableStaffs: [{
                id: staff._id,
                name: staff.name,
                priority: staff.priority,
                extra_charge: staff.extra_charge,
              }],
            });
          }
        });
      }
    });

    // 4. 各スロットのスタッフを優先度でソート
    const sortedSlots: IntegratedTimeSlot[] = Array.from(integratedSlots.values()).map(slot => ({
      ...slot,
      availableStaffs: slot.availableStaffs.sort((a, b) => {
        const priorityDiff = b.priority - a.priority;
        if (priorityDiff !== 0) return priorityDiff;
        return a.extra_charge - b.extra_charge;
      }),
    }));

    // 5. スロット自体を開始時間でソート
    sortedSlots.sort((a, b) => {
      const aMinutes = hourToMinutes(a.start);
      const bMinutes = hourToMinutes(b.start);
      return aMinutes - bMinutes;
    });

    return {
      available: sortedSlots.length > 0,
      timeSlots: sortedSlots,
      totalAvailableStaffs: availableStaffs.length,
    };
  },
});

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
    
    const queryBuilder = ctx.db.query("reservation").withIndex("status_start_time_archive", q => 
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


/**
 * 予約の重複を防ぐために、指定したスタッフの同じ時間帯に
 * 既に予約が存在しないかをチェックするヘルパー関数です。
 * 
 * この関数は競合状態（race condition）を防ぐために、
 * mutation内で呼び出してから即座に予約を挿入することを推奨します。
 * 更新時には自身の予約IDを除外してチェック可能です。
 * 同時予約数の上限とスタッフの同時予約数の上限をチェックします。
 * 
 * @param ctx Mutationコンテキスト（DBアクセス用）
 * @param args チェックに必要な情報（日時・スタッフID等）
 * @returns 重複予約があればtrue、なければfalse
 */
export const checkDoubleBooking = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
    date: v.string(),
    start_time_unix: v.number(),
    end_time_unix: v.number(),
    excludeReservationId: v.optional(v.id('reservation')) // 更新時に自分自身を除外するため
  },
  handler: async (ctx, args): Promise<boolean> => {
    return await checkReservationDoubleBooking(ctx, args);
  },
})

/**
 * 全スタッフの予約を日付範囲で一括取得
 * - タイムライン画面での全スタッフ表示用
 * - is_archive: false のみ対象
 * - confirmed ステータスのみを取得
 * - 日付範囲での絞り込み可能
 * データ取得専用でバリデーションはmutationで担保
 */
export const listAllStaffsByDateRange = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    start_date: v.string(), // "YYYY-MM-DD"
    end_date: v.string(), // "YYYY-MM-DD"
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateStringLength(args.org_id, 'org_id')
    validateDateStrFormat(args.start_date, 'start_date')
    validateDateStrFormat(args.end_date, 'end_date')
    
    // 日付範囲での予約を取得
    return await ctx.db
      .query('reservation')
      .withIndex('by_tenant_org_date_status_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .gte('date', args.start_date)
          .lte('date', args.end_date)
      )
      .filter((q) => q.eq(q.field('is_archive'), false))
      .filter((q) => q.eq(q.field('status'), 'confirmed'))
      .order(args.sort || 'asc')
      .paginate(args.paginationOpts)
  },
})

/**
 * スタッフ別の予約をまとめて取得（最適化版）
 * - 全スタッフのタイムライン表示専用
 * - 指定したスタッフIDリストの予約のみ取得
 * - パフォーマンス向上のため使用
 * データ取得専用でバリデーションはmutationで担保
 */
export const listByStaffIds = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_ids: v.array(v.id('staff')),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateStringLength(args.org_id, 'org_id')
    
    if (args.staff_ids.length === 0) {
      return { page: [], isDone: true, continueCursor: null }
    }
    
    // 各スタッフの予約を効率的に取得
    const allReservations: Doc<'reservation'>[] = []
    
    // スタッフごとの予約を並列取得
    const reservationPromises = args.staff_ids.map(async (staff_id) => {
      const reservations = await ctx.db
        .query('reservation')
        .withIndex('by_tenant_org_staff_date_status_archive', (q) =>
          q
            .eq('tenant_id', args.tenant_id)
            .eq('org_id', args.org_id)
            .eq('staff_id', staff_id)
        )
        .filter((q) => q.eq(q.field('is_archive'), false))
        .filter((q) => q.eq(q.field('status'), 'confirmed'))
        .order('asc')
        .take(50) // 各スタッフ最大50件
      return reservations
    })
    
    const results = await Promise.all(reservationPromises)
    results.forEach(reservations => allReservations.push(...reservations))
    
    // 日付・時間順でソート
    allReservations.sort((a, b) => {
      const timeA = a.start_time_unix || 0
      const timeB = b.start_time_unix || 0
      return args.sort === 'desc' ? timeB - timeA : timeA - timeB
    })
    
    // ページネーション形式に合わせて返す
    const pageSize = args.paginationOpts.numItems
    const startIndex = args.paginationOpts.cursor ? parseInt(args.paginationOpts.cursor) : 0
    const endIndex = startIndex + pageSize
    const page = allReservations.slice(startIndex, endIndex)
    const isDone = endIndex >= allReservations.length
    const continueCursor = isDone ? null : endIndex.toString()
    
    return { page, isDone, continueCursor }
  },
})


/**
 * 予約フォーム画面用の統合データ取得
 * Backend for Frontendパターンで複数クエリを統合
 */
export const getReservationFormData = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    menu_ids: v.optional(v.array(v.id('menu'))),
  },
  handler: async (ctx, args): Promise<{
    reservationConfig: Doc<'reservation_config'> | null
    weekSchedules: Doc<'week_schedule'>[]
    menus: Doc<'menu'>[]
    options: Doc<'option'>[]
    availableStaff: AvailableStaff[]
  }> => {
    try {
      // 並列でデータを取得（直接クエリを実行することでパフォーマンス向上）
      const [reservationConfig, weekSchedules, menus, options, availableStaffData] = await Promise.all([
        // 予約設定取得
        ctx.db
          .query('reservation_config')
          .withIndex('by_tenant_org_archive', (q) =>
            q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_archive', false)
          )
          .first(),
        
        // 営業時間取得
        ctx.db
          .query('week_schedule')
          .withIndex('by_tenant_org_week_archive', (q) =>
            q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id)
          )
          .filter((q) => q.eq(q.field('is_archive'), false))
          .order('asc')
          .collect(),
        
        // メニュー一覧取得
        ctx.db
          .query('menu')
          .withIndex('by_tenant_org_active_archive', (q) =>
            q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_active', true).eq('is_archive', false)
          )
          .order('asc')
          .collect(),
        
        // オプション一覧取得
        ctx.db
          .query('option')
          .withIndex('by_tenant_org_active_archive', (q) =>
            q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_active', true).eq('is_archive', false)
          )
          .order('asc')
          .collect(),
        
        // 選択メニューがある場合のみ利用可能スタッフ取得
        args.menu_ids && args.menu_ids.length > 0
          ? (async () => {
              // メニュー除外スタッフを取得
              const exclusionStaffIds = new Set<string>()
              await Promise.all(
                args.menu_ids!.map(async (menu_id) => {
                  const exclusions = await ctx.db
                    .query('menu_exclusion_staff')
                    .withIndex('by_tenant_org_menu_archive', (q) =>
                      q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('menu_id', menu_id).eq('is_archive', false)
                    )
                    .collect()
                  exclusions.forEach(e => exclusionStaffIds.add(e.staff_id))
                })
              )
              
              // アクティブなスタッフを取得
              const allStaff = await ctx.db
                .query('staff')
                .withIndex('by_tenant_org_active_archive', (q) =>
                  q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_active', true).eq('is_archive', false)
                )
                .collect()
              
              // 除外スタッフをフィルタリング
              const availableStaffList = allStaff.filter(staff => !exclusionStaffIds.has(staff._id))
              
              // スタッフ設定を取得
              const staffConfigs = await Promise.all(
                availableStaffList.map(staff =>
                  ctx.db
                    .query('staff_config')
                    .withIndex('by_tenant_org_staff_archive', (q) =>
                      q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('staff_id', staff._id).eq('is_archive', false)
                    )
                    .first()
                )
              )
              
              return availableStaffList.map((staff, index) => ({
                _id: staff._id,
                name: staff.name,
                images: staff.images,
                extra_charge: staffConfigs[index]?.extra_charge || 0,
              }))
            })()
          : []
      ])
      
      return {
        reservationConfig,
        weekSchedules,
        menus: menus,
        options: options,
        availableStaff: availableStaffData as AvailableStaff[],
      }
    } catch (error) {
      console.error('予約フォームデータ取得エラー:', error)
      throw new Error('予約フォームデータの取得に失敗しました')
    }
  },
})

/**
 * スケジュール表示用の統合データ取得
 */
export const getScheduleData = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    staff_id: v.id('staff'),
    date: v.string(),
    duration_min: v.number(),
  },
  handler: async (ctx, args): Promise<{
    availableSlots: TimeRange[]
    organizationSchedule: Doc<'week_schedule'>[]
  }> => {

    try {
      // 並列でデータを取得（直接クエリを実行することでパフォーマンス向上）
      const [availableSlots, organizationSchedule] = await Promise.all([
        // 利用可能時間スロット計算
        ctx.runQuery(api.reservation.query.calculateReservationTime, {
          tenant_id: args.tenant_id,
          org_id: args.org_id,
          staff_id: args.staff_id,
          date: args.date,
          duration_min: args.duration_min,
        }),
        
        // 組織営業時間取得
        ctx.db
          .query('week_schedule')
          .withIndex('by_tenant_org_week_archive', (q) =>
            q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id)
          )
          .filter((q) => q.eq(q.field('is_archive'), false))
          .order('asc')
          .collect(),
      ])

      return {
        availableSlots,
        organizationSchedule,
      }
    } catch (error) {
      console.error('スケジュールデータ取得エラー:', error)
      throw new Error('スケジュールデータの取得に失敗しました')
    }
  },
})
// pending状態の予約を取得（有効期限切れ含む）
export const getPendingReservations = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    includeExpired: v.optional(v.boolean()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    checkAuth(ctx)
    
    const now = Date.now()
    
    // pending状態の予約を取得
    let query = ctx.db
      .query('reservation')
      .withIndex('by_tenant_org_status_date_start_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('status', 'pending')
      )
      .filter((q) => q.eq(q.field('is_archive'), false));

    // 期限切れフィルタリング
    if (!args.includeExpired) {
      query = query.filter((q) => 
        q.or(
          q.eq(q.field('pending_expiry'), undefined),
          q.gt(q.field('pending_expiry'), now)
        )
      );
    }

    const result = await query.paginate(args.paginationOpts);

    // 各予約に期限切れフラグを追加
    const enrichedData = result.page.map(reservation => ({
      ...reservation,
      isExpired: reservation.pending_expiry ? reservation.pending_expiry < now : false,
      expiresIn: reservation.pending_expiry ? reservation.pending_expiry - now : null,
      expiresInMinutes: reservation.pending_expiry ? Math.floor((reservation.pending_expiry - now) / (1000 * 60)) : null,
    }))

    return {
      ...result,
      page: enrichedData,
    }
  },
})

/**
 * フリー指名用：指定時間帯に対応可能な最優先スタッフを取得
 * DateView コンポーネントから呼び出され、時間選択時に自動でスタッフを割り当てる
 */
export const getBestAvailableStaffForTimeSlot = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    menu_ids: v.array(v.id('menu')),
    date: v.string(),
    start_time_unix: v.number(),
    end_time_unix: v.number(),
  },
  returns: v.union(
    v.object({
      staff_id: v.id('staff'),
      staff_name: v.string(),
      priority: v.number(),
      extra_charge: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // 顧客予約フローからの呼び出しのため認証チェックは不要
    return await findBestAvailableStaffForTimeSlot(ctx, args)
  },
})

/**
 * 指定期間内の日毎の予約件数を取得
 * - タイムライン画面での予約件数表示とカレンダー表示用
 * - confirmed ステータスのみを対象
 * - 日付ごとの件数を軽量に返す
 */
export const getReservationCountsByDateRange = query({
  args: {
    tenant_id: v.id('tenant'),
    org_id: v.id('organization'),
    start_date: v.string(), // YYYY-MM-DD
    end_date: v.string(),   // YYYY-MM-DD
  },
  returns: v.array(v.object({
    date: v.string(),
    count: v.number(),
  })),
  handler: async (ctx, args) => {
    checkAuth(ctx)
    validateDateStrFormat(args.start_date, 'start_date')
    validateDateStrFormat(args.end_date, 'end_date')
    
    // 指定期間の予約を一度に取得（最小限のフィールドのみ）
    const reservations = await ctx.db
      .query('reservation')
      .withIndex('by_tenant_org_date_status_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .gte('date', args.start_date)
          .lte('date', args.end_date)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field('is_archive'), false),
          q.eq(q.field('status'), 'confirmed')
        )
      )
      .collect()
    
    // 日付ごとに集計（Map使用でO(n)で処理）
    const dateCounts = new Map<string, number>()
    
    reservations.forEach(reservation => {
      const date = reservation.date
      dateCounts.set(date, (dateCounts.get(date) || 0) + 1)
    })
    
    // 結果を配列形式に変換してソート
    const result = Array.from(dateCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
    
    return result
  },
})