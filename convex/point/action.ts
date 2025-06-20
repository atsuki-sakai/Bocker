"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { PointTaskQueueRepository } from "../../services/supabase/repositories/point/PointTaskQueueRepository";
import { CustomerRepository } from "../../services/supabase/repositories/customer/CustomerRepository";
import { getSupabaseAdminService } from "../../services/supabase/SupabaseService";
import type { RowType } from "../../services/supabase/SupabaseService";
import { getEnv } from '@/lib/env-config'
import { BASE_URL } from "@/lib/constants";

/**
 * ポイント付与バッチ処理
 * 予定時刻に達したポイント付与タスクを処理します
 */
export const cronApplyPointAward = internalAction({
  args: {},
  returns: v.object({
    processed: v.number(),
    errors: v.number(),
    skipped: v.number(),
  }),
  handler: async () => {
    console.log("Point award batch processor started (Supabase unified)");
    
    const BATCH_SIZE = 100;
    const MAX_PROCESSING_TIME = 8000; // 8秒でタイムアウト防止
    const startTime = Date.now();
    
    let processed = 0;
    let errors = 0;
    let skipped = 0;
    
    try {
      const supabase = getSupabaseAdminService();
      const taskQueueRepo = new PointTaskQueueRepository(supabase);
      const customerRepo = new CustomerRepository(supabase);
      
      let hasMore = true;
      
      while (hasMore && (Date.now() - startTime) < MAX_PROCESSING_TIME) {
        // 1. 実行対象タスクを取得（Supabase）
        const currentTime = Math.floor(Date.now() / 1000);
        const { data: pendingTasks } = await taskQueueRepo.findTasksToExecute(
          currentTime,
          'pending',
          { pageSize: BATCH_SIZE }
        );
        
        if (pendingTasks.length === 0) {
          hasMore = false;
          break;
        }
        
        // 2. バッチ処理実行
        for (const task of pendingTasks) {
          try {
            // 2.1 処理中に変更（Supabase）
            await taskQueueRepo.updateTaskStatus(task.id, 'processing');
            
            // 2.2 アトミックポイント付与実行（Supabase）
            const result = await customerRepo.updatePointsAtomic(
              task.customer_id,
              task.tenant_id,
              task.org_id,
              task.points || 0,
              'earned',
              `予約完了によるポイント付与（予約ID: ${task.reservation_id}）`,
              task.reservation_id || undefined
            );
            
            // 2.3 通知送信（非同期・エラー時も継続）
            sendPointAwardNotification(task).catch(error => {
              console.warn(`Notification failed for task ${task.id}:`, error);
            });
            
            // 2.4 タスク完了処理（Supabase）
            await taskQueueRepo.updateTaskStatus(task.id, 'completed');
            
            processed++;
            console.log(`Successfully awarded ${task.points || 0} points to customer ${task.customer_id}`);
            
          } catch (error) {
            console.error(`Error processing task ${task.id}:`, error);
            
            // エラー時の処理
            const maxRetries = 3;
            const retryCount = 0; // task.retry_countが型定義にないため、ひとまず0で固定
            
            if (retryCount < maxRetries) {
              // リトライ可能な場合は24時間後に再スケジュール
              const newScheduledTime = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
              await taskQueueRepo.rescheduleTask(task.id, newScheduledTime);
              skipped++;
            } else {
              // リトライ上限に達した場合は失敗とする
              await taskQueueRepo.updateTaskStatus(task.id, 'failed');
              errors++;
            }
          }
        }
      }
      
      console.log(`Point award batch completed: ${processed} processed, ${errors} errors, ${skipped} skipped`);
      
      return { processed, errors, skipped };
      
    } catch (error) {
      console.error("Point award batch processor failed:", error);
      return { processed, errors: errors + 1, skipped };
    }
  },
});

/**
 * ポイント有効期限処理
 * 有効期限切れのポイントをアーカイブします
 */
export const processPointExpirations = internalAction({
  args: {},
  returns: v.object({
    expiredCount: v.number(),
    totalExpiredPoints: v.number(),
  }),
  handler: async () => {
    console.log("Point expiration processor started");
    
    try {
      const supabase = getSupabaseAdminService();
      
      // RPC関数を呼び出してポイント有効期限処理を実行
      const { data, error } = await supabase.rpc<{
        expired_count: number;
        total_expired_points: number;
      }>('expire_points', {
        p_expiration_days: 365 // 365日で有効期限切れ
      });

      if (error) {
        console.error("Point expiration processor failed:", error);
        return { expiredCount: 0, totalExpiredPoints: 0 };
      }

      const result = data[0] || { expired_count: 0, total_expired_points: 0 };
      console.log(`Point expiration completed: ${result.expired_count} transactions expired, ${result.total_expired_points} points total`);
      
      return {
        expiredCount: result.expired_count,
        totalExpiredPoints: result.total_expired_points
      };
      
    } catch (error) {
      console.error("Point expiration processor failed:", error);
      return { expiredCount: 0, totalExpiredPoints: 0 };
    }
  },
});

/**
 * 通知送信関数（非同期）
 */
async function sendPointAwardNotification(task: RowType<'point_task_queue'>): Promise<void> {
  // 顧客情報取得
  const supabase = getSupabaseAdminService();
  const { data: customers } = await supabase.listRecords<'customer'>('customer', {
    filters: {
      uid: task.customer_id,
      tenant_id: task.tenant_id,
      org_id: task.org_id
    },
    select: ['line_id', 'email', 'first_name', 'last_name'] as const,
    pageSize: 1
  });
  
  const customer = customers[0];
  
  if (!customer) return;
  
  const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || '顧客様';
  const message = `${customerName}さん\\n\\n${task.points || 0}ポイントが付与されました！\\n\\n予約完了から30日が経過したため、ポイントをプレゼントいたします。\\n\\n現在のポイント残高をマイページでご確認ください。`;
  
  if (customer.line_id) {
    // LINE通知送信
    await fetch(`${BASE_URL}/api/line/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: task.tenant_id,
        orgId: task.org_id,
        lineUserId: customer.line_id,
        message: message,
      }),
    });
  } else if (customer.email) {
    // メール通知送信
    await fetch(`${BASE_URL}/api/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: customer.email,
        subject: 'ポイントが付与されました',
        html: `
          <h2>ポイント付与のお知らせ</h2>
          <p>${customerName}さん</p>
          <p>${task.points || 0}ポイントが付与されました！</p>
          <p>予約完了から30日が経過したため、ポイントをプレゼントいたします。</p>
          <p>現在のポイント残高はマイページでご確認ください。</p>
        `,
      }),
    });
  }
}