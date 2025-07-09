"use node"

import { internalAction } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { RowType, SupabaseService } from '@/services/supabase/SupabaseService';
import { createClient } from '@supabase/supabase-js';
import { getEnv } from '@/lib/env-config'
import { internal } from '@/convex/_generated/api';
import { Doc, Id} from '@/convex/_generated/dataModel';
import { ReservationMenu, ReservationOption, ReservationStatus, PaymentMethod } from '@/convex/types';
import { ConvexError } from 'convex/values';
import { ERROR_SEVERITY, ERROR_STATUS_CODE } from '@/lib/errors/constants';
import { PointTaskQueueRepository } from '@/services/supabase/repositories/point';
import { CustomerRepository } from '@/services/supabase/repositories/customer';
import { cancelForCompletedReservation } from './reservation.helpers';
import { CouponTransactionRepository } from '@/services/supabase/repositories/coupon';
import { fetchMutation } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';

/**
 * 予約IDに紐づくポイントタスクを削除する
 * キャンセル時にポイント付与を阻止するために使用
 */
export const deletePointTaskForReservation = internalAction({
  args: {
    tenant_id: v.string(),
    org_id: v.string(),
    reservation_id: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Supabase管理者クライアントを作成
      const supabase = createClient(
        getEnv('NEXT_PUBLIC_SUPABASE_URL'),
        getEnv('SUPABASE_SERVICE_ROLE_KEY')
      );
      
      const supabaseService = new SupabaseService(supabase);
      const pointTaskQueueRepo = new PointTaskQueueRepository(supabaseService);
      
      // 予約に紐づくポイントタスクを検索
      const pointTask = await pointTaskQueueRepo.findByReservation(
        args.tenant_id,
        args.org_id,
        args.reservation_id
      );
      
      if (pointTask && pointTask.status === 'pending') {
        // タスクがpending状態の場合のみ削除
        await pointTaskQueueRepo.deleteRecord('id', pointTask.id);
        console.log(`ポイントタスクを削除しました: ${pointTask.id} (予約ID: ${args.reservation_id})`);
        return { deleted: true, taskId: pointTask.id };
      }
      
      console.log(`削除対象のポイントタスクが見つかりませんでした: 予約ID ${args.reservation_id}`);
      return { deleted: false, reason: 'task_not_found_or_not_pending' };
      
    } catch (error) {
      console.error('ポイントタスク削除エラー:', error);
      throw error;
    }
  },
});

/**
 * 1時間ごとに実行されるリマインダー送信処理
 * 施術時間の3時間前の予約を対象にリマインダーを送信
 * 日本時間（JST）で実行されるように修正
 */
export const sendHourlyReminders = internalAction({
  handler: async (ctx): Promise<{ processed: number; sent: number; errors: Array<{ reservationId: string; error: string }> }> => {
    try {
      // 現在時刻（UTC）を取得
      const nowUTC = Date.now();
      
      // 日本時間での現在時刻を取得（正確なタイムゾーン処理）
      const nowJST = new Date(nowUTC).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      // 3-4時間後の時間帯を計算（UTC時間で）
      const threeHoursLaterUTC = nowUTC + (3 * 60 * 60 * 1000);
      const fourHoursLaterUTC = nowUTC + (4 * 60 * 60 * 1000);
      
      // 日本時間での表示用
      const threeHoursLaterJST = new Date(threeHoursLaterUTC).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const fourHoursLaterJST = new Date(fourHoursLaterUTC).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      console.log(`リマインダー送信処理開始（JST）: ${nowJST}`);
      console.log(`対象時間帯（JST）: ${threeHoursLaterJST} - ${fourHoursLaterJST}`);
      console.log(`対象時間帯（UTC Unix）: ${threeHoursLaterUTC} - ${fourHoursLaterUTC}`);
      
      // 3-4時間後に開始される、予約受付済みでリマインダー未送信の予約を取得
      // ConvexはUTC時間で処理するため、UTC時間を渡す
      const reminderData = await ctx.runQuery(internal.reservation.query.getReservationsForReminder, {
        startTimeFrom: threeHoursLaterUTC,
        startTimeTo: fourHoursLaterUTC,
      });
      
      console.log(`対象予約数: ${reminderData.length}`);
      
      if (reminderData.length === 0) {
        return { processed: 0, sent: 0, errors: [] };
      }
      
      // Supabase管理者クライアントを作成
      const supabase = createClient(
        getEnv('NEXT_PUBLIC_SUPABASE_URL'),
        getEnv('SUPABASE_SERVICE_ROLE_KEY')
      );
      
      const supabaseService = new SupabaseService(supabase);
      const customerRepo = new CustomerRepository(supabaseService);
      
      let sent = 0;
      const errors: Array<{ reservationId: string; error: string }> = [];
      
      // 並列処理で通知送信（最大10件ずつ）
      const batchSize = 10;
      for (let i = 0; i < reminderData.length; i += batchSize) {
        const batch = reminderData.slice(i, i + batchSize);
        const promises = batch.map(async (reminder) => {
          try {
            // 顧客情報を取得
            const { customer } = await customerRepo.getCompleteCustomerData(
              reminder.reservation.customer_uid!,
              reminder.reservation.tenant_id,
              reminder.reservation.org_id
            );
            
            if (!customer) {
              throw new Error('顧客情報が見つかりません');
            }
            
            // 通知送信処理
            if (customer.line_id) {
              await sendLineReminder(reminder.org_name, reminder.reservation, reminder.menus, reminder.options, reminder.extra_charge, reminder.coupon_discount, reminder.use_points, reminder.total_price, customer);
            } else if (customer.email) {
              await sendEmailReminder(reminder.org_name, reminder.reservation, reminder.menus, reminder.options, reminder.extra_charge, reminder.coupon_discount, reminder.use_points, reminder.total_price, customer);
            } else {
              throw new Error('通知先（LINE IDまたはメール）が設定されていません');
            }
            
            // リマインダー送信フラグを更新（送信時刻はUTC時間で保存）
            await ctx.runMutation(internal.reservation.mutation.updateReminderStatus, {
              reservationId: reminder.reservation._id,
              sent: true,
              sentAt: nowUTC,
            });
            
            sent++;
            console.log(`リマインダー送信成功: 予約ID ${reminder.reservation._id}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push({
              reservationId: reminder.reservation._id,
              error: errorMessage,
            });
            console.error(`リマインダー送信失敗: 予約ID ${reminder.reservation._id}`, error);
          }
        });
        
        await Promise.all(promises);
      }
      
      console.log(`リマインダー送信処理完了: 送信成功 ${sent}件, エラー ${errors.length}件`);
      
      return {
        processed: reminderData.length,
        sent,
        errors,
      };
    } catch (error) {
      console.error('リマインダー送信処理エラー:', error);
      throw error;
    }
  },
});

// LINE通知送信（リマインダー専用APIを使用）
async function sendLineReminder(orgName: string, reservation: Doc<"reservation">, menus: ReservationMenu[], options: ReservationOption[], extra_charge: number, coupon_discount: number, use_points: number, total_price: number, customer: RowType<'customer'>) {
  // Convex環境では process.env.CONVEX_SITE_URL が利用可能
  const baseUrl = getEnv('NEXT_PUBLIC_DEPLOY_URL')
  const fullUrl = `${baseUrl}/api/line/reminder`
  
  console.log('=== LINE リマインダー送信開始 ===')
  const requestBody = {
    tenant_id: reservation.tenant_id,
    org_id: reservation.org_id,
    line_user_id: customer.line_id,
    message_type: 'reminder',
    reservation_data: {
      id: reservation._id,
      customer_name: reservation.customer_name,
      staff_name: reservation.staff_name,
      start_time_unix: reservation.start_time_unix,
      end_time_unix: reservation.end_time_unix,
      menus: menus,
      options: options,
      extra_charge: extra_charge,
      coupon_discount: coupon_discount,
      use_points: use_points,
      total_price: total_price,
      org_name: orgName
    },
  }
  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  // ヘッダーを安全に出力
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  if (!response.ok) {
    let errorData = {};
    let responseText = '';
    
    try {
      responseText = await response.text();
      
      if (responseText) {
        errorData = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.log('Failed to parse response as JSON:', parseError);
    }
    console.log('Error data:', errorData);
    throw new Error(`LINE通知送信エラー: ${response.status} ${response.statusText} - Response: ${responseText}`);
  }
  console.log('=== LINE リマインダー送信完了 ===');
}

// メール通知送信（リマインダー専用APIを使用）
async function sendEmailReminder(orgName: string, reservation: Doc<"reservation">, menus: ReservationMenu[], options: ReservationOption[], extra_charge: number, coupon_discount: number, use_points: number, total_price: number, customer: RowType<'customer'>) {
  const baseUrl = getEnv('NEXT_PUBLIC_DEPLOY_URL')
  const fullUrl = `${baseUrl}/api/resend/reminder`
  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'reminder',
      to: customer.email,
      subject: '【リマインダー】本日のご予約について',
      customerData: {
        name: reservation.customer_name,
        email: customer.email,
      },
      reservationData: {
        id: reservation._id,
        customer_name: reservation.customer_name,
        staff_name: reservation.staff_name,
        start_time_unix: reservation.start_time_unix,
        end_time_unix: reservation.end_time_unix,
        menus: menus,
        options: options,
        extra_charge: extra_charge,
        coupon_discount: coupon_discount,
        use_points: use_points,
        total_price: total_price,
        org_name: orgName
      },
      organizationData: {
        name: orgName,
      }
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`メール送信エラー: ${response.status} ${errorData.error || response.statusText}`);
  }
}

type CreatePayload = {
  tenant_id: Id<'tenant'>;
  org_id: Id<'organization'>;
  customer_uid?: string;
  staff_id: Id<'staff'>;
  staff_name: string;
  start_time_unix: number;
  payment_method: PaymentMethod;
  menus: ReservationMenu[];
  options: ReservationOption[];
  total_price: number;
  notes?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isCreatePayload = (payload: any): payload is CreatePayload => {
  return typeof payload === 'object' && payload !== null && 'tenant_id' in payload && 'org_id' in payload && 'staff_id' in payload && 'staff_name' in payload && 'start_time_unix' in payload && 'payment_method' in payload && 'menus' in payload && 'options' in payload && 'total_price' in payload;
};

type ConfirmPayload = {
  reservation?: Doc<'reservation'> & {
    detail?: Doc<'reservation_detail'> | null;
  };
  pointConfig?: Doc<'point_config'> | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isConfirmPayload = (payload: any): payload is ConfirmPayload => {
  return typeof payload === 'object' && payload !== null && 'reservation' in payload && 'pointConfig' in payload;
};

type CancelPayload = {
  reservation?: Doc<'reservation'> & {
    detail?: Doc<'reservation_detail'> | null;
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isCancelPayload = (payload: any): payload is CancelPayload => {
  return typeof payload === 'object' && payload !== null && 'reservation' in payload;
};

// ステータス変更用のPayload型
type StatusSideEffectsPayload = {
  reservationId: Id<'reservation'>;
  status: ReservationStatus;
  reservation?: Doc<'reservation'> & {
    detail?: Doc<'reservation_detail'> | null;
  };
  pointConfig?: Doc<'point_config'> | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isStatusSideEffectsPayload = (payload: any): payload is StatusSideEffectsPayload => {
  return typeof payload === 'object' && payload !== null && 'reservationId' in payload && 'status' in payload && 'reservation' in payload && 'pointConfig' in payload;
};

/**
 * 予約管理の副次処理を実行する
 * Convexトランザクション後にSupabaseへの書き込みを行う
 */
export const performSideEffects = internalAction({
  args: { 
    mode: v.union(
      v.literal("create"),
      v.literal("confirm"),
      v.literal("cancel"),
      v.literal("status")
    ),
    payload: v.any(), 
    coreResult: v.object({
      reservationId: v.id('reservation'),
      status: v.optional(v.string()),
      payment_method: v.optional(v.string()),
      checkout_url: v.optional(v.string()),
      alreadyConfirmed: v.optional(v.boolean()),
      newStatus: v.optional(v.string()),
      refundedOptions: v.optional(v.any()),
    })
  },
  handler: async (ctx, { mode, payload, coreResult }) => {
    // Supabase管理者クライアントを作成
    const supabase = createClient(
      getEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getEnv('SUPABASE_SERVICE_ROLE_KEY')
    );
    
    const supabaseService = new SupabaseService(supabase);
    
    try {
      switch (mode) {
        case "create":
          if (isCreatePayload(payload)) {
            await handleCreateSideEffects(supabaseService, payload, coreResult);
          } else {
            throw new ConvexError(
              {
                statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
                severity: ERROR_SEVERITY.ERROR,
                message: 'Invalid payload type for create mode',
              }
            )
          }
          break;
        case "confirm":
          if (isConfirmPayload(payload)) {
            await handleConfirmSideEffects(supabaseService, payload, coreResult);
          } else {
            throw new ConvexError(
              {
                statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
                severity: ERROR_SEVERITY.ERROR,
                message: 'Invalid payload type for confirm mode',
              }
            )
          }
          break;
        case "cancel":
          if (isCancelPayload(payload)) {
            await handleCancelSideEffects(supabaseService, payload, coreResult);
          } else {
            throw new ConvexError(
              {
                statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
                severity: ERROR_SEVERITY.ERROR,
                message: 'Invalid payload type for cancel mode',
              }
            )
          }
          break;
        case "status":
          if (isStatusSideEffectsPayload(payload)) {
            await handleStatusSideEffects(supabaseService, payload, coreResult);
          } else {
            throw new ConvexError(
              'Invalid payload type for status mode',
            )
          }
          break;
      }
    } catch (error) {
      console.error("SideEffects error", error);
      // Sentryへの通知（実装されている場合）
      // Sentry.captureException(error);
      throw error; // エラーを再投げして、Convex側でロールバック
    }
  },
});

// 予約作成時の副次処理
async function handleCreateSideEffects(
  supabaseService: SupabaseService, 
  payload: {
    tenant_id: string;
    org_id: string;
    customer_uid?: string;
    staff_id: string;
    staff_name: string;
    start_time_unix: number;
    payment_method: string;
    menus: ReservationMenu[];
    options: ReservationOption[];
    total_price: number;
    notes?: string;
  }, 
  coreResult: {
    reservationId: string;
  }
) {
  const { CarteRepository } = await import('@/services/supabase/repositories/carte');
  
  const carteRepo = new CarteRepository(supabaseService);
  

  // カルテ作成（現金決済の場合のみ）
  if (payload.payment_method === "cash" && payload.customer_uid) {
    // カルテを取得または作成
    const carte = await carteRepo.findOrCreateByCustomer(
      payload.tenant_id,
      payload.org_id,
      payload.customer_uid,
      {
        ltv_price: 0, // 作成時はLTVに加算しない
      }
    );
    
    // カルテ詳細を追加
    const { CarteDetailRepository } = await import('@/services/supabase/repositories/carte');
    const carteDetailRepo = new CarteDetailRepository(supabaseService);
    await carteDetailRepo.createCarteDetail({
      tenant_id: payload.tenant_id,
      org_id: payload.org_id,
      carte_id: carte.id,
      reservation_id: coreResult.reservationId,
      staff_id: payload.staff_id,
      staff_name: payload.staff_name,
      // JST(UTC+9) の ISO 文字列に変換
      service_start_time: new Date(payload.start_time_unix + 9 * 60 * 60 * 1000).toISOString(),
      menu_details: payload.menus || [],
      option_details: payload.options || [],
      total_price: payload.total_price,
      notes: '',
      customer_requests: payload.notes || '',
      after_images: [],
    });
  }
}

// 決済確定時の副次処理
async function handleConfirmSideEffects(
  supabaseService: SupabaseService, 
  payload: {
    reservation?: Doc<'reservation'> & {
      detail?: Doc<'reservation_detail'> | null;
    };
    pointConfig?: Doc<'point_config'> | null;
  }, 
  coreResult: {
    reservationId: Id<'reservation'>;
  }
) {
  try {

    const { CarteRepository } = await import('@/services/supabase/repositories/carte');
  
    // クレジットカード決済の場合のみカルテ作成
    if(payload.reservation?.detail?.payment_method === "credit_card" && payload.reservation?.customer_uid && payload.reservation?.org_id) {
      const carteRepo = new CarteRepository(supabaseService);
      const carte = await carteRepo.findOrCreateByCustomer(
          payload.reservation.tenant_id,
          payload.reservation.org_id,
          payload.reservation.customer_uid,
        {
          ltv_price: 0, // 作成時はLTVに加算しない
        }
      );
      // カルテ詳細を追加
      const { CarteDetailRepository } = await import('@/services/supabase/repositories/carte');
      const carteDetailRepo = new CarteDetailRepository(supabaseService);
      await carteDetailRepo.createCarteDetail({
        tenant_id: payload.reservation.tenant_id,
        org_id: payload.reservation.org_id,
        carte_id: carte.id,
        reservation_id: coreResult.reservationId,
        staff_id: payload.reservation.staff_id || '',
        staff_name: payload.reservation.staff_name || '',
        // JST(UTC+9) の ISO 文字列に変換
        service_start_time: new Date(payload.reservation.start_time_unix + 9 * 60 * 60 * 1000).toISOString(),
        menu_details: payload.reservation.detail?.menus || [],
        option_details: payload.reservation.detail?.options || [],
        total_price: payload.reservation.detail?.total_price || 0,
        notes: '',
        customer_requests: payload.reservation.detail?.notes || '',
      });
    }
  } catch (error) {
    console.error("Confirm side effects error:", error);
    throw error;
  }
}

// キャンセル時の副次処理
async function handleCancelSideEffects(
  supabaseService: SupabaseService, 
  payload: {
    reservation?: Doc<'reservation'> & {
      detail?: Doc<'reservation_detail'> | null;
    };
  }, 
  coreResult: {
    reservationId: string;
  }
) {
  console.log('handleCancelSideEffects', coreResult);
  // 予約詳細はpayloadから取得
  const reservation = payload.reservation;
  
  if (!reservation || !reservation.customer_uid) return;
  
  const { CarteDetailRepository } = await import('@/services/supabase/repositories/carte');
  const carteDetailRepo = new CarteDetailRepository(supabaseService);
  
  try {
    // 1. カルテ詳細レコードを削除
    const carteDetail = await carteDetailRepo.findByReservation(
      reservation.tenant_id,
      reservation.org_id,
      reservation._id
    );
    if (carteDetail) {
      await carteDetailRepo.deleteRecord('id', carteDetail.id);
      console.log(`[handleCancelSideEffects] Deleted carte_detail record: ${carteDetail.id}`);
    }
    if(reservation.status === "completed" && reservation.customer_uid) {
      await cancelForCompletedReservation(supabaseService, reservation);
    }
  } catch (error) {
    console.error("Cancel side effects error:", error);
    throw error;
  }
}

// ステータス変更時の副次処理
async function handleStatusSideEffects(
  supabaseService: SupabaseService, 
  payload: StatusSideEffectsPayload, 
  coreResult: {
    reservationId: string;
  }
) {

  console.log(`[handleStatusSideEffects] Status changed to ${payload.status} for reservation ${payload.reservationId} ${coreResult.reservationId}`);
  
  // 予約情報を取得
  const reservation = payload.reservation;
  if (!reservation || !reservation.detail) {
    console.error('[handleStatusSideEffects] No reservation or detail found');
    return;
  }

  // completed ステータスへの変更時の処理
  if (payload.status === 'completed' && reservation.customer_uid) {
    const { PointTaskQueueRepository } = await import('@/services/supabase/repositories/point');
    const { CustomerRepository } = await import('@/services/supabase/repositories/customer');
    const { CarteRepository } = await import('@/services/supabase/repositories/carte');

    const pointTaskQueueRepo = new PointTaskQueueRepository(supabaseService);
    const customerRepo = new CustomerRepository(supabaseService);
    const carteRepo = new CarteRepository(supabaseService);
    try {
      // 1. カルテのLTV価格に今回の支払総額を加算
      const carte = await carteRepo.findOrCreateByCustomer(
        reservation.tenant_id,
        reservation.org_id,
        reservation.customer_uid,
        {
          ltv_price: 0, // 初期値
        }
      );
      
      await carteRepo.update(carte.id, {
        ltv_price: (carte.ltv_price || 0) + (reservation.detail?.total_price || 0),
        updated_at: new Date().toISOString(),
      });
      
      // 2. 30日後のポイント付与タスクを作成
      const pointConfig = payload.pointConfig;
      if (pointConfig && pointConfig.is_active) {
        const earnPoints = pointConfig.is_fixed_point ? pointConfig.fixed_point : Math.floor((reservation.detail?.total_price || 0) * ((pointConfig.point_rate || 0) / 100));
        
        if (earnPoints && earnPoints > 0) {
          await pointTaskQueueRepo.create({
            tenant_id: reservation.tenant_id,
            org_id: reservation.org_id,
            customer_uid: reservation.customer_uid,
            reservation_id: reservation._id,
            points: earnPoints,
            scheduled_for_unix: reservation.start_time_unix + (30 * 24 * 60 * 60 * 1000), // 30日後
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
      
      // 3. 顧客情報を取得・更新
      const { customer, customerPoints } = await customerRepo.getCompleteCustomerData(
        reservation.customer_uid,
        reservation.tenant_id,
        reservation.org_id
      );
      
      if (customer) {
        
        const updateData: Record<string, any> = { // eslint-disable-line @typescript-eslint/no-explicit-any
          // 4. total_reservation_countを1増やす
          total_reservation_count: (customer.total_reservation_count || 0) + 1,
          // 6. last_reservation_date_unixを現在時刻で更新（秒単位）
          last_reservation_date_unix: Math.floor(Date.now() / 1000),
        };
        
        // 5. 初回顧客の場合はcustomer_typeを"repeat"に変更
        if (customer.customer_type === 'first_time') {
          updateData.customer_type = 'repeat';
        }
        
        // 顧客基本情報を RPC 経由で更新
        await customerRepo.updateCustomer(
          reservation.customer_uid,
          reservation.tenant_id,
          reservation.org_id,
          updateData,
        );

        // 6. ポイント使用時は顧客ポイントを更新する
        if (reservation.detail.use_points) {
          const newTotalPoints = (customerPoints?.total_points || 0) - (reservation.detail.use_points || 0);
          await customerRepo.updateCustomerPoints(
            reservation.customer_uid,
            reservation.tenant_id,
            reservation.org_id,
            newTotalPoints,
            Math.floor(Date.now() / 1000),
          );
        }

        // 7. クーポン利用時はトランザクションを作成
        if(reservation.detail.coupon_discount && reservation.detail.coupon_discount > 0 && reservation.detail.coupon_id) {
           // Supabaseクライアントの作成（サーバーサイドでのみService Role Keyを使用）
    const supabase = createClient(
      getEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getEnv('SUPABASE_SERVICE_ROLE_KEY')
    )
    const supabaseService = new SupabaseService(supabase)
    const couponTransactionRepo = new CouponTransactionRepository(supabaseService)

    // クーポントランザクションの作成
    const couponTransaction = await couponTransactionRepo.create({
      tenant_id: reservation.tenant_id,
      org_id: reservation.org_id,
      coupon_id: reservation.detail.coupon_id,
      customer_uid: reservation.customer_uid,
      reservation_id: reservation._id,
      transaction_date_unix: Math.floor(Date.now() / 1000),
      discount_amount: reservation.detail.coupon_discount,
    })

    await fetchMutation(api.coupon.config.mutation.updateNumberOfUse, {
      type: 'increment',
      tenant_id: reservation.tenant_id as Id<'tenant'>,
      org_id: reservation.org_id as Id<'organization'>,
      coupon_id: reservation.detail.coupon_id as Id<'coupon'>,
    })

    console.log(
      `[API] Created coupon transaction: ${couponTransaction.id} for reservation: ${reservation._id}`
    )
        }
      }
      
      console.log('[handleStatusSideEffects] Completed status side effects successfully');
    } catch (error) {
      console.error('[handleStatusSideEffects] Error in completed status side effects:', error);
      throw error;
    }
  } else if ((payload.status === 'cancelled' || payload.status === 'refunded') && reservation.customer_uid) {
    console.log('[handleStatusSideEffects] Cancelled status side effects');

    const { CarteDetailRepository } = await import('@/services/supabase/repositories/carte');
    const carteDetailRepo = new CarteDetailRepository(supabaseService);
    console.log('handleCancelSideEffects', coreResult);
    // 予約詳細はpayloadから取得
    const reservation = payload.reservation;
    if (!reservation || !reservation.customer_uid) return;
    try {
      // 1. カルテ詳細レコードを削除
      const carteDetail = await carteDetailRepo.findByReservation(
        reservation.tenant_id,
        reservation.org_id,
        reservation._id
      );
      if (carteDetail) {
        await carteDetailRepo.deleteRecord('id', carteDetail.id);
        console.log(`[handleCancelSideEffects] Deleted carte_detail record: ${carteDetail.id}`);
      }

      if(reservation.status === "completed" && reservation.customer_uid) {
        await cancelForCompletedReservation(supabaseService, reservation);
      }
    } catch (error) {
      console.error("Cancel side effects error:", error);
      throw error;
    }
  } else if (payload.status === 'confirmed' && reservation.customer_uid) {
    console.log('[handleStatusSideEffects] Confirmed status side effects');
  } else if (payload.status === 'pending' && reservation.customer_uid) {
    console.log('[handleStatusSideEffects] Pending status side effects');
  }
}

















