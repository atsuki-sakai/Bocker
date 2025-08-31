'use client'

import React, { memo, useCallback, useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronRight, Loader2, RefreshCw } from 'lucide-react'
import { useLineAuth } from '@/hooks/useLineAuth'
import { toast } from 'sonner'
import { Id } from '@/convex/_generated/dataModel'

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

  // LINE OAuth 2.1 authentication hook
  const {
    authState,
    tokenState,
    isAuthenticated,
    isLoading,
    isRefreshing,
    needsRefresh,
    login,
    error: authError
  } = useLineAuth({
    tenantId,
    orgId,
    isCustomerLogin,
    scope,
    autoRefresh,
    onAuthSuccess: (data) => {
      console.log('[OptimizedLineLoginButton] Authentication successful:', data)
      setIsClicked(false)
      setRetryCount(0)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (onSuccess) {
        onSuccess({
          success: true,
          customerUid: data.customerUid,
          message: data.message,
          line_user_id: data.line_user_id,
          line_name: data.line_name,
        })
      }
    },
    onAuthError: (error) => {
      console.error('[OptimizedLineLoginButton] Authentication error:', error)
      setIsClicked(false)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      // Error is handled by useLineAuth hook, but we can add custom handling here if needed
    },
    onTokenRefreshed: () => {
      console.log('[OptimizedLineLoginButton] Token refreshed successfully')
    },
  })

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

    // 認証システムが読み込み中の場合
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

    // テナントIDと組織IDのバリデーション
    if (!tenantId || !orgId) {
      toast.error('システムエラー：組織情報が不正です')
      return
    }

    // 既に認証済みの場合
    if (isAuthenticated) {
      toast.info('既にログイン済みです')
      console.log('[OptimizedLineLoginButton] Already authenticated')
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
    isCustomerLogin,
    login,
    isClicked,
    authState,
    tokenState,
    isLoading,
    isRefreshing,
    isAuthenticated,
    retryCount,
  ])

  const isDisabled = isLoading || isRefreshing || isClicked || !tenantId || !orgId || authState === 'error'
  
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
            <span className="font-bold text-base text-red-600">認証エラー</span>
          </>
        ) : isAuthenticated ? (
          <>
            <span className="font-bold text-base text-green-600">ログイン済み</span>
            {needsRefresh && (
              <RefreshCw className="h-4 w-4 text-orange-500" aria-hidden="true" />
            )}
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
