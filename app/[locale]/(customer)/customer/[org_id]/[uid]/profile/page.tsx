'use client'

import React, { useEffect, useState, use } from 'react'
import { useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { SessionPayload } from '@/lib/types'

interface ProfilePageProps {
  params: Promise<{
    org_id: string
    uid: string
  }>
}

export default function ProfilePage({ params }: ProfilePageProps) {
  // React.use() を使って params をアンラップ
  const { org_id, uid } = use(params)
  const router = useRouter()
  const { liff } = useLiff()
  const { showErrorToast } = useErrorHandler()
  const locale = useLocale()

  // セッションデータを保持するステート
  const [sessionData, setSessionData] = useState<SessionPayload | null>(null)

  const handleLogout = async () => {
    try {
      liff?.logout()
      await fetch('/api/auth/logout', { credentials: 'include' })
      router.push(`/${locale}/customer/${org_id}/auth/login`)
    } catch (error) {
      showErrorToast(error)
    }
  }

  // セッション情報を取得
  useEffect(() => {
    // API からセッション情報を取得
    fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) {
          console.log('[ProfilePage] Session not found, redirecting to login')
          router.push(`/${locale}/customer/${org_id}/auth/login`)
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (data && data.session) {
          setSessionData(data.session)
          console.log('[ProfilePage] Session data:', data.session)

          // セッション内のuidとURLのuidが一致するか確認
          if (data.session.customerUid !== uid) {
            console.warn('[ProfilePage] UID mismatch, redirecting to login')
            router.push(`/${locale}/customer/${org_id}/auth/login`)
          }
        }
      })
      .catch((error) => {
        console.error('[ProfilePage] Failed to fetch session:', error)
        router.push(`/${locale}/customer/${org_id}/auth/login`)
      })
  }, [org_id, uid, locale, router])

  // TODO: セッション情報を表示するなど、UI に反映させる
  return (
    <div>
      <h1>ProfilePage</h1>
      <p>UID: {uid}</p>
      {/* 取得したセッションデータをデバッグ表示 */}
      {sessionData && (
        <pre className="whitespace-pre-wrap break-words text-xs bg-muted p-2 rounded-md">
          {JSON.stringify(sessionData, null, 2)}
        </pre>
      )}
      <Button onClick={handleLogout}>ログアウト</Button>
    </div>
  )
}
