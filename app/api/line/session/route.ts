import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { LINE_LOGIN_SESSION_KEY } from '@/services/line/constants'

// 統一したクッキー名
const AUTH_COOKIE_NAME = LINE_LOGIN_SESSION_KEY

// クライアントサイドでHTTPOnlyクッキー（bcker_login_session）の内容を取得するためのAPI
export async function GET(_: NextRequest) {
  try {
    // クッキーからセッションを取得
    const cookieStore = await cookies()
    const authSession = cookieStore.get(AUTH_COOKIE_NAME)

    if (!authSession || !authSession.value) {
      console.log('[API /api/line/session] Auth session cookie not found')
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    console.log('[API /api/line/session] Returning auth session information')

    // セッション情報を返す（トークンはHTTPOnlyだが、APIを通して内容を提供）
    return NextResponse.json(
      {
        session: authSession.value,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('[API /api/line/session] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
