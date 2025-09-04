// /hooks/useLineAuth.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

/**
 * Modern LINE OAuth Authentication Hook
 * 
 * Provides comprehensive LINE authentication management with:
 * - Automatic token refresh monitoring
 * - Secure authentication flow initiation  
 * - Token state monitoring with server-side validation
 * - Error handling with user-friendly messages
 * - TypeScript support for better DX
 */

// Authentication states
export type LineAuthState = 
  | 'loading'          // Initial loading or checking auth state
  | 'authenticated'    // User is authenticated with valid tokens
  | 'unauthenticated'  // User is not authenticated
  | 'refreshing'       // Token is being refreshed
  | 'error'           // Authentication error occurred

// Token states from server
export type ServerTokenState = 
  | 'valid' | 'near_expiry' | 'expired' | 'missing' | 'invalid'

// Hook configuration options
export interface UseLineAuthOptions {
  tenantId?: string
  orgId?: string
  isCustomerLogin?: boolean
  redirectUri?: string
  scope?: string
  autoRefresh?: boolean           // Enable automatic token refresh (default: true)
  refreshCheckInterval?: number   // Interval for checking token status in ms (default: 60000)
  onAuthSuccess?: (data: AuthSuccessData) => void
  onAuthError?: (error: Error) => void
  onTokenRefreshed?: () => void
}

// Authentication success response
export interface AuthSuccessData {
  success: boolean
  customerUid?: string
  line_user_id?: string
  line_name?: string
  message?: string
}

// Token status from server API
interface TokenStatusResponse {
  tokenState: ServerTokenState
  isAuthenticated: boolean
  expiresAt?: string
  expiresInMs?: number
  needsRefresh: boolean
  isValid: boolean
}

// Refresh response from server API  
interface RefreshResponse {
  success: boolean
  message: string
  tokenState?: ServerTokenState
  expiresAt?: string
  expiresInMs?: number
  refreshed?: boolean
  error?: string
}

export function useLineAuth(options: UseLineAuthOptions = {}) {
  // Configuration with defaults
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

  // State management
  const [authState, setAuthState] = useState<LineAuthState>('loading')
  const [tokenState, setTokenState] = useState<ServerTokenState | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Refs for cleanup and abort control
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const router = useRouter()

  /**
   * Check current authentication status from server
   */
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
        console.warn('[useLineAuth] Auth status check failed:', response.status)
        setAuthState('unauthenticated')
        setTokenState('missing')
        return false
      }

      const data: TokenStatusResponse = await response.json()
      
      console.log('[useLineAuth] Auth status:', data)
      
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

  /**
   * Refresh authentication token
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshing) return false

    setIsRefreshing(true)
    setAuthState('refreshing')

    try {
      const controller = new AbortController()
      abortControllerRef.current = controller

      console.log('[useLineAuth] Refreshing token...')

      const response = await fetch('/api/auth/line/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        credentials: 'include',
      })

      const data: RefreshResponse = await response.json()

      if (!response.ok || !data.success) {
        console.warn('[useLineAuth] Token refresh failed:', data)
        
        if (data.error === 'refresh_failed' || data.error === 'no_tokens') {
          setAuthState('unauthenticated')
          setTokenState('missing')
        } else {
          setAuthState('error')
          setError(new Error(data.message || 'Token refresh failed'))
        }
        return false
      }

      console.log('[useLineAuth] Token refreshed successfully')
      
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
  const login = useCallback(async (customRedirectUri?: string): Promise<void> => {
    if (!tenantId || !orgId) {
      const error = new Error('Tenant ID and Organization ID are required for authentication')
      setError(error)
      if (onAuthError) onAuthError(error)
      return
    }

    try {
      setAuthState('loading')
      setError(null)

      // Determine redirect URI
      const redirectUri = customRedirectUri || (() => {
        const locale = window.location.pathname.split('/')[1] || 'ja'
        return `${window.location.origin}/${locale}/reservation/auth/callback`
      })()

      console.log('[useLineAuth] Starting authentication flow:', {
        tenantId,
        orgId,
        isCustomerLogin,
        redirectUri,
        scope,
      })

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
          scope,
        }),
      })

      if (!response.ok) {
        let errorMessage = `Failed to start authentication (HTTP ${response.status})`
        try {
          const errorData = await response.json()
          errorMessage =
            errorData?.message ||
            errorData?.error ||
            errorMessage
        } catch (_) {
          // ignore JSON parse error and use default message
        }
        throw new Error(errorMessage)
      }

      const { authorizationUrl } = await response.json()

      console.log('[useLineAuth] Redirecting to LINE authorization...')
      
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
      
      console.log('[useLineAuth] Logging out...')

      // Clear tokens on server
      await fetch('/api/auth/line/refresh', {
        method: 'DELETE',
        credentials: 'include',
      })

      // Update local state
      setAuthState('unauthenticated')
      setTokenState('missing')
      setExpiresAt(null)
      setError(null)
      
      console.log('[useLineAuth] Logout successful')

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
      // Check if token needs refresh
      if (tokenState === 'near_expiry' || tokenState === 'expired') {
        console.log('[useLineAuth] Auto-refresh triggered for state:', tokenState)
        refreshToken()
      }
    }

    // Set up periodic token monitoring
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
   * Monitor response headers for server-side token state changes
   */
  useEffect(() => {
    const handleResponseHeaders = () => {
      // This could be enhanced to listen for server-sent events or WebSocket
      // For now, we rely on periodic checks and middleware headers
    }

    handleResponseHeaders()
  }, [])

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

  // URL parameter handling for auth callbacks
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    
    if (urlParams.get('auth_success') === 'true') {
      const lineUserId = urlParams.get('line_user_id')
      const lineName = urlParams.get('line_name')
      
      console.log('[useLineAuth] Authentication success detected in URL')
      
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
      
      // Re-check auth status to get token expiration info
      setTimeout(checkAuthStatus, 1000)
    }
  }, [checkAuthStatus, onAuthSuccess])

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
