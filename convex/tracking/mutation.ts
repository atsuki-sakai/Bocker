import { v } from 'convex/values'
import { mutation, internalMutation } from '../_generated/server'
import {
  TrackingEventType,
  trackingCodeType,
  TrackingCode,
} from '@/services/convex/shared/types/common'
import { Id } from '../_generated/dataModel'
import { QueryCtx } from '../_generated/server'
import { trackingEventType } from '@/services/convex/shared/types/common'
import { internal } from '../_generated/api'

export const createTrackingEvent = mutation({
  args: {
    salonId: v.id('salon'),
    eventType: trackingEventType,
    code: trackingCodeType,
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.sessionId) {
      console.warn(
        '[Convex Mutation] sessionId is missing, creating tracking event without duplication check.'
      )
      await ctx.db.insert('tracking_event', {
        salonId: args.salonId,
        eventType: args.eventType,
        code: args.code,
        sessionId: args.sessionId,
      })
      return
    }

    const RECENT_THRESHOLD_MS = 30 * 60 * 1000 // 30分
    const now = Date.now()

    const existingEvent = await ctx.db
      .query('tracking_event')
      .withIndex('by_session_id_and_event_details', (q) =>
        q
          .eq('sessionId', args.sessionId)
          .eq('salonId', args.salonId)
          .eq('eventType', args.eventType)
          .eq('code', args.code)
      )
      .filter((q) => q.gt(q.field('_creationTime'), now - RECENT_THRESHOLD_MS))
      .order('desc')
      .first()

    if (existingEvent) {
      console.log(
        '[Convex Mutation] Duplicate tracking event detected for sessionId within threshold, skipping creation:',
        existingEvent
      )
      return
    }

    await ctx.db.insert('tracking_event', {
      salonId: args.salonId,
      eventType: args.eventType,
      code: args.code,
      sessionId: args.sessionId,
    })
  },
})

// 集計用ヘルパー関数
// 集計用ヘルパー関数 - バッチ処理で大量データに対応
async function aggregateTrackingEvents(ctx: QueryCtx, salonId: Id<'salon'>, date: string) {
  const summaries = new Map<
    string,
    {
      source?: string
      campaign?: string
      term?: string
      eventType?: TrackingEventType
      code?: TrackingCode | undefined
      totalCount: number
    }
  >()

  // バッチサイズを設定
  const BATCH_SIZE = 100
  let cursor: string | null = null
  let isDone = false

  // バッチ処理でデータを取得
  while (!isDone) {
    const eventsResult = await ctx.db
      .query('tracking_event')
      .filter(
        (q) =>
          q.eq(q.field('salonId'), salonId) &&
          q.gte(q.field('_creationTime'), new Date(`${date}T00:00:00Z`).getTime()) &&
          q.lt(q.field('_creationTime'), new Date(`${date}T23:59:59Z`).getTime())
      )
      .paginate({ numItems: BATCH_SIZE, cursor })

    // バッチ内のイベントを集計
    for (const e of eventsResult.page) {
      const key = `${e.eventType || ''}_${e.code || ''}`
      const s = summaries.get(key) ?? {
        eventType: e.eventType,
        code: e.code,
        totalCount: 0,
      }
      s.totalCount += 1
      summaries.set(key, s)
    }

    // 次のバッチのためにカーソルを更新
    cursor = eventsResult.continueCursor
    isDone = eventsResult.isDone
  }

  return summaries
}

// 全てのサロンのトラッキングサマリーの更新　(※cron_jobで実行)
export const updateAllSalonTrackingSummaries = internalMutation({
  handler: async (ctx) => {
    const salons = await ctx.db.query('salon').collect()
    const today = new Date().toISOString().split('T')[0]

    for (const salon of salons) {
      await ctx.scheduler.runAfter(0, internal.tracking.mutation.updateTrackingSummaries, {
        salonId: salon._id,
        date: today,
      })
    }
  },
})

// トラッキングサマリーの更新
export const updateTrackingSummaries = internalMutation({
  args: {
    salonId: v.id('salon'),
    date: v.string(),
    cursor: v.optional(v.number()),
    summariesArray: v.optional(
      v.array(
        v.object({
          key: v.string(),
          summary: v.object({
            source: v.optional(v.string()),
            campaign: v.optional(v.string()),
            term: v.optional(v.string()),
            eventType: v.optional(trackingEventType),
            code: v.optional(trackingCodeType),
            totalCount: v.number(),
          }),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const BATCH_SIZE = 50

    if (!args.summariesArray) {
      const aggregatedSummariesMap = await aggregateTrackingEvents(ctx, args.salonId, args.date)

      const summariesInitArray = Array.from(aggregatedSummariesMap.entries()).map(
        ([key, summary]) => ({
          key,
          summary: {
            source: summary.source,
            campaign: summary.campaign,
            term: summary.term,
            eventType: summary.eventType,
            code: summary.code,
            totalCount: summary.totalCount,
          },
        })
      )

      if (summariesInitArray.length > 0) {
        await ctx.scheduler.runAfter(0, internal.tracking.mutation.updateTrackingSummaries, {
          salonId: args.salonId,
          date: args.date,
          summariesArray: summariesInitArray,
          cursor: 0,
        })
      } else {
        await ctx.scheduler.runAfter(0, internal.tracking.mutation.deleteTrackingEventsBatch, {
          salonId: args.salonId,
          date: args.date,
          cursor: null,
        })
      }
      return
    }

    const start = args.cursor || 0
    const end = Math.min(start + BATCH_SIZE, args.summariesArray.length)
    const currentBatch = args.summariesArray.slice(start, end)

    if (currentBatch.length === 0 && start === 0) {
      await ctx.scheduler.runAfter(0, internal.tracking.mutation.deleteTrackingEventsBatch, {
        salonId: args.salonId,
        date: args.date,
        cursor: null,
      })
      return
    }

    const existingSummariesQuery = await ctx.db
      .query('tracking_summaries')
      .filter((q) => q.eq(q.field('salonId'), args.salonId) && q.eq(q.field('date'), args.date))
      .collect()

    const existingSummariesMap = new Map<string, any>()
    for (const es of existingSummariesQuery) {
      const mapKey = `${es.eventType || ''}_${es.code || ''}`
      existingSummariesMap.set(mapKey, es)
    }

    for (const item of currentBatch) {
      const key = item.key
      const s = item.summary
      try {
        const existing = existingSummariesMap.get(key)

        if (existing) {
          await ctx.db.patch(existing._id, {
            totalCount: s.totalCount,
          })
        } else {
          await ctx.db.insert('tracking_summaries', {
            salonId: args.salonId,
            date: args.date,
            eventType: s.eventType,
            code: s.code,
            totalCount: s.totalCount,
            isArchive: false,
            deletedAt: new Date().getTime() + 1000 * 24 * 60 * 60 * 1095, // 1095日後
          })
        }
      } catch (error) {
        console.error(
          `Failed to update or insert tracking summary for salon ${args.salonId}, date ${args.date}, key ${key}:`,
          error
        )
      }
    }

    if (end < args.summariesArray.length) {
      await ctx.scheduler.runAfter(0, internal.tracking.mutation.updateTrackingSummaries, {
        salonId: args.salonId,
        date: args.date,
        summariesArray: args.summariesArray,
        cursor: end,
      })
    } else {
      await ctx.scheduler.runAfter(0, internal.tracking.mutation.deleteTrackingEventsBatch, {
        salonId: args.salonId,
        date: args.date,
        cursor: null,
      })
    }
  },
})

export const deleteTrackingEventsBatch = internalMutation({
  args: {
    salonId: v.id('salon'),
    date: v.string(),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const BATCH_SIZE = 100

    try {
      const eventsResult = await ctx.db
        .query('tracking_event')
        .filter(
          (q) =>
            q.eq(q.field('salonId'), args.salonId) &&
            q.gte(q.field('_creationTime'), new Date(`${args.date}T00:00:00Z`).getTime()) &&
            q.lt(q.field('_creationTime'), new Date(`${args.date}T23:59:59Z`).getTime())
        )
        .paginate({ numItems: BATCH_SIZE, cursor: args.cursor ?? null })

      for (const event of eventsResult.page) {
        try {
          await ctx.db.delete(event._id)
        } catch (error) {
          console.error(
            `Failed to delete tracking event ${event._id} for salon ${args.salonId}, date ${args.date}:`,
            error
          )
        }
      }

      if (!eventsResult.isDone) {
        await ctx.scheduler.runAfter(0, internal.tracking.mutation.deleteTrackingEventsBatch, {
          salonId: args.salonId,
          date: args.date,
          cursor: eventsResult.continueCursor,
        })
      }
    } catch (error) {
      console.error(
        `Failed to process deleteTrackingEventsBatch for salon ${args.salonId}, date ${args.date}, cursor ${args.cursor}:`,
        error
      )
    }
  },
})
