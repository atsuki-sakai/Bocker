'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { DynamicLiffProviderWithSuspense } from '@/components/providers/DynamicLiffProvider'
import type { NextFontWithVariable } from 'next/dist/compiled/@next/font'
import { getCookie } from '@/lib/utils'
import { Id } from '@/convex/_generated/dataModel'
import { LINE_LOGIN_SESSION_KEY } from '@/services/line/constants'
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
  const [salonId, setSalonId] = useState<Id<'salon'> | null>(null)
  const pathname = usePathname()
  const [errors, setErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  useEffect(() => {
    async function initSalon() {
      setIsLoading(true)
      // パスからサロンIDを取得し、Convex で存在チェック
      if (pathname && pathname.startsWith('/reservation/')) {
        const pathParts = pathname.split('/')
        const pathSalonId = pathParts[2] // /reservation/:salonId
        console.log('pathSalonId', pathSalonId)
        if (pathSalonId) {
          try {
            console.log('pathSalonId', pathSalonId)
            const existSalon = await fetchQuery(api.salon.core.query.get, {
              id: pathSalonId as Id<'salon'>,
            })
            console.log('existSalon', existSalon)
            if (existSalon) {
              setSalonId(pathSalonId as Id<'salon'>)
              return
            }
            setErrors((prev) => [
              ...prev,
              '指定されたサロンが存在しません。URLが間違っているか、サロンが削除されている可能性があります。',
            ])
          } catch (error) {
            console.error('サロンの取得に失敗しました', error)
            setErrors((prev) => [
              ...prev,
              `サロンの取得に失敗しました。URLが間違っているか、サロンが削除されている可能性があります。`,
            ])
          }
        }
      } else {
        setErrors((prev) => [
          ...prev,
          'URLが間違っているか、サロンが削除されている可能性があります。',
        ])
        // セッションクッキーの取得を試みる
        try {
          const sessionCookie = getCookie(LINE_LOGIN_SESSION_KEY)
          console.log('sessionCookie', sessionCookie)
          if (sessionCookie) {
            const sessionData = JSON.parse(sessionCookie)
            if (sessionData?.salonId) {
              const existSalon = await fetchQuery(api.salon.core.query.get, {
                id: sessionData.salonId as Id<'salon'>,
              })
              if (existSalon) {
                setSalonId(sessionData.salonId)
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
  }, [pathname])

  if (isLoading && !salonId) {
    return <Loading />
  }
  if (!salonId) {
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
    <DynamicLiffProviderWithSuspense salonId={salonId}>
      <div className={`${fontVariables.map((font) => font.className).join(' ')} antialiased`}>
        {children}
      </div>
    </DynamicLiffProviderWithSuspense>
  )
}
