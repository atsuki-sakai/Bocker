import { MutationCtx, QueryCtx } from '@/convex/_generated/server';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { createRecord, archiveRecord, killRecord } from '@/convex/utils/helpers';
import {
  ReservationMenu,
  ReservationOption,
  ImageType,
  PaymentMethod,
  ReservationStatus,
  ReservationPaymentStatus,
} from '@/convex/types';
import { ConvexError } from 'convex/values';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
// Convex環境内では fetchQuery は使用できないためコメントアウト
// import { fetchQuery } from 'convex/nextjs';
// import { api } from '@/convex/_generated/api';
import { getAppUrl } from '@/lib/env-config';
import { SupabaseService } from '@/services/supabase/SupabaseService';
import { getDayOfWeek, convertHourToTimestamp } from '@/lib/schedules';
import { DayOfWeek} from '@/convex/types';



export const getReservationWithDetail = async (ctx: QueryCtx, reservationId: Id<'reservation'>) => {
  const reservation = await ctx.db.get(reservationId);
  if (!reservation) {
    throw new ConvexError({
      message: '予約が存在しません',
      statusCode: ERROR_STATUS_CODE.NOT_FOUND,
      severity: ERROR_SEVERITY.ERROR,
      callFunc: 'getReservationWithDetail',
      details: {
        reservationId,
      },
    })
  }
  const reservationDetail = await ctx.db.query('reservation_detail').withIndex('by_reservation_archive', (q) =>
    q.eq('reservation_id', reservationId).eq('is_archive', false)
  ).first();
  return { reservation, reservationDetail };
}

/**
 * 予約と予約詳細を同時に作成するためのヘルパー関数です。
 * この関数は、予約の基本情報と詳細情報を一括して登録することで、
 * データの整合性を保ちつつ処理を簡潔にします。
 * 
 * 引数には予約に必要な情報をすべて含めて渡してください。
 * 予約の基本情報と詳細情報を関連付けて両テーブルにデータを挿入します。
 * 
 * @param ctx Mutationコンテキスト（DBアクセス用）
 * @param args 予約情報の詳細
 * @returns 作成した予約IDと予約詳細ID
 */
/**
 * 予約の重複チェックを行う共通関数
 * データベースアクセスを直接行い、ctx.runQueryを使用しない
 * 
 * @param ctx クエリまたはミューテーションコンテキスト
 * @param args チェックパラメータ
 * @returns 重複があればtrue、なければfalse
 */
export async function checkReservationDoubleBooking(
  ctx: QueryCtx | MutationCtx,
  args: {
    tenant_id: Id<'tenant'>
    org_id: Id<'organization'>
    staff_id: Id<'staff'>
    date: string
    start_time_unix: number
    end_time_unix: number
    excludeReservationId?: Id<'reservation'>
  }
): Promise<boolean> {
  // 予約設定を取得
  const reservationConfig = await ctx.db
    .query('reservation_config')
    .withIndex('by_tenant_org_archive', (q) =>
      q.eq('tenant_id', args.tenant_id)
        .eq('org_id', args.org_id)
        .eq('is_archive', false)
    )
    .first()

  // 店舗ごとの同時受付可能席数を取得
  const availableSheet = reservationConfig?.available_sheet || 3

  // 組織全体で、該当日の confirmed かつ is_archive: false の予約のみ取得
  const orgReservations = await ctx.db
    .query('reservation')
    .withIndex('by_tenant_org_date_status_archive', (q) =>
      q.eq('tenant_id', args.tenant_id)
        .eq('org_id', args.org_id)
        .eq('date', args.date)
        .eq('status', 'confirmed')
        .eq('is_archive', false)
    )
    .collect()

  const overlappingReservations = orgReservations.filter((reservation) => {
    // 除外ID（自分自身）は外す
    if (args.excludeReservationId && reservation._id === args.excludeReservationId) return false
    // 時間帯が一部でも重なればtrue
    const isOverlapping = reservation.start_time_unix < args.end_time_unix &&
      reservation.end_time_unix > args.start_time_unix
    
    return isOverlapping
  })
  
  const overlapCount = overlappingReservations.length

  if (overlapCount >= availableSheet) {
    throw new ConvexError({
      statusCode: ERROR_STATUS_CODE.CONFLICT,
      severity: ERROR_SEVERITY.ERROR,
      callFunc: 'reservation.checkReservationOverlap',
      message: 'この時間帯の最大同時予約数は上限です。別の時間を選択してください。',
      code: 'CONFLICT',
      status: 409,
      details: {
        ...args,
        overlapCount,
        availableSheet
      },
    })
  }

  // 指定された条件に合致する予約を検索し、
  // 時間帯が重複している予約が存在するかを判定
  const query = ctx.db
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
    .filter((q) =>
      q.and(
        // 時間の重複をチェック（開始時間が相手の終了時間前、終了時間が相手の開始時間後）
        q.lt(q.field('start_time_unix'), args.end_time_unix),
        q.gt(q.field('end_time_unix'), args.start_time_unix),
        // 除外IDがあればそれを除外、なければ常にtrueの条件
        args.excludeReservationId
          ? q.neq(q.field('_id'), args.excludeReservationId)
          : q.eq(q.field('_id'), q.field('_id')) // 常にtrueになる条件
      )
    )

  const overlapping = await query.first()
  return !!overlapping
}

/**
 * スタッフの同一時間帯に重複する予約を取得する関数
 * 指名フリー同士の入れ替え機能で使用
 * 
 * @param ctx クエリまたはミューテーションコンテキスト
 * @param args チェックパラメータ
 * @returns 重複している予約（なければnull）
 */
export async function getConflictingReservation(
  ctx: QueryCtx | MutationCtx,
  args: {
    tenant_id: Id<'tenant'>
    org_id: Id<'organization'>
    staff_id: Id<'staff'>
    date: string
    start_time_unix: number
    end_time_unix: number
    excludeReservationId?: Id<'reservation'>
  }
): Promise<Doc<'reservation'> | null> {
  // 指定された条件に合致する予約を検索し、
  // 時間帯が重複している予約を取得
  const query = ctx.db
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
    .filter((q) =>
      q.and(
        // 時間の重複をチェック（開始時間が相手の終了時間前、終了時間が相手の開始時間後）
        q.lt(q.field('start_time_unix'), args.end_time_unix),
        q.gt(q.field('end_time_unix'), args.start_time_unix),
        // 除外IDがあればそれを除外、なければ常にtrueの条件
        args.excludeReservationId
          ? q.neq(q.field('_id'), args.excludeReservationId)
          : q.eq(q.field('_id'), q.field('_id')) // 常にtrueになる条件
      )
    )

  return await query.first()
}

export async function createReservationWithDetails(
  ctx: MutationCtx,
  args: {
    tenant_id: Id<'tenant'>;
    org_id: Id<'organization'>;
    customer_id?: string;
    staff_id?: Id<'staff'>;
    customer_name: string;
    staff_name?: string;
    is_free_nomination?: boolean;
    status: ReservationStatus;
    date: string;
    start_time_unix: number;
    end_time_unix: number;
    payment_method: PaymentMethod;
    payment_status: ReservationPaymentStatus;
    stripe_checkout_session_id?: string;
    coupon_id?: Id<'coupon'>;
    total_price: number;
    menus: ReservationMenu[];
    options: ReservationOption[];
    extra_charge?: number;
    use_points?: number;
    coupon_discount?: number;
    featured_hair_images: ImageType[];
    notes?: string;
    pending_expiry?: number;
    assigned_staff_id?: Id<'staff'>;
    assigned_staff_name?: string;
    assignment_timestamp?: number;
  }
) {
  // 予約テーブルに基本情報を作成 
  const reservationId = await createRecord(ctx, 'reservation', {
    tenant_id: args.tenant_id,
    org_id: args.org_id,
    customer_id: args.customer_id,
    staff_id: args.staff_id,
    customer_name: args.customer_name,
    staff_name: args.staff_name,
    is_free_nomination: args.is_free_nomination,
    status: args.status,
    payment_status: args.payment_status,
    stripe_checkout_session_id: args.stripe_checkout_session_id,
    date: args.date,
    start_time_unix: args.start_time_unix,
    end_time_unix: args.end_time_unix,
    pending_expiry: args.pending_expiry,
    assigned_staff_id: args.assigned_staff_id,
    assigned_staff_name: args.assigned_staff_name,
    assignment_timestamp: args.assignment_timestamp,
    reminder_sent: false, // リマインダー送信フラグの初期値
  });

  // 予約詳細テーブルにメニューやオプション等の詳細情報を作成
  const reservationDetailId = await createRecord(ctx, 'reservation_detail', {
    tenant_id: args.tenant_id,
    org_id: args.org_id,
    reservation_id: reservationId,
    coupon_id: args.coupon_id,
    payment_method: args.payment_method,
    total_price: args.total_price,
    menus: args.menus,
    options: args.options,
    extra_charge: args.extra_charge,
    use_points: args.use_points,
    coupon_discount: args.coupon_discount,
    featured_hair_images: args.featured_hair_images,
    notes: args.notes,
  });

  const notificationId = await createRecord(ctx, 'reservation_notification', {
    tenant_id: args.tenant_id,
    org_id: args.org_id,
    reservation_id: reservationId,
    notification_sent: false,
    notification_sent_at: new Date().getTime(),
    date: args.date,
    start_time_unix: args.start_time_unix,
    end_time_unix: args.end_time_unix,
    customer_name: args.customer_name,
    staff_name: args.staff_name,
    status: args.status,
    payment_status: args.payment_status,
  });

  return { reservationId, reservationDetailId, notificationId };
}

/**
 * 予約とその予約詳細を同時に論理削除（アーカイブ）するヘルパー関数です。
 * 論理削除によりデータはDB上に残りつつ、通常の検索や表示から除外されます。
 * 予約詳細が存在しない場合はエラーをコンソールに出力します。
 * 
 * @param ctx Mutationコンテキスト（DBアクセス用）
 * @param reservationId アーカイブ対象の予約ID
 * @returns 常にtrueを返します（処理完了の目印）
 */
export async function archiveReservationWithDetails(
  ctx: MutationCtx,
  reservationId: Id<'reservation'>
) {
  // 予約詳細を取得し、存在すればアーカイブ処理を行う
  const reservationDetail = await ctx.db
    .query('reservation_detail')
    .withIndex('by_reservation_archive', (q) =>
      q.eq('reservation_id', reservationId).eq('is_archive', false)
    )
    .first();

  if (reservationDetail) {
    // 予約詳細を論理削除（アーカイブ）
    await archiveRecord(ctx, reservationDetail._id);
  } else {
    console.error('予約の詳細が存在しません: ' + reservationId);
  }

  // 予約自体も論理削除（アーカイブ）
  await archiveRecord(ctx, reservationId);

  return true;
}

/**
 * 予約と予約詳細を同時に物理削除（完全削除）するヘルパー関数です。
 * データベースから完全に削除されるため、元に戻せません。
 * 予約詳細が存在しない場合はエラーをコンソールに出力します。
 * 
 * @param ctx Mutationコンテキスト（DBアクセス用）
 * @param reservationId 削除対象の予約ID
 * @returns 常にtrueを返します（処理完了の目印）
 */
export async function deleteReservationWithDetails(
  ctx: MutationCtx,
  reservationId: Id<'reservation'>
) {
  // 予約詳細を取得し、存在すれば物理削除を行う
  const reservationDetail = await ctx.db
    .query('reservation_detail')
    .withIndex('by_reservation_archive', (q) =>
      q.eq('reservation_id', reservationId).eq('is_archive', false)
    )
    .first();

  if (reservationDetail) {
    // 予約詳細を物理削除（完全削除）
    await killRecord(ctx, reservationDetail._id);
  } else {
    console.error('予約の詳細が存在しません: ' + reservationId);
  }

  // 予約自体も物理削除（完全削除）
  await killRecord(ctx, reservationId);

  return true;
}

export function cancelableDeadline(availableCancelDays: number, start_time_unix: number) {
    const MS_PER_DAY = 86_400_000 // 24 * 60 * 60 * 1000 1日のミリ秒
    // 予約日の 0:00を取得
    const reservationMidnight = new Date(start_time_unix).setHours(0, 0, 0, 0)
    // (n-1) 日分をミリ秒で前倒し
    return reservationMidnight - (availableCancelDays - 1) * MS_PER_DAY
}

/**
 * フリー指名で指定時間帯に対応可能な最優先スタッフを自動選択する関数
 * 
 * @param ctx クエリまたはミューテーションコンテキスト
 * @param args 選択パラメータ
 * @returns 最適なスタッフ情報、または対応可能なスタッフがいない場合はnull
 */
export async function findBestAvailableStaffForTimeSlot(
  ctx: QueryCtx | MutationCtx,
  args: {
    tenant_id: Id<'tenant'>
    org_id: Id<'organization'>
    menu_ids: Id<'menu'>[]
    date: string
    start_time_unix: number
    end_time_unix: number
  }
): Promise<{
  staff_id: Id<'staff'>
  staff_name: string
  priority: number
  extra_charge: number
} | null> {
  
  console.log('=== findBestAvailableStaffForTimeSlot デバッグ開始 ===')
  console.log('引数:', args)
  
  // 1. 全アクティブスタッフを取得
  const allStaff = await ctx.db
    .query('staff')
    .withIndex('by_tenant_org_active_archive', (q) =>
      q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_active', true).eq('is_archive', false)
    )
    .collect()

  console.log('1. 全アクティブスタッフ数:', allStaff.length)
  console.log('スタッフリスト:', allStaff.map(s => ({ id: s._id, name: s.name })))

  if (allStaff.length === 0) {
    console.log('アクティブスタッフが0人のため終了')
    return null
  }

  // 2. 各メニューに対応しないスタッフ（除外スタッフ）を取得
  const excludedIds = new Set<string>()
  const exclusionsPromises = args.menu_ids.map(menu_id =>
    ctx.db
      .query('menu_exclusion_staff')
      .withIndex('by_tenant_org_menu_archive', (q) =>
        q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('menu_id', menu_id).eq('is_archive', false)
      )
      .collect()
  )
  const allExclusions = await Promise.all(exclusionsPromises)
  allExclusions.forEach(exclusions => {
    exclusions.forEach((ex) => excludedIds.add(ex.staff_id))
  })

  // 3. メニューに対応可能なスタッフのみフィルタリング
  const availableStaff = allStaff.filter((staff) => !excludedIds.has(staff._id))

  console.log('2. 除外されたスタッフID:', Array.from(excludedIds))
  console.log('3. メニュー対応可能スタッフ数:', availableStaff.length)
  console.log('対応可能スタッフリスト:', availableStaff.map(s => ({ id: s._id, name: s.name })))

  if (availableStaff.length === 0) {
    console.log('メニュー対応可能スタッフが0人のため終了')
    return null
  }

  // 4. スケジュール・週間勤務時間チェックで更にスタッフを絞り込み
  // ------------------------------------------------------------
  // ・当日の例外スケジュール(staff_exception_schedule)
  // 　 - is_all_day = true なら終日休み → 除外
  // 　 - is_all_day = false なら部分休み → 予約時間帯と被れば除外
  // ・週間スケジュール(staff_week_schedule)
  // 　 - is_open = false なら出勤していない → 除外
  // 　 - 勤務時間外(開始/終了)に被れば除外
  // ------------------------------------------------------------

  // 対象日の曜日を取得 (例: "monday")
  const dayOfWeek = getDayOfWeek(new Date(args.date))

  const filteredBySchedule: typeof availableStaff = []

  for (const staff of availableStaff) {
    let skip = false

    // 4.1 当日の例外スケジュール取得
    const staffSchedules = await ctx.db
      .query('staff_exception_schedule')
      .withIndex('by_tenant_org_staff_date_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('staff_id', staff._id)
          .eq('date', args.date)
          .eq('is_archive', false)
      )
      .collect()

    // 例外スケジュールチェック
    for (const sch of staffSchedules) {
      if (sch.is_all_day) {
        skip = true
        break
      }
      if (
        !sch.is_all_day &&
        sch.start_time_unix !== undefined &&
        sch.end_time_unix !== undefined &&
        args.start_time_unix < sch.end_time_unix &&
        args.end_time_unix > sch.start_time_unix
      ) {
        skip = true
        break
      }
    }

    if (skip) continue

    // 4.2 週間スケジュール取得
    const weekSchedule = await ctx.db
      .query('staff_week_schedule')
      .withIndex('by_tenant_org_staff_week_open_archive', (q) =>
        q
          .eq('tenant_id', args.tenant_id)
          .eq('org_id', args.org_id)
          .eq('staff_id', staff._id)
          .eq('day_of_week', dayOfWeek as DayOfWeek) 
          .eq('is_open', true)
          .eq('is_archive', false)
      )
      .first()

    if (!weekSchedule) {
      // 出勤していない
      continue
    }

    // 勤務時間内判定
    const workStart = weekSchedule.start_hour
      ? convertHourToTimestamp(weekSchedule.start_hour, args.date) ?? Number.MIN_SAFE_INTEGER
      : Number.MIN_SAFE_INTEGER
    const workEnd = weekSchedule.end_hour
      ? convertHourToTimestamp(weekSchedule.end_hour, args.date) ?? Number.MAX_SAFE_INTEGER
      : Number.MAX_SAFE_INTEGER

    if (args.start_time_unix < workStart || args.end_time_unix > workEnd) {
      continue // 勤務時間外
    }

    // ここまで到達すればスケジュールOK
    filteredBySchedule.push(staff)
  }

  console.log('4. スケジュール確認後のスタッフ数:', filteredBySchedule.length)
  console.log('スケジュール確認後スタッフリスト:', filteredBySchedule.map(s => ({ id: s._id, name: s.name })))

  if (filteredBySchedule.length === 0) {
    console.log('スケジュール確認後スタッフが0人のため終了')
    return null
  }

  // 4. スタッフ設定（優先度、指名料）を取得
  const configs = await ctx.db
    .query('staff_config')
    .withIndex('by_tenant_org_staff_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id))
    .filter((q) => q.eq(q.field('is_archive'), false))
    .collect()
  const configMap = new Map(configs.map((config) => [config.staff_id, config]))

  console.log('5. スタッフ設定数:', configs.length)
  console.log('設定があるスタッフID:', configs.map(c => c.staff_id))

  // 5. ダブルブッキングをチェックし、対応可能なスタッフを絞り込み
  const availableStaffWithConfigs = []
  for (const staff of filteredBySchedule) {
    const config = configMap.get(staff._id)
    console.log(`スタッフ ${staff.name} (${staff._id}): 設定=${config ? 'あり' : 'なし'}`)
    if (!config) {
      console.log(`スタッフ ${staff.name} は設定がないため除外`)
      continue
    }

    // ダブルブッキングチェック（エラーを詳細にハンドリング）
    try {
      const isDoubleBooked = await checkReservationDoubleBooking(ctx, {
        tenant_id: args.tenant_id,
        org_id: args.org_id,
        staff_id: staff._id,
        date: args.date,
        start_time_unix: args.start_time_unix,
        end_time_unix: args.end_time_unix,
      })

      if (!isDoubleBooked) {
        console.log(`スタッフ ${staff.name}: ダブルブッキングなし、追加対象`)
        availableStaffWithConfigs.push({
          staff_id: staff._id,
          staff_name: staff.name || '',
          priority: config?.priority || 1, // 優先度が設定されていない場合はデフォルト優先度
          extra_charge: config?.extra_charge || 0,
        })
      } else {
        console.log(`スタッフ ${staff.name}: ダブルブッキングあり、除外`)
      }
    } catch (error) {
      // ダブルブッキング、席数上限、その他のエラーの場合はスキップ
      console.warn(`スタッフ ${staff.name} (${staff._id}) の可用性チェックでエラー:`, error)
      continue
    }
  }

  console.log('6. 最終利用可能スタッフ数:', availableStaffWithConfigs.length)
  console.log('最終スタッフリスト:', availableStaffWithConfigs)

  if (availableStaffWithConfigs.length === 0) {
    console.log('最終的に利用可能なスタッフが0人のため終了')
    return null
  }

  // 6. 優先度順でソート（数値が高いほど優先度が高い）
  availableStaffWithConfigs.sort((a, b) => b.priority - a.priority)

  console.log('7. 選択されたスタッフ:', availableStaffWithConfigs[0])
  console.log('=== findBestAvailableStaffForTimeSlot デバッグ終了 ===')

  // 7. 最優先スタッフを返す
  return availableStaffWithConfigs[0]
}


// キャンセル通知を送信するヘルパー関数
export async function cancelNotification(
  ctx: QueryCtx | MutationCtx,
  args: {
    reservation: Doc<'reservation'> & {
      detail?: Doc<'reservation_detail'> | null;
    };
  }
) {
    // LINEでキャンセル通知を送信
    try {
      // 組織情報を取得
      const organization = await ctx.db.get(args.reservation.org_id);
      if (!organization) {
        console.warn('キャンセル通知: 組織情報が見つかりません');
        return { 
          reservationId: args.reservation._id,
          refundedOptions: args.reservation.detail?.options || [],
        };
      }
      
      // APIコンフィグを取得
      const apiConfig = await ctx.db
        .query('api_config')
        .withIndex('by_tenant_org_archive', (q) =>
          q.eq('tenant_id', args.reservation.tenant_id)
            .eq('org_id', args.reservation.org_id)
            .eq('is_archive', false)
        )
        .first();
        
      if (!apiConfig) {
        console.warn('キャンセル通知: APIコンフィグが見つかりません');
        return { 
          reservationId: args.reservation._id,
          refundedOptions: args.reservation.detail?.options || [],
        };
      }
  
      // 顧客にキャンセル通知を送信（customer_idがある場合のみ）
      if (args.reservation.customer_id && apiConfig.line_access_token) {
        try {
          // 顧客向けキャンセル通知のデータを準備
          const customerNotificationData = {
            tenantId: args.reservation.tenant_id,
            organizationId: args.reservation.org_id,
            customerUid: args.reservation.customer_id,
            cancelData: {
              reservationId: args.reservation._id,
              date: args.reservation.date,
              startTimeUnix: args.reservation.start_time_unix,
              endTimeUnix: args.reservation.end_time_unix,
              staffName: args.reservation.staff_name || '指名フリー',
              menus: args.reservation.detail?.menus || [],
              options: args.reservation.detail?.options || [],
              totalPrice: args.reservation.detail?.total_price || 0,
              cancelledBy: args.reservation.cancelled_by,
              cancelReason: args.reservation.cancel_reason || '',
            },
          };
  
          const baseUrl = getAppUrl()
          const customerResponse = await fetch(`${baseUrl}/api/line/customer-cancellation-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customerNotificationData),
          });
  
          if (!customerResponse.ok) {
            console.error('顧客キャンセル通知APIエラー:', customerResponse.status);
          } else {
            console.log('顧客キャンセル通知送信成功');
          }
          
        } catch (customerNotificationError) {
          console.warn('顧客キャンセル通知の送信に失敗しました:', customerNotificationError);
          // 顧客通知の失敗はキャンセル処理をブロックしない
        }
      }
  
      // サロンにキャンセル通知を送信（org_line_idがある場合のみ）
      if (apiConfig.org_line_id) {  
        try {
          // 環境変数から弊社のLINEチャンネル情報を取得
          const companyLineAccessToken = process.env.COMPANY_LINE_CHANNEL_ACCESS_TOKEN;
          
          if (companyLineAccessToken) {
            // サロン向けキャンセル通知のデータを準備
            const salonNotificationData = {
              tenantId: args.reservation.tenant_id,
              organizationId: args.reservation.org_id,
              reservationId: args.reservation._id,
              cancelData: {
                reservationId: args.reservation._id,
                customerName: args.reservation.customer_name,
                staffName: args.reservation.staff_name || '不明なスタッフ',
                date: args.reservation.date,
                startTimeUnix: args.reservation.start_time_unix,
                endTimeUnix: args.reservation.end_time_unix,
                menus: args.reservation.detail?.menus || [],
                options: args.reservation.detail?.options || [],
                totalPrice: args.reservation.detail?.total_price || 0,
                cancelledBy: args.reservation.cancelled_by,
                cancelReason: args.reservation.cancel_reason || '',
              },
            };
  
            const baseUrl = getAppUrl()
            const salonResponse = await fetch(`${baseUrl}/api/line/salon-cancellation-notification`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(salonNotificationData),
            });
  
            if (!salonResponse.ok) {
              console.error('サロンキャンセル通知APIエラー:', salonResponse.status);
            } else {
              console.log('サロンキャンセル通知送信成功');
            }
          } else {
            console.warn('キャンセル通知: COMPANY_LINE_CHANNEL_ACCESS_TOKENが設定されていません');
          }
        } catch (salonNotificationError) {
          console.warn('サロンキャンセル通知の送信に失敗しました:', salonNotificationError);
          // サロン通知の失敗はキャンセル処理をブロックしない
        }
      }
    } catch (notificationError) {
      console.warn('キャンセル通知処理でエラーが発生しました:', notificationError);
      // 通知の失敗はキャンセル処理をブロックしない
    }
}


export async function cancelForCompletedReservation(
  supabaseService: SupabaseService,
  reservation: Doc<'reservation'> & {
    detail?: Doc<'reservation_detail'> | null;
  }
) { 

  if(reservation.status === "completed" && reservation.customer_id) {
    const { PointTaskQueueRepository } = await import('@/services/supabase/repositories/point');
    const { CustomerRepository } = await import('@/services/supabase/repositories/customer');
    const { CarteRepository } = await import('@/services/supabase/repositories/carte');
    
    const pointTaskQueueRepo = new PointTaskQueueRepository(supabaseService);
    const customerRepo = new CustomerRepository(supabaseService);
    const carteRepo = new CarteRepository(supabaseService);
    
   // 1. カルテを取得し、LTV価格から今回の支払総額を減算
   const carte = await carteRepo.findOrCreateByCustomer(
    reservation.tenant_id,
    reservation.org_id,
    reservation.customer_id,
    {
      ltv_price: 0, // 初期値
    }
  );
  await carteRepo.update(carte.id, {
    ltv_price: (carte.ltv_price || 0) - (reservation.detail?.total_price || 0),
    updated_at: new Date().toISOString(),
  });

  // 2. ポイント返還処理
  const { PointTransactionRepository } = await import('@/services/supabase/repositories/point');
  const pointTransactionRepo = new PointTransactionRepository(supabaseService);
  if (reservation.detail?.use_points && reservation.detail.use_points > 0) {
    await pointTransactionRepo.create({
      tenant_id: reservation.tenant_id,
      org_id: reservation.org_id,
      customer_id: reservation.customer_id,
      reservation_id: reservation._id,
      points: reservation.detail.use_points, // プラスで返還
      transaction_type: 'refunded',
      transaction_date_unix: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    // 顧客ポイント更新
    const { customer, customerPoints } = await customerRepo.getCompleteCustomerData(
      reservation.customer_id,
      reservation.tenant_id,
      reservation.org_id
    );
    if (customer) {
      await customerRepo.updateCustomerWithDetailsAndPoints(
        reservation.customer_id,
        reservation.tenant_id,
        reservation.org_id,
        {},
        {},
        (customerPoints?.total_points || 0) + reservation.detail.use_points,
        []
      );
    }
  }

  
  // 3. ポイント付与タスク削除
  const pointTask = await pointTaskQueueRepo.findByReservation(
    reservation.tenant_id,
    reservation.org_id,
    reservation._id
  );
  
  if (pointTask && pointTask.status === 'pending') {
    await pointTaskQueueRepo.deleteRecord('id', pointTask.id);
  }
  // 3. 顧客情報を取得・更新
  const { customer, customerPoints } = await customerRepo.getCompleteCustomerData(
    reservation.customer_id,
    reservation.tenant_id,
    reservation.org_id
  );
  
  if (customer && reservation.detail?.use_points && reservation.detail.use_points > 0) {
    
    const updateData: Record<string, any> = { // eslint-disable-line @typescript-eslint/no-explicit-any
      // 4. total_reservation_countを1 減らす
      total_reservation_count: (customer.total_reservation_count || 0) - 1,
    };
    
    await customerRepo.updateCustomerWithDetailsAndPoints(
      reservation.customer_id,
      reservation.tenant_id,
      reservation.org_id,
      updateData,
      {},
      (customerPoints?.total_points || 0) + reservation.detail.use_points,
      []
    );
  }
  }
}
