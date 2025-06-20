import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'
import { LINE_STATE_SESSION_KEY, LINE_STATE_EXPIRY_MS } from '@/services/line/constants'
import { getEnv } from '@/lib/env-config'

// HTTPOnlyクッキーで安全にstateを管理するAPI

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, orgId } = body

    console.log('[API /api/auth/line-state POST] Received request:', { tenantId, orgId })

    if (!tenantId || !orgId) {
      console.error('[API /api/auth/line-state POST] Missing required fields')
      return NextResponse.json(
        { error: 'tenantId and orgId are required' },
        { status: 400 }
      )
    }

    // ユニークなstate値を生成
    const stateId = uuidv4()
    console.log('[API /api/auth/line-state POST] Generated stateId:', stateId)
    
    // stateデータをJSON文字列化
    const stateData = JSON.stringify({
      tenantId,
      orgId,
      timestamp: Date.now(),
      stateId
    })

    // HTTPOnlyクッキーとして保存（XSS攻撃から保護）
    const cookieStore = await cookies()
    const cookieOptions = {
      httpOnly: true,
      secure: getEnv('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: LINE_STATE_EXPIRY_MS / 1000 // 秒単位
    }
    
    console.log('[API /api/auth/line-state POST] Setting cookie with options:', cookieOptions)
    cookieStore.set(LINE_STATE_SESSION_KEY, stateData, cookieOptions)

    // 設定後のクッキーを確認
    const setCookie = cookieStore.get(LINE_STATE_SESSION_KEY)
    console.log('[API /api/auth/line-state POST] Cookie after setting:', setCookie ? 'Set successfully' : 'Failed to set')

    // state IDをクライアントに返す（これをLINE OAuth URLに含める）
    return NextResponse.json({ stateId }, { status: 200 })

  } catch (error) {
    console.error('[API /api/auth/line-state POST] Error:', error)
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
    const skipValidation = searchParams.get('skipValidation') === 'true'

    console.log('[API /api/auth/line-state GET] Request params:', {
      stateId,
      skipValidation,
      url: request.url
    })

    // HTTPOnlyクッキーからstateデータを取得
    const cookieStore = await cookies()
    const stateCookie = cookieStore.get(LINE_STATE_SESSION_KEY)
    
    console.log('[API /api/auth/line-state GET] Cookie found:', stateCookie ? 'Yes' : 'No')
    if (stateCookie) {
      console.log('[API /api/auth/line-state GET] Cookie value length:', stateCookie.value?.length)
    }

    if (!stateCookie || !stateCookie.value) {
      console.error('[API /api/auth/line-state GET] Cookie not found or empty')
      return NextResponse.json(
        { error: 'State not found or expired' },
        { status: 404 }
      )
    }

    try {
      const stateData = JSON.parse(stateCookie.value)
      console.log('[API /api/auth/line-state GET] Parsed state data:', {
        tenantId: stateData.tenantId,
        orgId: stateData.orgId,
        stateId: stateData.stateId,
        timestamp: stateData.timestamp
      })
      
      // skipValidationがtrueの場合、state IDの検証をスキップ
      if (!skipValidation && stateId) {
        // state IDの検証
        if (stateData.stateId !== stateId) {
          console.log('[API /api/auth/line-state GET] State ID mismatch:', {
            expected: stateData.stateId,
            received: stateId
          })
          return NextResponse.json(
            { error: 'Invalid state' },
            { status: 401 }
          )
        }
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
      // skipValidation が true の場合は ReserveRedirectPage 等の二重読み取り対策として
      // クッキーを残したままにし、通常の検証フローの場合のみ削除する。
      if (!skipValidation) {
        cookieStore.delete(LINE_STATE_SESSION_KEY)
      }

      // tenantIdとorgIdを返す
      return NextResponse.json(
        {
          tenantId: stateData.tenantId,
          orgId: stateData.orgId,
          originalStateId: stateData.stateId
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