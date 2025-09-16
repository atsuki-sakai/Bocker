'use client'

import React, { memo, useCallback, useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronRight, Loader2, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLineAuth } from '@/hooks/useLineAuth'
import { toast } from 'sonner'
import { Id } from '@/convex/_generated/dataModel'

// LIFF SDK types extension for window object
declare global {
  interface Window {
    liff?: {
      isLoggedIn?: () => boolean
      logout?: () => void
    }
  }
}

// LINEログイン成功時のレスポンス型 (updated for new auth system)
interface LineLoginSuccessData {
  customerUid?: string
  success: boolean
  message?: string
  line_user_id?: string
  line_name?: string
}

interface OptimizedLineLoginButtonProps {
  tenantId: Id<'tenant'>
  orgId: Id<'organization'>
  isCustomerLogin?: boolean
  onSuccess?: (data: LineLoginSuccessData) => void
  className?: string
  children?: React.ReactNode
  scope?: string
  autoRefresh?: boolean
}

const CLICK_TIMEOUT = 10000 // 10秒のタイムアウト

export const OptimizedLineLoginButton = memo(function OptimizedLineLoginButton({
  tenantId,
  orgId,
  isCustomerLogin = false,
  onSuccess,
  className = '',
  children,
  scope = 'profile openid',
  autoRefresh = true,
}: OptimizedLineLoginButtonProps) {
  const [isClicked, setIsClicked] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  // LINE OAuth 2.1 認証フック
  const {
    authState,
    tokenState,
    isAuthenticated,
    isLoading,
    isRefreshing,
    needsRefresh,
    login,
    logout: lineLogout,
    error: authError,
  } = useLineAuth({
    tenantId,
    orgId,
    isCustomerLogin,
    scope,
    autoRefresh,
    onAuthSuccess: async (data) => {
      console.log('[OptimizedLineLoginButton] Authentication successful:', data)
      setIsClicked(false)
      setRetryCount(0)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      try {
        // Create customer session from LINE authentication
        console.log('[OptimizedLineLoginButton] Creating LINE session...')

        const sessionResponse = await fetch('/api/auth/line-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            tenantId,
            orgId,
          }),
        })

        if (!sessionResponse.ok) {
          const errorData = await sessionResponse.json().catch(() => ({}))
          console.error('[OptimizedLineLoginButton] Session creation failed:', errorData)
          toast.error(errorData.details || 'セッション作成に失敗しました。')
          return
        }

        const sessionData = await sessionResponse.json()
        console.log('[OptimizedLineLoginButton] Session created successfully:', {
          ...sessionData,
          sessionResponse: {
            status: sessionResponse.status,
            ok: sessionResponse.ok,
            headers: Object.fromEntries(sessionResponse.headers.entries()),
          },
        })

        // Wait for cookie propagation and browser sync (increased wait time)
        console.log('[OptimizedLineLoginButton] Waiting for cookie propagation...')
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Verify session was actually created by checking the session endpoint
        console.log('[OptimizedLineLoginButton] Verifying session creation...')
        const verifyResponse = await fetch(
          `/api/auth/session?tenantId=${tenantId}&orgId=${orgId}`,
          {
            credentials: 'include',
          }
        )

        let verificationData = null
        if (verifyResponse.ok) {
          try {
            verificationData = await verifyResponse.json()
          } catch (e) {
            console.warn('[OptimizedLineLoginButton] Failed to parse verification response:', e)
          }
        }

        console.log('[OptimizedLineLoginButton] Session verification:', {
          status: verifyResponse.status,
          ok: verifyResponse.ok,
          hasSession: verifyResponse.ok,
          sessionData: verificationData
            ? {
                hasCustomerUid: !!verificationData.session?.customerUid,
                tenantMatches: verificationData.session?.tenantId === tenantId,
                orgMatches: verificationData.session?.orgId === orgId,
              }
            : null,
        })

        // Don't fail if verification fails - the session might still work
        if (!verifyResponse.ok) {
          console.warn(
            '[OptimizedLineLoginButton] Session verification failed, but continuing with login...'
          )
        }

        // Show success message
        toast.success('LINEログインが完了しました')

        // Call original success callback with session data
        if (onSuccess) {
          onSuccess({
            success: true,
            customerUid: sessionData.customerUid,
            message: sessionData.message,
            line_user_id: data.line_user_id,
            line_name: data.line_name,
          })
        }
      } catch (error) {
        console.error('[OptimizedLineLoginButton] Session creation error:', error)
        toast.error('セッション作成中にエラーが発生しました。')
      }
    },
    onAuthError: (error) => {
      console.error('[OptimizedLineLoginButton] Authentication error:', error)
      setIsClicked(false)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      // エラーは useLineAuth 側で処理済み。必要ならここで独自ハンドリングを追加
    },
    onTokenRefreshed: () => {
      console.log('[OptimizedLineLoginButton] Token refreshed successfully')
    },
  })

  // セッション作成処理を関数として分離
  const handleSessionCreation = useCallback(async () => {
    if (!tenantId || !orgId) {
      console.warn('[OptimizedLineLoginButton] Missing tenantId or orgId for session creation')
      return
    }

    try {
      console.log('[OptimizedLineLoginButton] Creating LINE session...')

      const sessionResponse = await fetch('/api/auth/line-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          orgId,
        }),
      })

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json().catch(() => ({}))
        console.error('[OptimizedLineLoginButton] Session creation failed:', errorData)
        toast.error(errorData.details || 'セッション作成に失敗しました。')
        return
      }

      const sessionData = await sessionResponse.json()
      console.log('[OptimizedLineLoginButton] Session created successfully:', {
        ...sessionData,
        sessionResponse: {
          status: sessionResponse.status,
          ok: sessionResponse.ok,
        },
      })

      // Wait for cookie propagation (increased wait time)
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Show success message
      toast.success('LINEログインが完了しました')

      // Call success callback
      if (onSuccess) {
        onSuccess({
          success: true,
          customerUid: sessionData.customerUid,
          message: sessionData.message,
        })
      }
    } catch (error) {
      console.error('[OptimizedLineLoginButton] Session creation error:', error)
      toast.error('セッション作成中にエラーが発生しました。')
    }
  }, [tenantId, orgId, onSuccess])

  // LIFFログアウト状態の確認と同期
  useEffect(() => {
    const checkLiffLogoutState = () => {
      // LIFF環境でのログアウト状態確認
      if (typeof window !== 'undefined' && window.liff) {
        try {
          const isLiffLoggedIn = window.liff.isLoggedIn && window.liff.isLoggedIn()

          // LIFFからログアウトされているが、コンポーネントはまだ認証済みの場合
          if (!isLiffLoggedIn && isAuthenticated && authState === 'authenticated') {
            console.log(
              '[OptimizedLineLoginButton] LIFF logout detected, clearing authentication state...'
            )

            // useLineAuthのlogout methodで状態をクリア
            lineLogout()
              .then(() => {
                console.log(
                  '[OptimizedLineLoginButton] Authentication state cleared after LIFF logout'
                )

                // コンポーネントの状態をリセット
                setIsClicked(false)
                setRetryCount(0)
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current)
                  timeoutRef.current = null
                }
              })
              .catch((error) => {
                console.error('[OptimizedLineLoginButton] Failed to clear auth state:', error)
              })

            // LIFFログアウトが検出された場合は、自動セッション作成をしない
            return
          }

          // LIFFログイン状態とコンポーネント認証状態が一致している場合のみ自動セッション作成
          if (
            isLiffLoggedIn &&
            isAuthenticated &&
            !isLoading &&
            !isClicked &&
            authState === 'authenticated' &&
            tokenState === 'valid'
          ) {
            // セッションクッキーが既に存在するかチェック
            const hasSession = document.cookie.includes('bocker_login_session=')

            if (!hasSession) {
              console.log(
                '[OptimizedLineLoginButton] Auto-detecting successful LINE authentication, creating session...'
              )
              // 自動セッション作成を実行
              handleSessionCreation()
            }
          }
        } catch (error) {
          console.warn('[OptimizedLineLoginButton] LIFF state check failed:', error)
        }
      }
    }

    checkLiffLogoutState()

    // 定期的にLIFFログアウト状態をチェック（5秒間隔）
    const interval = setInterval(checkLiffLogoutState, 5000)

    return () => clearInterval(interval)
  }, [
    isAuthenticated,
    isLoading,
    isClicked,
    authState,
    tokenState,
    lineLogout,
    handleSessionCreation,
  ])

  // コンポーネントマウント時の設定とクリーンアップ
  useEffect(() => {
    // アンマウント時のクリーンアップ
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleClick = useCallback(async () => {
    console.log('[OptimizedLineLoginButton] Click initiated', {
      isClicked,
      authState,
      tokenState,
      isLoading,
      isRefreshing,
      tenantId,
      orgId,
      retryCount,
    })

    // 二重クリック防止
    if (isClicked || isLoading || isRefreshing) {
      console.log('[OptimizedLineLoginButton] Click blocked - already processing')
      return
    }

    // 認証システムが読み込み中またはエラー状態の場合
    if (authState === 'loading') {
      const remainingTime = Math.max(10 - retryCount * 2, 3) // 最低3秒待機
      toast.info(`認証システムを読み込み中です。${remainingTime}秒後にもう一度お試しください。`)

      // 自動リトライ機能
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount((prev) => prev + 1)
          handleClick()
        }, remainingTime * 1000)
      }
      return
    }

    // エラー状態の場合、エラータイプに応じた処理
    if (authState === 'error' && authError) {
      console.log('[OptimizedLineLoginButton] Handling error state:', {
        errorMessage: authError.message,
        retryCount,
      })

      // 特定のエラーに対する自動リトライ
      if (authError.message.includes('expired') && retryCount < 2) {
        toast.info('認証がタイムアウトしました。自動的にリトライします...')
        setTimeout(() => {
          setRetryCount((prev) => prev + 1)
          // Simply retry - the hook will handle state management
          handleClick()
        }, 2000)
        return
      }

      // その他のエラーの場合は手動リトライを促す
      if (retryCount === 0) {
        setRetryCount(1) // Mark as attempted
        toast.error('認証でエラーが発生しました。もう一度お試しください。')
      }
    }

    // テナントIDと組織IDのバリデーション
    if (!tenantId || !orgId) {
      toast.error('システムエラー：組織情報が不正です')
      return
    }

    // 既に認証済みの場合
    console.log('[OptimizedLineLoginButton] isAuthenticated:', isAuthenticated)
    if (isAuthenticated) {
      toast.info('既にログイン済みです')
      router.push(`/reservation/${orgId}/calendar`) // Redirect to home or dashboard
      return
    }

    setIsClicked(true)

    // タイムアウト設定
    timeoutRef.current = setTimeout(() => {
      console.warn('[OptimizedLineLoginButton] Click timeout reached')
      setIsClicked(false)
      toast.error('認証処理がタイムアウトしました。もう一度お試しください。')
    }, CLICK_TIMEOUT)

    try {
      console.log('[OptimizedLineLoginButton] Starting LINE OAuth 2.1 authentication...')
      await login()
    } catch (error) {
      console.error('[OptimizedLineLoginButton] Login initiation failed:', error)
      toast.error('ログイン処理で予期しないエラーが発生しました')
      setIsClicked(false)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [
    tenantId,
    orgId,
    login,
    isClicked,
    authState,
    tokenState,
    isLoading,
    isRefreshing,
    isAuthenticated,
    retryCount,
    router,
    authError,
  ])

  const isDisabled =
    isLoading || isRefreshing || isClicked || !tenantId || !orgId || authState === 'error'

  // デバッグ情報を表示（開発環境のみ）
  if (process.env.NODE_ENV === 'development') {
    console.log('[OptimizedLineLoginButton] Render state:', {
      authState,
      tokenState,
      isLoading,
      isRefreshing,
      isClicked,
      isDisabled,
      isAuthenticated,
      needsRefresh,
      hasOrgId: !!orgId,
      hasTenantId: !!tenantId,
      retryCount,
      error: authError?.message,
    })

    console.log(isAuthenticated ? 'User is authenticated' : 'User is not authenticated')
  }

  return (
    <Button
      className={`px-8 py-5 w-full ${className}`}
      onClick={handleClick}
      disabled={isDisabled}
      aria-label="LINEでログイン"
      aria-busy={isLoading || isRefreshing}
    >
      <div className="flex items-center justify-center space-x-2">
        {isRefreshing ? (
          <>
            <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span className="font-bold text-base">トークン更新中...</span>
          </>
        ) : isLoading || authState === 'loading' ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span className="font-bold text-base">読み込み中...</span>
          </>
        ) : isClicked ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span className="font-bold text-base">認証開始中...</span>
          </>
        ) : authState === 'error' ? (
          <>
            <span className="font-bold text-base text-red-600">
              {process.env.NODE_ENV === 'development' && authError
                ? `認証エラー: ${authError.message.substring(0, 30)}...`
                : '認証エラー'}
            </span>
            {retryCount > 0 && <span className="text-xs text-red-500">({retryCount}回目)</span>}
          </>
        ) : isAuthenticated ? (
          <>
            <span className="font-bold text-base text-green-600">ログイン済み</span>
            {needsRefresh && <RefreshCw className="h-4 w-4 text-orange-500" aria-hidden="true" />}
          </>
        ) : (
          <>
            <span className="font-bold text-base">{children || 'LINEでログイン'}</span>
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
            {retryCount > 0 && process.env.NODE_ENV === 'development' && (
              <span className="text-xs">({retryCount})</span>
            )}
          </>
        )}
      </div>
    </Button>
  )
})

// エラーバウンダリー付きバージョン
export function LineLoginButtonWithErrorBoundary(props: OptimizedLineLoginButtonProps) {
  return (
    <ErrorBoundary fallback={<LineLoginFallback />}>
      <OptimizedLineLoginButton {...props} />
    </ErrorBoundary>
  )
}

// エラー時のフォールバック
function LineLoginFallback() {
  return (
    <Button className="px-8 py-5 w-full" disabled>
      <span className="text-muted-foreground">LINEログインが利用できません</span>
    </Button>
  )
}

// 簡易エラーバウンダリー
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[LineLoginButton] Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}
