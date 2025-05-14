import { NextResponse, NextRequest } from 'next/server'
import { clerkMiddleware } from '@clerk/nextjs/server'
import { LINE_LOGIN_SESSION_KEY } from '@/services/line/constants'
import { TrackingEventType } from '@/services/convex/shared/types/common'
import { api } from '@/convex/_generated/api'
import { fetchQuery } from 'convex/nextjs'
import { fetchMutation } from 'convex/nextjs'
import { Id } from '@/convex/_generated/dataModel'

// メンテナンスモードが有効かどうか
const isMaintenance = false

// 認証不要なパス
const publicPaths = [
  '/',
  '/api/webhook/clerk',
  '/api/webhook/stripe',
  '/api/line/verify-token',
  '/api/line/session',
  '/api/auth/session',
  '/reservation',
  '/reservation/:path*', // Keep this for clarity, though handled separately below
  '/api/line',
]

// 認証ページのパス
const authPaths = ['/sign-in', '/sign-up', '/staff/login']

// 認証が必要なAPIエンドポイント
const protectedApiPaths = ['/api/verify-password', '/dashboard/:path*']

const isPublicPath = (pathname: string): boolean => {
  // 認証ページも公開パスとして扱う
  if (isAuthPath(pathname)) {
    return true
  }

  // 予約ページの特別処理 - Treat anything starting with /reservation as public
  if (pathname.startsWith('/reservation')) {
    return true
  }

  // 公開パスのチェック
  if (
    publicPaths.some(
      // Use regex for more accurate matching or just startsWith
      (publicPath) =>
        pathname === publicPath ||
        (publicPath.endsWith('/') && pathname.startsWith(publicPath)) ||
        pathname === publicPath.replace(/\/$/, '') // Handle /path and /path/ cases
    )
  ) {
    return true
  }
  return false
}

const isAuthPath = (pathname: string): boolean =>
  authPaths.some((authPath) => pathname === authPath || pathname.startsWith(`${authPath}/`))

const isProtectedApiPath = (pathname: string): boolean =>
  protectedApiPaths.some((apiPath) => pathname === apiPath || pathname.startsWith(`${apiPath}/`))

// setTrackingDataCookie 関数はレスポンスオブジェクトを受け取り、それにクッキーを設定する役割
const setTrackingDataCookie = (
  req: NextRequest,
  res: NextResponse,
  targetStartsWithPath: string,
  pathname: string
) => {
  // 対象のパスでない場合は何もしない
  if (!pathname.startsWith(targetStartsWithPath)) {
    return
  }

  const campaign = req.nextUrl.searchParams.get('campaign')
  const source = req.nextUrl.searchParams.get('source')
  const medium = req.nextUrl.searchParams.get('medium')
  const term = req.nextUrl.searchParams.get('term')

  const trackingData: {
    code?: string // 流入元識別子(line, google, etc.)
    source?: string // 流入元サイト
    medium?: string // 流入媒体、投稿メディア
    campaign?: string // 流入キャンペーン
    term?: string // 流入キーワード
    content?: string // 流入コンテンツ
    referer?: string // リファラー
    sessionId?: string // セッションID
  } = {}

  if (campaign) {
    trackingData.campaign = campaign
  }
  if (source) {
    trackingData.source = source
  }
  if (medium) {
    trackingData.medium = medium
  }
  if (term) {
    trackingData.term = term
  }

  // トラッキングデータがある場合は、JSON文字列を含む1つのCookieを設定
  if (Object.keys(trackingData).length > 0) {
    try {
      // 既存のCookieを削除
      res.cookies.delete('_bkr_tracking_source')
      console.log('[Middleware] Deleted existing tracking_data cookie.')

      const trackingDataJson = JSON.stringify(trackingData)
      res.cookies.set({
        name: '_bkr_tracking_source', // 1つのCookie名を使用
        value: trackingDataJson,
        httpOnly: true, // セキュリティのためhttpOnlyを保持
        secure: process.env.NODE_ENV === 'production', // 本番環境ではSecureを設定
        path: '/', // サイト全体で利用可能
        maxAge: 60 * 60 * 24 * 30, // 30日
        sameSite: 'lax',
      })
      console.log('[Middleware] Setting tracking_data cookie:', trackingDataJson)
    } catch (error) {
      console.error('[Middleware] トラッキングデータのJSON変換に失敗:', error)
      // オプションでエラーを処理, コッキーを設定しない
    }
  } else {
    console.log('[Middleware] No tracking parameters found.')
  }
}

const checkMaintenance = (pathname: string, req: NextRequest) => {
  // メンテナンスモードが有効で、かつ現在のパスがメンテナンスページでない場合にリダイレクト
  if (isMaintenance && pathname !== '/maintenance') {
    const maintenanceUrl = new URL('/maintenance', req.url)
    return NextResponse.redirect(maintenanceUrl)
  }

  // メンテナンスページへのアクセスの場合は、以降の処理をスキップしてページを表示
  if (pathname === '/maintenance') {
    return NextResponse.next()
  }
}

// Clerkミドルウェアの設定
export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl // 現在のパスを取得

  // メンテナンスチェックを行い、リダイレクトまたは次の処理へ進むレスポンスを取得
  const maintenanceResponse = checkMaintenance(pathname, req)
  // maintenanceResponse が NextResponse オブジェクトであれば、それを返す
  if (maintenanceResponse instanceof NextResponse) {
    return maintenanceResponse
  }

  const { userId, orgId } = await auth()
  const { searchParams, origin } = req.nextUrl

  console.log(`[Middleware] -----------------------------------------------------`)
  console.log(
    `[Middleware] Request: ${req.method} ${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
  )
  console.log(`[Middleware] Origin: ${origin}`)
  console.log(`[Middleware] Clerk userId: ${userId}, orgId: ${orgId}`)

  // LINEセッションCookieの確認 (Assuming LINE_LOGIN_SESSION_KEY is used for both LINE and potentially other auth sessions)
  const lineSessionCookie = req.cookies.get(LINE_LOGIN_SESSION_KEY)
  // const authSessionCookie = req.cookies.get(LINE_LOGIN_SESSION_KEY); // authSessionCookieも同じ変数を見ているようです

  // 有効なセッションかをログに記録
  console.log(
    `[Middleware] Auth session cookie (${LINE_LOGIN_SESSION_KEY}): ${lineSessionCookie ? 'present' : 'absent'}, value: ${lineSessionCookie?.value ? 'has content' : 'empty'}`
  )

  // 公開パスの判定
  const isPublic = isPublicPath(pathname)
  console.log(`[Middleware] Pathname: ${pathname}, Is public path? ${isPublic}`)

  // 認証ページの判定
  const isAuthPg = isAuthPath(pathname)
  console.log(`[Middleware] Is auth page? ${isAuthPg}`)

  // 保護されたAPIエンドポイントの判定
  const isProtectedApi = isProtectedApiPath(pathname)
  console.log(`[Middleware] Is protected API path? ${isProtectedApi}`)

  let response: NextResponse // 生成するレスポンスを格納する変数

  // 訪問者IDの管理
  let sessionId = req.cookies.get('_bkr_session_id')?.value
  let newSessionIdCookieSet = false
  if (!sessionId) {
    sessionId = crypto.randomUUID() // Node.jsのcryptoモジュールではなく、Web Crypto APIを使用
    newSessionIdCookieSet = true // 新しいCookieがセットされることを示すフラグ
    console.log(`[Middleware] New session ID generated: ${sessionId}`)
  } else {
    console.log(`[Middleware] Existing session ID found: ${sessionId}`)
  }

  // サインイン/サインアップページへの特別処理
  // Clerkでログイン済みの場合はダッシュボードへリダイレクト
  if (isAuthPg) {
    if (userId) {
      const dashboardUrl = new URL(`/dashboard`, req.url)
      console.log(
        `[Middleware] User is authenticated with Clerk on auth page, redirecting to dashboard: ${dashboardUrl.toString()}`
      )
      response = NextResponse.redirect(dashboardUrl) // レスポンスを設定
    } else {
      console.log(
        `[Middleware] User is not authenticated with Clerk, proceeding to auth page: ${pathname}`
      )
      response = NextResponse.next() // レスポンスを設定
      // Clerk middleware will handle rendering the auth page for non-authenticated users
    }
  }
  // 保護されたAPIエンドポイントへのアクセス
  // ClerkユーザーIDがなく、認証セッションもない場合は認証エラー
  else if (isProtectedApi && !userId && !lineSessionCookie) {
    // 認証セッションはlineSessionCookieのみチェックすれば良さそうであれば修正
    console.log('[Middleware] Protected API access without any authentication, returning 401')
    response = new NextResponse(JSON.stringify({ error: '認証が必要です' }), {
      // レスポンスを設定
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  // 保護されたAPIエンドポイントだが認証あり (Clerk or other session)
  else if (isProtectedApi && (userId || lineSessionCookie)) {
    // 認証セッションはlineSessionCookieのみチェックすれば良さそうであれば修正
    console.log('[Middleware] Protected API access with authentication, proceeding.')
    response = NextResponse.next() // レスポンスを設定
  }
  // 公開パスでなく、かつ ClerkユーザーIDもなく、認証セッションもない場合
  // → サインインページへリダイレクト
  else if (!isPublic && !userId && !lineSessionCookie) {
    // 認証セッションはlineSessionCookieのみチェックすれば良さそうであれば修正
    console.log(
      '[Middleware] User not authenticated (neither Clerk nor any session), redirecting to sign-in'
    )
    const signInUrl = new URL('/sign-in', req.url)
    // 元のURLをクエリパラメータとして追加することも検討 (redirect_url)
    // signInUrl.searchParams.set('redirect_url', pathname);
    response = NextResponse.redirect(signInUrl) // レスポンスを設定
  }
  // 上記のどれにも当てはまらない場合 (公開パス or 認証済み)
  else {
    console.log('[Middleware] Request will proceed. Is public or user authenticated (Clerk/LINE).')
    response = NextResponse.next() // レスポンスを設定
  }

  // ここで流入元をTrackingEventに保存する
  if (pathname.startsWith(TARGET_PATH_PREFIX)) {
    const code = req.nextUrl.searchParams.get('code')

    console.log('[Middleware] Attempting to get salonId for tracking.')
    // getSalonIdFromRequest に middleware の auth 関数を渡す
    const salonId = await getSalonIdFromRequest(req, auth)
    const codeValue = determineTrackingCode(code)

    if (salonId && codeValue) {
      console.log(
        `[Middleware] SalonId: ${salonId}, CodeValue: ${codeValue}. Creating tracking event for visitor: ${sessionId}.`
      )
      try {
        await fetchMutation(api.tracking.mutation.createTrackingEvent, {
          salonId: salonId as Id<'salon'>,
          eventType: 'page_view' as TrackingEventType, // TrackingEventType型に合わせる
          code: codeValue,
          sessionId: sessionId, // 訪問者IDを渡す
        })
      } catch (error) {
        console.error('[Middleware] Error creating tracking event:', error)
      }
    } else {
      if (!salonId) {
        console.log('[Middleware] Tracking event not sent: salonId could not be determined.')
      }
      if (!codeValue && salonId) {
        // salonIdはあるがcodeValueがない場合（通常はdetermineTrackingCodeでデフォルト値が返るはず）
        console.log(
          '[Middleware] Tracking event not sent: codeValue could not be determined, even with defaults.'
        )
      }
    }
  }

  // **ここが重要**:
  // 上で決定した 'response' オブジェクトに対してクッキーを設定する関数を呼び出す
  // 関数は void を返すので、response 変数はそのまま使用できる
  setTrackingDataCookie(req, response, '/reservation', pathname)

  // 新しい訪問者IDが生成された場合、レスポンスにCookieを設定
  if (newSessionIdCookieSet && sessionId) {
    response.cookies.set({
      name: '_bkr_session_id',
      value: sessionId,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7日間有効
      sameSite: 'lax',
    })
    console.log(`[Middleware] Setting new session_id cookie: ${sessionId}`)
  }

  console.log(`[Middleware] Final response determined.`)
  // 決定し、必要に応じてクッキー設定関数で修正された response を返す
  return response
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes explicitly if needed, though the above often covers it
    '/(api|trpc)(.*)',
  ],
}

// ★★★ 以下について、具体的な値を教えてください ★★★
const TARGET_PATH_PREFIX = '/reservation' // 例: '/reservation' や '/lp' など、対象のルートプレフィックス

// salonId をリクエストから取得する関数
// clerkMiddlewareから渡されるauth関数を引数として受け取るように変更
async function getSalonIdFromRequest(
  req: NextRequest,
  auth: any // 型をanyに変更して様子を見る
): Promise<string | null> {
  const { userId } = await auth()
  if (!userId) {
    console.log('[Middleware][getSalonIdFromRequest] No userId found from auth().')
    return null
  }
  try {
    console.log(`[Middleware][getSalonIdFromRequest] Fetching salon for userId: ${userId}`)
    const salon = await fetchQuery(api.salon.core.query.findByClerkId, { clerkId: userId })
    if (salon) {
      console.log(`[Middleware][getSalonIdFromRequest] Salon found: ${salon._id}`)
      return salon._id
    } else {
      console.log(`[Middleware][getSalonIdFromRequest] No salon found for userId: ${userId}`)
      return null
    }
  } catch (error) {
    console.error('[Middleware][getSalonIdFromRequest] Error fetching salonId:', error)
    // Convex SDK (fetchQuery) がEdge Runtimeで期待通りに動作するかは注意が必要です。
    // もし問題が発生する場合は、このロジックをAPI Routeに移動することを検討してください。
    return null
  }
}

// トラッキングデータから適切な `code` を決定する仮の関数
function determineTrackingCode(trackingCode?: string | null) {
  if (!trackingCode) return 'direct' // デフォルト値または適切なロジック

  const code = trackingCode?.toLowerCase()
  // const medium = trackingData.medium?.toLowerCase(); // 必要に応じてmediumも使用

  if (code?.includes('line')) return 'line'
  if (code?.includes('googleMap')) return 'googleMap'
  if (code?.includes('facebook')) return 'facebook'
  if (code?.includes('instagram')) return 'instagram'
  if (code?.includes('tiktok')) return 'tiktok'
  if (code?.includes('x')) return 'x'
  if (code?.includes('youtube')) return 'youtube'
  // 他のソースや媒体に基づいたマッピングルールを追加

  return 'unknown' // いずれにも一致しない場合のデフォルト
}
