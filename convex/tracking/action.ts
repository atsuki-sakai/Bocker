import { action } from '../_generated/server'
import { TrackingEventRepository } from '@/services/supabase/repositories/tracking/TrackingEventRepository'
import { TrackingSummariesRepository } from '@/services/supabase/repositories/tracking/TrackingSummariesRepository'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

type SummaryKey = string
interface SummaryData {
  tenant_id: string
  org_id: string
  summary_date: string
  dimension_type: 'utm_source' | 'utm_medium' | 'utm_campaign'
  dimension_value: string
  total_count: number
  unique_sessions: Set<string>
  conversion_count: number
}

export const aggregateDailyTrackingData = action({
  handler: async () => {
    console.log('[TrackingAction] Starting daily tracking data aggregation.')
    const eventRepo = new TrackingEventRepository()
    const summaryRepo = new TrackingSummariesRepository()

    // 1. Define the time range for yesterday
    const yesterday = subDays(new Date(), 1)
    const startDate = startOfDay(yesterday)
    const endDate = endOfDay(yesterday)
    const summaryDate = format(startDate, 'yyyy-MM-dd')
    const fromUnix = Math.floor(startDate.getTime() / 1000)
    const toUnix = Math.floor(endDate.getTime() / 1000)

    console.log(
      `[TrackingAction] Aggregating data for ${summaryDate} (UTC), from ${fromUnix} to ${toUnix}`
    )

    // 2. Fetch all events for the period (assuming this won't exceed memory limits for a daily run)
    // We fetch all tenants and orgs at once.
    // Note: For very large scale, this should be batched per tenant.
    const { data: events } = await eventRepo.list({
      rangeFilter: { column: 'event_timestamp_unix', from: fromUnix, to: toUnix },
      pageSize: 100000, // High limit to get all daily events
    })

    if (events.length === 0) {
      console.log('[TrackingAction] No events found for the period. Exiting.')
      return
    }
    console.log(`[TrackingAction] Found ${events.length} events to process.`)

    // 3. Aggregate data in memory
    const summaries = new Map<SummaryKey, SummaryData>()
    const dimensions: ('utm_source' | 'utm_medium' | 'utm_campaign')[] = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
    ]

    for (const event of events) {
      if (!event.tenant_id || !event.org_id) continue

      for (const dimension of dimensions) {
        const value = event[dimension]
        if (value) {
          const key: SummaryKey = `${event.tenant_id}:${event.org_id}:${dimension}:${value}`
          if (!summaries.has(key)) {
            summaries.set(key, {
              tenant_id: event.tenant_id,
              org_id: event.org_id,
              summary_date: summaryDate,
              dimension_type: dimension,
              dimension_value: value,
              total_count: 0,
              unique_sessions: new Set(),
              conversion_count: 0,
            })
          }

          const summary = summaries.get(key)!
          summary.total_count += 1
          if (event.session_id) {
            summary.unique_sessions.add(event.session_id)
          }
          if (event.event_type === 'conversion') {
            summary.conversion_count += 1
          }
        }
      }
    }

    // 4. Prepare data for insertion
    const summaryList = Array.from(summaries.values()).map((s) => ({
      tenant_id: s.tenant_id,
      org_id: s.org_id,
      summary_date: s.summary_date,
      dimension_type: s.dimension_type,
      dimension_value: s.dimension_value,
      total_count: s.total_count,
      unique_user_count: s.unique_sessions.size,
      conversion_count: s.conversion_count,
    }))

    if (summaryList.length === 0) {
      console.log('[TrackingAction] No summaries to save. Exiting.')
      return
    }

    // 5. Bulk insert summaries
    console.log(`[TrackingAction] Saving ${summaryList.length} summaries.`)
    try {
      await summaryRepo.bulkUpsertSummaries(summaryList)
      console.log('[TrackingAction] Successfully saved summaries.')
    } catch (error) {
      console.error('[TrackingAction] Error saving summaries:', error)
      // Depending on the error, you might want to throw to trigger Convex's retry mechanism
      throw error
    }
  },
})
