"use node"

import { internalAction } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { PointTaskQueueRepository } from '@/services/supabase/repositories/point';
import { SupabaseService } from '@/services/supabase/SupabaseService';
import { createClient } from '@supabase/supabase-js';
import { getEnv } from '@/lib/env-config'

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