'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { useLineAuth } from '@/hooks/useLineAuth'
import { api } from '@/convex/_generated/api'
import { fetchQuery } from 'convex/nextjs'
import { Card, CardContent } from '@/components/ui/card'
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
    isLoading: isProcessingLineCallback,
    error: lineCallbackError,
  } = useLineAuth({
    tenantId: tenantId || undefined,
    orgId: orgId || undefined,
    isCustomerLogin: false,
    onAuthSuccess: async () => {
      if (orgId) {
        router.push(`/${locale}/reservation/${orgId}/calendar`)
      }
    },
  })

  // LINE authentication is now handled automatically by useLineAuth hook

  // Get organization info from URL path (removed dependency on deleted /api/auth/line-state)
  useEffect(() => {
    async function getOrgInfo() {
      try {
        // Get org_id from URL path directly (no longer using deleted line-state API)
        const pathParts = window.location.pathname.split('/').filter(Boolean)
        const reservationIndex = pathParts.indexOf('reservation')
        const pathOrgId =
          reservationIndex !== -1 && pathParts.length > reservationIndex + 1
            ? pathParts[reservationIndex + 1]
            : undefined

        if (pathOrgId && pathOrgId !== 'auth') {
          // Validate that this is a real organization ID
          const existOrg = await fetchQuery(api.organization.query.findByOrgId, {
            org_id: pathOrgId as Id<'organization'>,
          })
          if (existOrg) {
            setOrgId(pathOrgId as Id<'organization'>)
            setTenantId(existOrg.tenant_id)
            // 組織IDが取得できた場合、直接calendarページに遷移
            router.push(`/${locale}/reservation/${pathOrgId}/calendar`)
          } else {
            console.warn('[ReserveRedirectPage] Organization not found:', pathOrgId)
            showErrorToast('組織が見つかりません')
          }
        } else {
          // If no org_id in URL, redirect to a default org (the one with LINE config)
          const defaultOrgId = 'v5799kb53q14k5tyf4y0kj636d7jhz8p'
          const existOrg = await fetchQuery(api.organization.query.findByOrgId, {
            org_id: defaultOrgId as Id<'organization'>,
          })
          if (existOrg) {
            setOrgId(defaultOrgId as Id<'organization'>)
            setTenantId(existOrg.tenant_id)
            router.push(`/${locale}/reservation/${defaultOrgId}/calendar`)
          }
        }
      } catch (error) {
        console.error('[ReserveRedirectPage] Error getting organization info:', error)
        showErrorToast(error)
      }
    }

    getOrgInfo()
  }, [showErrorToast, router, locale])

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

  return <Loading />
}
