import { NextResponse, NextRequest } from 'next/server'
import { clerkMiddleware } from '@clerk/nextjs/server'
import { LOGIN_SESSION_KEY } from '@/services/line/constants'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// メンテナンスモードが有効かどうか
const isMaintenance = false

// next-intlミドルウェアの設定
const intlMiddleware = createMiddleware(routing)

// 認証不要なパス
const publicPaths = [
  '/',
  '/api/webhook/clerk',
  '/api/webhook/stripe/subscription',
  '/api/webhook/stripe/connect',
  '/api/webhook/stripe/checkout',
  '/api/line/verify-token',
  '/api/auth/session',
  '/api/auth/line-state',
  '/reservation',
  '/reservation/:path*', // Keep this for clarity, though handled separately below
  '/api/line',
  '/staff/invite-accept', // hash-basedルーティングを使用するため、:path*は不要
]

// 認証ページのパス
const authPaths = ['/sign-in', '/sign-up', '/staff/login', '/staff/invite-accept']

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

// 言語設定を除いたパスを取得する関数
const getPathnameWithoutLocale = (pathname: string): string => {
  const segments = pathname.split('/')
  if (segments.length > 1 && routing.locales.includes(segments[1] as any)) {
    return `/${segments.slice(2).join('/')}`
  }
  return pathname
}

// Clerkミドルウェアの設定
export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl // 現在のパスを取得
  const pathnameWithoutLocale = getPathnameWithoutLocale(pathname)

  // ★ manifest.jsonリクエストをルートにリダイレクト ★
  if (pathname.endsWith('/manifest.json') && pathname !== '/manifest.json') {
    return NextResponse.redirect(new URL('/manifest.json', req.url))
  }

  // ★ API ルートは next-intl のロケール付与から除外 ★
  if (pathnameWithoutLocale.startsWith('/api/')) {
    // APIルートはClerk認証のみ処理、next-intlは適用しない
    return NextResponse.next()
  }

  // メンテナンスチェックを行い、リダイレクトまたは次の処理へ進むレスポンスを取得
  const maintenanceResponse = checkMaintenance(pathnameWithoutLocale, req)
  // maintenanceResponse が NextResponse オブジェクトであれば、それを返す
  if (maintenanceResponse instanceof NextResponse) {
    return maintenanceResponse
  }

  const { userId } = await auth()
  // const { searchParams, origin } = req.nextUrl // 現在は使用していない


  // LINEセッションCookieの確認 (Assuming LOGIN_SESSION_KEY is used for both LINE and potentially other auth sessions)
  const lineSessionCookie = req.cookies.get(LOGIN_SESSION_KEY)
  // const authSessionCookie = req.cookies.get(LOGIN_SESSION_KEY); // authSessionCookieも同じ変数を見ているようです


  // 公開パスの判定（ロケール除去後のパスで判定）
  const isPublic = isPublicPath(pathnameWithoutLocale)

  // 認証ページの判定（ロケール除去後のパスで判定）
  const isAuthPg = isAuthPath(pathnameWithoutLocale)

  // 保護されたAPIエンドポイントの判定（ロケール除去後のパスで判定）
  const isProtectedApi = isProtectedApiPath(pathnameWithoutLocale)

  let response: NextResponse // 生成するレスポンスを格納する変数


  // サインイン/サインアップページへの特別処理
  // Clerkでログイン済みの場合はダッシュボードへリダイレクト
  if (isAuthPg) {
    if (userId) {
      // 現在の言語を保持してダッシュボードへリダイレクト
      const locale = pathname.split('/')[1]
      const isValidLocale = routing.locales.includes(locale as any)
      const redirectLocale = isValidLocale ? locale : routing.defaultLocale
      const dashboardUrl = new URL(`/${redirectLocale}/dashboard`, req.url)
      response = NextResponse.redirect(dashboardUrl) // レスポンスを設定
    } else {
      // next-intlミドルウェアを適用
      response = intlMiddleware(req)
    }
  }


  // 保護されたAPIエンドポイントへのアクセス
  // ClerkユーザーIDがなく、認証セッションもない場合は認証エラー
  else if (isProtectedApi && !userId && !lineSessionCookie) {
    // 認証セッションはlineSessionCookieのみチェックすれば良さそうであれば修正
    response = new NextResponse(JSON.stringify({ error: '認証が必要です' }), {
      // レスポンスを設定
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  // 保護されたAPIエンドポイントだが認証あり (Clerk or other session)
  else if (isProtectedApi && (userId || lineSessionCookie)) {
    // 認証セッションはlineSessionCookieのみチェックすれば良さそうであれば修正
    response = NextResponse.next() // レスポンスを設定
  }
  // 公開パスでなく、かつ ClerkユーザーIDもなく、認証セッションもない場合
  // → サインインページへリダイレクト
  else if (!isPublic && !userId && !lineSessionCookie) {
    // 認証セッションはlineSessionCookieのみチェックすれば良さそうであれば修正
    // 現在の言語を保持してサインインページへリダイレクト
    const locale = pathname.split('/')[1]
    const isValidLocale = routing.locales.includes(locale as any)
    const redirectLocale = isValidLocale ? locale : routing.defaultLocale
    const signInUrl = new URL(`/${redirectLocale}/sign-in`, req.url)
    // 元のURLをクエリパラメータとして追加することも検討 (redirect_url)
    // signInUrl.searchParams.set('redirect_url', pathname);
    response = NextResponse.redirect(signInUrl) // レスポンスを設定
  }
  // 上記のどれにも当てはまらない場合 (公開パス or 認証済み)
  else {
    // next-intlミドルウェアを適用
    response = intlMiddleware(req)
  }

  // 決定し、必要に応じてクッキー設定関数で修正された response を返す
  return response
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|json)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
