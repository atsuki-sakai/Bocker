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
import { v4 as uuidv4 } from 'uuid';
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
 * ConvexとSupabaseで共通に使う識別子(master_id)を生成し、
 * 両テーブルに適切にデータを挿入します。
 * 
 * @param ctx Mutationコンテキスト（DBアクセス用）
 * @param args 予約情報の詳細
 * @returns 作成した予約IDと予約詳細ID
 */
export async function createReservationWithDetails(
  ctx: MutationCtx,
  args: {
    tenant_id: Id<'tenant'>;
    org_id: Id<'organization'>;
    customer_id: string;
    staff_id: Id<'staff'>;
    customer_name: string;
    staff_name: string;
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
  }
) {
  // Convex & Supabase 共通識別子を生成し、予約と予約詳細の紐付けを保証
  const master_id = uuidv4();

  // 予約テーブルに基本情報を作成 
  const reservationId = await createRecord(ctx, 'reservation', {
    master_id,
    tenant_id: args.tenant_id,
    org_id: args.org_id,
    customer_id: args.customer_id,
    staff_id: args.staff_id,
    customer_name: args.customer_name,
    staff_name: args.staff_name,
    status: args.status,
    payment_status: args.payment_status,
    stripe_checkout_session_id: args.stripe_checkout_session_id,
    date: args.date,
    start_time_unix: args.start_time_unix,
    end_time_unix: args.end_time_unix,
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


