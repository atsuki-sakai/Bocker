"use node"

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal, api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// Supabaseサービスのインポート（既存のサービスを使用）
const getSupabaseService = async () => {
  const { getSupabaseAdminService } = await import("@/services/supabase/SupabaseService");
  return getSupabaseAdminService();
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
    
    console.log('[Migration] Starting daily reservation migration process...');
    
    try {
      // 1. 移行前の統計情報を取得
      const stats = await ctx.runQuery(internal.migration.query.getMigrationStats, {
        cutoffTime
      });
      
      console.log('[Migration] Migration statistics:', stats);
      
      if (stats.totalToMigrate === 0) {
        console.log('[Migration] No records to migrate today');
        return;
      }
      
      // 2. 完了済み予約を移行
      await migrateCompletedReservations(ctx, cutoffTime);
      
      // 3. キャンセル済み予約を移行（7日以上経過）
      const cancelCutoffTime = startTime - (7 * 24 * 60 * 60 * 1000);
      await migrateCancelledReservations(ctx, cancelCutoffTime);
      
      const duration = Date.now() - startTime;
      console.log(`[Migration] Completed in ${duration}ms`);
      
      // 4. 移行結果をログに記録
      await ctx.runMutation(internal.migration.mutation.logMigrationResult, {
        tableName: 'reservation',
        startTime,
        endTime: Date.now(),
        recordsProcessed: stats.totalToMigrate,
        recordsDeleted: stats.totalToMigrate, // 理想的には全て削除
        errors: [],
        status: 'success'
      });
      
    } catch (error) {
      console.error('[Migration] Fatal error:', error);
      
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
 * 完了済み予約の移行処理
 */
async function migrateCompletedReservations(ctx: any, cutoffTime: number) {
  const batchSize = 500;
  let cursor: string | undefined;
  let totalMigrated = 0;
  
  const supabase = await getSupabaseService();
  
  while (true) {
    // Convexから予約データを取得
    const { records, nextCursor, hasMore } = await ctx.runQuery(
      internal.migration.query.getCompletedReservations,
      { cursor, limit: batchSize, cutoffTime }
    );
    
    if (records.length === 0) break;
    
    console.log(`[Migration] Processing batch of ${records.length} completed reservations`);
    
    // 予約IDの配列を作成
    const reservationIds = records.map((r: any) => r._id as Id<'reservation'>);
    
    // 関連する予約詳細を取得
    const details = await ctx.runQuery(
      internal.migration.query.getReservationDetails,
      { reservationIds }
    );
    
    // Supabaseへ移行
    const migrationResult = await migrateToSupabase(
      supabase,
      records,
      details,
      'completed'
    );
    
    if (migrationResult.success) {
      // 成功したレコードをConvexから削除（または論理削除）
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
      
      totalMigrated += deleteResult.deletedCount;
    }
    
    cursor = nextCursor;
    if (!hasMore) break;
    
    // 負荷軽減のため短時間待機
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`[Migration] Migrated ${totalMigrated} completed reservations`);
}

/**
 * キャンセル済み予約の移行処理
 */
async function migrateCancelledReservations(ctx: any, cutoffTime: number) {
  const batchSize = 500;
  let cursor: string | undefined;
  let totalMigrated = 0;
  
  const supabase = await getSupabaseService();
  
  while (true) {
    const { records, nextCursor, hasMore } = await ctx.runQuery(
      internal.migration.query.getCancelledReservations,
      { cursor, limit: batchSize, cutoffTime }
    );
    
    if (records.length === 0) break;
    
    console.log(`[Migration] Processing batch of ${records.length} cancelled reservations`);
    
    const reservationIds = records.map((r: any) => r._id as Id<'reservation'>);
    const details = await ctx.runQuery(
      internal.migration.query.getReservationDetails,
      { reservationIds }
    );
    
    const migrationResult = await migrateToSupabase(
      supabase,
      records,
      details,
      'cancelled'
    );
    
    if (migrationResult.success) {
      const deleteResult = await ctx.runMutation(
        internal.migration.mutation.deleteReservations,
        { reservationIds: migrationResult.migratedReservationIds }
      );
      
      if (migrationResult.migratedDetailIds.length > 0) {
        await ctx.runMutation(
          internal.migration.mutation.deleteReservationDetails,
          { detailIds: migrationResult.migratedDetailIds }
        );
      }
      
      totalMigrated += deleteResult.deletedCount;
    }
    
    cursor = nextCursor;
    if (!hasMore) break;
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`[Migration] Migrated ${totalMigrated} cancelled reservations`);
}

/**
 * Supabaseへのデータ移行処理
 */
async function migrateToSupabase(
  supabase: any,
  reservations: any[],
  details: any[],
  status: 'completed' | 'cancelled'
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
    // 予約データの変換
    const reservationPayloads = reservations.map(reservation => ({
      master_id: reservation.master_id,
      tenant_id: reservation.tenant_id,
      org_id: reservation.org_id,
      customer_id: reservation.customer_id || null,
      staff_id: reservation.staff_id,
      customer_name: reservation.customer_name,
      staff_name: reservation.staff_name,
      status: reservation.status,
      payment_status: reservation.payment_status,
      stripe_checkout_session_id: reservation.stripe_checkout_session_id || null,
      date: reservation.date,
      start_time_unix: reservation.start_time_unix,
      end_time_unix: reservation.end_time_unix,
      is_archive: reservation.is_archive || false,
      sort_key: reservation.sort_key || null,
      _convex_id: reservation._id,
      _creation_time: reservation._creationTime
    }));
    
    // 予約詳細データの変換
    const detailPayloads = details.map(detail => ({
      tenant_id: detail.tenant_id,
      org_id: detail.org_id,
      reservation_id: detail.reservation_id,
      coupon_id: detail.coupon_id || null,
      total_price: detail.total_price || null,
      payment_method: detail.payment_method,
      menus: detail.menus || [],
      options: detail.options || [],
      extra_charge: detail.extra_charge || null,
      use_points: detail.use_points || null,
      coupon_discount: detail.coupon_discount || null,
      featured_hair_images: detail.featured_hair_images || [],
      notes: detail.notes || null,
      is_archive: detail.is_archive || false,
      sort_key: detail.sort_key || null,
      _convex_id: detail._id,
      _convex_reservation_id: detail.reservation_id,
      _creation_time: detail._creationTime
    }));
    
    // Supabaseへバルクインサート（upsert）
    const { data: reservationData, error: reservationError } = await supabase
      .from('reservation')
      .upsert(reservationPayloads, { 
        onConflict: '_convex_id',
        returning: 'minimal' 
      });
    
    if (reservationError) {
      throw new Error(`Reservation insert error: ${reservationError.message}`);
    }
    
    // 予約詳細のインサート
    if (detailPayloads.length > 0) {
      const { data: detailData, error: detailError } = await supabase
        .from('reservation_detail')
        .upsert(detailPayloads, { 
          onConflict: '_convex_id',
          returning: 'minimal' 
        });
      
      if (detailError) {
        throw new Error(`Detail insert error: ${detailError.message}`);
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