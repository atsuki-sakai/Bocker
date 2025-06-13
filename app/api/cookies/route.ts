// POST /api/auth/logout
// このAPIはログアウト処理を行い、HttpOnly クッキー "bocker_login_session" を無効化します

import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'




/**
 * クッキー削除処理
 * @returns NextResponse JSON
 */
const performLogout = async (key: string): Promise<NextResponse> => {

  // クッキー取得
  const cookieStore = await cookies()

  // クッキーを削除 (メモリ上)
  cookieStore.delete(key)

  // ブラウザ側にも削除指示を返す
  const response = NextResponse.json({ success: true })

  // 失効済みクッキーを設定 (Max-Age=0)
  response.cookies.set(key, '', {
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
 * POST /api/cookies
 * フロントエンドは fetch('/api/cookies?key=<cookie_key>', { method: 'POST', credentials: 'include' }) で呼び出す
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const key = request.nextUrl.searchParams.get('key')
    if (!key) {
      return NextResponse.json({ error: 'cookie key is required' }, { status: 400 })
    }
    return await performLogout(key)
  } catch (error) {
    console.error('[API /api/auth/logout] Error:', error)
    return NextResponse.json({ error: 'ログアウト処理に失敗しました' }, { status: 500 })
  }
}