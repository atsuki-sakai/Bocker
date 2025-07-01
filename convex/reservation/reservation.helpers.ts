import { MutationCtx, QueryCtx } from '@/convex/_generated/server';
import { Id } from '@/convex/_generated/dataModel';
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

  return { reservationId, reservationDetailId };
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
  
  // 1. 全アクティブスタッフを取得
  const allStaff = await ctx.db
    .query('staff')
    .withIndex('by_tenant_org_active_archive', (q) =>
      q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id).eq('is_active', true).eq('is_archive', false)
    )
    .collect()

  if (allStaff.length === 0) {
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

  if (availableStaff.length === 0) {
    return null
  }

  // 4. スタッフ設定（優先度、指名料）を取得
  const configs = await ctx.db
    .query('staff_config')
    .withIndex('by_tenant_org_staff_archive', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id))
    .filter((q) => q.eq(q.field('is_archive'), false))
    .collect()
  const configMap = new Map(configs.map((config) => [config.staff_id, config]))

  // 5. ダブルブッキングをチェックし、対応可能なスタッフを絞り込み
  const availableStaffWithConfigs = []
  for (const staff of availableStaff) {
    const config = configMap.get(staff._id)
    if (!config) continue

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
        availableStaffWithConfigs.push({
          staff_id: staff._id,
          staff_name: staff.name || '',
          priority: config.priority || 999, // 優先度が設定されていない場合は最低優先度
          extra_charge: config.extra_charge || 0,
        })
      }
    } catch (error) {
      // ダブルブッキング、席数上限、その他のエラーの場合はスキップ
      // 認証エラーは上位に伝播させず、このスタッフは利用不可として扱う
      console.warn(`スタッフ ${staff.name} (${staff._id}) の可用性チェックでエラー:`, error)
      continue
    }
  }

  if (availableStaffWithConfigs.length === 0) {
    return null
  }

  // 6. 優先度順でソート（数値が高いほど優先度が高い）
  availableStaffWithConfigs.sort((a, b) => b.priority - a.priority)

  // 7. 最優先スタッフを返す
  return availableStaffWithConfigs[0]
}
