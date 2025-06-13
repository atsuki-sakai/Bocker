// POST /api/auth/logout
// このAPIはログアウト処理を行い、HttpOnly クッキー "bocker_login_session" を無効化します

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { LOGIN_SESSION_KEY } from '@/services/line/constants'

export const runtime = 'nodejs'

/**
 * ログアウト共通処理
 * @returns NextResponse JSON
 */
const performLogout = async (): Promise<NextResponse> => {
  // クッキー取得
  const cookieStore = await cookies()

  // クッキーを削除 (メモリ上)
  cookieStore.delete(LOGIN_SESSION_KEY)

  // ブラウザ側にも削除指示を返す
  const response = NextResponse.json({ success: true })

  // 失効済みクッキーを設定 (Max-Age=0)
  response.cookies.set(LOGIN_SESSION_KEY, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // 即時失効
    expires: new Date(0),
  })

  return response
}

/**
 * POST /api/auth/logout
 * フロントエンドは fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) で呼び出す
 */
export async function POST(): Promise<NextResponse> {
  try {
    return await performLogout()
  } catch (error) {
    console.error('[API /api/auth/logout] Error:', error)
    return NextResponse.json({ error: 'ログアウト処理に失敗しました' }, { status: 500 })
  }
}

/**
 * GET /api/auth/logout
 * GET リクエストも許可しておくと利便性が上がる
 */
export async function GET(): Promise<NextResponse> {
  try {
    return await performLogout()
  } catch (error) {
    console.error('[API /api/auth/logout] Error:', error)
    return NextResponse.json({ error: 'ログアウト処理に失敗しました' }, { status: 500 })
  }
} 