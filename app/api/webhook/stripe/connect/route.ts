import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { stripeConnect } from '@/services/stripe/StripeConnect';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || null;

  console.log(`Received webhook at ${request.url}`);
  console.log(`Stripe signature present: ${!!signature}`);
  console.log(`Webhook secret set: ${!!webhookSecret}`);

  // リクエストボディを取得
  const body = await request.text();

  try {
    // 署名を検証してイベントを構築
    const event = await stripeConnect.verifyWebhookSignature(body, signature, webhookSecret);

    // イベントを処理
    const result = await stripeConnect.handleWebhookEvent(event);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    // Sentryでエラーを記録（設定されている場合）
    if (Sentry) {
      Sentry.captureException(error);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '不明なエラーが発生しました' },
      { status: 400 }
    );
  }
}
