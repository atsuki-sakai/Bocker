import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * 移行対象の予約データを取得するクエリ
 * confirmed以外のステータス（completed, cancelled, refunded等）かつ24時間以上経過した予約を取得
 */
export const getNonActiveReservations = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.number(),
    cutoffTime: v.number() // 基準時刻（Unix timestamp）
  },
  returns: v.object({
    records: v.array(v.any()),
    nextCursor: v.optional(v.string()),
    hasMore: v.boolean()
  }),
  handler: async (ctx, { cursor, limit, cutoffTime }) => {
    // confirmed以外のステータスの予約を取得
    // confirmed、pendingは現在アクティブな予約として除外
    let query = ctx.db
      .query('reservation')
      .withIndex('by_tenant_org_archive')
      .filter((q) => 
        q.and(
          q.neq(q.field('status'), 'confirmed'),
          q.neq(q.field('status'), 'pending'),
          q.lt(q.field('end_time_unix'), cutoffTime),
          q.eq(q.field('is_archive'), false)
        )
      )
      .order('asc');

    // カーソルがある場合は、その位置から開始
    if (cursor) {
      const cursorDoc = await ctx.db.get(cursor as any);
      if (cursorDoc) {
        query = query.filter((q) => 
          q.gt(q.field('_creationTime'), cursorDoc._creationTime)
        );
      }
    }

    // limit + 1件取得して、次のページがあるか判定
    const records = await query.take(limit + 1);
    
    const hasMore = records.length > limit;
    const returnRecords = hasMore ? records.slice(0, limit) : records;
    const nextCursor = hasMore ? records[limit]._id : undefined;

    return {
      records: returnRecords,
      nextCursor,
      hasMore
    };
  }
});

/**
 * 移行対象のキャンセル済み予約データを取得するクエリ（下位互換のため残す）
 * @deprecated getNonActiveReservationsを使用してください
 */
export const getCancelledReservations = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.number(),
    cutoffTime: v.number() // 7日前のUnix timestamp
  },
  returns: v.object({
    records: v.array(v.any()),
    nextCursor: v.optional(v.string()),
    hasMore: v.boolean()
  }),
  handler: async (ctx, { cursor, limit, cutoffTime }) => {
    let query = ctx.db
      .query('reservation')
      .withIndex('status_start_time_archive')
      .filter((q) => 
        q.and(
          q.eq(q.field('status'), 'cancelled'),
          q.lt(q.field('updated_at'), cutoffTime),
          q.eq(q.field('is_archive'), false)
        )
      )
      .order('asc');

    if (cursor) {
      const cursorDoc = await ctx.db.get(cursor as any);
      if (cursorDoc) {
        query = query.filter((q) => 
          q.gt(q.field('_creationTime'), cursorDoc._creationTime)
        );
      }
    }

    const records = await query.take(limit + 1);
    
    const hasMore = records.length > limit;
    const returnRecords = hasMore ? records.slice(0, limit) : records;
    const nextCursor = hasMore ? records[limit]._id : undefined;

    return {
      records: returnRecords,
      nextCursor,
      hasMore
    };
  }
});

/**
 * 移行対象の完了済み予約データを取得するクエリ（下位互換のため残す）
 * @deprecated getNonActiveReservationsを使用してください
 */
export const getCompletedReservations = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.number(),
    cutoffTime: v.number() // 基準時刻（Unix timestamp）
  },
  returns: v.object({
    records: v.array(v.any()),
    nextCursor: v.optional(v.string()),
    hasMore: v.boolean()
  }),
  handler: async (ctx, { cursor, limit, cutoffTime }) => {
    // 下位互換のため、完了済み予約のみを対象とする元の実装を維持
    let query = ctx.db
      .query('reservation')
      .withIndex('status_start_time_archive')
      .filter((q) => 
        q.and(
          q.eq(q.field('status'), 'completed'),
          q.lt(q.field('end_time_unix'), cutoffTime),
          q.eq(q.field('is_archive'), false)
        )
      )
      .order('asc');

    if (cursor) {
      const cursorDoc = await ctx.db.get(cursor as any);
      if (cursorDoc) {
        query = query.filter((q) => 
          q.gt(q.field('_creationTime'), cursorDoc._creationTime)
        );
      }
    }

    const records = await query.take(limit + 1);
    
    const hasMore = records.length > limit;
    const returnRecords = hasMore ? records.slice(0, limit) : records;
    const nextCursor = hasMore ? records[limit]._id : undefined;

    return {
      records: returnRecords,
      nextCursor,
      hasMore
    };
  }
});

/**
 * 特定の予約に関連する予約詳細を取得
 */
export const getReservationDetails = query({
  args: {
    reservationIds: v.array(v.id('reservation'))
  },
  returns: v.array(v.any()),
  handler: async (ctx, { reservationIds }) => {
    // 複数の予約IDに対応する詳細を一括取得
    const details = await Promise.all(
      reservationIds.map(async (reservationId) => {
        const detail = await ctx.db
          .query('reservation_detail')
          .withIndex('by_reservation_archive')
          .filter((q) => 
            q.and(
              q.eq(q.field('reservation_id'), reservationId),
              q.eq(q.field('is_archive'), false)
            )
          )
          .first();
        
        return detail;
      })
    );

    // nullを除外して返す
    return details.filter(d => d !== null);
  }
});

/**
 * 移行前のデータ件数を確認するクエリ
 */
export const getMigrationStats = query({
  args: {
    cutoffTime: v.number()
  },
  returns: v.object({
    completedReservations: v.number(),
    cancelledReservations: v.number(),
    nonActiveReservations: v.number(),
    totalToMigrate: v.number()
  }),
  handler: async (ctx, { cutoffTime }) => {
    // confirmed以外の全ての予約の件数
    const nonActiveReservations = await ctx.db
      .query('reservation')
      .withIndex('by_tenant_org_archive')
      .filter((q) => 
        q.and(
          q.neq(q.field('status'), 'confirmed'),
          q.neq(q.field('status'), 'pending'),
          q.lt(q.field('end_time_unix'), cutoffTime),
          q.eq(q.field('is_archive'), false)
        )
      )
      .collect();

    // 個別の統計情報（下位互換のため）
    const completedReservations = nonActiveReservations.filter(r => r.status === 'completed');
    const cancelledReservations = nonActiveReservations.filter(r => r.status === 'cancelled');

    return {
      completedReservations: completedReservations.length,
      cancelledReservations: cancelledReservations.length,
      nonActiveReservations: nonActiveReservations.length,
      totalToMigrate: nonActiveReservations.length
    };
  }
});

/**
 * 移行済みデータの確認（_convex_idでの存在チェック用）
 */
export const checkMigratedRecords = query({
  args: {
    convexIds: v.array(v.string())
  },
  returns: v.array(v.object({
    convexId: v.string(),
    exists: v.boolean()
  })),
  handler: async (ctx, { convexIds }) => {
    const results = await Promise.all(
      convexIds.map(async (convexId) => {
        try {
          const doc = await ctx.db.get(convexId as any);
          return {
            convexId,
            exists: doc !== null
          };
        } catch {
          return {
            convexId,
            exists: false
          };
        }
      })
    );

    return results;
  }
});