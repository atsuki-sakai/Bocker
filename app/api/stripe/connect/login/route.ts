import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { stripeService } from '@/services/stripe';

export async function POST(request: Request) {
  try {
    // リクエストからアカウントIDを取得
    const { accountId, salonId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'アカウントIDが必要です' }, { status: 400 });
    }
    // StripeConnectクラスを使用してログインリンクを生成
    const result = await stripeService.createDashboardLoginLink(accountId);

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
          salonId,
          accountId,
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
}
