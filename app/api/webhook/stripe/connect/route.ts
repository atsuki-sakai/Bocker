// app/api/webhook/stripe/connect/route.ts
import { StripeWebhookProcessor } from '@/services/stripe/webhook/processor';
import { NextRequest } from 'next/server';

// StripeWebhookProcessor のインスタンスを作成 (同じプロセッサを再利用)
const processor = new StripeWebhookProcessor();

export const runtime = 'nodejs'; // 指示書通り nodejs を指定

/**
 * Stripe Connect Webhook を処理する POST リクエストハンドラ
 * @param req - NextRequest オブジェクト
 * @returns NextResponse オブジェクト
 */
export async function POST(req: NextRequest) {
  // 環境変数から Connect 用の Webhook シークレットを取得
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_CONNECT;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET_CONNECT is not set in environment variables.');
    return new Response('STRIPE_WEBHOOK_SECRET_CONNECT is not configured.', { status: 500 });
  }
  // processor.process の第二引数は processor 側で 'connect' か 'subscription' を区別するものではなく、
  // 単純に Webhook Secret を渡すためのものです。
  // イベントタイプに応じた処理の分岐は StripeWebhookProcessor の dispatch メソッド内で行われます。
  return processor.process(req, webhookSecret);
}
