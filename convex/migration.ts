import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'
import { checkAuth } from '@/services/convex/shared/utils/auth'

/**
 * 指定されたテーブルから履歴データを取得するクエリ
 */
export const getHistoricalData = query({
  args: {
    tableName: v.string(),
    cutoffTimestamp: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { tableName, cutoffTimestamp, limit = 100 } = args

    // システム管理者のみ実行可能
    checkAuth(ctx)

    // テーブル名のバリデーション
    const validTables = ['point_task_queue', 'reservation', 'payment']
    if (!validTables.includes(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`)
    }

    // カットオフ日時より前のデータを取得
    const query = ctx.db
      .query(tableName as any)
      .filter((q) => q.lt(q.field('_creationTime'), cutoffTimestamp))
      .filter((q) => q.eq(q.field('isArchive'), false))
      .take(limit)

    return query
  },
})

/**
 * 移行済みのデータをアーカイブとしてマークするミューテーション
 */
export const markAsArchived = mutation({
  args: {
    tableName: v.string(),
    ids: v.array(v.id('any')),
  },
  handler: async (ctx, args) => {
    const { tableName, ids } = args

    // システム管理者のみ実行可能
    checkAuth(ctx)

    // テーブル名のバリデーション
    const validTables = ['point_task_queue', 'reservation', 'payment']
    if (!validTables.includes(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`)
    }

    // 各IDに対してアーカイブフラグを設定
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          await ctx.db.patch(id as Id<any>, {
            isArchive: true,
            migratedToSupabase: true,
            migratedAt: Date.now(),
          })
          return { id, success: true }
        } catch (error) {
          return { id, success: false, error: (error as Error).message }
        }
      })
    )

    return {
      totalProcessed: ids.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      details: results,
    }
  },
})
