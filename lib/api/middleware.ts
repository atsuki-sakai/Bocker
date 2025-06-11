import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrganizationAuth } from '@/lib/auth/getOrganizationAuth'
import { z } from 'zod'
import { Id } from '@/convex/_generated/dataModel'
import { Role } from '@/convex/types'

// Type for authenticated context
export interface AuthContext {
  userId: string
  tenantId: Id<'tenant'>
  orgId: Id<'organization'>
  role: Role
  token: string
}

// Type for API handler with authentication
export type AuthenticatedHandler = (
  req: NextRequest,
  auth: AuthContext
) => Promise<NextResponse>

// Authentication middleware
export function withAuth(
  handler: AuthenticatedHandler,
  options?: {
    requiredRoles?: Role[]
  }
) {
  return async (req: NextRequest) => {
    try {
      // Check if user is authenticated with Clerk
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.json(
          { error: '認証が必要です' },
          { status: 401 }
        )
      }

      // Get organization auth context
      const authContext = await getOrganizationAuth()

      // Check role permissions if specified
      if (options?.requiredRoles && !options.requiredRoles.includes(authContext.role)) {
        return NextResponse.json(
          { error: 'この操作を実行する権限がありません' },
          { status: 403 }
        )
      }

      // Call the actual handler with auth context
      return handler(req, authContext)
    } catch (error) {
      console.error('Authentication middleware error:', error)
      
      // Handle redirect errors from getOrganizationAuth
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        return NextResponse.json(
          { error: '認証情報が不正です。再度ログインしてください。' },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { error: '認証処理中にエラーが発生しました' },
        { status: 500 }
      )
    }
  }
}

// Validation middleware
export async function validateRequest<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    const body = await req.json()
    const data = schema.parse(body)
    return { data, error: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return { data: null, error: errors }
    }
    return { data: null, error: '不正なリクエスト形式です' }
  }
}

// Combined auth + validation middleware
export function withAuthAndValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (req: NextRequest, auth: AuthContext, data: T | null) => Promise<NextResponse>,
  options?: {
    requiredRoles?: Role[]
  }
) {
  return withAuth(async (req, auth) => {
    const validation = await validateRequest(req, schema)
    
    if (validation.error) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }
    
    return handler(req, auth, validation.data)
  }, options)
}

// Rate limiting helper (basic in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function withRateLimit(
  handler: AuthenticatedHandler,
  options: {
    windowMs?: number // Time window in milliseconds (default: 15 minutes)
    max?: number // Max requests per window (default: 100)
    keyGenerator?: (req: NextRequest, auth: AuthContext) => string
  } = {}
) {
  const { 
    windowMs = 15 * 60 * 1000, 
    max = 100,
    keyGenerator = (_, auth) => auth.userId
  } = options

  return async (req: NextRequest, auth: AuthContext) => {
    const key = keyGenerator(req, auth)
    const now = Date.now()
    
    // Clean up expired entries
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetTime < now) {
        rateLimitMap.delete(k)
      }
    }
    
    // Check rate limit
    const limit = rateLimitMap.get(key)
    if (limit) {
      if (limit.count >= max) {
        const retryAfter = Math.ceil((limit.resetTime - now) / 1000)
        return NextResponse.json(
          { error: 'リクエスト数が制限を超えました。しばらく待ってから再試行してください。' },
          { 
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': max.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(limit.resetTime).toISOString()
            }
          }
        )
      }
      limit.count++
    } else {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    }
    
    // Add rate limit headers to response
    const response = await handler(req, auth)
    const currentLimit = rateLimitMap.get(key)!
    
    response.headers.set('X-RateLimit-Limit', max.toString())
    response.headers.set('X-RateLimit-Remaining', (max - currentLimit.count).toString())
    response.headers.set('X-RateLimit-Reset', new Date(currentLimit.resetTime).toISOString())
    
    return response
  }
}