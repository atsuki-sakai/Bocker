import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { decryptStringCryptoJS } from '@/lib/utils'
import { LINE_LOGIN_SESSION_KEY } from '@/services/line/constants'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// JWT署名用のシークレットキー (環境変数から取得)
const JWT_SECRET = process.env.JWT_SECRET || 'bocker-auth-session-secret-key'

// セッション情報取得API
export async function GET(req: NextRequest) {
  try {
    // クッキーからセッション情報を取得
    const cookieStore = await cookies()
    const authSession = cookieStore.get(LINE_LOGIN_SESSION_KEY)

    if (!authSession || !authSession.value) {
      console.log('[API /api/auth/session] Auth session cookie not found')
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    console.log('[API /api/auth/session] Returning auth session information')

    // セッション情報を返す（トークンはHTTPOnlyだが、APIを通して内容を提供）
    return NextResponse.json(
      {
        session: authSession.value,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[API /api/auth/session] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message || String(error) },
      { status: 500 }
    )
  }
}

// メール認証ログインAPI
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, salonId } = body

    if (!email || !password || !salonId) {
      return NextResponse.json(
        { error: 'Email, password and salonId are required' },
        { status: 400 }
      )
    }

    // Convexでユーザーを検索
    const existingCustomer = await convex.query(api.customer.core.query.findByEmail, {
      email,
      salonId,
    })

    if (!existingCustomer) {
      console.error('[API /api/auth/session] Customer not found with email:', email)
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // パスワードをデコードして比較
    const storedPassword = existingCustomer.password
    if (!storedPassword) {
      console.error('[API /api/auth/session] Password not set for customer:', existingCustomer._id)
      return NextResponse.json({ error: 'Account has no password set' }, { status: 401 })
    }

    const decryptedPassword = decryptStringCryptoJS(
      storedPassword,
      process.env.NEXT_PUBLIC_ENCRYPTION_SECRET_KEY!
    )

    if (password !== decryptedPassword) {
      console.error('[API /api/auth/session] Password mismatch for customer:', existingCustomer._id)
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // JWTトークンの生成
    const sessionPayload = {
      customerId: existingCustomer._id,
      salonId: salonId,
      email: email,
      tags: ['EMAIL'],
      // 必要に応じて他のフィールドを追加
    }

    const sessionToken = jwt.sign(sessionPayload, JWT_SECRET, { expiresIn: '30d' })
    console.log('[API /api/auth/session] Issuing auth session cookie for email login')

    // レスポンスの作成とクッキーの設定
    const response = NextResponse.json(
      {
        success: true,
        message: 'Email authentication successful',
        customerId: existingCustomer._id,
      },
      { status: 200 }
    )

    response.cookies.set(LINE_LOGIN_SESSION_KEY, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30日間
    })

    return response
  } catch (error: any) {
    console.error('[API /api/auth/session] Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message || String(error) },
      { status: 500 }
    )
  }
}
