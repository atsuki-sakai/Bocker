import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { stripeService } from '@/services/stripe/StripeService';
import { withAuth, validateRequest } from '@/lib/api/middleware';
import { z } from 'zod';

// Validation schema
const stripeConnectLoginSchema = z.object({
  stripe_account_id: z.string().startsWith('acct_', 'Invalid Stripe account ID'),
});


export const POST = withAuth(async (request, auth) => {
  try {
    // Validate request body
    const validation = await validateRequest(request, stripeConnectLoginSchema);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { stripe_account_id } = validation.data;

    // Only admin and owner can access Stripe dashboard
    if (!['admin', 'owner'].includes(auth.role)) {
      return NextResponse.json(
        { error: 'Stripeダッシュボードへのアクセスには管理者権限が必要です' },
        { status: 403 }
      );
    }

    // StripeConnectクラスを使用してログインリンクを生成
    const result = await stripeService.createConnectAccountDashboardLink(stripe_account_id);

    if (result.success && result.data) {
      // 成功した場合はURLとisOnboardingフラグを返す
      return NextResponse.json({
        url: result.data.url,
        isOnboarding: result.data.isOnboarding || false,
      });
    } else {
      // エラーの場合はSentryに記録してエラーレスポンスを返す
      Sentry.captureMessage('Failed to generate Stripe login link', {
        tags: {
          stripe_account_id,
          component: 'stripe_dashboard_login',
        },
        level: 'error',
        extra: { error: result.error },
      });

      return NextResponse.json(
        { error: result.error || 'ダッシュボードURLの生成に失敗しました' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Stripe Dashboard Login Link Error:', error);
    Sentry.captureException(error, {
      tags: {
        component: 'stripe_dashboard_login',
      },
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '不明なエラーが発生しました' },
      { status: 500 }
    );
  }
})


/**
 * Stripe Dashboard Loginエンドポイントの動作確認用GETリクエストハンドラ
 * @returns NextResponse - エンドポイントの状態を示すJSONレスポンス
 */
export async function GET(): Promise<NextResponse> {
  // エンドポイントが動作していることを示すメッセージと、
  // 現在の実装バージョン、主要な機能リストを返す
  return NextResponse.json(
    {
      message: 'Stripe Dashboard Login endpoint is working. Please use POST for webhooks.',
      version: '2.0.0', // 現在のWebhook処理ロジックのバージョン
      status: 'healthy', // エンドポイントの健康状態
      timestamp: new Date().toISOString(), // 現在時刻
      features: [
        'Pure Function Architecture', // 関数型プログラミングに基づいた設計
        'Parallel Processing for I/O bound tasks', // I/O処理の並列実行
        'Advanced Metrics Collection (Sentry)', // Sentryによる詳細なメトリクス収集
        'Enhanced Type Safety (TypeScript, Zod)', // TypeScriptとZodによる型安全性
        'Dependency Injection for Testability', // DIによるテスト容易性の向上
        'Idempotency Handling', // 冪等性担保
        'Retry Logic for Critical Operations', // クリティカルな操作のリトライ処理
      ],
    },
    { status: 200 }
  );
}