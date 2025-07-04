import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import jwt from 'jsonwebtoken' // JWTを扱うためにjsonwebtokenをインストールする必要があります
import { v4 as uuidv4 } from 'uuid'
import { LOGIN_SESSION_KEY } from '@/services/line/constants'
import { InsertType, SupabaseService } from '@/services/supabase/SupabaseService'
import { CustomerRepository } from '@/services/supabase/repositories/customer/CustomerRepository'
import { SystemError } from '@/lib/errors/custom_errors'
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants'
import { getEnv } from '@/lib/env-config'
import { createClient } from '@supabase/supabase-js'

const convex = new ConvexHttpClient(getEnv('NEXT_PUBLIC_CONVEX_URL'))

// LINEのIDトークン検証エンドポイント
const LINE_VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify'
// JWT署名用のシークレットキー (環境変数から取得)
const APP_JWT_SECRET = getEnv('APP_JWT_SECRET')

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
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  console.log(`[API /api/line/verify-token] [${requestId}] Received POST request`)
  
  try {
    const body = await req.json()
    const { idToken, tenantId, orgId } = body
    
    console.log(`[API /api/line/verify-token] [${requestId}] Request body:`, { 
      hasIdToken: !!idToken, 
      tenantId, 
      orgId,
      idTokenLength: idToken?.length,
      userAgent: req.headers.get('user-agent'),
      origin: req.headers.get('origin')
    })

    const organizationApiConfig = await convex.query(api.organization.api_config.query.findByTenantAndOrg, {
      tenant_id: tenantId,
      org_id: orgId,
    })

    console.log('[API /api/line/verify-token] Organization API config:', {
      found: !!organizationApiConfig,
      hasLiffId: !!organizationApiConfig?.liff_id,
      hasChannelId: !!organizationApiConfig?.line_channel_id,
      channelId: organizationApiConfig?.line_channel_id,
      channelIdType: typeof organizationApiConfig?.line_channel_id,
      fullConfig: organizationApiConfig
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

    // IDトークンをデコードして期限を確認（署名は検証しない）
    try {
      const decoded = jwt.decode(idToken, { complete: true })
      const currentTime = Math.floor(Date.now() / 1000)
      
      // より安全で読みやすい期限チェック
      let isExpired = false
      let expirationTime: number | null = null
      
      if (decoded?.payload && typeof decoded.payload === 'object' && 'exp' in decoded.payload) {
        const exp = decoded.payload.exp
        if (typeof exp === 'number' && exp > 0) {
          expirationTime = exp
          isExpired = exp < currentTime
        }
      }
  
      console.log('[API /api/line/verify-token] ID Token decoded:', {
        header: decoded?.header,
        payload: decoded?.payload,
        currentTime,
        expirationTime,
        isExpired,
        expiredBy: isExpired && expirationTime ? currentTime - expirationTime : 0
      })
      
      // サーバー側でも期限切れを検出した場合の特別処理
      if (isExpired) {
        console.warn('[API /api/line/verify-token] Token is expired on server side, returning special error for re-authentication')
        return NextResponse.json(
          {
            error: 'token_expired',
            message: 'IDトークンが期限切れです。再度ログインしてください。',
            details: {
              error: 'token_expired',
              error_description: 'ID token has expired on server side',
              hint: '新しいIDトークンが必要です。ページを再読み込みしてください。',
              shouldReload: true
            }
          },
          { status: 401 }
        )
      }
    } catch (e) {
      console.error('[API /api/line/verify-token] Failed to decode ID token:', e)
    }

    console.log(`[API /api/line/verify-token] [${requestId}] Verifying idToken with LINE server...`)
    // 1. LINEサーバーでIDトークンを検証（タイムアウト付き）
    const params = new URLSearchParams()
    params.append('id_token', idToken)
    params.append('client_id', channelId)

    const lineResponse = await Promise.race([
      fetch(LINE_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('LINE API timeout after 15 seconds')), 15000)
      })
    ]) as Response

    console.log(`[API /api/line/verify-token] [${requestId}] LINE API response status:`, lineResponse.status)

    if (!lineResponse.ok) {
      const errorData = await lineResponse.json().catch(() => ({ error: 'Failed to parse error response' }))
      console.error(`[API /api/line/verify-token] [${requestId}] LINE token verification failed:`, {
        status: lineResponse.status,
        statusText: lineResponse.statusText,
        error: errorData,
        channelId: channelId,
        paramsLength: params.toString().length,
        headers: Object.fromEntries(lineResponse.headers.entries())
      })
      
      // より具体的なエラーメッセージとスマートフォン用の対処法
      let userMessage = 'LINE認証に失敗しました'
      let hint = 'しばらく待ってから再度お試しください'
      
      if (errorData.error_description?.includes('client_id') || errorData.error === 'invalid_client') {
        userMessage = 'LINEチャンネルIDの設定に問題があります'
        hint = '管理者にLINEログインチャンネルのChannel IDの確認を依頼してください'
      } else if (errorData.error?.includes('token') || lineResponse.status === 401) {
        userMessage = 'LINEログインセッションの有効期限が切れています'
        hint = 'ページを再読み込みしてから再度ログインしてください'
      } else if (lineResponse.status >= 500) {
        userMessage = 'LINEサーバーの一時的な問題です'
        hint = '数分後に再度お試しください'
      }
      
      return NextResponse.json({ 
        error: userMessage,
        details: {
          ...errorData,
          hint,
          requestId,
          shouldReload: errorData.error?.includes('token'),
          isTemporary: lineResponse.status >= 500
        }
      }, { status: 401 })
    }

    const verifiedToken: LineVerifyResponse = await lineResponse.json()
    console.log(`[API /api/line/verify-token] [${requestId}] LINE token verified successfully:`, {
      sub: verifiedToken.sub,
      aud: verifiedToken.aud,
      exp: verifiedToken.exp,
      hasName: !!verifiedToken.name,
      hasEmail: !!verifiedToken.email
    })

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
        // Supabase管理者クライアントを作成
        const supabase = createClient(
          getEnv('NEXT_PUBLIC_SUPABASE_URL'),
          getEnv('SUPABASE_SERVICE_ROLE_KEY')
        );
        
        const supabaseService = new SupabaseService(supabase);
        const customerRepo = new CustomerRepository(supabaseService);
        
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
              notes: 'LI',
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
      target_type: 'first_time',
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
      secure: getEnv('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30日間
    })

    return response
  } catch (error: unknown) {
    console.error(`[API /api/line/verify-token] [${requestId}] General error:`, {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    
    // スマートフォンユーザー向けのエラーメッセージ
    let userMessage = 'システムエラーが発生しました'
    let shouldReload = false
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        userMessage = '通信がタイムアウトしました'
        shouldReload = true
      } else if (error.message.includes('fetch') || error.message.includes('network')) {
        userMessage = 'ネットワークエラーが発生しました'
        shouldReload = true
      } else if (error.message.includes('JSON')) {
        userMessage = 'データの解析に失敗しました'
      }
    }
    
    return NextResponse.json(
      {
        error: userMessage,
        details: {
          message: error instanceof Error ? error.message : String(error),
          requestId,
          shouldReload,
          hint: shouldReload ? 'ページを再読み込みしてから再度お試しください' : 'しばらく待ってから再度お試しください'
        },
      },
      { status: 500 }
    )
  }
}
