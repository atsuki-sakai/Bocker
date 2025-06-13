import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'
import { LINE_STATE_SESSION_KEY, LINE_STATE_EXPIRY_MS } from '@/services/line/constants'

// HTTPOnlyクッキーで安全にstateを管理するAPI

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, orgId } = body

    if (!tenantId || !orgId) {
      return NextResponse.json(
        { error: 'tenantId and orgId are required' },
        { status: 400 }
      )
    }

    // ユニークなstate値を生成
    const stateId = uuidv4()
    
    // stateデータをJSON文字列化
    const stateData = JSON.stringify({
      tenantId,
      orgId,
      timestamp: Date.now(),
      stateId
    })

    // HTTPOnlyクッキーとして保存（XSS攻撃から保護）
    const cookieStore = await cookies()
    cookieStore.set(LINE_STATE_SESSION_KEY, stateData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: LINE_STATE_EXPIRY_MS / 1000 // 秒単位
    })

    // state IDをクライアントに返す（これをLINE OAuth URLに含める）
    return NextResponse.json({ stateId }, { status: 200 })

  } catch (error) {
    console.error('[API /api/auth/line-state] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stateId = searchParams.get('stateId')

    if (!stateId) {
      return NextResponse.json(
        { error: 'stateId is required' },
        { status: 400 }
      )
    }

    // HTTPOnlyクッキーからstateデータを取得
    const cookieStore = await cookies()
    const stateCookie = cookieStore.get(LINE_STATE_SESSION_KEY)

    if (!stateCookie || !stateCookie.value) {
      return NextResponse.json(
        { error: 'State not found or expired' },
        { status: 404 }
      )
    }

    try {
      const stateData = JSON.parse(stateCookie.value)
      
      // state IDの検証
      if (stateData.stateId !== stateId) {
        return NextResponse.json(
          { error: 'Invalid state' },
          { status: 401 }
        )
      }

      // タイムスタンプの検証（有効期限チェック）
      if (Date.now() - stateData.timestamp > LINE_STATE_EXPIRY_MS) {
        // 期限切れのstateを削除
        cookieStore.delete(LINE_STATE_SESSION_KEY)
        return NextResponse.json(
          { error: 'State expired' },
          { status: 401 }
        )
      }

      // 使用済みのstateを削除（CSRF攻撃対策）
      cookieStore.delete(LINE_STATE_SESSION_KEY)

      // tenantIdとorgIdを返す
      return NextResponse.json(
        {
          tenantId: stateData.tenantId,
          orgId: stateData.orgId
        },
        { status: 200 }
      )

    } catch (e) {
      console.error('[API /api/auth/line-state] Failed to parse state:', e)
      return NextResponse.json(
        { error: 'Invalid state data' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('[API /api/auth/line-state] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}