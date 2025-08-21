import { createClient } from '@supabase/supabase-js'
import { getOrganizationAuth } from '@/lib/auth/getOrganizationAuth'
import { NextRequest, NextResponse } from 'next/server'
import { getEnv } from '@/lib/env-config'



interface DailyData {
  date: string
  events: number
  sessions: number
  conversions: number
}

interface DimensionData {
  value: string
  events: number
  sessions: number
  conversions: number
}

export async function GET(request: NextRequest) {
  try {
    const { orgId, tenantId } = await getOrganizationAuth()
    
    if (!orgId || !tenantId) {
      return NextResponse.json(
        { error: 'Organization or tenant ID is missing' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]
    const dimensionType = searchParams.get('dimensionType') || 'utm_source'

    const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL')!, getEnv('SUPABASE_SERVICE_ROLE_KEY')!)

    // tracking_summariesテーブルからデータを取得
    const { data: summaries, error: summariesError } = await supabase
      .from('tracking_summaries')
      .select('summary_date, total_count, unique_user_count, conversion_count, dimension_value')
      .eq('tenant_id', tenantId)
      .eq('org_id', orgId)
      .eq('dimension_type', dimensionType)
      .gte('summary_date', startDate)
      .lte('summary_date', endDate)
      .order('summary_date', { ascending: false })

    if (summariesError) {
      console.error('Error fetching tracking summaries:', summariesError)
      return NextResponse.json(
        { error: 'Failed to fetch tracking summaries' },
        { status: 500 }
      )
    }

    // 統計データの計算
    const totalEvents = summaries?.reduce((sum, item) => sum + (item.total_count || 0), 0) || 0
    const totalSessions = summaries?.reduce((sum, item) => sum + (item.unique_user_count || 0), 0) || 0
    const totalConversions = summaries?.reduce((sum, item) => sum + (item.conversion_count || 0), 0) || 0
    const conversionRate = totalEvents > 0 ? (totalConversions / totalEvents * 100) : 0

    // 日別データの集計
    const dailyStats = summaries?.reduce((acc, item) => {
      const date = item.summary_date
      if (!acc[date]) {
        acc[date] = {
          date,
          events: 0,
          sessions: 0,
          conversions: 0
        }
      }
      acc[date].events += item.total_count || 0
      acc[date].sessions += item.unique_user_count || 0
      acc[date].conversions += item.conversion_count || 0
      return acc
    }, {} as Record<string, DailyData>)

    const dailyData = Object.values(dailyStats || {}).sort((a: DailyData, b: DailyData) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // dimension_value別の集計
    const dimensionStats = summaries?.reduce((acc, item) => {
      const value = item.dimension_value || '(unknown)'
      if (!acc[value]) {
        acc[value] = {
          value,
          events: 0,
          sessions: 0,
          conversions: 0
        }
      }
      acc[value].events += item.total_count || 0
      acc[value].sessions += item.unique_user_count || 0
      acc[value].conversions += item.conversion_count || 0
      return acc
    }, {} as Record<string, DimensionData>)

    const dimensionData = Object.values(dimensionStats || {})
      .sort((a: DimensionData, b: DimensionData) => b.events - a.events)
      .slice(0, 10) // トップ10のみ

    return NextResponse.json({
      summary: {
        totalEvents,
        totalSessions,
        totalConversions,
        conversionRate: Number(conversionRate.toFixed(2))
      },
      dailyData,
      dimensionData,
      rawData: summaries || []
    })

  } catch (error) {
    console.error('Error in tracking summaries API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}