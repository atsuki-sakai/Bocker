'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useLiff } from '@/hooks/useLiff'
import { toast } from 'sonner'
import { Loading } from '@/components/common'

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

  // クライアントサイドでのみ実行
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // クライアントサイド以外または既に処理済みの場合は実行しない
    if (!isClient || hasProcessedRef.current) return

    async function handleLineCallback() {
      // 処理中またはLIFF未初期化の場合は実行しない
      if (isProcessingCallback || liffIsLoading || !liff) return

      // 処理開始をマーク（無限ループ防止）
      hasProcessedRef.current = true
      setIsProcessingCallback(true)

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
        // ステップ1: state検証
        console.log('[AuthCallback] Step 1: Validating state...')
        const stateResponse = await fetch(`/api/auth/line-state?stateId=${state}`, {
          method: 'GET',
          credentials: 'include',
        })

        if (!stateResponse.ok) {
          const stateError = await stateResponse.json()
          console.error('[AuthCallback] State validation failed:', stateError)
          throw new Error(`状態検証に失敗しました: ${stateError.error || 'Unknown error'}`)
        }

        const stateData = await stateResponse.json()
        console.log('[AuthCallback] State data:', stateData)

        // ステップ2: LINEログイン状態確認
        console.log('[AuthCallback] Step 2: Checking LINE login status...')
        if (!liff.isLoggedIn()) {
          console.log('[AuthCallback] Not logged in to LINE, initiating login')
          liff.login({
            redirectUri: window.location.href,
          })
          return
        }

        // ステップ3: LINE IDトークンを取得（必要に応じて再取得）
        console.log('[AuthCallback] Step 3: Getting LINE ID token...')
        let idToken: string | null = null
        let attempts = 0
        const maxAttempts = 2

        while (attempts < maxAttempts && !idToken) {
          attempts++
          try {
            if (attempts > 1) {
              console.log(`[AuthCallback] Retrying ID token acquisition (attempt ${attempts})...`)
              // 少し待ってから再試行
              await new Promise((resolve) => setTimeout(resolve, 500))
            }

            idToken = liff.getIDToken()
            console.log(
              `[AuthCallback] ID token obtained successfully on attempt ${attempts}, length:`,
              idToken?.length
            )

            // IDトークンの期限をクライアント側でも確認
            if (idToken) {
              try {
                const payload = JSON.parse(atob(idToken.split('.')[1]))
                const now = Math.floor(Date.now() / 1000)
                const exp = payload.exp
                console.log(
                  `[AuthCallback] ID token expiry check - now: ${now}, exp: ${exp}, valid: ${exp > now}`
                )

                if (exp <= now) {
                  console.warn(
                    `[AuthCallback] ID token is expired on client side (exp: ${exp}, now: ${now}, diff: ${now - exp}s)`
                  )

                  // 期限切れでも一度サーバー側で検証を試行（サーバー側でハンドリング）
                  console.log(
                    '[AuthCallback] Token expired on client, but proceeding to server validation...'
                  )
                  break // while ループを抜けてサーバー検証に進む
                }
              } catch (e) {
                console.warn('[AuthCallback] Failed to decode ID token on client:', e)
              }
            }
          } catch (e) {
            console.error(`[AuthCallback] Error getting ID token on attempt ${attempts}:`, e)
            if (attempts >= maxAttempts) {
              throw new Error('LINE認証情報の取得に失敗しました')
            }
          }
        }

        if (!idToken) {
          throw new Error('LINE認証情報の取得に失敗しました')
        }

        // ステップ4: トークン検証とセッション作成
        console.log('[AuthCallback] Step 4: Verifying token and creating session...')
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

        console.log('[AuthCallback] Verify response status:', verifyResponse.status)

        const verifyData = await verifyResponse.json()
        console.log('[AuthCallback] Verify response data:', verifyData)

        if (!verifyResponse.ok) {
          console.error('[AuthCallback] Token verification failed:', verifyData)

          // トークン期限切れの場合は特別処理
          if (verifyData.error === 'token_expired' || verifyData.details?.shouldReload) {
            console.log(
              '[AuthCallback] Token expired on server, reloading page for fresh authentication...'
            )
            // 少し待ってからページ再読み込み
            setTimeout(() => {
              window.location.reload()
            }, 1000)
            return
          }

          throw new Error(verifyData.message || verifyData.error || 'LINE認証に失敗しました')
        }

        console.log(
          '[AuthCallback] Verification successful, redirecting based on type:',
          redirectType
        )

        // ステップ5: redirect_type に基づいてリダイレクト
        if (redirectType === 'customer') {
          // 顧客用: セッションから customerUid を取得してプロフィールページへ
          console.log('[AuthCallback] Step 5a: Getting customer session...')
          const sessionResponse = await fetch('/api/auth/session', {
            method: 'GET',
            credentials: 'include',
          })

          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json()
            console.log('[AuthCallback] Session data:', sessionData)
            if (sessionData.session && sessionData.session.customerUid) {
              const profileUrl = `/${locale}/customer/${stateData.orgId}/${sessionData.session.customerUid}/profile`
              console.log('[AuthCallback] Redirecting to customer profile:', profileUrl)
              router.push(profileUrl)
            } else {
              throw new Error('セッション情報の取得に失敗しました')
            }
          } else {
            const sessionError = await sessionResponse.json()
            console.error('[AuthCallback] Session check failed:', sessionError)
            throw new Error('セッションの確認に失敗しました')
          }
        } else if (redirectType === 'reservation') {
          // 予約用: カレンダーページへ
          console.log('[AuthCallback] Step 5b: Redirecting to reservation calendar...')
          const calendarUrl = `/${locale}/reservation/${stateData.orgId}/calendar`
          console.log('[AuthCallback] Redirecting to reservation calendar:', calendarUrl)
          router.push(calendarUrl)
        } else {
          throw new Error('不正なリダイレクトタイプです')
        }

        toast.success('LINEログインに成功しました')
      } catch (error) {
        console.error('[AuthCallback] Error in handleLineCallback:', error)
        // エラーの詳細をログに出力
        if (error instanceof Error) {
          console.error('[AuthCallback] Error message:', error.message)
          console.error('[AuthCallback] Error stack:', error.stack)
        }
        setError(error instanceof Error ? error.message : '認証処理中にエラーが発生しました')
        setIsProcessingCallback(false)
        // エラー時もhasProcessedRefをリセットしない（再実行を防ぐため）
      }
    }

    handleLineCallback()
  }, [router, locale, searchParams, liff, liffIsLoggedIn, liffIsLoading, isClient])

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