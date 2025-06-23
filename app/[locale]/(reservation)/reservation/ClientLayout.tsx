'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { DynamicLiffProviderWithSuspense } from '@/components/providers/DynamicLiffProvider'
import type { NextFontWithVariable } from 'next/dist/compiled/@next/font'
import { getCookie } from '@/lib/utils'
import { Id } from '@/convex/_generated/dataModel'
import { LOGIN_SESSION_KEY } from '@/services/line/constants'
import { Loading } from '@/components/common'
import { api } from '@/convex/_generated/api'
import { fetchQuery } from 'convex/nextjs'
import { motion } from 'framer-motion'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
interface ClientLayoutProps {
  children: React.ReactNode
  fontVariables: NextFontWithVariable[]
}

export function ClientLayout({ children, fontVariables }: ClientLayoutProps) {
  const [tenantId, setTenantId] = useState<Id<'tenant'> | null>(null)
  const [orgId, setOrgId] = useState<Id<'organization'> | null>(null)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [errors, setErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  useEffect(() => {
    async function initSalon() {
      setIsLoading(true)
      console.log('pathname', pathname)
      console.log('searchParams', searchParams)
      const stateId = searchParams.get('state')
      console.log('stateId', stateId)
      // パスから店舗IDを取得し、Convex で存在チェック
      if (pathname && pathname.includes('/reservation/')) {
        // 認証コールバックページの場合は特別処理
        if (pathname.includes('/reservation/auth/callback')) {
          console.log('[ClientLayout] Auth callback page detected, extracting orgId from searchParams')
          const oid = searchParams.get('oid')
          if (oid) {
            try {
              const existOrg = await fetchQuery(api.organization.query.findByOrgId, {
                org_id: oid as Id<'organization'>,
              })
              if (existOrg) {
                setOrgId(oid as Id<'organization'>)
                setTenantId(existOrg.tenant_id)
                setIsLoading(false)
                return
              }
            } catch (error) {
              console.error('店舗の取得に失敗しました', error)
              setErrors((prev) => [
                ...prev,
                `店舗の取得に失敗しました。URLが間違っているか、店舗が削除されている可能性があります。`,
              ])
            }
          }
          setIsLoading(false)
          return
        }
        
        // クエリパラメータを除去してパス部分のみ取得
        const cleanPath = pathname.split('?')[0]
        // パスをスラッシュで分割
        const pathParts = cleanPath.split('/').filter(Boolean)
        // パスフォーマット: 1. /<locale>/reservation/:orgId/... 2. /reservation/:orgId/...
        const reservationIndex = pathParts.indexOf('reservation')
        const pathOrgId =
          reservationIndex !== -1 && pathParts.length > reservationIndex + 1
            ? pathParts[reservationIndex + 1]
            : undefined
        if (pathOrgId) {
          try {
            console.log('pathOrgId', pathOrgId)
            const existOrg = await fetchQuery(api.organization.query.findByOrgId, {
              org_id: pathOrgId as Id<'organization'>,
            })
            console.log('existOrg', existOrg)
            if (existOrg) {
              setOrgId(pathOrgId as Id<'organization'>)
              setTenantId(existOrg.tenant_id)
              return
            }
            setErrors((prev) => [
              ...prev,
              '指定された店舗が存在しません。URLが間違っているか、店舗が削除されている可能性があります。',
            ])
          } catch (error) {
            console.error('店舗の取得に失敗しました', error)
            setErrors((prev) => [
              ...prev,
              `店舗の取得に失敗しました。URLが間違っているか、店舗が削除されている可能性があります。`,
            ])
          }
        }
      } else if (pathname && pathname.endsWith('/reservation')) {
        // LINE認証のコールバックページの場合は、組織IDなしでも許可
        console.log('[ClientLayout] LINE OAuth callback page detected, allowing without orgId')

        const sessionCookie = await fetch(
          `/api/auth/line-state?stateId=${stateId}&skipValidation=true`,
          {
            method: 'GET',
            credentials: 'include',
          }
        )
        const sessionData = await sessionCookie.json()
        console.log('sessionData', sessionData)
        if (sessionData?.orgId) {
          setOrgId(sessionData.orgId)
          setTenantId(sessionData.tenantId)
        }

        setIsLoading(false)
        setErrors([])

        return
      } else {
        setErrors((prev) => [
          ...prev,
          'URLが間違っているか、店舗が削除されている可能性があります。',
        ])
        // セッションクッキーの取得を試みる
        try {
          const sessionCookie = getCookie(LOGIN_SESSION_KEY)
          console.log('sessionCookie', sessionCookie)
          if (sessionCookie) {
            const sessionData = JSON.parse(sessionCookie)
            if (sessionData?.orgId) {
              const existOrg = await fetchQuery(api.organization.query.findByOrgId, {
                org_id: sessionData.orgId as Id<'organization'>,
              })
              if (existOrg) {
                setOrgId(sessionData.orgId)
                setTenantId(existOrg.tenant_id)
                return
              }
            }
          }
        } catch (error) {
          console.error('セッション復帰処理中にエラーが発生しました', error)
          setErrors((prev) => [...prev, `セッション復帰処理中にエラーが発生しました`])
        }
      }
      setIsLoading(false)
    }
    initSalon()
  }, [pathname, searchParams])

  // LINE認証コールバックページの場合は、組織IDなしでも子コンポーネントをレンダリング
  const isOAuthCallback = pathname && (pathname.endsWith('/reservation') || pathname.includes('/reservation/auth/callback'))

  if (isLoading && !orgId && !tenantId && !isOAuthCallback) {
    return <Loading />
  }
  if (!orgId || !tenantId) {
    // LINE認証コールバックページの場合は、子コンポーネントに処理を委譲
    if (isOAuthCallback) {
      return <>{children}</>
    }
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-background backdrop-blur-sm flex items-center justify-center p-4"
      >
        <Alert variant="destructive" className="max-w-md w-full space-y-4 bg-background">
          <AlertTitle className="text-2xl font-bold text-destructive">
            エラーが発生しました
          </AlertTitle>
          <AlertDescription>
            <ul className="list-none list-inside space-y-1 text-destructive">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </AlertDescription>
          <div className="flex justify-end space-x-2 text-sm">
            <Button variant="outline" onClick={() => window.location.reload()}>
              再読み込み
            </Button>
            <Button
              onClick={() => {
                router.back()
              }}
            >
              戻る
            </Button>
          </div>
        </Alert>
      </motion.div>
    )
  }
  return (
    <DynamicLiffProviderWithSuspense tenantId={tenantId} orgId={orgId}>
      <div className={`${fontVariables.map((font) => font.className).join(' ')} antialiased`}>
        {children}
      </div>
    </DynamicLiffProviderWithSuspense>
  )
}
