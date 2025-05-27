// app/api/webhook/stripe/subscription/route.ts
import { StripeWebhookProcessor } from '@/services/webhook/stripe/StripeWebhookProcessor';
import { NextRequest } from 'next/server';

// StripeWebhookProcessor のインスタンスを作成
const processor = new StripeWebhookProcessor();

// Next.js Edge Runtime を使用する場合や特定のランタイムを指定する場合
// export const runtime = 'edge'; // or 'nodejs'
export const runtime = 'nodejs'; // 指示書通り nodejs を指定

/**
 * Stripe Subscription Webhook を処理する POST リクエストハンドラ
 * @param req - NextRequest オブジェクト
 * @returns NextResponse オブジェクト
 */
export async function POST(req: NextRequest) {
  // 環境変数から Subscription 用の Webhook シークレットを取得
  // process.env.STRIPE_WEBHOOK_SECRET_SUBS! のように `!` をつけて非nullであることを明示
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET_SUBS is not set in environment variables.');
    // Sentry でのエラー報告は processor 内で行われるため、ここではログ出力に留めるか、
    // processor を呼び出さずに早期リターンすることも検討できますが、
    // processor に処理を委ねて一貫したエラーハンドリングを行うのが望ましいでしょう。
    // ただし、secretがない場合は processor.process が失敗するため、ここでエラーレスポンスを返すのが適切です。
    return new Response('STRIPE_WEBHOOK_SECRET_SUBS is not configured.', { status: 500 });
  }
  return processor.process(req, webhookSecret);
}