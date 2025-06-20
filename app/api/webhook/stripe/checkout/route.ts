// app/api/webhook/stripe/checkout/route.ts
import { StripeWebhookProcessor } from '@/services/webhook/stripe/StripeWebhookProcessor';
import { NextRequest, NextResponse } from 'next/server';

// StripeWebhookProcessor のインスタンスを作成 (同じプロセッサを再利用)
const processor = new StripeWebhookProcessor();

export const runtime = 'nodejs'; // 指示書通り nodejs を指定

/**
 * Stripe Checkout Webhook を処理する POST リクエストハンドラ
 * @param req - NextRequest オブジェクト
 * @returns NextResponse オブジェクト
 */
export async function POST(req: NextRequest) {
  // 環境変数から Checkout 用の Webhook シークレットを取得
  const webhookSecret = process.env.STRIPE_CHECKOUT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_CHECKOUT_WEBHOOK_SECRET is not set in environment variables.');
    return new Response('STRIPE_CHECKOUT_WEBHOOK_SECRET is not configured.', { status: 500 });
  }
  // processor.process の第二引数は processor 側で 'connect' か 'subscription' を区別するものではなく、
  // 単純に Webhook Secret を渡すためのものです。
  // イベントタイプに応じた処理の分岐は StripeWebhookProcessor の dispatch メソッド内で行われます。
  return processor.process(req, webhookSecret);
}

export async function GET() {
  return NextResponse.json({
    message: 'Stripe Checkout webhook endpoint is active. Use POST for events.',
    required_secret_env: 'STRIPE_CHECKOUT_WEBHOOK_SECRET',
    timestamp: new Date().toISOString(),
  }, { status: 200 });
}