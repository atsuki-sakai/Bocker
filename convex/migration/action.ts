"use node"

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { createClient } from "@supabase/supabase-js";

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
    
    console.log('[Migration] Starting daily reservation migration process...');
    
    try {
      // 1. 移行前の統計情報を取得
      const stats = await ctx.runQuery((internal as any).migration.query.getMigrationStats, {
        cutoffTime
      });
      
      console.log('[Migration] Migration statistics:', stats);
      
      if (stats.totalToMigrate === 0) {
        console.log('[Migration] No records to migrate today');
        return;
      }
      
      // 2. 非アクティブ予約（confirmed/pending以外）を移行
      await migrateNonActiveReservations(ctx, cutoffTime);
      
      const duration = Date.now() - startTime;
      console.log(`[Migration] Completed in ${duration}ms`);
      
      // 4. 移行結果をログに記録
      await ctx.runMutation((internal as any).migration.mutation.logMigrationResult, {
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
      
      await ctx.runMutation((internal as any).migration.mutation.logMigrationResult, {
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
async function migrateNonActiveReservations(ctx: any, cutoffTime: number) {
  const batchSize = 500;
  let cursor: string | undefined;
  let totalMigrated = 0;
  
  const supabase = getSupabaseClient();
  
  while (true) {
    // Convexから非アクティブ予約データを取得
    const { records, nextCursor, hasMore } = await ctx.runQuery(
      (internal as any).migration.query.getNonActiveReservations,
      { cursor, limit: batchSize, cutoffTime }
    );
    
    if (records.length === 0) break;
    
    console.log(`[Migration] Processing batch of ${records.length} non-active reservations`);
    
    // 予約IDの配列を作成
    const reservationIds = records.map((r: any) => r._id as Id<'reservation'>);
    
    // 関連する予約詳細を取得
    const details = await ctx.runQuery(
      (internal as any).migration.query.getReservationDetails,
      { reservationIds }
    );
    
    // Supabaseへ移行
    const migrationResult = await migrateToSupabase(
      supabase,
      records,
      details
    );
    
    if (migrationResult.success) {
      // 成功したレコードをConvexから削除
      const deleteResult = await ctx.runMutation(
        (internal as any).migration.mutation.deleteReservations,
        { reservationIds: migrationResult.migratedReservationIds }
      );
      
      // 予約詳細も削除
      if (migrationResult.migratedDetailIds.length > 0) {
        await ctx.runMutation(
          (internal as any).migration.mutation.deleteReservationDetails,
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
  
  console.log(`[Migration] Migrated ${totalMigrated} non-active reservations`);
}

/**
 * 完了済み予約の移行処理（下位互換のため残す）
 * @deprecated migrateNonActiveReservationsを使用してください
 */
async function migrateCompletedReservations(ctx: any, cutoffTime: number) {
  const batchSize = 500;
  let cursor: string | undefined;
  let totalMigrated = 0;
  
  const supabase = getSupabaseClient();
  
  while (true) {
    // Convexから予約データを取得
    const { records, nextCursor, hasMore } = await ctx.runQuery(
      (internal as any).migration.query.getCompletedReservations,
      { cursor, limit: batchSize, cutoffTime }
    );
    
    if (records.length === 0) break;
    
    console.log(`[Migration] Processing batch of ${records.length} completed reservations`);
    
    // 予約IDの配列を作成
    const reservationIds = records.map((r: any) => r._id as Id<'reservation'>);
    
    // 関連する予約詳細を取得
    const details = await ctx.runQuery(
      (internal as any).migration.query.getReservationDetails,
      { reservationIds }
    );
    
    // Supabaseへ移行
    const migrationResult = await migrateToSupabase(
      supabase,
      records,
      details
    );
    
    if (migrationResult.success) {
      // 成功したレコードをConvexから削除（または論理削除）
      const deleteResult = await ctx.runMutation(
        (internal as any).migration.mutation.deleteReservations,
        { reservationIds: migrationResult.migratedReservationIds }
      );
      
      // 予約詳細も削除
      if (migrationResult.migratedDetailIds.length > 0) {
        await ctx.runMutation(
          (internal as any).migration.mutation.deleteReservationDetails,
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
 * キャンセル済み予約の移行処理（下位互換のため残す）
 * @deprecated migrateNonActiveReservationsを使用してください
 */
async function migrateCancelledReservations(ctx: any, cutoffTime: number) {
  const batchSize = 500;
  let cursor: string | undefined;
  let totalMigrated = 0;
  
  const supabase = getSupabaseClient();
  
  while (true) {
    const { records, nextCursor, hasMore } = await ctx.runQuery(
      (internal as any).migration.query.getCancelledReservations,
      { cursor, limit: batchSize, cutoffTime }
    );
    
    if (records.length === 0) break;
    
    console.log(`[Migration] Processing batch of ${records.length} cancelled reservations`);
    
    const reservationIds = records.map((r: any) => r._id as Id<'reservation'>);
    const details = await ctx.runQuery(
      (internal as any).migration.query.getReservationDetails,
      { reservationIds }
    );
    
    const migrationResult = await migrateToSupabase(
      supabase,
      records,
      details
    );
    
    if (migrationResult.success) {
      const deleteResult = await ctx.runMutation(
        (internal as any).migration.mutation.deleteReservations,
        { reservationIds: migrationResult.migratedReservationIds }
      );
      
      if (migrationResult.migratedDetailIds.length > 0) {
        await ctx.runMutation(
          (internal as any).migration.mutation.deleteReservationDetails,
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
  details: any[]
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
    // 予約データの変換（_creationTimeは整数のBIGINTとして保存）
    const reservationPayloads = reservations.map(reservation => ({
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
        payment_method: detail.payment_method || 'unknown', // NOT NULL制約がある可能性を考慮
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
          onConflict: '_convex_id',
          returning: 'minimal' 
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
            onConflict: '_convex_id',
            returning: 'minimal' 
          });
        
        if (detailError) {
          throw new Error(`Detail insert error: ${detailError.message}`);
        }
      }
    }
    
    // 成功したIDを記録
    migratedReservationIds.push(...reservations.map((r: any) => r._id));
    migratedDetailIds.push(...details.map((d: any) => d._id));
    
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