'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useLiff } from '@/hooks/useLiff'
import { toast } from 'sonner'
import { Loading } from '@/components/common'
import { batchAuthProcessing } from '@/lib/auth/batchProcessor'
import { prefetchCustomerData } from '@/lib/auth/sessionCache'

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
  // 一度だけ実行するためのref（無限ループ防止）
  const hasProcessedRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // クライアントサイドでのみ実行
  useEffect(() => {
    setIsClient(true)
  }, [])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // トークン検証の最適化版
  const verifyTokenOptimized = useCallback(
    async (
      idToken: string,
      tenantId: string,
      orgId: string,
      isCustomerLogin: boolean,
      controller: AbortController
    ) => {
      const maxRetries = 2
      let lastError = null

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch('/api/line/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken,
              tenantId,
              orgId,
              isCustomerLogin,
            }),
            signal: controller.signal,
          })

          const data = await response.json()

          if (response.ok) {
            return { success: true, data }
          }

          // トークン期限切れの場合、新しいトークンで再試行
          if (data.error === 'token_expired' && attempt < maxRetries && liff?.isLoggedIn()) {
            console.log(`[AuthCallback] Token expired, retrying (attempt ${attempt + 1})...`)
            await new Promise((resolve) => setTimeout(resolve, 500))
            const newIdToken = liff.getIDToken()
            if (newIdToken && newIdToken !== idToken) {
              idToken = newIdToken
              continue
            }
          }

          lastError = new Error(data.message || data.error || 'LINE認証に失敗しました')
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw error
          }
          lastError = error
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 500))
          }
        }
      }

      throw lastError || new Error('トークン検証に失敗しました')
    },
    [liff]
  )

  useEffect(() => {
    // クライアントサイド以外または既に処理済みの場合は実行しない
    if (!isClient || hasProcessedRef.current) return

    async function handleLineCallback() {
      // 処理中またはLIFF未初期化の場合は実行しない
      if (isProcessingCallback || liffIsLoading || !liff) return

      // 処理開始をマーク（無限ループ防止）
      hasProcessedRef.current = true
      setIsProcessingCallback(true)

      // AbortController作成
      const controller = new AbortController()
      abortControllerRef.current = controller

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
        setIsProcessingCallback(false)
        return
      }

      try {
        // バッチ処理で最適化: state検証とLIFFログイン状態確認を並列実行
        const authTasks = [
          {
            name: 'validateState',
            task: () =>
              fetch(`/api/auth/line-state?stateId=${state}`, {
                method: 'GET',
                credentials: 'include',
                signal: controller.signal,
              }).then((r) => {
                if (!r.ok) throw new Error('State validation failed')
                return r.json()
              }),
            priority: 3,
          },
          {
            name: 'checkLiff',
            task: async () => {
              if (!liff.isLoggedIn()) {
                throw new Error('Not logged in to LINE')
              }
              return Promise.resolve({ loggedIn: true })
            },
            priority: 2,
          },
        ]

        const results = await batchAuthProcessing(authTasks)
        const stateData = results.get('validateState')
        const liffStatus = results.get('checkLiff')

        if (!stateData) {
          throw new Error('状態検証に失敗しました')
        }

        console.log('[AuthCallback] State data:', stateData)

        // LINEにログインしていない場合
        if (!liffStatus?.loggedIn) {
          console.log('[AuthCallback] Not logged in to LINE, initiating login')
          liff.login({
            redirectUri: window.location.href,
          })
          return
        }

        // IDトークン取得
        let idToken: string | null = null
        try {
          idToken = liff.getIDToken()
          if (!idToken) {
            throw new Error('IDトークンが取得できませんでした')
          }
        } catch (e) {
          console.error('[AuthCallback] Error getting ID token:', e)
          throw new Error('LINE認証情報の取得に失敗しました')
        }

        // トークン検証（最適化版）
        const verifyResult = await verifyTokenOptimized(
          idToken,
          stateData.tenantId,
          stateData.orgId,
          redirectType === 'customer',
          controller
        )

        if (!verifyResult.success) {
          throw new Error('トークン検証に失敗しました')
        }

        console.log('[AuthCallback] Verification successful, preparing redirect...')

        // リダイレクト準備
        if (redirectType === 'customer') {
          // 顧客プロフィールへのリダイレクト用にデータをプリフェッチ
          const sessionTasks = [
            {
              name: 'getSession',
              task: () =>
                fetch('/api/auth/session', {
                  method: 'GET',
                  credentials: 'include',
                  signal: controller.signal,
                }).then((r) => r.json()),
              priority: 3,
            },
          ]

          const sessionResults = await batchAuthProcessing(sessionTasks)
          const sessionData = sessionResults.get('getSession')

          if (sessionData?.session?.customerUid) {
            // 顧客データをプリフェッチ（バックグラウンド）
            prefetchCustomerData(
              sessionData.session.customerUid,
              stateData.tenantId,
              stateData.orgId
            ).catch(console.warn) // エラーは無視

            const profileUrl = `/${locale}/customer/${stateData.orgId}/${sessionData.session.customerUid}/profile`
            console.log('[AuthCallback] Redirecting to customer profile:', profileUrl)
            router.push(profileUrl)
          } else {
            throw new Error('セッション情報の取得に失敗しました')
          }
        } else if (redirectType === 'reservation') {
          // 予約カレンダーへ
          const calendarUrl = `/${locale}/reservation/${stateData.orgId}/calendar`
          console.log('[AuthCallback] Redirecting to reservation calendar:', calendarUrl)
          router.push(calendarUrl)
        } else {
          throw new Error('不正なリダイレクトタイプです')
        }

        toast.success('LINEログインに成功しました')
      } catch (error) {
        console.error('[AuthCallback] Error in handleLineCallback:', error)

        if (error instanceof Error) {
          console.error('[AuthCallback] Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
          })

          // AbortErrorの場合は特別処理
          if (error.name === 'AbortError') {
            setError('処理がキャンセルされました')
          } else {
            setError(error.message)
          }
        } else {
          setError('認証処理中にエラーが発生しました')
        }

        setIsProcessingCallback(false)
      }
    }

    handleLineCallback()
  }, [
    router,
    locale,
    searchParams,
    liff,
    liffIsLoggedIn,
    liffIsLoading,
    isClient,
    isProcessingCallback,
    verifyTokenOptimized,
  ])

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

  return <Loading />
}