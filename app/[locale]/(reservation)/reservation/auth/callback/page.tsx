'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useLiff } from '@/hooks/useLiff'
import { toast } from 'sonner'
import { Loading } from '@/components/common'
import { isLineTokenValid } from '@/lib/auth/lineAuthCleanup'
import type { Liff } from '@line/liff'
import { Id } from '@/convex/_generated/dataModel'

// LINEログイン認証状態の型定義
interface AuthState {
  tenantId: Id<'tenant'>
  orgId: Id<'organization'>
  isCustomerLogin: boolean
}

// トークン検証APIのレスポンス型
interface TokenVerifyResponse {
  success: boolean
  customerUid?: string
  message?: string
  error?: string
}

// State検証APIのレスポンス型
interface StateValidationResponse {
  tenantId: Id<'tenant'>
  orgId: Id<'organization'>
  isCustomerLogin: boolean
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const locale = useLocale()
  const { liff, isLoggedIn: liffIsLoggedIn, isLoading: liffIsLoading } = useLiff()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const hasProcessedRef = useRef(false)

  // クライアントサイドでのみ実行
  useEffect(() => {
    setIsClient(true)
  }, [])

  // トークン検証処理
  const verifyToken = async (liff: Liff, authState: AuthState): Promise<TokenVerifyResponse> => {
    const idToken = liff.getIDToken()
    if (!idToken) {
      throw new Error('IDトークンが取得できませんでした')
    }

    // トークン有効性の事前チェック
    if (!(await isLineTokenValid(idToken))) {
      throw new Error('IDトークンの有効期限が切れています')
    }

    const response = await fetch('/api/line/verify-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken,
        tenantId: authState.tenantId,
        orgId: authState.orgId,
        isCustomerLogin: authState.isCustomerLogin,
      }),
    })

    const data: TokenVerifyResponse = await response.json()

    if (!response.ok) {
      throw new Error(data.error || data.message || 'トークン検証に失敗しました')
    }

    return data
  }

  // State検証処理
  const validateState = async (stateId: string): Promise<StateValidationResponse> => {
    const response = await fetch(`/api/auth/line-state?stateId=${stateId}`, {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('認証状態の検証に失敗しました')
    }

    return response.json()
  }

  // セッション取得処理
  const getSession = async () => {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
    })
    return response.json()
  }

  // LINEコールバック処理
  useEffect(() => {
    if (!isClient || hasProcessedRef.current) return

    async function handleLineCallback() {
      if (isProcessing || liffIsLoading || !liff) return

      hasProcessedRef.current = true
      setIsProcessing(true)

      try {
        // URLパラメータから情報を取得
        const state = searchParams.get('state')
        const redirectType = searchParams.get('redirect_type')

        console.log('[AuthCallback] Processing callback with params:', {
          state,
          redirectType,
          hasLiff: !!liff,
          isLoggedIn: liffIsLoggedIn,
        })

        // 必須パラメータの確認
        if (!state || !redirectType) {
          throw new Error('認証情報が不足しています')
        }

        // LINEログイン状態確認
        if (!liff.isLoggedIn()) {
          console.log('[AuthCallback] Not logged in to LINE, initiating login')
          liff.login({ redirectUri: window.location.href })
          return
        }

        // State検証
        const authState = await validateState(state)
        console.log('[AuthCallback] State validated:', authState)

        // トークン検証
        await verifyToken(liff, authState)
        console.log('[AuthCallback] Token verified successfully')

        // リダイレクト処理
        if (redirectType === 'customer') {
          const sessionData = await getSession()

          if (sessionData?.session?.customerUid) {
            const profileUrl = `/${locale}/customer/${authState.orgId}/${sessionData.session.customerUid}/profile`
            console.log('[AuthCallback] Redirecting to customer profile:', profileUrl)
            router.push(profileUrl)
          } else {
            throw new Error('セッション情報の取得に失敗しました')
          }
        } else if (redirectType === 'reservation') {
          const calendarUrl = `/${locale}/reservation/${authState.orgId}/calendar`
          console.log('[AuthCallback] Redirecting to reservation calendar:', calendarUrl)
          router.push(calendarUrl)
        } else {
          throw new Error('不正なリダイレクトタイプです')
        }

        toast.success('LINEログインに成功しました')
      } catch (error) {
        console.error('[AuthCallback] Error:', error)

        if (error instanceof Error) {
          setError(error.message)
        } else {
          setError('認証処理中にエラーが発生しました')
        }

        setIsProcessing(false)
      }
    }

    handleLineCallback()
  }, [router, locale, searchParams, liff, liffIsLoggedIn, liffIsLoading, isClient, isProcessing])

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