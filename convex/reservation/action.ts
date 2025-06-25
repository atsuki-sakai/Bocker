"use node"

import { internalAction } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { PointTaskQueueRepository } from '@/services/supabase/repositories/point';
import { CustomerRepository } from '@/services/supabase/repositories/customer';
import { RowType, SupabaseService } from '@/services/supabase/SupabaseService';
import { createClient } from '@supabase/supabase-js';
import { getEnv } from '@/lib/env-config'
import { internal } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { ReservationMenu, ReservationOption } from '@/convex/types';

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
              reminder.reservation.customer_id!,
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