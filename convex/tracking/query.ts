import { query } from '../_generated/server'
import { v } from 'convex/values'

import {
  trackingEventType,
  trackingCodeType,
  TRACKING_CODE_VALUES,
} from '@/services/convex/shared/types/common'
import {
  trackingSummaryAggregate,
  trackingByDateAggregate,
  trackingByCodeAggregate,
  trackingByDateCodeEventTypeAggregate,
} from './aggregate'

// 一定期間内の、日付、イベントタイプごとの集計
export const getOptimizedTrackingSummaries = query({
  args: {
    salonId: v.id('salon'),
    date: v.optional(v.string()), // YYYY-MM-DD
    yearMonth: v.optional(v.string()), // YYYY-MM
    eventType: v.optional(trackingEventType),
    source: v.optional(v.string()),
    code: v.optional(trackingCodeType),
    campaign: v.optional(trackingCodeType),
  },
  handler: async (ctx, args) => {
    const salonId = args.salonId

    // 日付範囲の計算
    let startDate = ''
    let endDate = ''

    if (args.date) {
      startDate = args.date
      endDate = args.date
    } else if (args.yearMonth) {
      const [yearStr, monthStr] = args.yearMonth.split('-')
      const year = parseInt(yearStr, 10)
      const month = parseInt(monthStr, 10)
      startDate = `${args.yearMonth}-01`
      const lastDayOfMonth = new Date(year, month, 0).getDate()
      endDate = `${args.yearMonth}-${lastDayOfMonth.toString().padStart(2, '0')}`
    }

    // 合計カウントの取得
    let totalCountSum = 0
    if (startDate && endDate) {
      try {
        totalCountSum = await trackingSummaryAggregate.sum(ctx, {
          namespace: salonId,
          bounds: {
            lower: { key: startDate, inclusive: true },
            upper: { key: endDate, inclusive: true },
          },
        })
      } catch (error) {
        console.error(`Error fetching totalCountSum for salon ${salonId}:`, error)
      }
    }

    // 日付ごとの集計
    const byDate: { [date: string]: number } = {}
    if (startDate && endDate) {
      const dates: string[] = []
      const currentDate = new Date(startDate)
      const lastDate = new Date(endDate)
      while (currentDate <= lastDate) {
        dates.push(currentDate.toISOString().split('T')[0])
        currentDate.setDate(currentDate.getDate() + 1)
      }

      const dateResults = await Promise.all(
        dates.map(async (dateStr) => {
          try {
            const dateBounds = {
              lower: { key: [dateStr, ''] as [string, string], inclusive: true },
              upper: { key: [dateStr, '\uffff'] as [string, string], inclusive: true },
            }
            const count = await trackingByDateAggregate.sum(ctx, {
              namespace: salonId,
              bounds: dateBounds,
            })
            return { dateStr, count }
          } catch (error) {
            console.error(`Error fetching byDate for ${dateStr}, salon ${salonId}:`, error)
            return { dateStr, count: 0 } // Default on error
          }
        })
      )
      dateResults.forEach(({ dateStr, count }) => {
        byDate[dateStr] = count
      })
    }

    // イベントタイプごとの集計
    const byEventType: { [type: string]: number } = {}
    if (args.eventType) {
      try {
        const eventTypeBounds = {
          prefix: ['', args.eventType] as [string, string],
        }
        byEventType[args.eventType] = await trackingByDateAggregate.sum(ctx, {
          namespace: salonId,
          bounds: eventTypeBounds,
        })
      } catch (error) {
        console.error(`Error fetching byEventType for ${args.eventType}, salon ${salonId}:`, error)
        byEventType[args.eventType] = 0
      }
    } else {
      const eventTypes = ['page_view', 'conversion']
      const eventTypeResults = await Promise.all(
        eventTypes.map(async (eventType) => {
          try {
            const eventTypeBounds = {
              prefix: ['', eventType] as [string, string],
            }
            const count = await trackingByDateAggregate.sum(ctx, {
              namespace: salonId,
              bounds: eventTypeBounds,
            })
            return { eventType, count }
          } catch (error) {
            console.error(`Error fetching byEventType for ${eventType}, salon ${salonId}:`, error)
            return { eventType, count: 0 }
          }
        })
      )
      eventTypeResults.forEach(({ eventType, count }) => {
        byEventType[eventType] = count
      })
    }

    // コードごとの集計
    const byCode: { [cd: string]: number } = {}
    if (args.code) {
      try {
        const codeBounds = {
          prefix: [args.code, ''] as [string, string],
        }
        byCode[args.code] = await trackingByCodeAggregate.sum(ctx, {
          namespace: salonId,
          bounds: codeBounds,
        })
      } catch (error) {
        console.error(`Error fetching byCode for ${args.code}, salon ${salonId}:`, error)
        byCode[args.code] = 0
      }
    } else {
      const codeResults = await Promise.all(
        TRACKING_CODE_VALUES.map(async (code) => {
          try {
            const codeBounds = {
              prefix: [code, ''] as [string, string],
            }
            const count = await trackingByCodeAggregate.sum(ctx, {
              namespace: salonId,
              bounds: codeBounds,
            })
            return { code, count }
          } catch (error) {
            console.error(`Error fetching byCode for ${code}, salon ${salonId}:`, error)
            return { code, count: 0 }
          }
        })
      )
      codeResults.forEach(({ code, count }) => {
        byCode[code] = count
      })
    }

    // 元のクエリも実行して詳細データを取得（必要に応じて）
    const tableQuery = ctx.db.query('tracking_summaries')
    let indexedQuery // Declare without initial assignment to tableQuery

    if (args.date) {
      indexedQuery = tableQuery.withIndex(
        'by_salon_date',
        (q) => q.eq('salonId', args.salonId).eq('date', args.date!) // Use non-null assertion for args.date
      )
    } else if (args.yearMonth) {
      // startDate and endDate are defined from args.yearMonth in this block
      indexedQuery = tableQuery.withIndex('by_salon_date', (q) =>
        q.eq('salonId', args.salonId).gte('date', startDate).lte('date', endDate)
      )
    } else {
      // This branch ensures indexedQuery is always assigned if no date/yearMonth is provided.
      indexedQuery = tableQuery.withIndex('by_salon_date', (q) => q.eq('salonId', args.salonId))
    }

    return {
      totalCountSum,
      byDate,
      byEventType,
      byCode,
    }
  },
})

// 指定した期間内の、コード、イベントタイプごとの集計
export const getTotalByDateCodeEventType = query({
  args: {
    salonId: v.id('salon'),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(), // YYYY-MM-DD
    code: trackingCodeType,
    eventType: trackingEventType,
  },
  handler: async (ctx, args) => {
    const { salonId, startDate, endDate, code, eventType } = args
    let totalCount = 0

    // 日付の配列を生成
    const dates: string[] = []
    let currentDate = new Date(startDate)
    const lastDate = new Date(endDate)
    while (currentDate <= lastDate) {
      dates.push(currentDate.toISOString().split('T')[0])
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // 各日付について集計処理を並列実行
    const dailyCounts = await Promise.all(
      dates.map(async (dateStr) => {
        try {
          // 特定の日付、コード、イベントタイプに完全に一致するキーで集計
          const count = await trackingByDateCodeEventTypeAggregate.sum(ctx, {
            namespace: salonId,
            bounds: {
              // 精密な検索のために lower と upper を同じ値に設定
              lower: { key: [dateStr, code, eventType], inclusive: true },
              upper: { key: [dateStr, code, eventType], inclusive: true },
            },
          })
          return count
        } catch (error) {
          console.error(
            `Error fetching total for date ${dateStr}, code ${code}, eventType ${eventType}, salon ${salonId}:`,
            error
          )
          return 0 // エラー時は0を返す
        }
      })
    )

    // 日ごとのカウントを合計
    totalCount = dailyCounts.reduce((sum, count) => sum + count, 0)

    return totalCount
  },
})
