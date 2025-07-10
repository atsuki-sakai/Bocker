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

// state 抽出ヘルパー（liff.state対応）
const extractStateId = (sp: URLSearchParams): string | null => {
  const direct = sp.get('state')
  if (direct) return direct
  const ls = sp.get('liff.state')
  if (ls) {
    try {
      return new URLSearchParams(ls.split('?')[1] ?? '').get('state')
    } catch {
      return null
    }
  }
  return null
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
  const validateState = async (
    stateId: string | null,
    skip = false
  ): Promise<StateValidationResponse> => {
    const url =
      skip || !stateId
        ? '/api/auth/line-state?skipValidation=true'
        : `/api/auth/line-state?stateId=${stateId}`

    const response = await fetch(url, {
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
        // URLパラメータからstateを取得
        const state = extractStateId(searchParams)

        console.log('[AuthCallback] Processing callback with params:', {
          state,
          hasLiff: !!liff,
          isLoggedIn: liffIsLoggedIn,
        })

        // State検証（stateが不足している場合はskipValidation=trueでフォールバック）
        console.log('[AuthCallback] State parameter:', state)
        if (!state) {
          console.warn('[AuthCallback] State parameter missing, will use skipValidation fallback')
        }

        // LINEログイン状態確認
        if (!liff.isLoggedIn()) {
          console.log('[AuthCallback] Not logged in to LINE, initiating login')
          liff.login({ redirectUri: window.location.href })
          return
        }

        // State検証（stateが不足している場合はskipValidation=trueを使用）
        const authState = await validateState(state, !state)
        console.log('[AuthCallback] State validated:', authState)

        if (!authState || !authState.tenantId || !authState.orgId) {
          throw new Error('認証状態の取得に失敗しました。再度ログインしてください。')
        }

        // トークン検証
        await verifyToken(liff, authState)
        console.log('[AuthCallback] Token verified successfully')

        // リダイレクト処理（stateから取得したisCustomerLoginを使用）
        if (authState.isCustomerLogin) {
          const sessionData = await getSession()

          if (sessionData?.session?.customerUid) {
            const profileUrl = `/${locale}/customer/${authState.orgId}/${sessionData.session.customerUid}/profile`
            console.log('[AuthCallback] Redirecting to customer profile:', profileUrl)
            router.push(profileUrl)
          } else {
            throw new Error('セッション情報の取得に失敗しました')
          }
        } else {
          const calendarUrl = `/${locale}/reservation/${authState.orgId}/calendar`
          console.log('[AuthCallback] Redirecting to reservation calendar:', calendarUrl)
          router.push(calendarUrl)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liff, liffIsLoading, isClient])

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