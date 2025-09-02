import { getOrganizationAuth } from '@/lib/auth/getOrganizationAuth'
import TrackingDashboard from '@/components/tracking/TrackingDashboard'
import { subDays, format } from 'date-fns'
import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { getEnv } from '@/lib/env-config'

export const revalidate = 21600 // 6時間

async function fetchTrackingSummaries({
  tenantId,
  orgId,
  startDate,
  endDate,
  dimensionType,
}: {
  tenantId: string
  orgId: string
  startDate: string
  endDate: string
  dimensionType: string
}) {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL')!, getEnv('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: summaries, error } = await supabase
    .from('tracking_summaries')
    .select('summary_date, total_count, unique_user_count, conversion_count, dimension_value')
    .eq('tenant_id', tenantId)
    .eq('org_id', orgId)
    .eq('dimension_type', dimensionType)
    .gte('summary_date', startDate)
    .lte('summary_date', endDate)
    .order('summary_date', { ascending: false })

  if (error) throw error

  const totalEvents = summaries?.reduce((sum, item) => sum + (item.total_count || 0), 0) || 0
  const totalSessions = summaries?.reduce((sum, item) => sum + (item.unique_user_count || 0), 0) || 0
  const totalConversions = summaries?.reduce((sum, item) => sum + (item.conversion_count || 0), 0) || 0
  const conversionRate = totalEvents > 0 ? (totalConversions / totalEvents) * 100 : 0

  const dailyStats = (summaries || []).reduce((acc, item) => {
    const date = item.summary_date as string
    if (!acc[date]) {
      acc[date] = { date, events: 0, sessions: 0, conversions: 0 }
    }
    acc[date].events += item.total_count || 0
    acc[date].sessions += item.unique_user_count || 0
    acc[date].conversions += item.conversion_count || 0
    return acc
  }, {} as Record<string, { date: string; events: number; sessions: number; conversions: number }>)

  const dailyData = Object.values(dailyStats).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const dimensionStats = (summaries || []).reduce((acc, item) => {
    const value = (item.dimension_value as string) || '(unknown)'
    if (!acc[value]) {
      acc[value] = { value, events: 0, sessions: 0, conversions: 0 }
    }
    acc[value].events += item.total_count || 0
    acc[value].sessions += item.unique_user_count || 0
    acc[value].conversions += item.conversion_count || 0
    return acc
  }, {} as Record<string, { value: string; events: number; sessions: number; conversions: number }>)

  const dimensionData = Object.values(dimensionStats).sort((a, b) => b.events - a.events)

  return {
    summary: {
      totalEvents,
      totalSessions,
      totalConversions,
      conversionRate: Number(conversionRate.toFixed(2)),
    },
    dailyData,
    dimensionData,
    rawData: summaries || [],
  }
}

async function getCachedTrackingSummaries(params: {
  tenantId: string
  orgId: string
  startDate: string
  endDate: string
  dimensionType: string
}) {
  // パラメータをキャッシュキーに含めて衝突を防ぐ
  const key = [
    'tracking-summaries',
    params.tenantId,
    params.orgId,
    params.startDate,
    params.endDate,
    params.dimensionType,
  ]

  const cached = unstable_cache(
    async () => fetchTrackingSummaries(params),
    key,
    { revalidate: 21600 }
  )
  return cached()
}

export default async function TrackingPage() {
  const { orgId, tenantId } = await getOrganizationAuth()
  if (!orgId || !tenantId) {
    return <div>Organization ID is missing.</div>
  }

  // デフォルト（過去30日）
  const from = subDays(new Date(), 30)
  const to = new Date()
  const startDate = format(from, 'yyyy-MM-dd')
  const endDate = format(to, 'yyyy-MM-dd')
  const dimensionType = 'utm_source'

  const initialData = await getCachedTrackingSummaries({
    tenantId,
    orgId,
    startDate,
    endDate,
    dimensionType,
  })

  return (
    <TrackingDashboard
      orgId={orgId}
      initialData={initialData}
      initialDimensionType={dimensionType}
      initialDateRange={{ from, to }}
    />
  )
}