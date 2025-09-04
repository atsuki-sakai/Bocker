// /app/api/auth/line/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { open } from '@/lib/crypto-server'
import { extractState, validatePreAuth, OAUTH_COOKIE_PREFIX, safeNext, type PreAuth } from '@/lib/line-oauth'
import { verifyLineIdToken, type LineIdTokenPayload } from '@/lib/verify-line-idtoken'
import { storeTokens, type LineTokens } from '@/lib/auth/token-manager'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { z } from 'zod'

/**
 * LINE OAuth 2.1 Authorization Callback Endpoint
 * 
 * Handles the callback from LINE's OAuth server with:
 * - State parameter verification (CSRF protection)
 * - PKCE code verification (S256 method)  
 * - Authorization code exchange for tokens
 * - ID token verification (HS256/ES256 auto-detection)
 * - Secure token storage with AES-256-GCM encryption
 * - Proper cleanup of temporary state cookies
 */

// Token exchange response from LINE API
interface LineTokenResponse {
  access_token: string
  expires_in: number
  id_token: string
  refresh_token: string
  scope: string
  token_type: string
}

// Callback query parameters validation
const CallbackParamsSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
  error: z.string().optional(),
  error_description: z.string().optional(),
})

/**
 * GET /api/auth/line/callback
 * Handle OAuth authorization callback from LINE
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams
  let stateId: string | null = null
  
  try {
    // Check for OAuth error response first
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    
    if (error) {
      console.error('[LineAuth:Callback] OAuth error:', { error, errorDescription })
      
      return NextResponse.redirect(
        new URL(`/?error=oauth_${error}&message=${encodeURIComponent(errorDescription || 'OAuth authorization failed')}`, request.url)
      )
    }
    
    // Extract state from both direct and LIFF formats
    stateId = extractState(searchParams)
    
    if (!stateId) {
      console.error('[LineAuth:Callback] Missing state parameter')
      return NextResponse.redirect(
        new URL('/?error=missing_state&message=Missing state parameter', request.url)
      )
    }
    
    // Parse and validate callback parameters
    const paramValidation = CallbackParamsSchema.safeParse({
      code: searchParams.get('code'),
      state: stateId,
      error: searchParams.get('error'),
      error_description: searchParams.get('error_description'),
    })
    
    if (!paramValidation.success) {
      console.error('[LineAuth:Callback] Invalid callback parameters:', paramValidation.error.flatten())
      return NextResponse.redirect(
        new URL('/?error=invalid_params&message=Invalid callback parameters', request.url)
      )
    }
    
    const { code } = paramValidation.data
    
    console.log('[LineAuth:Callback] Processing callback:', {
      stateId: stateId.substring(0, 8) + '...',
      hasCode: !!code,
      userAgent: request.headers.get('User-Agent')?.substring(0, 100),
    })
    
    // Retrieve and verify PreAuth data from cookie
    const cookieStore = await cookies()
    const cookieName = `${OAUTH_COOKIE_PREFIX}${stateId}`
    const encryptedPreAuth = cookieStore.get(cookieName)?.value
    
    if (!encryptedPreAuth) {
      console.error('[LineAuth:Callback] State cookie not found or expired:', cookieName)
      return NextResponse.redirect(
        new URL('/?error=state_expired&message=Authentication state expired', request.url)
      )
    }
    
    // Decrypt and parse PreAuth data
    let preAuth: PreAuth
    try {
      const decryptedData = open(encryptedPreAuth)
      preAuth = JSON.parse(decryptedData)
    } catch (error) {
      console.error('[LineAuth:Callback] Failed to decrypt PreAuth data:', error)
      return NextResponse.redirect(
        new URL('/?error=state_corrupted&message=Authentication state corrupted', request.url)
      )
    }
    
    // Validate PreAuth integrity and expiration
    if (!validatePreAuth(preAuth)) {
      console.error('[LineAuth:Callback] Invalid or expired PreAuth:', {
        used: preAuth.used,
        age: Date.now() - preAuth.ts,
        hasNonce: !!preAuth.nonce,
        hasCodeVerifier: !!preAuth.cv,
      })
      
      // Clean up invalid cookie
      cookieStore.delete(cookieName)
      
      return NextResponse.redirect(
        new URL('/?error=state_invalid&message=Authentication state invalid or expired', request.url)
      )
    }
    
    // Mark state as used to prevent replay attacks
    preAuth.used = true
    
    // Clean up state cookie immediately (one-time use)
    cookieStore.delete(cookieName)
    
    console.log('[LineAuth:Callback] PreAuth validated successfully, exchanging code for tokens')
    
    // Fetch LINE channel config from Convex using tenant/org stored in PreAuth
    const apiConfig = (preAuth.tenantId && preAuth.orgId)
      ? await fetchQuery(api.organization.api_config.query.findByTenantAndOrg, {
          tenant_id: preAuth.tenantId as Id<'tenant'>,
          org_id: preAuth.orgId as Id<'organization'>,
        })
      : null

    const channelId = apiConfig?.line_channel_id
    const channelSecret = apiConfig?.line_channel_secret
    if (!channelId || !channelSecret) {
      console.error('[LineAuth:Callback] Missing LINE config in DB', { tenantId: preAuth.tenantId, orgId: preAuth.orgId })
      return NextResponse.redirect(
        new URL('/?error=config_missing&message=LINE設定（ClientID/Secret）が未設定です', request.url)
      )
    }

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code, preAuth.cv, request.url, channelId, channelSecret)
    
    if (!tokens) {
      console.error('[LineAuth:Callback] Token exchange failed')
      return NextResponse.redirect(
        new URL('/?error=token_exchange_failed&message=Failed to obtain access tokens', request.url)
      )
    }
    
    // Verify ID token with expected nonce
    let idTokenPayload: LineIdTokenPayload
    try {
      idTokenPayload = await verifyLineIdToken(tokens.id_token, {
        channelId,
        channelSecret,
        expectedNonce: preAuth.nonce,
        clockTolerance: 60, // 60 seconds tolerance
      })
      
      console.log('[LineAuth:Callback] ID token verified:', {
        sub: idTokenPayload.sub,
        iss: idTokenPayload.iss,
        aud: idTokenPayload.aud,
        hasName: !!idTokenPayload.name,
        hasEmail: !!idTokenPayload.email,
        hasProfileImage: !!idTokenPayload.picture,
      })
      
    } catch (error) {
      console.error('[LineAuth:Callback] ID token verification failed:', error)
      return NextResponse.redirect(
        new URL('/?error=id_token_invalid&message=ID token verification failed', request.url)
      )
    }
    
    // Store tokens securely using token manager
    const now = Date.now()
    const lineTokens: LineTokens = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: now + (tokens.expires_in * 1000), // Convert seconds to milliseconds
      issuedAt: now,
      tokenType: tokens.token_type,
      scope: tokens.scope,
    }
    
    await storeTokens(lineTokens)

    // Persist tenant/org context in HttpOnly cookies for future refresh calls
    try {
      const cookieStore = await cookies()
      const ctxCookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 90 * 24 * 60 * 60, // 90 days
      }
      if (preAuth.tenantId) cookieStore.set('line_ctx_tid', preAuth.tenantId, ctxCookieOptions)
      if (preAuth.orgId) cookieStore.set('line_ctx_oid', preAuth.orgId, ctxCookieOptions)
    } catch (e) {
      console.warn('[LineAuth:Callback] Failed to persist LINE context cookies', e)
    }
    
    console.log('[LineAuth:Callback] Tokens stored successfully:', {
      expiresIn: tokens.expires_in,
      scope: tokens.scope,
      hasRefreshToken: !!tokens.refresh_token,
      lineUserId: idTokenPayload.sub,
    })
    
    // Determine redirect URL
    const redirectPath = safeNext(preAuth.next)
    const finalRedirectUrl = new URL(redirectPath, request.url)
    
    // Add success parameters
    finalRedirectUrl.searchParams.set('auth_success', 'true')
    finalRedirectUrl.searchParams.set('line_user_id', idTokenPayload.sub)
    
    // Add profile info if available
    if (idTokenPayload.name) {
      finalRedirectUrl.searchParams.set('line_name', encodeURIComponent(idTokenPayload.name))
    }
    
    console.log('[LineAuth:Callback] Authentication complete, redirecting:', {
      redirectTo: finalRedirectUrl.pathname,
      lineUserId: idTokenPayload.sub,
      hasName: !!idTokenPayload.name,
    })
    
    // Redirect to success page
    return NextResponse.redirect(finalRedirectUrl.toString())
    
  } catch (error) {
    console.error('[LineAuth:Callback] Unexpected error:', error)
    
    // Clean up state cookie if we have stateId
    if (stateId) {
      try {
        const cookieStore = await cookies()
        cookieStore.delete(`${OAUTH_COOKIE_PREFIX}${stateId}`)
      } catch (cookieError) {
        console.warn('[LineAuth:Callback] Failed to clean up cookie:', cookieError)
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
    
    return NextResponse.redirect(
      new URL(`/?error=auth_error&message=${encodeURIComponent(errorMessage)}`, request.url)
    )
  }
}

/**
 * Exchange authorization code for access and refresh tokens using PKCE
 */
async function exchangeCodeForTokens(
  code: string, 
  codeVerifier: string, 
  requestUrl: string,
  channelId: string,
  channelSecret: string,
): Promise<LineTokenResponse | null> {
  try {
    // channelId/secret are provided from DB
    
    // Build redirect URI (must match the one used in authorization)
    const callbackUrl = new URL('/api/auth/line/callback', requestUrl)
    const redirectUri = callbackUrl.toString()
    
    // Prepare token exchange request per LINE OAuth 2.1 spec
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
      code_verifier: codeVerifier, // PKCE verification
    })
    
    console.log('[LineAuth:TokenExchange] Requesting tokens from LINE:', {
      endpoint: 'https://api.line.me/oauth2/v2.1/token',
      redirectUri,
      codeVerifierLength: codeVerifier.length,
    })
    
    const response = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Bocker-LINE-OAuth/1.0',
      },
      body: tokenParams,
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[LineAuth:TokenExchange] Token exchange failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      })
      return null
    }
    
    const tokenResponse: LineTokenResponse = await response.json()
    
    // Validate response structure
    if (!tokenResponse.access_token || !tokenResponse.id_token) {
      console.error('[LineAuth:TokenExchange] Invalid token response:', {
        hasAccessToken: !!tokenResponse.access_token,
        hasIdToken: !!tokenResponse.id_token,
        hasRefreshToken: !!tokenResponse.refresh_token,
      })
      return null
    }
    
    console.log('[LineAuth:TokenExchange] Token exchange successful:', {
      tokenType: tokenResponse.token_type,
      expiresIn: tokenResponse.expires_in,
      scope: tokenResponse.scope,
      hasRefreshToken: !!tokenResponse.refresh_token,
    })
    
    return tokenResponse
    
  } catch (error) {
    console.error('[LineAuth:TokenExchange] Unexpected error:', error)
    return null
  }
}

/**
 * POST method not allowed for callback endpoint
 */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Callback endpoint only accepts GET requests' },
    { status: 405 }
  )
}
