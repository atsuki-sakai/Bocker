import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

/**
 * 移行完了した予約レコードを削除する内部ミューテーション
 */
export const deleteReservations = internalMutation({
  args: {
    reservationIds: v.array(v.id('reservation'))
  },
  returns: v.object({
    success: v.boolean(),
    deletedCount: v.number(),
    failedIds: v.array(v.id('reservation'))
  }),
  handler: async (ctx, { reservationIds }) => {
    const failedIds: Id<'reservation'>[] = [];
    let deletedCount = 0;

    // トランザクション内で一括削除を試みる
    for (const reservationId of reservationIds) {
      try {
        // 予約を削除
        await ctx.db.delete(reservationId);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete reservation ${reservationId}:`, error);
        failedIds.push(reservationId);
      }
    }

    return {
      success: failedIds.length === 0,
      deletedCount,
      failedIds
    };
  }
});

/**
 * 移行完了した予約詳細レコードを削除する内部ミューテーション
 */
export const deleteReservationDetails = internalMutation({
  args: {
    detailIds: v.array(v.id('reservation_detail'))
  },
  returns: v.object({
    success: v.boolean(),
    deletedCount: v.number(),
    failedIds: v.array(v.id('reservation_detail'))
  }),
  handler: async (ctx, { detailIds }) => {
    const failedIds: Id<'reservation_detail'>[] = [];
    let deletedCount = 0;

    for (const detailId of detailIds) {
      try {
        // 予約詳細を削除
        await ctx.db.delete(detailId);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete reservation detail ${detailId}:`, error);
        failedIds.push(detailId);
      }
    }

    return {
      success: failedIds.length === 0,
      deletedCount,
      failedIds
    };
  }
});

/**
 * 移行処理のログを記録する内部ミューテーション
 */
export const logMigrationResult = internalMutation({
  args: {
    tableName: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    recordsProcessed: v.number(),
    recordsDeleted: v.number(),
    errors: v.array(v.string()),
    status: v.union(v.literal('success'), v.literal('partial'), v.literal('failed'))
  },
  handler: async (ctx, args) => {
    // webhook_eventsテーブルを流用して移行ログを記録
    await ctx.db.insert('webhook_events', {
      event_id: `migration_${args.tableName}_${args.startTime}`,
      event_type: `data_migration_${args.tableName}`,
      processed_at: args.endTime,
      processing_result: args.status === 'success' ? 'completed' : 'failed',
      error_message: args.errors.length > 0 ? args.errors.join('; ') : undefined,
      created_at: Date.now(),
      updated_at: Date.now(),
      is_archive: false
    });

    console.log(`Migration log recorded: ${args.tableName}`, {
      duration: args.endTime - args.startTime,
      recordsProcessed: args.recordsProcessed,
      recordsDeleted: args.recordsDeleted,
      status: args.status
    });
  }
});

/**
 * 予約レコードを論理削除する（物理削除前の安全策）
 */
export const archiveReservations = internalMutation({
  args: {
    reservationIds: v.array(v.id('reservation'))
  },
  returns: v.object({
    success: v.boolean(),
    archivedCount: v.number()
  }),
  handler: async (ctx, { reservationIds }) => {
    let archivedCount = 0;

    for (const reservationId of reservationIds) {
      try {
        await ctx.db.patch(reservationId, {
          is_archive: true,
          updated_at: Date.now()
        });
        archivedCount++;
      } catch (error) {
        console.error(`Failed to archive reservation ${reservationId}:`, error);
      }
    }

    return {
      success: archivedCount === reservationIds.length,
      archivedCount
    };
  }
});

/**
 * 予約詳細レコードを論理削除する
 */
export const archiveReservationDetails = internalMutation({
  args: {
    detailIds: v.array(v.id('reservation_detail'))
  },
  returns: v.object({
    success: v.boolean(),
    archivedCount: v.number()
  }),
  handler: async (ctx, { detailIds }) => {
    let archivedCount = 0;

    for (const detailId of detailIds) {
      try {
        await ctx.db.patch(detailId, {
          is_archive: true,
          updated_at: Date.now()
        });
        archivedCount++;
      } catch (error) {
        console.error(`Failed to archive reservation detail ${detailId}:`, error);
      }
    }

    return {
      success: archivedCount === detailIds.length,
      archivedCount
    };
  }
});