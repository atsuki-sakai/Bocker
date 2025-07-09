"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { PointTaskQueueRepository } from "../../services/supabase/repositories/point/PointTaskQueueRepository";
import { CustomerRepository } from "../../services/supabase/repositories/customer/CustomerRepository";
import { getSupabaseAdminService } from "../../services/supabase/SupabaseService";

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
            await customerRepo.updatePointsAtomic(
              task.customer_uid,
              task.tenant_id,
              task.org_id,
              task.points || 0,
              'earned',
              `予約完了によるポイント付与（予約ID: ${task.reservation_id}）`,
              task.reservation_id || undefined
            );
            
            // 2.4 タスク完了処理（Supabase）
            await taskQueueRepo.updateTaskStatus(task.id, 'completed');
            
            processed++;
            console.log(`Successfully awarded ${task.points || 0} points to customer ${task.customer_uid}`);
            
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
 * ポイント有効期限処理 - サロンの設定したポイントの有効期限を過ぎたポイントをアーカイブします
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
