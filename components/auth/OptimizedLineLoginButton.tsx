'use client'

import React, { memo, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronRight, Loader2 } from 'lucide-react'
import { useLineAuthHandler } from '@/hooks/useLineAuthHandler'
import { toast } from 'sonner'
import { Id } from '@/convex/_generated/dataModel'

interface OptimizedLineLoginButtonProps {
  tenantId: Id<'tenant'>
  orgId: Id<'organization'>
  isCustomerLogin?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess?: (data: any) => void
  className?: string
  children?: React.ReactNode
}

export const OptimizedLineLoginButton = memo(function OptimizedLineLoginButton({
  tenantId,
  orgId,
  isCustomerLogin = false,
  onSuccess,
  className = '',
  children,
}: OptimizedLineLoginButtonProps) {
  const [isClicked, setIsClicked] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const { handleLineAuth, isProcessing, isLiffLoading } = useLineAuthHandler({
    onSuccess: (data) => {
      console.log('[OptimizedLineLoginButton] Login successful:', data)
      setIsClicked(false)
      setRetryCount(0) // 成功時にリトライカウントをリセット
      if (onSuccess) {
        onSuccess(data)
      }
    },
    onError: (error) => {
      console.error('[OptimizedLineLoginButton] Error:', error)
      setIsClicked(false)
      // エラーは useLineAuthHandler 内で処理される
    },
  })

  const handleClick = useCallback(async () => {
    console.log('[OptimizedLineLoginButton] Click initiated', {
      isClicked,
      isProcessing,
      isLiffLoading,
      tenantId,
      orgId,
      retryCount
    })

    // 二重クリック防止
    if (isClicked || isProcessing) {
      console.log('[OptimizedLineLoginButton] Click blocked - already processing')
      return
    }

    // LIFFが読み込み中の場合
    if (isLiffLoading) {
      const remainingTime = Math.max(10 - retryCount * 2, 3) // 最低3秒待機
      toast.info(`LINEログイン機能を読み込み中です。${remainingTime}秒後にもう一度お試しください。`)
      
      // 自動リトライ機能
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
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

    setIsClicked(true)

    try {
      console.log('[OptimizedLineLoginButton] Starting LINE auth...')
      await handleLineAuth(tenantId, orgId, isCustomerLogin)
    } catch (error) {
      console.error('[OptimizedLineLoginButton] Unexpected error:', error)
      // エラーはuseLineAuthHandler内で処理されるが、念のためフォールバック
      toast.error('ログイン処理で予期しないエラーが発生しました')
      setIsClicked(false)
    }
  }, [tenantId, orgId, isCustomerLogin, handleLineAuth, isClicked, isProcessing, isLiffLoading, retryCount])

  const isDisabled = isProcessing || isLiffLoading || isClicked || !tenantId || !orgId
  
  // デバッグ情報を表示（開発環境のみ）
  if (process.env.NODE_ENV === 'development') {
    console.log('[OptimizedLineLoginButton] Render state:', {
      isProcessing,
      isLiffLoading,
      isClicked,
      isDisabled,
      hasOrgId: !!orgId,
      hasTenantId: !!tenantId,
      retryCount
    })
  }

  return (
    <Button
      className={`px-8 py-5 w-full ${className}`}
      onClick={handleClick}
      disabled={isDisabled}
      aria-label="LINEでログイン"
      aria-busy={isProcessing}
    >
      <div className="flex items-center justify-center space-x-2">
        {isProcessing || isClicked ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span className="font-bold text-base">処理中...</span>
          </>
        ) : isLiffLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span className="font-bold text-base">読み込み中...</span>
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
