// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { LINE_LOGIN_SESSION_KEY } from '@/services/line/constants'

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true })
  response.cookies.set(LINE_LOGIN_SESSION_KEY, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // 即時削除
  })
  return response
}
