'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'

/**
 * LINE OAuth 2.1 認証用フック（簡潔版）
 *
 * LINE公式のベストプラクティスに準拠した実装：
 * - サーバー管理の PKCE（OAuth 2.1）フロー
 * - トークンの自動リフレッシュ監視
 * - HttpOnly クッキーによる安全なトークン保存
 * - ユーザーに配慮したエラーハンドリング
 */

// 認証状態
export type LineAuthState =
  | 'loading' // Initial loading or checking auth state
  | 'authenticated' // User is authenticated with valid tokens
  | 'unauthenticated' // User is not authenticated
  | 'refreshing' // Token is being refreshed
  | 'error' // Authentication error occurred

// サーバーからのトークン状態
export type ServerTokenState = 'valid' | 'near_expiry' | 'expired' | 'missing' | 'invalid'

// フックの設定オプション
export interface UseLineAuthOptions {
  tenantId?: string
  orgId?: string
  isCustomerLogin?: boolean
  scope?: string
  autoRefresh?: boolean
  refreshCheckInterval?: number
  onAuthSuccess?: (data: AuthSuccessData) => void
  onAuthError?: (error: Error) => void
  onTokenRefreshed?: () => void
}

// 認証成功時のレスポンス
export interface AuthSuccessData {
  success: boolean
  customerUid?: string
  line_user_id?: string
  line_name?: string
  message?: string
}

// サーバーAPIからのトークン状態レスポンス
interface TokenStatusResponse {
  tokenState: ServerTokenState
  isAuthenticated: boolean
  expiresAt?: string
  expiresInMs?: number
  needsRefresh: boolean
  isValid: boolean
}

// サーバーAPIからのリフレッシュ結果レスポンス
interface RefreshResponse {
  success: boolean
  message: string
  tokenState?: ServerTokenState
  expiresAt?: string
  refreshed?: boolean
  error?: string
}

export function useLineAuth(options: UseLineAuthOptions = {}) {
  const {
    tenantId,
    orgId,
    isCustomerLogin = false,
    scope = 'profile openid',
    autoRefresh = true,
    refreshCheckInterval = 60 * 1000, // 1 minute
    onAuthSuccess,
    onAuthError,
    onTokenRefreshed,
  } = options

  // 状態管理
  const [authState, setAuthState] = useState<LineAuthState>('loading')
  const [tokenState, setTokenState] = useState<ServerTokenState | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // クリーンアップ／中断制御用の参照
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  /** サーバーに現在の認証状態を確認 */
  const checkAuthStatus = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController()
      abortControllerRef.current = controller

      const response = await fetch('/api/auth/line/refresh', {
        method: 'GET',
        signal: controller.signal,
        credentials: 'include',
      })

      if (!response.ok) {
        setAuthState('unauthenticated')
        setTokenState('missing')
        return false
      }

      const data: TokenStatusResponse = await response.json()

      setTokenState(data.tokenState)
      setExpiresAt(data.expiresAt ? new Date(data.expiresAt) : null)

      if (data.isAuthenticated) {
        setAuthState('authenticated')
        setError(null)
        return true
      } else {
        setAuthState('unauthenticated')
        return false
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return false
      }

      console.error('[useLineAuth] Auth status check error:', error)
      setAuthState('error')
      setError(error instanceof Error ? error : new Error('Authentication check failed'))
      return false
    } finally {
      abortControllerRef.current = null
    }
  }, [])

  // Type guard for window.liff.logout
  const hasLiffLogout = (): boolean => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w: any = typeof window !== 'undefined' ? window : undefined
      return !!(w && w.liff && typeof w.liff.logout === 'function')
    } catch {
      return false
    }
  }

  /**
   * Refresh authentication token
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshing) return false

    setIsRefreshing(true)
    setAuthState('refreshing')

    try {
      const response = await fetch('/api/auth/line/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      const data: RefreshResponse = await response.json()

      if (!response.ok || !data.success) {
        if (data.error === 'refresh_failed' || data.error === 'no_tokens') {
          setAuthState('unauthenticated')
          setTokenState('missing')
        } else {
          setAuthState('error')
          setError(new Error(data.message || 'Token refresh failed'))
        }
        return false
      }

      setTokenState(data.tokenState || 'valid')
      setExpiresAt(data.expiresAt ? new Date(data.expiresAt) : null)
      setAuthState('authenticated')
      setError(null)

      if (onTokenRefreshed) {
        onTokenRefreshed()
      }

      return true
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return false
      }

      console.error('[useLineAuth] Token refresh error:', error)
      setAuthState('error')
      setError(error instanceof Error ? error : new Error('Token refresh failed'))
      return false
    } finally {
      setIsRefreshing(false)
      abortControllerRef.current = null
    }
  }, [isRefreshing, onTokenRefreshed])

  /**
   * Start LINE OAuth authentication flow
   */
  const login = useCallback(async (): Promise<void> => {
    if (!tenantId || !orgId) {
      const error = new Error('Tenant ID and Organization ID are required for authentication')
      setError(error)
      if (onAuthError) onAuthError(error)
      return
    }

    try {
      setAuthState('loading')
      setError(null)

      // Compute redirect URI with NEXT_PUBLIC_DEVELOP_URL support
      const { redirectUri, next } = (() => {
        const locale = window.location.pathname.split('/')[1] || 'ja'

        const getBaseUrl = () => {
          // Prioritize NEXT_PUBLIC_DEVELOP_URL for tunnels
          if (process.env.NEXT_PUBLIC_DEVELOP_URL) {
            try {
              return new URL(process.env.NEXT_PUBLIC_DEVELOP_URL).origin
            } catch {
              return window.location.origin
            }
          }
          return window.location.origin
        }

        const baseUrl = getBaseUrl()
        const redirectUri = `${baseUrl}/api/auth/line/callback`
        // 次のリダイレクト先はログインコンテキストで切り替える
        const next = isCustomerLogin
          ? `/${locale}/customer/${orgId}/auth/login`
          : `/${locale}/reservation/${orgId}/calendar`
        return { redirectUri, next }
      })()

      // Request authorization start from server
      const response = await fetch('/api/auth/line/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          orgId,
          isCustomerLogin,
          redirectUri,
          next,
          scope,
        }),
      })

      if (!response.ok) {
        let errorMessage = `Failed to start authentication (HTTP ${response.status})`
        try {
          const errorData = await response.json()
          errorMessage = errorData?.message || errorData?.error || errorMessage
        } catch {
          // ignore JSON parse error
        }
        throw new Error(errorMessage)
      }

      const { authorizationUrl } = await response.json()

      // Redirect to LINE OAuth authorization
      window.location.href = authorizationUrl
    } catch (error) {
      console.error('[useLineAuth] Login initiation failed:', error)
      const authError = error instanceof Error ? error : new Error('Authentication failed')

      setAuthState('error')
      setError(authError)

      if (onAuthError) {
        onAuthError(authError)
      }

      toast.error(authError.message)
    }
  }, [tenantId, orgId, isCustomerLogin, scope, onAuthError])

  /**
   * Logout and clear authentication tokens
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      setAuthState('loading')

      // If LIFF SDK is available in the browser, also instruct it to logout
      try {
        if (hasLiffLogout()) {
          // LIFF側のアクセストークン／状態をクリア
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const w: any = window
          w.liff.logout()
        }
      } catch (e) {
        // Non-fatal: even if liff.logout fails, continue to clear server state
        console.warn('[useLineAuth] liff.logout() failed:', e)
      }

      // Clear tokens on server (this will also attempt server-side revoke/cleanup)
      await fetch('/api/auth/line/refresh', {
        method: 'DELETE',
        credentials: 'include',
      })

      // Update local state
      setAuthState('unauthenticated')
      setTokenState('missing')
      setExpiresAt(null)
      setError(null)
    } catch (error) {
      console.error('[useLineAuth] Logout failed:', error)
      // Even if server logout fails, clear local state
      setAuthState('unauthenticated')
      setTokenState('missing')
      setExpiresAt(null)
    }
  }, [])

  /**
   * Set up automatic token refresh monitoring
   */
  useEffect(() => {
    if (!autoRefresh) return

    const monitorTokens = () => {
      if (tokenState === 'near_expiry' || tokenState === 'expired') {
        refreshToken()
      }
    }

    refreshIntervalRef.current = setInterval(monitorTokens, refreshCheckInterval)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }
  }, [autoRefresh, tokenState, refreshCheckInterval, refreshToken])

  /**
   * Initial authentication check on mount
   */
  useEffect(() => {
    checkAuthStatus()
  }, [checkAuthStatus])

  /**
   * Handle URL parameters for auth callbacks and errors
   */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)

    // Handle authentication success
    if (urlParams.get('auth_success') === 'true') {
      const lineUserId = urlParams.get('line_user_id')
      const lineName = urlParams.get('line_name')

      // Clear URL parameters
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('auth_success')
      newUrl.searchParams.delete('line_user_id')
      newUrl.searchParams.delete('line_name')
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search)

      // Update state and trigger success callback
      setAuthState('authenticated')
      setError(null)

      if (onAuthSuccess) {
        onAuthSuccess({
          success: true,
          line_user_id: lineUserId || undefined,
          line_name: lineName ? decodeURIComponent(lineName) : undefined,
        })
      }

      toast.success('LINEログインが完了しました')
      setTimeout(checkAuthStatus, 1000)
      return
    }

    // Handle authentication errors
    const errorParam = urlParams.get('error')
    const errorMessage = urlParams.get('message')

    if (errorParam && errorMessage) {
      // Clear error parameters from URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('error')
      newUrl.searchParams.delete('message')
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search)

      // Handle specific error types
      if (errorParam === 'oauth_access_denied') {
        setAuthState('unauthenticated') // User cancelled, not an error
        return
      }

      // Create error object and show message
      const errorObj = new Error(decodeURIComponent(errorMessage))
      setAuthState('error')
      setError(errorObj)
      setTokenState('missing')

      toast.error('ログインでエラーが発生しました。もう一度お試しください。')

      if (onAuthError) {
        onAuthError(errorObj)
      }
    }
  }, [checkAuthStatus, onAuthSuccess, onAuthError])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    // State
    authState,
    tokenState,
    expiresAt,
    error,
    isRefreshing,

    // Computed values
    isAuthenticated: authState === 'authenticated',
    isLoading: authState === 'loading',
    needsRefresh: tokenState === 'near_expiry' || tokenState === 'expired',

    // Actions
    login,
    logout,
    refreshToken,
    checkAuthStatus,
  }
}
