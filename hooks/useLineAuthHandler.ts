'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import { toast } from 'sonner'

interface UseLineAuthHandlerOptions {
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
  maxRetries?: number
  retryDelay?: number
}

export function useLineAuthHandler(options: UseLineAuthHandlerOptions = {}) {
  const { liff, isLoading: liffIsLoading } = useLiff()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { maxRetries = 2, retryDelay = 1000, onSuccess, onError } = options

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const verifyTokenWithRetry = async (
    idToken: string,
    tenantId: string,
    orgId: string,
    isCustomerLogin: boolean,
    attempt = 1
  ): Promise<Response> => {
    const controller = new AbortController()
    abortControllerRef.current = controller

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

      if (!response.ok && response.status === 401 && attempt < maxRetries) {
        const data = await response.json()
        
        // トークン期限切れの場合、新しいトークンを取得して再試行
        if (data.error === 'token_expired' && liff?.isLoggedIn()) {
          console.log(`[useLineAuthHandler] Token expired, retrying (attempt ${attempt + 1})...`)
          
          // 少し待機
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          
          // 新しいトークンを取得
          const newIdToken = liff.getIDToken()
          if (newIdToken) {
            return verifyTokenWithRetry(newIdToken, tenantId, orgId, isCustomerLogin, attempt + 1)
          }
        }
      }

      return response
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('認証処理がキャンセルされました')
      }
      throw error
    }
  }

  const handleLineAuth = async (
    tenantId: string,
    orgId: string,
    isCustomerLogin: boolean
  ) => {
    if (isProcessing || liffIsLoading || !liff) {
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // LINEログイン状態を確認
      if (!liff.isLoggedIn()) {
        // セキュアなstateを生成してログイン
        const stateResponse = await fetch('/api/auth/line-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            tenantId,
            orgId,
            isCustomerLogin,
          }),
        })

        if (!stateResponse.ok) {
          throw new Error('認証の準備に失敗しました')
        }

        const { stateId } = await stateResponse.json()
        
        // コールバックURLを構築
        const locale = window.location.pathname.split('/')[1] || 'ja'
        const callbackUrl = new URL(
          `/${locale}/reservation/auth/callback`,
          window.location.origin
        )
        
        callbackUrl.searchParams.set('redirect_type', isCustomerLogin ? 'customer' : 'reservation')
        callbackUrl.searchParams.set('state', stateId)
        callbackUrl.searchParams.set('tid', tenantId)
        callbackUrl.searchParams.set('oid', orgId)

        liff.login({ redirectUri: callbackUrl.toString() })
        return
      }

      // IDトークンを取得
      const idToken = liff.getIDToken()
      if (!idToken) {
        throw new Error('LINE認証情報の取得に失敗しました')
      }

      // トークン検証（リトライ付き）
      const response = await verifyTokenWithRetry(idToken, tenantId, orgId, isCustomerLogin)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'LINE認証に失敗しました')
      }

      toast.success('LINEログインに成功しました')
      
      if (onSuccess) {
        onSuccess(data)
      }

      // リダイレクト処理
      if (isCustomerLogin && data.customerUid) {
        const locale = window.location.pathname.split('/')[1] || 'ja'
        router.push(`/${locale}/customer/${orgId}/${data.customerUid}/profile`)
      }

    } catch (error) {
      console.error('[useLineAuthHandler] Error:', error)
      const err = error instanceof Error ? error : new Error('認証処理中にエラーが発生しました')
      setError(err)
      
      if (onError) {
        onError(err)
      } else {
        toast.error(err.message)
      }
    } finally {
      setIsProcessing(false)
      abortControllerRef.current = null
    }
  }

  return {
    handleLineAuth,
    isProcessing,
    error,
    isLiffLoading: liffIsLoading,
  }
}