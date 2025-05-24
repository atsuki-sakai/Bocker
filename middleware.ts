import { NextResponse, NextRequest } from 'next/server'
import { clerkMiddleware } from '@clerk/nextjs/server'
import { LINE_LOGIN_SESSION_KEY } from '@/services/line/constants'
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

  console.log(`[Middleware] Final response determined.`)
  // 決定し、必要に応じてクッキー設定関数で修正された response を返す
  return response
})

export const config = {
  matcher: [
    '/((?!api/|_next/static/|_next/image/|images/|img/|assets/|favicon.ico|sw.js).*)',
  ],
}
