import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { LINE_LOGIN_SESSION_KEY } from '@/services/line/constants'

// 認証不要なパス
const publicPaths = [
  '/',
  '/api/webhook/clerk',
  '/api/webhook/stripe',
  '/api/line/verify-token',
  '/api/line/session',
  '/api/auth/session',
  '/reservation',
  '/reservation/:path*',
  '/api/line',
]

// ngrokの公開URL
const deployUrl =
  process.env.NEXT_PUBLIC_NODE_ENV === 'development'
    ? process.env.NEXT_PUBLIC_DEVELOP_URL
    : process.env.NEXT_PUBLIC_DEPLOY_URL || ''

// 認証ページのパス
const authPaths = ['/sign-in', '/sign-up', '/staff/login']

// 認証が必要なAPIエンドポイント
const protectedApiPaths = ['/api/verify-password', '/dashboard/:path*']

const isPublicPath = (pathname: string): boolean => {
  // 認証ページも公開パスとして扱う
  if (isAuthPath(pathname)) {
    return true
  }

  // 予約ページの特別処理
  if (pathname.startsWith('/reservation')) {
    return true
  }

  // 公開パスのチェック
  if (
    publicPaths.some(
      (publicPath) => pathname === publicPath || pathname.startsWith(`${publicPath}/`)
    )
  ) {
    return true
  }

  // ngrokのURLとの一致確認
  if (deployUrl && (pathname === deployUrl || pathname.startsWith(`${deployUrl}/`))) {
    return true
  }

  return false
}

const isAuthPath = (pathname: string): boolean =>
  authPaths.some((authPath) => pathname === authPath || pathname.startsWith(`${authPath}/`))

const isProtectedApiPath = (pathname: string): boolean =>
  protectedApiPaths.some((apiPath) => pathname === apiPath || pathname.startsWith(`${apiPath}/`))

// Clerkミドルウェアの設定
export default clerkMiddleware(async (auth, req) => {
  const { userId, orgId, sessionId } = await auth()
  const { pathname, searchParams, origin } = req.nextUrl

  console.log(`[Middleware] -----------------------------------------------------`)
  console.log(
    `[Middleware] Request: ${req.method} ${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
  )
  console.log(`[Middleware] Origin: ${origin}`)
  console.log(
    `[Middleware] Clerk userId: ${userId}, orgId: ${orgId}, sessionId: ${sessionId ? 'present' : 'absent'}`
  )

  // LINEセッションCookieの確認
  const lineSessionCookie = req.cookies.get(LINE_LOGIN_SESSION_KEY)
  const authSessionCookie = req.cookies.get(LINE_LOGIN_SESSION_KEY)

  // 有効なセッションかをログに記録
  console.log(
    `[Middleware] LINE session cookie (LINE_LOGIN_SESSION_KEY): ${lineSessionCookie ? 'present' : 'absent'}, value: ${lineSessionCookie?.value ? 'has content' : 'empty'}`
  )
  console.log(
    `[Middleware] Auth session cookie (${LINE_LOGIN_SESSION_KEY}): ${authSessionCookie ? 'present' : 'absent'}, value: ${authSessionCookie?.value ? 'has content' : 'empty'}`
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

  // サインイン/サインアップページへの特別処理
  // Clerkでログイン済みの場合はダッシュボードへリダイレクト
  if (isAuthPg) {
    if (userId) {
      const dashboardUrl = new URL(`/dashboard`, req.url)
      console.log(
        `[Middleware] User is authenticated with Clerk on auth page, redirecting to dashboard: ${dashboardUrl.toString()}`
      )
      return NextResponse.redirect(dashboardUrl)
    }
    console.log(
      `[Middleware] User is not authenticated with Clerk, proceeding to auth page: ${pathname}`
    )
    return NextResponse.next() // 認証ページ自体はClerkミドルウェアのデフォルト処理に任せるか、公開なのでそのまま表示
  }

  // 保護されたAPIエンドポイントへのアクセス
  // ClerkユーザーIDがなく、認証セッションもない場合は認証エラー
  if (isProtectedApi && !userId && !lineSessionCookie && !authSessionCookie) {
    console.log('[Middleware] Protected API access without any authentication, returning 401')
    return new NextResponse(JSON.stringify({ error: '認証が必要です' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (isProtectedApi && (userId || lineSessionCookie || authSessionCookie)) {
    console.log('[Middleware] Protected API access with authentication, proceeding.')
    return NextResponse.next()
  }

  // 公開パスでなく、ClerkユーザーIDもなく、認証セッションもない場合
  // → サインインページへリダイレクト
  if (!isPublic && !userId && !lineSessionCookie && !authSessionCookie) {
    console.log(
      '[Middleware] User not authenticated (neither Clerk nor any session), redirecting to sign-in'
    )
    const signInUrl = new URL('/sign-in', req.url)
    // 元のURLをクエリパラメータとして追加することも検討 (redirect_url)
    // signInUrl.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(signInUrl)
  }

  console.log('[Middleware] Request will proceed. Is public or user authenticated (Clerk/LINE).')
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
