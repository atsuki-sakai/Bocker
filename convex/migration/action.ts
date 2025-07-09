"use node"

import { internalAction, ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { createClient } from "@supabase/supabase-js";
import { MigrationPerformanceTracker } from "./monitoring";
import { ImageType, ReservationMenu, ReservationOption } from "../types";
  
// Supabaseクライアントの取得（Node.js環境用）
const getSupabaseClient = () => {
  // 環境変数を直接取得
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Environment variables:', {
      supabaseUrl: !!supabaseUrl,
      serviceRoleKey: !!serviceRoleKey
    });
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

/**
 * 日次移行処理のメインアクション
 * 毎日深夜2時に実行される想定
 */
export const runDailyMigration = internalAction({
  args: {},
  handler: async (ctx) => {
    const startTime = Date.now();
    const cutoffTime = startTime - (24 * 60 * 60 * 1000); // 24時間前
    const tracker = new MigrationPerformanceTracker();
    
    console.log('[Migration] Starting daily reservation migration process...');
    
    try {
      // 1. 移行前の統計情報を取得
      const queryStartTime = Date.now();
      const stats = await ctx.runQuery(internal.migration.query.getMigrationStats, {
        cutoffTime
      });
      tracker.trackConvexQuery(Date.now() - queryStartTime);
      
      console.log('[Migration] Migration statistics:', stats);
      
      if (stats.totalToMigrate === 0) {
        console.log('[Migration] No records to migrate today');
        tracker.logMetrics();
        return;
      }
      
      // 2. 非アクティブ予約（confirmed/pending以外）を移行
      const migrationResult = await migrateNonActiveReservations(ctx, cutoffTime, tracker);
      
      const duration = Date.now() - startTime;
      console.log(`[Migration] Completed in ${duration}ms`);
      
      // 3. パフォーマンスメトリクスをログ出力
      tracker.logMetrics();
      
      // 4. 移行結果をログに記録
      await ctx.runMutation(internal.migration.mutation.logMigrationResult, {
        tableName: 'reservation',
        startTime,
        endTime: Date.now(),
        recordsProcessed: migrationResult.totalProcessed,
        recordsDeleted: migrationResult.totalDeleted,
        errors: migrationResult.errors,
        status: migrationResult.errors.length === 0 ? 'success' : 'partial'
      });
      
    } catch (error) {
      console.error('[Migration] Fatal error:', error);
      tracker.trackError(error instanceof Error ? error : new Error('Unknown error'), 0);
      tracker.logMetrics();
      
      await ctx.runMutation(internal.migration.mutation.logMigrationResult, {
        tableName: 'reservation',
        startTime,
        endTime: Date.now(),
        recordsProcessed: 0,
        recordsDeleted: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        status: 'failed'
      });
      
      throw error;
    }
  }
});

/**
 * 非アクティブ予約（confirmed/pending以外）の移行処理
 * confirmed、pending以外のすべてのステータス（completed、cancelled、refunded等）を移行
 */
async function migrateNonActiveReservations(
  ctx: ActionCtx, 
  cutoffTime: number, 
  tracker: MigrationPerformanceTracker
): Promise<{
  totalProcessed: number;
  totalDeleted: number;
  errors: string[];
}> {
  const batchSize = 500;
  let cursor: Id<'reservation'> | undefined;
  let totalProcessed = 0;
  let totalDeleted = 0;
  const errors: string[] = [];
  
  const supabase = getSupabaseClient();
  
  while (true) {
    tracker.startBatch();
    
    try {
      // Convexから非アクティブ予約データを取得
      const queryStartTime = Date.now();
      const { records, nextCursor, hasMore } = await ctx.runQuery(
        internal.migration.query.getNonActiveReservations,
        { cursor, limit: batchSize, cutoffTime }
      );
      tracker.trackConvexQuery(Date.now() - queryStartTime);
      
      if (records.length === 0) break;
      
      console.log(`[Migration] Processing batch of ${records.length} non-active reservations`);
      totalProcessed += records.length;
      
      // 予約IDの配列を作成
      const reservationIds = records.map((r) => r._id);
      
      // 関連する予約詳細を取得
      const detailQueryStartTime = Date.now();
      const details = await ctx.runQuery(
        internal.migration.query.getReservationDetails,
        { reservationIds }
      );
      tracker.trackConvexQuery(Date.now() - detailQueryStartTime);
      
      // Supabaseへ移行
      const insertStartTime = Date.now();
      const migrationResult = await migrateToSupabase(
        supabase,
        records,
        details
      );
      tracker.trackSupabaseInsert(Date.now() - insertStartTime);
      
      if (migrationResult.success) {
        // 成功したレコードをConvexから削除
        const deleteStartTime = Date.now();
        const deleteResult = await ctx.runMutation(
          internal.migration.mutation.deleteReservations,
          { reservationIds: migrationResult.migratedReservationIds }
        );
        
        // 予約詳細も削除
        if (migrationResult.migratedDetailIds.length > 0) {
          await ctx.runMutation(
            internal.migration.mutation.deleteReservationDetails,
            { detailIds: migrationResult.migratedDetailIds }
          );
        }
        tracker.trackConvexDelete(Date.now() - deleteStartTime);
        
        const deletedCount = deleteResult.deletedCount;
        totalDeleted += deletedCount;
        tracker.trackSuccess(records.length, deletedCount);
      } else {
        errors.push(...migrationResult.errors);
        tracker.trackError(new Error('Migration failed'), records.length);
      }
      
      tracker.endBatch(records.length);
      cursor = nextCursor;
      if (!hasMore) break;
      
      // 負荷軽減のため短時間待機
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown batch error';
      errors.push(errorMessage);
      tracker.trackError(error instanceof Error ? error : new Error(errorMessage), batchSize);
      console.error(`[Migration] Batch error:`, errorMessage);
      
      // バッチエラーでも次に進む（部分的成功を許容）
      tracker.endBatch(0);
      cursor = undefined; // カーソルをリセットして次のバッチを試行
    }
  }
  
  console.log(`[Migration] Processed ${totalProcessed}, deleted ${totalDeleted} non-active reservations`);
  
  return {
    totalProcessed,
    totalDeleted,
    errors
  };
}



/**
 * Supabaseへのデータ移行処理
 */
async function migrateToSupabase(
  supabase: ReturnType<typeof getSupabaseClient>,
  reservations: Array<{
    _id: Id<'reservation'>;
    _creationTime: number;
    tenant_id: Id<'tenant'>;
    org_id: Id<'organization'>;
    customer_uid?: string;
    staff_id?: Id<'staff'>;
    customer_name: string;
    staff_name?: string;
    status: string;
    payment_status: string;
    stripe_checkout_session_id?: string;
    stripe_payment_intent_id?: string;
    date: string;
    start_time_unix: number;
    end_time_unix: number;
    pending_expiry?: number;
    cancelled_at?: number;
    cancelled_by?: string;
    cancel_reason?: string;
    reminder_sent?: boolean;
    reminder_sent_at?: number;
    is_free_nomination?: boolean;
    assigned_staff_id?: Id<'staff'>;
    assigned_staff_name?: string;
    assignment_timestamp?: number;
    last_staff_change?: any;
    is_archive?: boolean;
    updated_at?: number;
    deleted_at?: number;
  }>,
  details: Array<{
    _id: Id<'reservation_detail'>;
    _creationTime: number;
    tenant_id: Id<'tenant'>;
    org_id: Id<'organization'>;
    reservation_id: Id<'reservation'>;
    coupon_id?: Id<'coupon'>;
    total_price?: number;
    payment_method: string;
    menus: ReservationMenu[];
    options: ReservationOption[];
    extra_charge?: number;
    use_points?: number;
    coupon_discount?: number;
    featured_hair_images: ImageType[];
    notes?: string;
    cancellation_info?: any; 
    is_archive?: boolean;
    updated_at?: number;
    deleted_at?: number;
  }>
): Promise<{
  success: boolean;
  migratedReservationIds: Id<'reservation'>[];
  migratedDetailIds: Id<'reservation_detail'>[];
  errors: string[];
}> {
  const errors: string[] = [];
  const migratedReservationIds: Id<'reservation'>[] = [];
  const migratedDetailIds: Id<'reservation_detail'>[] = [];
  
  try {
    // 予約データの変換（フリー指名フィールド対応、_creationTimeは整数のBIGINTとして保存）
    const reservationPayloads = reservations.map(reservation => ({
      tenant_id: reservation.tenant_id,
      org_id: reservation.org_id,
      customer_uid: reservation.customer_uid || null,
      staff_id: reservation.staff_id,
      customer_name: reservation.customer_name,
      staff_name: reservation.staff_name || null,
      status: reservation.status,
      payment_status: reservation.payment_status,
      stripe_checkout_session_id: reservation.stripe_checkout_session_id || null,
      stripe_payment_intent_id: reservation.stripe_payment_intent_id || null,
      date: reservation.date,
      start_time_unix: reservation.start_time_unix,
      end_time_unix: reservation.end_time_unix,
      // フリー指名関連フィールドを追加
      is_free_nomination: reservation.is_free_nomination || false,
      assigned_staff_id: reservation.assigned_staff_id || null,
      assigned_staff_name: reservation.assigned_staff_name || null,
      assignment_timestamp: reservation.assignment_timestamp || null,
      last_staff_change: reservation.last_staff_change || null,
      // キャンセル関連フィールドを追加
      cancelled_at: reservation.cancelled_at || null,
      cancelled_by: reservation.cancelled_by || null,
      cancel_reason: reservation.cancel_reason || null,
      // リマインダー関連フィールドを追加
      reminder_sent: reservation.reminder_sent || false,
      reminder_sent_at: reservation.reminder_sent_at || null,
      pending_expiry: reservation.pending_expiry || null,
      is_archive: reservation.is_archive || false,
      _convex_id: reservation._id, // ConvexレコードIDを保持
      _creation_time: Math.floor(reservation._creationTime) // 小数点を切り捨てて整数に変換
    }));
    
    // 予約詳細データの変換（_creationTimeは整数のBIGINTとして保存）
    const detailPayloads = details.map(detail => {
      // reservation_idのデバッグログ出力
      console.log(`[Migration] Detail reservation_id mapping:`, {
        detail_id: detail._id,
        reservation_id: detail.reservation_id,
        reservation_id_type: typeof detail.reservation_id
      });
      
      // reservation_idがNULLの場合はエラーとして扱う
      if (!detail.reservation_id) {
        throw new Error(`reservation_id is null/undefined for detail ${detail._id}`);
      }
      
      return {
        tenant_id: detail.tenant_id,
        org_id: detail.org_id,
        reservation_id: detail.reservation_id, // NOT NULL制約があるため必須
        coupon_id: detail.coupon_id || null,
        total_price: detail.total_price || null,
        payment_method: detail.payment_method || 'cash', // デフォルト値を適切に設定
        menus: detail.menus || [],
        options: detail.options || [],
        extra_charge: detail.extra_charge || null,
        use_points: detail.use_points || null,
        coupon_discount: detail.coupon_discount || null,
        featured_hair_images: detail.featured_hair_images || [],
        notes: detail.notes || null,
        // キャンセル情報を追加（新しいフィールド）
        cancellation_info: detail.cancellation_info || null,
        is_archive: detail.is_archive || false,
        _convex_id: detail._id,
        _convex_reservation_id: detail.reservation_id,
        _creation_time: Math.floor(detail._creationTime) // 小数点を切り捨てて整数に変換
      };
    });
    
    // Supabaseへバルクインサート（500件ずつ分割）
    const chunkSize = 500;
    for (let i = 0; i < reservationPayloads.length; i += chunkSize) {
      const chunk = reservationPayloads.slice(i, i + chunkSize);
      const { error: reservationError } = await supabase
        .from('reservation')
        .upsert(chunk, { 
          onConflict: '_convex_id'
        });
      
      if (reservationError) {
        throw new Error(`Reservation insert error: ${reservationError.message}`);
      }
    }
    
    // 予約詳細のインサート（500件ずつ分割）
    if (detailPayloads.length > 0) {
      for (let i = 0; i < detailPayloads.length; i += chunkSize) {
        const chunk = detailPayloads.slice(i, i + chunkSize);
        const { error: detailError } = await supabase
          .from('reservation_detail')
          .upsert(chunk, { 
            onConflict: '_convex_id'
          });
        
        if (detailError) {
          throw new Error(`Detail insert error: ${detailError.message}`);
        }
      }
    }
    
    // 成功したIDを記録
    migratedReservationIds.push(...reservations.map(r => r._id));
    migratedDetailIds.push(...details.map(d => d._id));
    
    return {
      success: true,
      migratedReservationIds,
      migratedDetailIds,
      errors
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMessage);
    console.error('[Migration] Supabase migration failed:', errorMessage);
    
    return {
      success: false,
      migratedReservationIds: [],
      migratedDetailIds: [],
      errors
    };
  }
}

/**
 * テスト用：限定的な移行処理（手動実行用）
 * 少量のデータで移行動作を確認するためのアクション
 */
export const testMigration = internalAction({
  args: {
    limit: v.optional(v.number()), // 移行するレコード数の上限（デフォルト: 10）
    dryRun: v.optional(v.boolean()) // true: 実際の削除は行わない（デフォルト: false）
  },
  returns: v.object({
    processed: v.number(),
    migrated: v.number(),
    errors: v.array(v.string()),
    dryRun: v.boolean()
  }),
  handler: async (ctx, { limit = 10, dryRun = false }): Promise<{
    processed: number;
    migrated: number;
    errors: string[];
    dryRun: boolean;
  }> => {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24時間前
    const tracker = new MigrationPerformanceTracker();
    
    console.log(`[Test Migration] Starting test migration (limit: ${limit}, dryRun: ${dryRun})`);
    
    try {
      const supabase = getSupabaseClient();
      
      // 限定的なデータ取得
      const { records }: { records: any[] } = await ctx.runQuery(
        internal.migration.query.getNonActiveReservations,
        { limit, cutoffTime }
      );
      
      if (records.length === 0) {
        console.log('[Test Migration] No records found for testing');
        return { processed: 0, migrated: 0, errors: [], dryRun };
      }
      
      console.log(`[Test Migration] Found ${records.length} records for testing`);
      
      // 関連する予約詳細を取得
      const reservationIds = records.map((r) => r._id);
      const details = await ctx.runQuery(
        internal.migration.query.getReservationDetails,
        { reservationIds }
      );
      
      // Supabaseへの移行テスト
      const migrationResult = await migrateToSupabase(supabase, records, details);
      
      if (migrationResult.success && !dryRun) {
        // ドライランでない場合のみ削除実行
        await ctx.runMutation(
          internal.migration.mutation.deleteReservations,
          { reservationIds: migrationResult.migratedReservationIds }
        );
        
        if (migrationResult.migratedDetailIds.length > 0) {
          await ctx.runMutation(
            internal.migration.mutation.deleteReservationDetails,
            { detailIds: migrationResult.migratedDetailIds }
          );
        }
      }
      
      const result: {
        processed: number;
        migrated: number;
        errors: string[];
        dryRun: boolean;
      } = {
        processed: records.length,
        migrated: migrationResult.success ? records.length : 0,
        errors: migrationResult.errors,
        dryRun
      };
      
      console.log('[Test Migration] Results:', result);
      tracker.logMetrics();
      
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Test Migration] Error:', errorMessage);
      
      return {
        processed: 0,
        migrated: 0,
        errors: [errorMessage],
        dryRun
      };
    }
  }
});