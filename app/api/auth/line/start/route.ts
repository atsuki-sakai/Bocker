// /app/api/auth/line/start/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createPreAuth, ccFromVerifier, OAUTH_COOKIE_PREFIX, OAUTH_TTL_MS } from '@/lib/line-oauth'
import { seal } from '@/lib/crypto'
import { z } from 'zod'

/**
 * LINE OAuth 2.1 Authorization Start Endpoint
 * 
 * Implements secure authorization initiation with:
 * - PKCE (Proof Key for Code Exchange) with S256 method
 * - State parameter for CSRF protection  
 * - Nonce for replay protection
 * - Short-term HttpOnly cookie storage (5 minutes TTL)
 * - Support for both Web Login and LIFF flows
 */

// Request validation schema
const StartAuthSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  orgId: z.string().min(1, 'Organization ID is required'),
  isCustomerLogin: z.boolean().optional().default(false),
  redirectUri: z.string().url('Valid redirect URI is required'),
  scope: z.string().optional().default('profile openid'),
  next: z.string().optional(), // Safe redirect path after successful auth
})


/**
 * POST /api/auth/line/start
 * Initialize LINE OAuth authorization flow
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse and validate request body
    const body = await request.json().catch(() => ({}))
    const validation = StartAuthSchema.safeParse(body)
    
    if (!validation.success) {
      console.error('[LineAuth:Start] Validation failed:', validation.error.flatten())
      return NextResponse.json(
        { 
          error: 'Invalid request parameters',
          details: validation.error.flatten().fieldErrors 
        },
        { status: 400 }
      )
    }
    
    const { tenantId, orgId, isCustomerLogin, redirectUri, scope, next } = validation.data
    
    // Validate LINE channel configuration
    const channelId = process.env.LINE_CHANNEL_ID
    if (!channelId) {
      console.error('[LineAuth:Start] LINE_CHANNEL_ID not configured')
      return NextResponse.json(
        { error: 'LINE authentication not configured' },
        { status: 500 }
      )
    }
    
    // Generate secure authentication parameters
    const { stateId, preAuth } = createPreAuth({
      tenantId,
      orgId,
      next,
    })
    
    // Calculate code challenge from verifier (PKCE S256)
    const codeChallenge = ccFromVerifier(preAuth.cv)
    
    console.log('[LineAuth:Start] Generated auth parameters:', {
      stateId: stateId.substring(0, 8) + '...',
      tenantId,
      orgId,
      isCustomerLogin,
      nonce: preAuth.nonce.substring(0, 8) + '...',
      redirectUri,
    })
    
    // Store PreAuth data in encrypted HttpOnly cookie
    const cookieStore = await cookies()
    const cookieName = `${OAUTH_COOKIE_PREFIX}${stateId}`
    const encryptedPreAuth = seal(JSON.stringify(preAuth))
    
    // Secure cookie options (5 minutes TTL, HttpOnly, Secure in production)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const, // Lax for OAuth redirect compatibility
      path: '/',
      maxAge: Math.floor(OAUTH_TTL_MS / 1000), // 5 minutes in seconds
    }
    
    cookieStore.set(cookieName, encryptedPreAuth, cookieOptions)
    
    // Build LINE authorization URL per OAuth 2.1 specification
    const authUrl = new URL('https://access.line.me/oauth2/v2.1/authorize')
    
    const authParams = {
      response_type: 'code',
      client_id: channelId,
      redirect_uri: redirectUri,
      state: stateId,
      scope: scope,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      nonce: preAuth.nonce,
    }
    
    // Add parameters to URL
    Object.entries(authParams).forEach(([key, value]) => {
      if (value) {
        authUrl.searchParams.set(key, value)
      }
    })
    
    const finalAuthUrl = authUrl.toString()
    
    console.log('[LineAuth:Start] Authorization URL generated:', {
      url: finalAuthUrl.replace(/[?&](state|nonce|code_challenge)=[^&]+/g, (match) => 
        match.replace(/=([^&]+)/, `=${match.split('=')[1].substring(0, 8)}...`)
      ),
      cookieSet: cookieName,
      expiresIn: `${OAUTH_TTL_MS / 1000}s`,
    })
    
    // Return authorization URL for client-side redirect
    return NextResponse.json({
      success: true,
      authorizationUrl: finalAuthUrl,
      stateId, // Client may need this for debugging
      expiresAt: Date.now() + OAUTH_TTL_MS,
    })
    
  } catch (error) {
    console.error('[LineAuth:Start] Unexpected error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/line/start (for debug/health check)
 * Returns configuration status without sensitive data
 */
export async function GET(): Promise<NextResponse> {
  try {
    const channelId = process.env.LINE_CHANNEL_ID
    const channelSecret = process.env.LINE_CHANNEL_SECRET
    
    return NextResponse.json({
      configured: {
        channelId: !!channelId,
        channelSecret: !!channelSecret,
      },
      endpoints: {
        authorize: 'https://access.line.me/oauth2/v2.1/authorize',
        token: 'https://api.line.me/oauth2/v2.1/token',
        verify: 'https://api.line.me/oauth2/v2.1/verify',
        revoke: 'https://api.line.me/oauth2/v2.1/revoke',
      },
      cookieConfig: {
        prefix: OAUTH_COOKIE_PREFIX,
        ttlMs: OAUTH_TTL_MS,
      },
    })
    
  } catch (error) {
    console.error('[LineAuth:Start] Health check failed:', error)
    
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS method for CORS preflight (if needed)
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' ? '*' : process.env.NEXT_PUBLIC_DEPLOY_URL || 'https://bocker.jp',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  })
}