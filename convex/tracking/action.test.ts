import { convexTest } from 'convex-test'
import { expect, test, vi } from 'vitest'
import { internal } from '../_generated/api'
import { subDays, startOfDay, endOfDay } from 'date-fns'

vi.mock('@/services/supabase/repositories/tracking/TrackingEventRepository')
vi.mock('@/services/supabase/repositories/tracking/TrackingSummariesRepository')

test('aggregateDailyTrackingData should process events and save summaries', async () => {
  const t = convexTest()

  const yesterday = subDays(new Date(), 1)
  const fromUnix = Math.floor(startOfDay(yesterday).getTime() / 1000)

  const mockEvents = [
    // Campaign 1: Google Ads
    {
      tenant_id: 'tenant1',
      org_id: 'org1',
      session_id: 'session1',
      event_timestamp_unix: fromUnix,
      event_type: 'page_view',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'black_friday',
    },
    {
      tenant_id: 'tenant1',
      org_id: 'org1',
      session_id: 'session1',
      event_timestamp_unix: fromUnix + 10,
      event_type: 'conversion',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'black_friday',
    },
    // Campaign 2: Facebook
    {
      tenant_id: 'tenant1',
      org_id: 'org1',
      session_id: 'session2',
      event_timestamp_unix: fromUnix + 20,
      event_type: 'page_view',
      utm_source: 'facebook',
      utm_medium: 'social',
      utm_campaign: 'summer_sale',
    },
    // Direct traffic
    {
      tenant_id: 'tenant1',
      org_id: 'org1',
      session_id: 'session3',
      event_timestamp_unix: fromUnix + 30,
      event_type: 'page_view',
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
    },
    // Another event for session1 to test unique count
    {
      tenant_id: 'tenant1',
      org_id: 'org1',
      session_id: 'session1',
      event_timestamp_unix: fromUnix + 5,
      event_type: 'click',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'black_friday',
    },
  ]

  // Mock the repository methods
  const {
    TrackingEventRepository,
  } = await import('@/services/supabase/repositories/tracking/TrackingEventRepository')
  const {
    TrackingSummariesRepository,
  } = await import('@/services/supabase/repositories/tracking/TrackingSummariesRepository')

  const listMock = vi.fn().mockResolvedValue({ data: mockEvents })
  const bulkUpsertMock = vi.fn().mockResolvedValue([])

  TrackingEventRepository.prototype.list = listMock
  TrackingSummariesRepository.prototype.bulkUpsertSummaries = bulkUpsertMock

  // Run the action
  await t.action(internal.tracking.action.aggregateDailyTrackingData, {})

  // Assertions
  expect(listMock).toHaveBeenCalledOnce()
  expect(bulkUpsertMock).toHaveBeenCalledOnce()

  const savedSummaries = bulkUpsertMock.mock.calls[0][0]
  expect(savedSummaries).toHaveLength(5) // google, cpc, black_friday, facebook, social, summer_sale -> 5 because summer_sale is missing from fb event

  // Check Google Source
  const googleSourceSummary = savedSummaries.find(
    (s: any) => s.dimension_type === 'utm_source' && s.dimension_value === 'google'
  )
  expect(googleSourceSummary.total_count).toBe(3)
  expect(googleSourceSummary.unique_user_count).toBe(1)
  expect(googleSourceSummary.conversion_count).toBe(1)

  // Check Facebook Source
  const facebookSourceSummary = savedSummaries.find(
    (s: any) => s.dimension_type === 'utm_source' && s.dimension_value === 'facebook'
  )
  expect(facebookSourceSummary.total_count).toBe(1)
  expect(facebookSourceSummary.unique_user_count).toBe(1)
  expect(facebookSourceSummary.conversion_count).toBe(0)

  // Check CPC Medium
  const cpcMediumSummary = savedSummaries.find(
    (s: any) => s.dimension_type === 'utm_medium' && s.dimension_value === 'cpc'
  )
  expect(cpcMediumSummary.total_count).toBe(3)
  expect(cpcMediumSummary.unique_user_count).toBe(1)
  expect(cpcMediumSummary.conversion_count).toBe(1)

  // Check Black Friday Campaign
  const blackFridayCampaign = savedSummaries.find(
    (s: any) => s.dimension_type === 'utm_campaign' && s.dimension_value === 'black_friday'
  )
  expect(blackFridayCampaign.total_count).toBe(3)
  expect(blackFridayCampaign.unique_user_count).toBe(1)
  expect(blackFridayCampaign.conversion_count).toBe(1)
})
