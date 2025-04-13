import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { stripeService } from '@/services/stripe/StripeService';

export async function POST(req: Request) {
  const webhookConnectSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  const { event, error } = await stripeService.processStripeWebhookRequest(
    req,
    webhookConnectSecret
  );
  if (error || !event) {
    Sentry.captureException(new Error(error ?? 'Unknown error'), {
      level: 'error',
      tags: {
        function: 'POST',
        url: req.url,
        webhook: 'connect',
      },
    });
    console.error('Stripe Connect webhook署名の検証に失敗しました:', error);
    return NextResponse.json({ error }, { status: 400 });
  }
  try {
    if (
      event.type === 'account.updated' ||
      event.type === 'account.application.authorized' ||
      event.type === 'account.application.deauthorized'
    ) {
      // Connect関連のイベント
      const result = await stripeService.handleConnectWebhookEvent(event);
      if (!result.success) {
        throw new Error(result.message || 'Webhook処理に失敗しました');
      }
    } else {
      console.log(`未対応のStripeイベントタイプ: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    // クリティカルなエラーの場合は再試行を促すために5xxエラーを返す
    console.error(`Webhook処理中の重大なエラー:`, error);
    Sentry.captureException(
      error instanceof Error ? error : new Error('Webhook処理中の重大なエラー'),
      {
        level: 'error',
        tags: {
          function: 'webhookHandler',
          eventType: event.type,
          eventId: event.id,
        },
      }
    );

    return NextResponse.json(
      { error: 'Internal server error processing webhook' },
      { status: 500 } // 500エラーを返すとStripeは後でこのイベントを再送信する
    );
  }
}
