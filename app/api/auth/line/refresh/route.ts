// /app/api/auth/line/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { 
  validateTokenState, 
  refreshLineToken, 
  getTokenExpirationInfo, 
  clearTokens,
  type TokenValidationState 
} from '@/lib/auth/token-manager'

/**
 * LINE Token Refresh API Endpoint
 * 
 * Provides automatic token refresh functionality with:
 * - Token validation and state checking
 * - Automatic refresh token usage with LINE's API
 * - Secure token storage with encryption
 * - Refresh token rotation support
 * - Proper error handling and cleanup
 */

interface RefreshResponse {
  success: boolean
  message: string
  tokenState?: TokenValidationState
  expiresAt?: string
  expiresInMs?: number
  refreshed?: boolean
  error?: string
}

/**
 * POST /api/auth/line/refresh
 * Refresh LINE access token using stored refresh token
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[LineAuth:Refresh] Token refresh requested:', {
      userAgent: request.headers.get('User-Agent')?.substring(0, 100),
      origin: request.headers.get('origin'),
      timestamp: new Date().toISOString(),
    })
    
    // Validate current token state
    const tokenState = await validateTokenState()
    
    console.log('[LineAuth:Refresh] Current token state:', tokenState)
    
    switch (tokenState) {
      case 'valid':
        // Token is still valid, no refresh needed
        const expirationInfo = await getTokenExpirationInfo()
        
        return NextResponse.json<RefreshResponse>({
          success: true,
          message: 'Token is still valid, no refresh needed',
          tokenState,
          expiresAt: expirationInfo?.expiresAt?.toISOString(),
          expiresInMs: expirationInfo?.expiresInMs,
          refreshed: false,
        })
        
      case 'near_expiry':
      case 'expired':
        // Token needs refresh or has expired, attempt refresh
        console.log('[LineAuth:Refresh] Attempting token refresh...')
        
        const refreshedTokens = await refreshLineToken()
        
        if (!refreshedTokens) {
          console.error('[LineAuth:Refresh] Token refresh failed, clearing tokens')
          await clearTokens()
          
          return NextResponse.json<RefreshResponse>({
            success: false,
            message: 'Token refresh failed, re-authentication required',
            tokenState,
            refreshed: false,
            error: 'refresh_failed',
          }, { status: 401 })
        }
        
        console.log('[LineAuth:Refresh] Token refresh successful')
        
        return NextResponse.json<RefreshResponse>({
          success: true,
          message: 'Token refreshed successfully',
          tokenState: 'valid',
          expiresAt: new Date(refreshedTokens.expiresAt).toISOString(),
          expiresInMs: refreshedTokens.expiresAt - Date.now(),
          refreshed: true,
        })
        
      case 'missing':
        // No tokens found
        return NextResponse.json<RefreshResponse>({
          success: false,
          message: 'No authentication tokens found',
          tokenState,
          refreshed: false,
          error: 'no_tokens',
        }, { status: 401 })
        
      case 'invalid':
        // Corrupted or invalid tokens
        console.warn('[LineAuth:Refresh] Invalid tokens detected, clearing')
        await clearTokens()
        
        return NextResponse.json<RefreshResponse>({
          success: false,
          message: 'Invalid tokens detected, re-authentication required',
          tokenState,
          refreshed: false,
          error: 'invalid_tokens',
        }, { status: 401 })
        
      default:
        // Unexpected state
        return NextResponse.json<RefreshResponse>({
          success: false,
          message: 'Unknown token state',
          tokenState,
          refreshed: false,
          error: 'unknown_state',
        }, { status: 500 })
    }
    
  } catch (error) {
    console.error('[LineAuth:Refresh] Unexpected error:', error)
    
    // On unexpected errors, clear tokens for security
    try {
      await clearTokens()
    } catch (clearError) {
      console.error('[LineAuth:Refresh] Failed to clear tokens after error:', clearError)
    }
    
    return NextResponse.json<RefreshResponse>({
      success: false,
      message: 'Internal server error during token refresh',
      error: 'server_error',
      refreshed: false,
    }, { status: 500 })
  }
}

/**
 * GET /api/auth/line/refresh
 * Check current token status without refreshing
 */
export async function GET(): Promise<NextResponse> {
  try {
    const tokenState = await validateTokenState()
    const expirationInfo = await getTokenExpirationInfo()
    
    const response = {
      tokenState,
      isAuthenticated: tokenState === 'valid' || tokenState === 'near_expiry',
      expiresAt: expirationInfo?.expiresAt?.toISOString(),
      expiresInMs: expirationInfo?.expiresInMs,
      needsRefresh: tokenState === 'near_expiry' || tokenState === 'expired',
      isValid: expirationInfo?.isValid,
    }
    
    console.log('[LineAuth:Refresh] Token status check:', response)
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('[LineAuth:Refresh] Status check failed:', error)
    
    return NextResponse.json({
      tokenState: 'invalid',
      isAuthenticated: false,
      needsRefresh: false,
      isValid: false,
      error: 'status_check_failed',
    }, { status: 500 })
  }
}

/**
 * DELETE /api/auth/line/refresh
 * Clear all authentication tokens (logout)
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    console.log('[LineAuth:Refresh] Token deletion requested (logout)')
    
    await clearTokens()
    
    return NextResponse.json({
      success: true,
      message: 'Authentication tokens cleared successfully',
      cleared: true,
    })
    
  } catch (error) {
    console.error('[LineAuth:Refresh] Token deletion failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to clear authentication tokens',
      cleared: false,
      error: 'deletion_failed',
    }, { status: 500 })
  }
}

/**
 * OPTIONS method for CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' ? '*' : process.env.NEXT_PUBLIC_DEPLOY_URL || 'https://bocker.jp',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  })
}

/**
 * PUT method not allowed
 */
export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'PUT method not supported for token refresh' },
    { status: 405 }
  )
}

/**
 * PATCH method not allowed
 */
export async function PATCH(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'PATCH method not supported for token refresh' },
    { status: 405 }
  )
}