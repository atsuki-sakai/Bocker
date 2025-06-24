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
  const { handleLineAuth, isProcessing, isLiffLoading } = useLineAuthHandler({
    onSuccess: (data) => {
      setIsClicked(false)
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
    // 二重クリック防止
    if (isClicked || isProcessing) {
      return
    }

    // LIFFが読み込み中の場合
    if (isLiffLoading) {
      toast.info('LINEログイン機能を読み込み中です。もう一度お試しください。')
      return
    }

    setIsClicked(true)

    try {
      await handleLineAuth(tenantId, orgId, isCustomerLogin)
    } catch (error) {
      // エラーはuseLineAuthHandler内で処理される
      console.error('[OptimizedLineLoginButton] Error:', error)
      setIsClicked(false)
    }
  }, [tenantId, orgId, isCustomerLogin, handleLineAuth, isClicked, isProcessing, isLiffLoading])

  const isDisabled = isProcessing || isLiffLoading || isClicked || !tenantId || !orgId

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
