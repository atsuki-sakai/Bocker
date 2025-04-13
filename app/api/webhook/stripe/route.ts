import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchMutation } from 'convex/nextjs';
import { normalizeSubscriptionStatus, priceIdToPlanInfo } from '@/lib/utils';
import { STRIPE_API_VERSION } from '@/lib/constants';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';

import { stripeService } from '@/services/stripe/StripeService';

export async function POST(req: Request) {
  const webhookSubscriptionSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const { event, error } = await stripeService.processStripeWebhookRequest(
    req,
    webhookSubscriptionSecret
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
    // イベントタイプに基づいて適切なハンドラに振り分け
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted' ||
      event.type === 'invoice.payment_succeeded' ||
      event.type === 'invoice.payment_failed'
    ) {
      // サブスクリプション関連のイベント
      const result = await stripeService.handleSubscriptionWebhookEvent(event);
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
