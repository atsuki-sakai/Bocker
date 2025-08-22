'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { subDays, format } from 'date-fns'
import { withOwnerAccess } from '@/components/common'
import { DashboardSection } from '@/components/common'
import { AnalyticsFilters, type FilterOptions } from '@/components/analytics'
import { useTenantAndOrganization } from '@/hooks/useTenantAndOrganization'
import { TrackingSummariesRepository } from '@/services/supabase/repositories/tracking'
import { Users, Link as LinkIcon, Megaphone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

// --- Types ---
interface AcquisitionData {
  name: string
  visitors: number
  conversions: number
  conversion_rate: number
}

// --- Initial State ---
const getInitialFilters = (tenantId: string, orgId: string): FilterOptions => {
  const now = new Date()
  const from = subDays(now, 29)
  const to = subDays(now, 1)
  return { dateRange: { from, to }, tenantId, orgId }
}

// --- Page Component ---
function AcquisitionAnalyticsPage() {
  const { tenantId, orgId } = useTenantAndOrganization()
  const [filters, setFilters] = useState<FilterOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sourceData, setSourceData] = useState<AcquisitionData[]>([])
  const [mediumData, setMediumData] = useState<AcquisitionData[]>([])
  const [campaignData, setCampaignData] = useState<AcquisitionData[]>([])

  const repository = useMemo(() => {
    if (!tenantId || !orgId) return null
    return new TrackingSummariesRepository()
  }, [tenantId, orgId])

  useEffect(() => {
    if (tenantId && orgId && !filters) {
      setFilters(getInitialFilters(tenantId, orgId))
    }
  }, [tenantId, orgId, filters])

  const fetchData = useCallback(async () => {
    if (!repository || !filters) return

    setLoading(true)
    setError(null)
    try {
      const fromDate = format(filters.dateRange.from!, 'yyyy-MM-dd')
      const toDate = format(filters.dateRange.to!, 'yyyy-MM-dd')

      const [sources, mediums, campaigns] = await Promise.all([
        repository.getTopSources(tenantId!, orgId!, fromDate, toDate),
        repository.getTopMediums(tenantId!, orgId!, fromDate, toDate),
        repository.getTopCampaigns(tenantId!, orgId!, fromDate, toDate),
      ])

      setSourceData(
        sources.map((s) => ({
          name: s.source || '(direct)',
          visitors: s.unique_users,
          conversions: s.conversions,
          conversion_rate: s.conversion_rate,
        }))
      )
      setMediumData(
        mediums.map((m) => ({
          name: m.medium || '(none)',
          visitors: m.unique_users,
          conversions: m.conversions,
          conversion_rate: m.conversion_rate,
        }))
      )
      setCampaignData(
        campaigns.map((c) => ({
          name: c.campaign || '(not set)',
          visitors: c.unique_users,
          conversions: c.conversions,
          conversion_rate: c.conversion_rate,
        }))
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'データの取得に失敗しました'
      setError(message)
      console.error('Acquisition data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [repository, filters, tenantId, orgId])

  useEffect(() => {
    if (filters && repository) {
      fetchData()
    }
  }, [filters, repository, fetchData])

  const renderSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-1/4" />
      <div className="border rounded-lg p-4">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )

  const renderTable = (data: AcquisitionData[], title: string, icon: React.ReactNode) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          {icon}
          <span className="ml-2">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>参照元</TableHead>
              <TableHead className="text-right">訪問者数</TableHead>
              <TableHead className="text-right">コンバージョン</TableHead>
              <TableHead className="text-right">コンバージョン率</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  データがありません
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.name}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{item.visitors.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{item.conversions.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{item.conversion_rate.toFixed(2)}%</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )

  return (
    <DashboardSection title="流入経路分析" backLink="/dashboard/analytics" backLinkTitle="分析">
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <AnalyticsFilters
          filters={filters || getInitialFilters(tenantId!, orgId!)}
          onFiltersChange={setFilters}
          loading={loading}
          showStaffFilter={false}
          showMenuFilter={false}
        />
        {loading ? (
          renderSkeleton()
        ) : (
          <Tabs defaultValue="source" className="space-y-4">
            <TabsList>
              <TabsTrigger value="source">
                <LinkIcon className="mr-2 h-4 w-4" />
                ソース別
              </TabsTrigger>
              <TabsTrigger value="medium">
                <Users className="mr-2 h-4 w-4" />
                メディア別
              </TabsTrigger>
              <TabsTrigger value="campaign">
                <Megaphone className="mr-2 h-4 w-4" />
                キャンペーン別
              </TabsTrigger>
            </TabsList>
            <TabsContent value="source">
              {renderTable(sourceData, '参照元 (UTM Source)', <LinkIcon className="h-5 w-5" />)}
            </TabsContent>
            <TabsContent value="medium">
              {renderTable(mediumData, 'メディア (UTM Medium)', <Users className="h-5 w-5" />)}
            </TabsContent>
            <TabsContent value="campaign">
              {renderTable(
                campaignData,
                'キャンペーン (UTM Campaign)',
                <Megaphone className="h-5 w-5" />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardSection>
  )
}

export default withOwnerAccess(AcquisitionAnalyticsPage)
