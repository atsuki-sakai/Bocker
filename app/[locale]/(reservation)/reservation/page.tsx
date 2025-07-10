'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { useLineAuthHandler } from '@/hooks/useLineAuthHandler'
import { api } from '@/convex/_generated/api'
import { fetchQuery } from 'convex/nextjs'
import { Card, CardContent } from '@/components/ui/card'
import { Processing } from '@/components/common/Processing'
import { Button } from '@/components/ui/button'
import { Id } from '@/convex/_generated/dataModel'
import { Loading } from '@/components/common'

export default function ReserveRedirectPage() {
  const router = useRouter()
  const locale = useLocale()
  const { showErrorToast } = useErrorHandler()
  const [orgId, setOrgId] = useState<Id<'organization'> | null>(null)
  const [tenantId, setTenantId] = useState<Id<'tenant'> | null>(null)

  const {
    handleLineAuth,
    isProcessing: isProcessingLineCallback,
    error: lineCallbackError,
  } = useLineAuthHandler({
    onSuccess: async () => {
      if (orgId) {
        router.push(`/${locale}/reservation/${orgId}/calendar`)
      }
    },
  })

  // Handle LINE callback detection (similar to customer login page)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const hasLineCallback = urlParams.get('liffRedirectUri') || urlParams.get('state')

    if (hasLineCallback && orgId && tenantId && !isProcessingLineCallback) {
      handleLineAuth(tenantId, orgId, false) // false for reservation login
    }
  }, [orgId, tenantId, handleLineAuth, isProcessingLineCallback])

  // Get organization info from state or URL
  useEffect(() => {
    async function getOrgInfo() {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const state = urlParams.get('state')

        // Get state information
        const stateEndpoint = state
          ? `/api/auth/line-state?stateId=${state}`
          : '/api/auth/line-state?skipValidation=true'

        const stateResponse = await fetch(stateEndpoint, {
          method: 'GET',
          credentials: 'include',
        })

        if (stateResponse.ok) {
          const stateData = await stateResponse.json()
          if (stateData?.orgId && stateData?.tenantId) {
            setOrgId(stateData.orgId)
            setTenantId(stateData.tenantId)
            return
          }
        }

        // Fallback: try to get from URL path
        const pathParts = window.location.pathname.split('/').filter(Boolean)
        const reservationIndex = pathParts.indexOf('reservation')
        const pathOrgId =
          reservationIndex !== -1 && pathParts.length > reservationIndex + 1
            ? pathParts[reservationIndex + 1]
            : undefined

        if (pathOrgId) {
          const existOrg = await fetchQuery(api.organization.query.findByOrgId, {
            org_id: pathOrgId as Id<'organization'>,
          })
          if (existOrg) {
            setOrgId(pathOrgId as Id<'organization'>)
            setTenantId(existOrg.tenant_id)
          }
        }
      } catch (error) {
        console.error('[ReserveRedirectPage] Error getting organization info:', error)
        showErrorToast(error)
      }
    }

    getOrgInfo()
  }, [showErrorToast])

  if (!orgId || !tenantId || isProcessingLineCallback) {
    return <Loading />
  }

  // Show error state for LINE callback errors
  if (lineCallbackError) {
    return (
      <div className="w-full mx-auto bg-background min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-destructive/20 bg-card/90 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center space-y-6 py-8">
            {/* エラーアイコン */}
            <div className="relative">
              <div className="w-16 h-16 bg-destructive rounded-full flex items-center justify-center">
                <div className="w-8 h-8 bg-destructive rounded-full flex items-center justify-center">
                  <div className="w-1 h-4 bg-destructive-foreground rounded-full"></div>
                  <div className="w-1 h-1 bg-destructive-foreground rounded-full mt-1 ml-0.5"></div>
                </div>
              </div>
              <div className="absolute inset-0 animate-ping opacity-25">
                <div className="w-16 h-16 bg-destructive rounded-full"></div>
              </div>
            </div>

            <div className="text-center space-y-3">
              <p className="text-lg font-semibold text-destructive">エラーが発生しました</p>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                {lineCallbackError.message}
              </p>
            </div>

            <Button
              variant="outline"
              className="min-w-[120px] transition-all duration-200 hover:scale-105"
              onClick={() => {
                // Clear URL parameters
                const newUrl = window.location.pathname
                window.history.replaceState({}, '', newUrl)
              }}
            >
              予約画面に戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <Processing />
}
