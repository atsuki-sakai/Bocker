'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { DynamicLiffProviderWithSuspense } from '@/components/providers/DynamicLiffProvider'
import type { NextFontWithVariable } from 'next/dist/compiled/@next/font'
import { Id } from '@/convex/_generated/dataModel'
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
  const [errors, setErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    async function initOrganization() {
      setIsLoading(true)
      console.log('[CustomerClientLayout] pathname:', pathname)

      // パスから組織IDを取得
      if (pathname && pathname.includes('/customer/')) {
        const cleanPath = pathname.split('?')[0]
        const pathParts = cleanPath.split('/').filter(Boolean)
        
        // パスフォーマット: [locale]/customer/:orgId/...
        const pathOrgId = pathParts[2]
        
        if (pathOrgId) {
          try {
            console.log('[CustomerClientLayout] pathOrgId:', pathOrgId)
            const existOrg = await fetchQuery(api.organization.query.findByOrgId, {
              org_id: pathOrgId as Id<'organization'>,
            })
            console.log('[CustomerClientLayout] existOrg:', existOrg)
            
            if (existOrg) {
              setOrgId(pathOrgId as Id<'organization'>)
              setTenantId(existOrg.tenant_id)
            } else {
              setErrors(['指定された組織が存在しません。URLが間違っているか、組織が削除されている可能性があります。'])
            }
          } catch (error) {
            console.error('[CustomerClientLayout] 組織の取得に失敗しました', error)
            setErrors(['組織の取得に失敗しました。URLが間違っているか、組織が削除されている可能性があります。'])
          }
        } else {
          setErrors(['URLが正しくありません。'])
        }
      }
      
      setIsLoading(false)
    }
    
    initOrganization()
  }, [pathname])

  if (isLoading) {
    return <Loading />
  }

  if (!orgId || !tenantId) {
    if (errors.length > 0) {
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
              <Button onClick={() => window.history.back()}>
                戻る
              </Button>
            </div>
          </Alert>
        </motion.div>
      )
    }
    return <Loading />
  }

  return (
    <DynamicLiffProviderWithSuspense tenantId={tenantId} orgId={orgId}>
      <div className={`${fontVariables.map((font) => font.className).join(' ')} antialiased`}>
        {children}
      </div>
    </DynamicLiffProviderWithSuspense>
  )
}