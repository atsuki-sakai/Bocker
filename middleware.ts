import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

// 認証不要なパス
const publicPaths = [
  "/", 
  "/api/webhook/clerk", 
  "/api/webhook/stripe",
  "/reservation/:path*",
];

// ngrokの公開URL
const ngrokUrl = process.env.NGROK_TUNNEL_URL || "";

// 認証ページのパス
const authPaths = ["/sign-in", "/sign-up", "/staff/login"];

// 認証が必要なAPIエンドポイント
const protectedApiPaths = [
  "/api/verify-password",
  "/dashboard/:path*",
];

const isPublicPath = (pathname: string): boolean => {
  // 認証ページも公開パスとして扱う
  if (isAuthPath(pathname)) {
    return true;
  }
  
  // 公開パスのチェック
  if (publicPaths.some(
    (publicPath) => 
      pathname === publicPath || pathname.startsWith(`${publicPath}/`)
  )) {
    return true;
  }
  
  // ngrokのURLとの一致確認
  if (ngrokUrl && (pathname === ngrokUrl || pathname.startsWith(`${ngrokUrl}/`))) {
    return true;
  }
  
  return false;
};

const isAuthPath = (pathname: string): boolean => 
  authPaths.some(
    (authPath) => 
      pathname === authPath || pathname.startsWith(`${authPath}/`)
  );

const isProtectedApiPath = (pathname: string): boolean =>
  protectedApiPaths.some(
    (apiPath) =>
      pathname === apiPath || pathname.startsWith(`${apiPath}/`)
  );

// Clerkミドルウェアの設定
export default clerkMiddleware(
  async (auth, req) => {
    const { userId } = await auth();
    const { pathname } = req.nextUrl;
    
    console.log(`[Middleware] Processing request: ${pathname}, userId: ${userId ? 'logged-in: ' + userId : 'not-logged-in'}`);
    console.log(`[Middleware] Current URL: ${req.url}`);
    
    // 公開パスの判定結果をログに出力
    const isPublic = isPublicPath(pathname);
    console.log(`[Middleware] Is public path: ${isPublic}`);
    
    // サインイン/サインアップページへの特別処理
    // ログイン済みの場合はダッシュボードへリダイレクト
    if (isAuthPath(pathname)) {
      if (userId) {
        console.log(`[Middleware] User is authenticated, redirecting to dashboard`);
        const dashboardUrl = new URL(`/dashboard`, req.url);
        return NextResponse.redirect(dashboardUrl);
      }
    }
    
    // 保護されたAPIエンドポイントへのアクセスには認証が必要
    if (isProtectedApiPath(pathname) && !userId) {
      console.log('[Middleware] Protected API access without auth, returning 401');
      return new NextResponse(
        JSON.stringify({ error: "認証が必要です" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // 公開パス以外の場合、未認証ならサインインページへリダイレクト
    if (!isPublic && !userId) {
      console.log('[Middleware] User not authenticated, redirecting to sign-in');
      const signInUrl = new URL("/sign-in", req.url);
      return NextResponse.redirect(signInUrl);
    }

    console.log('[Middleware] Proceeding to next middleware/handler');
    return NextResponse.next();
  }
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
