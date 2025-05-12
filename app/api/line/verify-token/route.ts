import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken' // JWTを扱うためにjsonwebtokenをインストールする必要があります
import { LINE_LOGIN_SESSION_KEY } from '@/services/line/constants'
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// LINEのIDトークン検証エンドポイント
const LINE_VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify'
// JWT署名用のシークレットキー (環境変数から取得)
const JWT_SECRET = process.env.JWT_SECRET || 'bocker-auth-session-secret-key'

interface LineVerifyResponse {
  iss: string // https://access.line.me
  sub: string // LINE User ID
  aud: string // LIFF Channel ID
  exp: number // Expiration time (epoch seconds)
  iat: number // Issued at time (epoch seconds)
  name?: string // User display name
  picture?: string // User profile image URL
  email?: string // User email (requires email scope)
}

export async function POST(req: NextRequest) {
  console.log('[API /api/line/verify-token] Received POST request')
  try {
    const body = await req.json()
    const { idToken, salonId } = body

    const salonApiConfig = await convex.query(api.salon.api_config.query.findBySalonId, {
      salonId: salonId,
    })

    if (!idToken) {
      console.error('[API /api/line/verify-token] idToken is missing in request body')
      return NextResponse.json({ error: 'idToken is required' }, { status: 400 })
    }
    if (!salonId) {
      console.warn(
        '[API /api/line/verify-token] salonId is missing. Proceeding without it for general login, but required for reservation flow.'
      )
      // 予約フロー以外の場合salonIdは必須ではないかもしれないので、ここでは警告に留める
    }
    if (!salonApiConfig?.lineChannelId) {
      console.error('[API /api/line/verify-token] salonApiConfig.lineChannelId is missing.')
      return NextResponse.json(
        { error: 'Server configuration error: LINE Channel ID missing' },
        { status: 500 }
      )
    }

    console.log('[API /api/line/verify-token] Verifying idToken with LINE server...')
    // 1. LINEサーバーでIDトークンを検証
    const params = new URLSearchParams()
    params.append('id_token', idToken)
    params.append('client_id', salonApiConfig.lineChannelId)

    const lineResponse = await fetch(LINE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })

    if (!lineResponse.ok) {
      const errorData = await lineResponse.json()
      console.error('[API /api/line/verify-token] LINE token verification failed:', errorData)
      return NextResponse.json({ error: 'Invalid LINE token', details: errorData }, { status: 401 })
    }

    const verifiedToken: LineVerifyResponse = await lineResponse.json()
    console.log('[API /api/line/verify-token] LINE token verified successfully:', verifiedToken)

    // 2. Convexでユーザー情報を登録/更新
    const lineUserId = verifiedToken.sub
    const lineUserName = verifiedToken.name
    const email = verifiedToken.email // emailスコープが必要

    if (!lineUserId) {
      console.error('[API /api/line/verify-token] LINE User ID (sub) is missing in verified token.')
      return NextResponse.json({ error: 'LINE User ID not found in token' }, { status: 400 })
    }

    // salonIdがある場合のみConvex処理 (予約フローを想定)
    let customerId
    if (salonId) {
      console.log(`[API /api/line/verify-token] Upserting customer info for salonId: ${salonId}`)
      try {
        const existingCustomer = await convex.query(api.customer.core.query.findByLineId, {
          lineId: lineUserId,
          salonId: salonId,
        })

        if (existingCustomer) {
          console.log('[API /api/line/verify-token] Existing customer found, updating...')
          await convex.mutation(api.customer.core.mutation.updateRelatedTables, {
            customerId: existingCustomer._id,
            salonId: salonId,
            lineId: lineUserId,
            lineUserName: lineUserName || existingCustomer.lineUserName || '',
            email: email || existingCustomer.email || '',
            // 他に必要なフィールドがあれば追加
          })
          customerId = existingCustomer._id
          console.log(
            '[API /api/line/verify-token] Customer updated successfully. Customer ID:',
            customerId
          )
        } else {
          console.log('[API /api/line/verify-token] New customer, creating...')
          customerId = await convex.mutation(api.customer.core.mutation.createCompleteFields, {
            salonId: salonId,
            lineId: lineUserId,
            lineUserName: lineUserName || '',
            email: email || '',
            tags: ['LINE'],
          })
          console.log(
            '[API /api/line/verify-token] Customer created successfully. Customer ID:',
            customerId
          )
        }
      } catch (error: any) {
        console.error('[API /api/line/verify-token] Convex mutation/query error:', error)
        return NextResponse.json(
          { error: 'Failed to process customer data', details: error.message || String(error) },
          { status: 500 }
        )
      }
    } else {
      // salonIdがない場合、汎用的なLINEログインとして扱う (例: LINEユーザーIDのみをセッション情報とする)
      // このユースケースがなければ、salonIdがない場合はエラーとしても良い
      console.warn(
        '[API /api/line/verify-token] salonId not provided. Session will be based on LINE user ID only.'
      )
      customerId = lineUserId // この場合、customerIdはLINEのユーザーIDそのものになる
    }

    // 3. セッションCookieを発行 (JWTを使用)
    const sessionPayload = {
      lineUserId: lineUserId,
      customerId: customerId, // Convexの顧客ID or LINE User ID
      salonId: salonId, // 予約フローのためにsalonIdもセッションに含める
      name: lineUserName,
      email: email,
      // 他にセッションに含めたい情報
    }

    const sessionToken = jwt.sign(sessionPayload, JWT_SECRET, { expiresIn: '30d' }) // 30日間有効
    console.log('[API /api/line/verify-token] Issuing session cookie (bcker_login_session)')

    // NextResponseオブジェクトを作成して、それにCookieを設定します
    const response = NextResponse.json(
      { success: true, message: 'LINE authentication successful', customerId },
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
    console.error('[API /api/line/verify-token] General error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message || String(error) },
      { status: 500 }
    )
  }
}
