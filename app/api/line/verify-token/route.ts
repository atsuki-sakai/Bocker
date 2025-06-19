import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import jwt from 'jsonwebtoken' // JWTを扱うためにjsonwebtokenをインストールする必要があります
import { v4 as uuidv4 } from 'uuid'
import { LOGIN_SESSION_KEY } from '@/services/line/constants'
import { getSupabaseAdminService, InsertType } from '@/services/supabase/SupabaseService'
import { CustomerRepository } from '@/services/supabase/repositories/customer/CustomerRepository'
import { SystemError } from '@/lib/errors/custom_errors'
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string)

// LINEのIDトークン検証エンドポイント
const LINE_VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify'
// JWT署名用のシークレットキー (環境変数から取得)
const APP_JWT_SECRET = process.env.APP_JWT_SECRET || 'bocker-auth-session-secret-key'

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
    const { idToken, tenantId, orgId } = body

    const organizationApiConfig = await convex.query(api.organization.api_config.query.findByTenantAndOrg, {
      tenant_id: tenantId,
      org_id: orgId,
    })

    if (!idToken) {
      console.error('[API /api/line/verify-token] idToken is missing in request body')
      return NextResponse.json({ error: 'idToken is required' }, { status: 400 })
    }
    if (!tenantId || !orgId) {
      console.warn(
        '[API /api/line/verify-token] tenantId or orgId is missing. These are required for reservation flow.'
      )
      return NextResponse.json({ 
        error: 'tenantId and orgId are required for reservation flow' 
      }, { status: 400 })
    }

    // LINE Channel IDの取得と検証を改善
    const channelId = organizationApiConfig?.line_channel_id

    if (!channelId) {
      // より詳細なエラーメッセージ
      const errorDetails = {
        message: 'LINE Channel ID が設定されていません',
        hint: '管理画面の「設定」→「API設定」で「LINE チャンネルID」を設定してください',
        debug: {
          hasLiffId: !!organizationApiConfig?.liff_id,
          hasLineChannelId: !!organizationApiConfig?.line_channel_id,
        }
      }
      console.error('[API /api/line/verify-token] Channel ID not found:', errorDetails)
      return NextResponse.json(
        { 
          error: 'LINE Channel ID not configured',
          details: errorDetails
        },
        { status: 500 }
      )
    }

    // LIFF IDではなくChannel IDであることを明示
    if (organizationApiConfig?.liff_id && !organizationApiConfig?.line_channel_id) {
      console.warn(
        '[API /api/line/verify-token] Using LIFF ID as fallback is deprecated. Please set line_channel_id in api_config.'
      )
    }

    console.log('[API /api/line/verify-token] Verifying idToken with LINE server...')
    // 1. LINEサーバーでIDトークンを検証
    const params = new URLSearchParams()
    params.append('id_token', idToken)
    params.append('client_id', channelId)

    const lineResponse = await fetch(LINE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })

    if (!lineResponse.ok) {
      const errorData = await lineResponse.json()
      console.error('[API /api/line/verify-token] LINE token verification failed:', {
        status: lineResponse.status,
        error: errorData,
        channelId: channelId,
      })
      
      // より具体的なエラーメッセージ
      let userMessage = 'LINE認証に失敗しました'
      if (errorData.error_description?.includes('client_id')) {
        userMessage = 'LINE Channel IDが正しくありません。管理画面でLINEログインチャンネルのChannel IDを確認してください'
      }
      
      return NextResponse.json({ 
        error: userMessage,
        details: {
          ...errorData,
          hint: 'LINEログインチャンネルのChannel ID（数字のみ）を設定する必要があります'
        }
      }, { status: 401 })
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

    // tenantIdとorgIdがある場合のみConvex処理 (予約フローを想定)
    let customerUid
    if (tenantId && orgId) {
      console.log(`[API /api/line/verify-token] Upserting customer info for tenantId: ${tenantId} and orgId: ${orgId}`)
      try {
        // Supabaseで顧客を検索・作成
        const supabaseAdmin = getSupabaseAdminService();
        const customerRepo = new CustomerRepository(supabaseAdmin);
        
        // 既存の顧客をLINE IDで検索（LINE IDの方が確実にユニーク）
        let existingCustomer = await customerRepo.findByTenantAndOrgAndCustomerLineId(
          tenantId,
          orgId,
          lineUserId
        );
        
        // LINE IDで見つからない場合、emailでも検索（emailがある場合のみ）
        if (!existingCustomer && email) {
          existingCustomer = await customerRepo.findByTenantAndOrgAndCustomerEmail(
            tenantId,
            orgId,
            email
          );
        }

        if (existingCustomer) {
          console.log('[API /api/line/verify-token] Existing customer found, updating...')
          
          // 顧客・詳細を更新
          const result = await customerRepo.updateCustomer(
            existingCustomer.uid,
            tenantId,
            orgId,
            {
              first_name: existingCustomer.first_name || '',
              last_name: existingCustomer.last_name || '',
              phone: existingCustomer.phone || '',
              line_id: lineUserId || existingCustomer.line_id || '',
              line_user_name: lineUserName || existingCustomer.line_user_name || '',
              email: email || existingCustomer.email || '',
            }
          );

          customerUid = result.uid || existingCustomer.uid;
          console.log(
            '[API /api/line/verify-token] Customer updated successfully. Customer ID:',
            customerUid
          );
        } else {
          console.log('[API /api/line/verify-token] New customer, creating...')
          
          // 新規顧客を作成
          const customerCoreData: InsertType<'customer'> = {
            uid: uuidv4(),
            email: email,
            first_name: '',
            last_name: '',
            phone: '',
            tenant_id: tenantId,
            org_id: orgId,
            line_id: lineUserId,
            line_user_name: lineUserName,
            password_hash: null, // パスワードはLINEログインでは使用しない
            customer_type: 'first_time', // 新規顧客は'first_time'に設定
          };
          
          const result = await customerRepo.createCustomerWithDetailsAndPoints(
            customerCoreData,
            {
              email: email || '',
              gender: null, // 性別はLINEログインでは取得できない
              birthday: null, // 誕生日はLINEログインでは取得できない
              age: 0, // 年齢は数値型なので0をデフォルト値にする
              notes: 'LINEから新規登録',
            },
            0
          );
          
          customerUid = result.customer?.uid;
          console.log(
            '[API /api/line/verify-token] New customer created successfully. Customer ID:',
            customerUid
          );
        }
      } catch (error: unknown) {
        console.error('[API /api/line/verify-token] Convex mutation/query error:', error)
        return NextResponse.json(
          {
            error: 'Failed to process customer data',
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        )
      }
    } else {
      // tenantIdとorgIdがない場合、汎用的なLINEログインとして扱う (例: LINEユーザーIDのみをセッション情報とする)
      // このユースケースがなければ、tenantIdとorgIdがない場合はエラーとしても良い
      console.warn(
        '[API /api/line/verify-token] tenantId and orgId not provided. Session will be based on LINE user ID only.'
      )
      throw new SystemError('tenantId and orgId not provided', {
        statusCode: ERROR_STATUS_CODE.BAD_REQUEST,
        severity: ERROR_SEVERITY.WARNING,
        message: 'tenantId and orgId not provided',
        title: 'tenantId and orgId not provided',
        callFunc: 'api/line/verify-token',
        code: 'LINE_VERIFY_TOKEN_ERROR',
        details: {
          tenantId: tenantId,
          orgId: orgId,
          lineUserId: lineUserId,
          lineUserName: lineUserName,
          email: email,
        }
      })
    }

    // 3. セッションCookieを発行 (JWTを使用)
    const sessionPayload = {
      lineUserId: lineUserId,
      customerUid: customerUid, // Supabaseの顧客UID
      tenantId: tenantId, // 予約フローのためにtenantIdもセッションに含める
      orgId: orgId, // 予約フローのためにorgIdもセッションに含める
      name: lineUserName,
      email: email,
      // 他にセッションに含めたい情報
    }

    const sessionToken = jwt.sign(sessionPayload, APP_JWT_SECRET, { expiresIn: '30d' }) // 30日間有効
    console.log('[API /api/line/verify-token] Issuing session cookie (bcker_login_session)')

    // NextResponseオブジェクトを作成して、それにCookieを設定します
    const response = NextResponse.json(
      { success: true, message: 'LINE authentication successful', customerUid },
      { status: 200 }
    )

    response.cookies.set(LOGIN_SESSION_KEY, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30日間
    })

    return response
  } catch (error: unknown) {
    console.error('[API /api/line/verify-token] General error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
