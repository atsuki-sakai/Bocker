"use node"

import { internalAction } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { PointTaskQueueRepository } from '@/services/supabase/repositories/point';
import { CustomerRepository } from '@/services/supabase/repositories/customer';
import { RowType, SupabaseService } from '@/services/supabase/SupabaseService';
import { createClient } from '@supabase/supabase-js';
import { getEnv } from '@/lib/env-config'
import { api, internal } from '@/convex/_generated/api';
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
        await pointTaskQueueRepo.delete('id', pointTask.id);
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
 */
export const sendHourlyReminders = internalAction({
  handler: async (ctx): Promise<{ processed: number; sent: number; errors: Array<{ reservationId: string; error: string }> }> => {
    try {
      const now = Date.now();
      const threeHoursLater = now + (3 * 60 * 60 * 1000); // 3時間後
      const fourHoursLater = now + (4 * 60 * 60 * 1000); // 4時間後
      
      console.log(`リマインダー送信処理開始: ${new Date(now).toISOString()}`);
      console.log(`対象時間帯: ${new Date(threeHoursLater).toISOString()} - ${new Date(fourHoursLater).toISOString()}`);
      
      // 3-4時間後に開始される、確定済みでリマインダー未送信の予約を取得
      const reminderData = await ctx.runQuery(internal.reservation.query.getReservationsForReminder, {
        startTimeFrom: threeHoursLater,
        startTimeTo: fourHoursLater,
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
              reminder.reservation.tenant_id,
              reminder.reservation.org_id,
              reminder.reservation.customer_id!
            );
            
            if (!customer) {
              throw new Error('顧客情報が見つかりません');
            }
            
            // 通知送信処理（既存のAPIを使用）
            if (customer.line_id) {
              // LINE通知
              await sendLineReminder(reminder.org_name, reminder.reservation, reminder.menus, reminder.options, reminder.extra_charge, reminder.coupon_discount, reminder.use_points, reminder.total_price, customer);
            } else if (customer.email) {
              // メール通知
              await sendEmailReminder(reminder.org_name, reminder.reservation, reminder.menus, reminder.options, reminder.extra_charge, reminder.coupon_discount, reminder.use_points, reminder.total_price, customer);
            } else {
              throw new Error('通知先（LINE IDまたはメール）が設定されていません');
            }
            
            // リマインダー送信フラグを更新
            await ctx.runMutation(internal.reservation.mutation.updateReminderStatus, {
              reservationId: reminder.reservation._id,
              sent: true,
              sentAt: now,
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
  const baseUrl = process.env.CONVEX_SITE_URL || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/line/reminder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
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
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`LINE通知送信エラー: ${response.status} ${errorData.error || response.statusText}`);
  }
}

// メール通知送信（リマインダー専用APIを使用）
async function sendEmailReminder(orgName: string, reservation: Doc<"reservation">, menus: ReservationMenu[], options: ReservationOption[], extra_charge: number, coupon_discount: number, use_points: number, total_price: number, customer: RowType<'customer'>) {
  // Convex環境では process.env.CONVEX_SITE_URL が利用可能
  const baseUrl = process.env.CONVEX_SITE_URL || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/resend/reminder`, {
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