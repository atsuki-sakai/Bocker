import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { getValidAccessToken } from '@/lib/auth/token-manager'
import { CustomerRepository } from '@/services/supabase/repositories/customer'
import { SessionPayload } from '@/lib/types'
import { getEnv } from '@/lib/env-config'
import { LOGIN_SESSION_KEY } from '@/services/line/constants'
import type { Id } from '@/convex/_generated/dataModel'

export const runtime = 'nodejs'

// LINE Profile API response structure
interface LineProfileResponse {
  userId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
}

const APP_JWT_SECRET = getEnv('APP_JWT_SECRET')
const JWT_EXPIRES_IN = '30d'

/**
 * Create customer session from LINE authentication
 * Called after successful LINE OAuth to establish user session
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API /api/auth/line-session] Creating LINE user session...')

    // Parse request body to get tenant and org info
    const body: { tenantId?: string; orgId?: string } = await request.json().catch(() => ({}))

    // Also check cookies for tenant/org context (set during LINE auth)
    const cookieStore = await cookies()
    const tenantId = body.tenantId || cookieStore.get('line_ctx_tid')?.value
    const orgId = body.orgId || cookieStore.get('line_ctx_oid')?.value

    if (!tenantId || !orgId) {
      console.error('[API /api/auth/line-session] Missing tenant or org context')
      return NextResponse.json(
        {
          error: 'Missing tenant or organization context',
          details: 'LINE認証コンテキストが見つかりません。再度ログインをお試しください。',
        },
        { status: 400 }
      )
    }

    // Get valid LINE access token
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      console.warn('[API /api/auth/line-session] No valid LINE access token available')
      return NextResponse.json(
        {
          error: 'LINE authentication required',
          details: 'LINE認証が必要です。再度ログインをお試しください。',
        },
        { status: 401 }
      )
    }

    // Get LINE user profile information
    let lineProfile: LineProfileResponse
    try {
      console.log('[API /api/auth/line-session] Fetching LINE user profile...')

      const profileResponse = await fetch('https://api.line.me/v2/profile', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'Bocker-LINE-Session/1.0',
        },
      })

      if (!profileResponse.ok) {
        const errorData = await profileResponse.text()
        console.error('[API /api/auth/line-session] LINE Profile API failed:', {
          status: profileResponse.status,
          statusText: profileResponse.statusText,
          error: errorData,
        })
        throw new Error(`LINE Profile API error: ${profileResponse.status}`)
      }

      lineProfile = await profileResponse.json()

      console.log('[API /api/auth/line-session] LINE profile retrieved successfully:', {
        userId: lineProfile.userId,
        displayName: lineProfile.displayName?.substring(0, 20) + '...',
        hasPicture: !!lineProfile.pictureUrl,
      })
    } catch (error) {
      console.error('[API /api/auth/line-session] Failed to get LINE profile:', error)
      return NextResponse.json(
        {
          error: 'Failed to retrieve LINE profile',
          details: 'LINEプロフィール情報の取得に失敗しました。',
        },
        { status: 500 }
      )
    }

    // Initialize customer repository
    const customerRepo = new CustomerRepository()

    // Check if customer exists by LINE ID
    let customer = await customerRepo.findByTenantAndOrgAndCustomerLineId(
      tenantId,
      orgId,
      lineProfile.userId
    )

    if (!customer) {
      console.log('[API /api/auth/line-session] Creating new LINE customer...')

      try {
        // Create new customer with LINE information
        const customerResult = await customerRepo.createCustomerWithDetailsAndPoints(
          {
            uid: uuidv4(), //一時的に
            tenant_id: tenantId,
            org_id: orgId,
            line_id: lineProfile.userId,
            line_user_name: lineProfile.displayName,
            customer_type: 'first_time',
          },
          {
            email: '', // LINE users might not have email
            gender: null,
            birthday: null,
            age: 0,
            notes: `LINE登録ユーザー - ${lineProfile.displayName}`,
          },
          0 // Initial points
        )

        customer = customerResult.customer
        console.log('[API /api/auth/line-session] New LINE customer created:', customer?.uid)
      } catch (error) {
        console.error('[API /api/auth/line-session] Failed to create LINE customer:', error)
        return NextResponse.json(
          {
            error: 'Failed to create customer account',
            details: '顧客アカウントの作成に失敗しました。',
          },
          { status: 500 }
        )
      }
    } else {
      console.log('[API /api/auth/line-session] Existing LINE customer found:', customer.uid)

      // Update LINE user name if it has changed
      if (customer.line_user_name !== lineProfile.displayName) {
        try {
          await customerRepo.updateCustomer(customer.uid, tenantId, orgId, {
            line_user_name: lineProfile.displayName,
          })
          console.log('[API /api/auth/line-session] Updated LINE display name')
        } catch (error) {
          console.warn('[API /api/auth/line-session] Failed to update display name:', error)
          // Non-critical error, continue with session creation
        }
      }
    }

    // Ensure customer exists before proceeding
    if (!customer) {
      console.error('[API /api/auth/line-session] Customer is null after creation/retrieval')
      return NextResponse.json(
        {
          error: 'Failed to resolve customer',
          details: '顧客情報の取得に失敗しました。再度お試しください。',
        },
        { status: 500 }
      )
    }

    // Create customer name with priority: first/last name → LINE display name → email → 'LINE User'
    const customerName =
      customer.last_name && customer.first_name
        ? `${customer.last_name} ${customer.first_name}`
        : customer.line_user_name || customer.email || 'LINE User'

    // Create JWT session payload
    const sessionPayload: SessionPayload = {
      customerUid: customer.uid,
      email: customer.email || undefined,
      customerName: customerName,
      tenantId: tenantId as Id<'tenant'>,
      orgId: orgId as Id<'organization'>,
      lineUserId: customer.line_id || undefined,
      lineUserName: customer.line_user_name || undefined,
      target_type: customer.customer_type as SessionPayload['target_type'],
    }

    // Generate JWT token
    const token = jwt.sign(sessionPayload, APP_JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    // Set HTTPOnly session cookie (exactly matching session API format)
    const cookieOptions = {
      httpOnly: true,
      secure: getEnv('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    }

    console.log('[API /api/auth/line-session] Setting session cookie:', {
      cookieName: LOGIN_SESSION_KEY,
      cookieOptions,
      tokenLength: token.length,
      nodeEnv: getEnv('NODE_ENV'),
      requestUrl: request.url,
      requestHost: request.headers.get('host'),
      requestOrigin: request.headers.get('origin'),
    })

    cookieStore.set(LOGIN_SESSION_KEY, token, cookieOptions)

    // Force cookie to be written immediately by attempting to read it back
    const immediateVerification = cookieStore.get(LOGIN_SESSION_KEY)
    console.log('[API /api/auth/line-session] Immediate cookie verification after set:', {
      cookieExists: !!immediateVerification,
      cookieLength: immediateVerification?.value?.length || 0,
      tokenMatches: immediateVerification?.value === token,
    })

    // Verify cookie was set immediately
    const verifySessionCookie = cookieStore.get(LOGIN_SESSION_KEY)
    console.log('[API /api/auth/line-session] Immediate cookie verification:', {
      cookieExists: !!verifySessionCookie,
      cookieValue: verifySessionCookie ? '***SET***' : 'NOT_SET',
      cookieValueLength: verifySessionCookie?.value?.length || 0,
    })

    // Additional verification - list all cookies
    const allCookiesAfterSet = cookieStore.getAll()
    console.log('[API /api/auth/line-session] All cookies after setting:', {
      totalCookies: allCookiesAfterSet.length,
      cookieNames: allCookiesAfterSet.map((c) => c.name),
      hasLoginSessionCookie: allCookiesAfterSet.some((c) => c.name === LOGIN_SESSION_KEY),
    })

    console.log('[API /api/auth/line-session] LINE session created successfully:', {
      customerUid: customer.uid,
      customerName: customerName,
      lineUserId: lineProfile.userId,
      tenantId,
      orgId,
    })

    return NextResponse.json(
      {
        success: true,
        customerUid: customer.uid,
        customerName: customerName,
        lineUserId: lineProfile.userId,
        lineUserName: lineProfile.displayName,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[API /api/auth/line-session] Unexpected error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : '内部サーバーエラーが発生しました。',
      },
      { status: 500 }
    )
  }
}
