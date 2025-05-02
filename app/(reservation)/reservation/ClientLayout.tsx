'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { DynamicLiffProviderWithSuspense } from '@/components/providers/DynamicLiffProvider'
import type { NextFontWithVariable } from 'next/dist/compiled/@next/font'
import { Loading } from '@/components/common'
import { getCookie } from '@/lib/utils'
import { Id } from '@/convex/_generated/dataModel'
import { LINE_LOGIN_SESSION_KEY } from '@/services/line/constants'

interface ClientLayoutProps {
  children: React.ReactNode
  fontVariables: NextFontWithVariable[]
}

export function ClientLayout({ children, fontVariables }: ClientLayoutProps) {
  const [salonId, setSalonId] = useState<string>('')
  const pathname = usePathname()

  useEffect(() => {
    // パスからサロンIDを取得
    if (pathname && pathname.startsWith('/reservation/')) {
      // 修正: /reservation/ 以降のパスから最初のセグメントだけを取得
      const pathParts = pathname.replace('/reservation/', '').split('/')
      const pathSalonId = pathParts[0]

      if (pathSalonId && pathSalonId !== '') {
        setSalonId(pathSalonId)
        return
      }
    }

    // セッションクッキーの取得を試みる
    try {
      const sessionCookie = getCookie(LINE_LOGIN_SESSION_KEY)
      console.log('sessionCookie', sessionCookie)
      console.log('セッションクッキーの状態:', sessionCookie ? '取得成功' : '取得失敗')

      if (sessionCookie) {
        const sessionData = JSON.parse(sessionCookie)
        if (sessionData && sessionData.salonId) {
          setSalonId(sessionData.salonId)
        } else {
          console.warn('セッションにsalonIdが含まれていません')
        }
      } else {
        console.warn('セッションクッキーが見つかりませんでした')
      }
    } catch (error) {
      console.error('セッション処理中にエラーが発生しました:', error)
    }
  }, [pathname])

  if (!salonId) {
    return <Loading />
  }
  return (
    <DynamicLiffProviderWithSuspense salonId={salonId as Id<'salon'>}>
      <div className={`${fontVariables.map((font) => font.className).join(' ')} antialiased`}>
        {children}
      </div>
    </DynamicLiffProviderWithSuspense>
  )
}
