'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useLiff } from '@/hooks/useLiff'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

// LINEログイン共通コールバックページ
// redirect_type パラメータで顧客用と予約用を切り替え
export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const locale = useLocale()
  const { liff, isLoggedIn: liffIsLoggedIn, isLoading: liffIsLoading } = useLiff()
  const [isProcessingCallback, setIsProcessingCallback] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  // クライアントサイドでのみ実行
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    async function handleLineCallback() {
      if (isProcessingCallback || liffIsLoading || !liff) return

      // URLパラメータから情報を取得
      const liffRedirectUri = searchParams.get('liffRedirectUri')
      const state = searchParams.get('state')
      const redirectType = searchParams.get('redirect_type') // 'customer' or 'reservation'

      console.log('[AuthCallback] URL params:', {
        liffRedirectUri,
        state,
        redirectType,
        hasLiff: !!liff,
        isLoggedIn: liffIsLoggedIn,
      })

      // 必須パラメータの確認
      if (!state || !redirectType) {
        console.error('[AuthCallback] Missing required parameters')
        setError('認証情報が不足しています')
        return
      }

      setIsProcessingCallback(true)

      try {
        // state検証
        const stateResponse = await fetch(`/api/auth/line-state?stateId=${state}`, {
          method: 'GET',
          credentials: 'include',
        })

        if (!stateResponse.ok) {
          throw new Error('State validation failed')
        }

        const stateData = await stateResponse.json()
        console.log('[AuthCallback] State data:', stateData)

        // LINEにログインしていない場合はログイン画面へ
        if (!liff.isLoggedIn()) {
          console.log('[AuthCallback] Not logged in to LINE, initiating login')
          liff.login({
            redirectUri: window.location.href,
          })
          return
        }

        // LINE IDトークンを取得
        let idToken: string | null = null
        try {
          idToken = liff.getIDToken()
        } catch (e) {
          console.error('[AuthCallback] Error getting ID token:', e)
          throw new Error('LINE認証情報の取得に失敗しました')
        }

        if (!idToken) {
          throw new Error('LINE認証情報の取得に失敗しました')
        }

        // トークン検証とセッション作成
        const verifyResponse = await fetch('/api/line/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            tenantId: stateData.tenantId,
            orgId: stateData.orgId,
            isCustomerLogin: redirectType === 'customer',
          }),
        })

        const verifyData = await verifyResponse.json()

        if (!verifyResponse.ok) {
          throw new Error(verifyData.message || 'LINE認証に失敗しました')
        }

        console.log('[AuthCallback] Verification successful, redirecting based on type:', redirectType)

        // redirect_type に基づいてリダイレクト
        if (redirectType === 'customer') {
          // 顧客用: セッションから customerUid を取得してプロフィールページへ
          const sessionResponse = await fetch('/api/auth/session', {
            method: 'GET',
            credentials: 'include',
          })

          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json()
            if (sessionData.session && sessionData.session.customerUid) {
              const profileUrl = `/${locale}/customer/${stateData.orgId}/${sessionData.session.customerUid}/profile`
              console.log('[AuthCallback] Redirecting to customer profile:', profileUrl)
              router.push(profileUrl)
            } else {
              throw new Error('セッション情報の取得に失敗しました')
            }
          } else {
            throw new Error('セッションの確認に失敗しました')
          }
        } else if (redirectType === 'reservation') {
          // 予約用: カレンダーページへ
          const calendarUrl = `/${locale}/reservation/${stateData.orgId}/calendar`
          console.log('[AuthCallback] Redirecting to reservation calendar:', calendarUrl)
          router.push(calendarUrl)
        } else {
          throw new Error('不正なリダイレクトタイプです')
        }

        toast.success('LINEログインに成功しました')

      } catch (error) {
        console.error('[AuthCallback] Error:', error)
        setError(error instanceof Error ? error.message : '認証処理中にエラーが発生しました')
        setIsProcessingCallback(false)
      }
    }

    handleLineCallback()
  }, [router, locale, searchParams, liff, liffIsLoggedIn, liffIsLoading, isProcessingCallback, isClient])

  // サーバーサイドレンダリング時は何も表示しない
  if (!isClient) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-background rounded-lg shadow-lg p-6 max-w-md w-full">
          <h2 className="text-lg font-semibold text-destructive mb-2">エラーが発生しました</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null)
              window.history.back()
            }}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">認証処理中...</p>
      </div>
    </div>
  )
}