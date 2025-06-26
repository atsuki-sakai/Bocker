'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import { toast } from 'sonner'
import { isLineTokenValid } from '@/lib/auth/lineAuthCleanup'

// LINEログイン成功時のレスポンス型
interface LineAuthSuccessData {
  customerUid?: string
  success: boolean
  message?: string
}

interface UseLineAuthHandlerOptions {
  onSuccess?: (data: LineAuthSuccessData) => void
  onError?: (error: Error) => void
  maxRetries?: number
  retryDelay?: number
}

// 型定義には state プロパティが無いため拡張する簡易型
type LoginParamsWithState = { redirectUri: string; state?: string }

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

      if (!response.ok) {
        // リトライ可能なエラーかチェック
        const isRetryableError = 
          response.status === 503 || 
          response.status === 504 ||
          (response.status === 500 && attempt === 1)
        
        if (isRetryableError && attempt < maxRetries) {
          console.log(`[useLineAuthHandler] Retrying due to ${response.status} error (attempt ${attempt + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
          return verifyTokenWithRetry(idToken, tenantId, orgId, isCustomerLogin, attempt + 1)
        }
        
        // 認証エラーの場合は再ログインを促す
        if (response.status === 401) {
          if (liff?.isLoggedIn()) {
            liff.logout()
          }
          throw new Error('認証情報の有効期限が切れています。再度ログインしてください。')
        }
      }

      return response
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('認証処理がキャンセルされました')
      }
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください。')
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
      console.log('[useLineAuthHandler] Skipping auth - not ready:', { isProcessing, liffIsLoading, hasLiff: !!liff })
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // LIFF初期化の最終確認
      // liff.readyはPromiseなので、ここではLIFFオブジェクトの存在確認のみ行う

      // LINEログイン状態を確認
      if (!liff.isLoggedIn()) {
        console.log('[useLineAuthHandler] User not logged in, initiating login flow')
        
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
          const errorData = await stateResponse.json().catch(() => ({}))
          throw new Error(errorData.message || '認証の準備に失敗しました')
        }

        const { stateId } = await stateResponse.json()
        console.log('[useLineAuthHandler] State created:', stateId)
        
        // コールバックURL構築
        const locale = window.location.pathname.split('/')[1] || 'ja'
        const getBaseUrl = () => {
          // 開発環境
          if (process.env.NODE_ENV === 'development') {
            return window.location.origin
          }
          
          // Preview環境（Vercel）
          if (process.env.VERCEL_ENV === 'preview') {
            return 'https://bocker-project.vercel.app'
          }
          
          // Production環境
          if (process.env.VERCEL_ENV === 'production') {
            return 'https://bocker.jp'
          }
          
          // フォールバック
          return process.env.NEXT_PUBLIC_DEPLOY_URL || window.location.origin
        }
        
        const baseUrl = getBaseUrl()
        const callbackUrl = new URL(
          `/${locale}/reservation/auth/callback`,
          baseUrl
        )
        
        // NOTE: redirectUri は固定。state は LIFF SDK のオプションで付与（OAuth 仕様準拠）
        console.log('[useLineAuthHandler] Redirecting to LINE login with callback:', callbackUrl.toString())

        // スマホ環境での確実なリダイレクト
        try {
          liff.login({ redirectUri: callbackUrl.toString(), state: stateId } as LoginParamsWithState)
        } catch (loginError) {
          console.error('[useLineAuthHandler] LIFF login failed, trying window.location:', loginError)
          // フォールバック：基本的なリダイレクト（LIFF IDを使用）
          const liffId = liff.id || ''
          const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?` +
            `response_type=code&client_id=${liffId}&` +
            `redirect_uri=${encodeURIComponent(callbackUrl.toString())}&` +
            `state=${stateId}&scope=profile%20openid`
          window.location.href = lineAuthUrl
        }
        return
      }

      // IDトークンを取得
      console.log('[useLineAuthHandler] User already logged in, getting ID token')
      const idToken = liff.getIDToken()
      
      if (!idToken) {
        console.warn('[useLineAuthHandler] ID token not available, forcing re-login')
        liff.logout()
        throw new Error('LINE認証情報の取得に失敗しました。再度ログインしてください。')
      }
      
      console.log('[useLineAuthHandler] ID token acquired, length:', idToken.length)
      
      // トークンの有効性を事前チェック
      const tokenValid = await isLineTokenValid(idToken)
      if (!tokenValid) {
        console.warn('[useLineAuthHandler] ID token is expired, initiating silent re-authentication')
        liff.logout()
        
        // エラー表示せず、サイレントに再ログインを開始
        if (!liff.isLoggedIn()) {
          console.log('[useLineAuthHandler] Starting silent re-authentication flow')
          
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
            const errorData = await stateResponse.json().catch(() => ({}))
            throw new Error(errorData.message || '認証の準備に失敗しました')
          }

          const { stateId } = await stateResponse.json()
          console.log('[useLineAuthHandler] Silent re-auth state created:', stateId)
          
          // コールバックURL構築
          const locale = window.location.pathname.split('/')[1] || 'ja'
          const getBaseUrl = () => {
            // 開発環境
            if (process.env.NODE_ENV === 'development') {
              return window.location.origin
            }
            
            // Preview環境（Vercel）
            if (process.env.VERCEL_ENV === 'preview') {
              return 'https://bocker-project.vercel.app'
            }
            
            // Production環境
            if (process.env.VERCEL_ENV === 'production') {
              return 'https://bocker.jp'
            }
            
            // フォールバック
            return process.env.NEXT_PUBLIC_DEPLOY_URL || window.location.origin
          }
          
          const baseUrl = getBaseUrl()
          const callbackUrl = new URL(
            `/${locale}/reservation/auth/callback`,
            baseUrl
          )
          
          // NOTE: redirectUri は固定。state は LIFF SDK のオプションで付与（OAuth 仕様準拠）
          console.log('[useLineAuthHandler] Silent re-auth redirecting to LINE login')
          
          try {
            liff.login({ redirectUri: callbackUrl.toString(), state: stateId } as LoginParamsWithState)
          } catch (loginError) {
            console.error('[useLineAuthHandler] Silent re-auth LIFF login failed:', loginError)
            const liffId = liff.id || ''
            const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?` +
              `response_type=code&client_id=${liffId}&` +
              `redirect_uri=${encodeURIComponent(callbackUrl.toString())}&` +
              `state=${stateId}&scope=profile%20openid`
            window.location.href = lineAuthUrl
          }
          return
        }
        return
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
      console.error('[useLineAuthHandler] Error details:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        liffId: liff?.id,
        liffIsLoggedIn: liff?.isLoggedIn(),
        tenantId,
        orgId,
        isCustomerLogin
      })
      
      const err = error instanceof Error ? error : new Error('認証処理中にエラーが発生しました')
      
      // 認証切れかどうかを判定
      const isAuthExpired = err.message.includes('有効期限が切れています') || 
                           err.message.includes('token_expired')
      
      if (isAuthExpired) {
        // 認証切れの場合はエラー表示せず、ログ出力のみ
        console.warn('[useLineAuthHandler] Authentication expired, silent handling')
        return
      }
      
      // 実際のエラーの場合のみ表示
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