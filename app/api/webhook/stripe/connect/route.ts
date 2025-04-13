import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { stripeService } from '@/services/stripe';

// Stripe Webhook
const stripeWebhookSchema = z.object({
  id: z.string().min(1, { message: 'IDが空です' }),
  object: z.string().min(1, { message: 'オブジェクトが空です' }),
  type: z.string().min(1, { message: 'イベントタイプが空です' }),
  data: z.object({
    object: z.any(),
  }),
});

export async function POST(req: Request) {
  const { event, error } = await stripeService.processStripeWebhookRequest(req, true);
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

  // Zod による型チェック
  const validationResult = stripeWebhookSchema.safeParse(event);
  if (!validationResult.success) {
    Sentry.captureException(validationResult.error, {
      level: 'error',
      tags: {
        function: 'POST',
        url: req.url,
        webhook: 'connect',
      },
    });
    console.error('Stripe Connect webhookペイロードの検証エラー:', validationResult.error);
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }

  // 型チェック済みのイベントを利用
  const validatedEvent = validationResult.data;
  const eventType = validatedEvent.type;

  try {
    // Connect関連のイベントを処理
    const result = await stripeService.handleConnectWebhookEvent(event);
    if (!result.success) {
      throw new Error(result.message || 'Connect Webhook処理に失敗しました');
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    // クリティカルなエラーの場合は再試行を促すために5xxエラーを返す
    console.error(`Connect Webhook処理中の重大なエラー:`, error);
    Sentry.captureException(
      error instanceof Error ? error : new Error('Connect Webhook処理中の重大なエラー'),
      {
        level: 'error',
        tags: {
          function: 'connectWebhookHandler',
          eventType,
          eventId: validatedEvent.id,
          webhook: 'connect',
        },
      }
    );

    return NextResponse.json(
      { error: 'Internal server error processing Connect webhook' },
      { status: 500 } // 500エラーを返すとStripeは後でこのイベントを再送信する
    );
  }
}
