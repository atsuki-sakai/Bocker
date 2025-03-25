import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchMutation } from 'convex/nextjs';
import { normalizeSubscriptionStatus, priceIdToPlanInfo } from '@/lib/utils';
import { STRIPE_API_VERSION } from '@/lib/constants';
import { z } from 'zod';
import * as Sentry from "@sentry/nextjs";

// Stripe Webhook
const stripeWebhookSchema = z.object({
    id: z.string().min(1, { message: "IDが空です" }),
    object: z.string().min(1, { message: "オブジェクトが空です" }),
    type: z.string().min(1, { message: "イベントタイプが空です" }),
    data: z.object({
      object: z.any(),
    }),
  });

// Stripeの課金期間("month"/"year")をConvexスキーマ形式("monthly"/"yearly")に変換する関数
function convertIntervalToBillingPeriod(interval: string): string {
  const intervalMapping: Record<string, string> = {
    "month": "monthly",
    "year": "yearly"
  };
  return intervalMapping[interval] || "monthly"; // デフォルトはmonthly
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
});

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    Sentry.captureException(new Error("Missing Stripe signature or webhook secret"), {
      level: "error",
      tags: {
        function: "POST",
        url: req.url,
      },
    });
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
  }

  // 生のボディ文字列を取得（署名検証に使用）
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      Sentry.captureException(new Error(errMsg), {
        level: "error",
        tags: {
          function: "POST",
          url: req.url,
        },
      });
      console.error("Stripe webhook署名の検証に失敗しました:", errMsg);
      return NextResponse.json({ error: `Webhook Error: ${errMsg}` }, { status: 400 });
    }

  // Zod による型チェック
  const validationResult = stripeWebhookSchema.safeParse(event);
  if (!validationResult.success) {
    Sentry.captureException(validationResult.error, {
      level: "error",
      tags: {
        function: "POST",
        url: req.url,
      },
    });
    console.error("Stripe webhookペイロードの検証エラー:", validationResult.error);
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }

  // 型チェック済みのイベントを利用
  const validatedEvent = validationResult.data;
  const eventType = validatedEvent.type;
  const dataObject = validatedEvent.data.object;

  // 共通関数: サブスクリプション更新処理
  async function updateSubscriptionData(subscription: Stripe.Subscription, priceId?: string): Promise<boolean> {
    try {
      const customerId = typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer.id;

      console.log("subscription", subscription.items.data[0]);
      
      const status = normalizeSubscriptionStatus(subscription);
      
      // トランザクションIDを生成して同一操作を追跡可能にする
      const transactionId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`[${transactionId}] Processing webhook for subscription: ${subscription.id}, status: ${status}`);
      
      // priceIdが指定されていない場合は、サブスクリプションから取得
      const actualPriceId = priceId || subscription.items.data[0]?.price?.id || "";
      const planInfo = priceIdToPlanInfo(actualPriceId);
      
      // 請求期間
      let billingPeriod;
      try {
        billingPeriod = subscription.items.data[0]?.plan?.interval
          ? convertIntervalToBillingPeriod(subscription.items.data[0].plan.interval)
          : "monthly";
      } catch (error) {
        // デフォルト値をセット
        billingPeriod = "monthly";
        console.warn(`billingPeriodの変換に失敗しました。デフォルト値を使用: ${subscription.id}`, error);
      }

      // サブスクリプションテーブルのみ更新（内部で両方のテーブルを更新）
      // 単一のAPIコールにすることでアトミック性を向上
      await fetchMutation(api.subscription.core.syncSubscription, {
        subscription: {
          subscriptionId: subscription.id,
          stripeCustomerId: customerId,
          status: status,
          priceId: actualPriceId,
          currentPeriodEnd: subscription.current_period_end,
          planName: planInfo.name,
          billingPeriod: billingPeriod as "monthly" | "yearly"
        }
      });
      
      return true;
    } catch (error) {
      // エラーログと再試行可能性のために詳細なログを残す
      console.error('サブスクリプションデータの更新に失敗しました:', error);
      Sentry.captureException(new Error('サブスクリプションデータの更新に失敗しました'), {
        level: "error",
        tags: {
          function: "updateSubscriptionData",
          subscriptionId: subscription.id,
          customerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
          action: 'updateSubscriptionData'
        }
      });
      throw error;
    }
  }

  try {
    switch (eventType) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        console.log('######################################');
        console.log("CUSTOMER.SUBSCRIPTION.CREATED/UPDATED");
        console.log('######################################');
        const subscription = dataObject as Stripe.Subscription;
        console.log('subscription', subscription);
        const priceId = subscription.items.data[0].plan.id;
        await updateSubscriptionData(subscription, priceId);
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = dataObject as Stripe.Invoice;
        const subId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.toString();
          
        if (subId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subId);
            console.log('######################################');
            console.log("INVOICE.PAYMENT_SUCCEEDED");
            console.log('######################################');
            console.log('subscription', subscription);
            await updateSubscriptionData(subscription);
          } catch (error) {
            console.error(`請求書 ${invoice.id} のサブスクリプション取得に失敗しました:`, error);
            Sentry.captureException(new Error('請求書のサブスクリプション取得に失敗しました'), {
              level: "error",
              tags: {
                function: "handlePaymentSucceeded",
                subscriptionId: subId,
                action: 'invoice.payment_succeeded'
              }
            });
            throw error;
          }
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const canceledSub = dataObject as Stripe.Subscription;
        console.log('######################################');
        console.log("CUSTOMER.SUBSCRIPTION.DELETED");
        console.log('######################################');
        console.log('canceledSub', canceledSub);
        await updateSubscriptionData(canceledSub);
        break;
      }
      
      case 'invoice.payment_failed': {
        console.log('######################################');
        console.log("INVOICE.PAYMENT_FAILED");
        console.log('######################################');
        const invoice = dataObject as Stripe.Invoice;
        const subId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.toString();
        
        if (subId) {
          try {
            // トランザクションIDを生成して同一操作を追跡可能にする
            const transactionId = `payment_failed_webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // サブスクリプションの詳細を取得
            const subscription = await stripe.subscriptions.retrieve(subId);
            const customerId = typeof subscription.customer === 'string'
              ? subscription.customer
              : subscription.customer.id;
            
            // サブスクリプションテーブル経由で両テーブルを一度の呼び出しでアトミックに更新
            await fetchMutation(api.subscription.core.paymentFailed, {
              subscriptionId: subId,
              stripeCustomerId: customerId,
              transactionId: transactionId
            });
            
            console.log(`[${transactionId}] Successfully processed payment failed for subscription ${subId}, customer ${customerId}`);
          } catch (error) {
            console.error(`サブスクリプション ${subId} の支払い失敗処理に失敗しました:`, error);
            Sentry.captureException(new Error('サブスクリプションの支払い失敗処理に失敗しました'), {
              level: "error",
              tags: {
                function: "handlePaymentFailed",
                subscriptionId: subId,
                invoiceId: invoice.id,
                action: 'invoice.payment_failed'
              }
            });
            throw error;
          }
        }
        break;
      }
      
      default:
        console.log(`未対応のStripeイベントタイプ: ${eventType}`);
    }
    
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    // クリティカルなエラーの場合は再試行を促すために5xxエラーを返す
    console.error(`Webhook処理中の重大なエラー:`, error);
    Sentry.captureException(error instanceof Error ? error : new Error('Webhook処理中の重大なエラー'), {
      level: "error",
      tags: {
        function: "webhookHandler",
        eventType,
        eventId: validatedEvent.id
      }
    });
    
    return NextResponse.json(
      { error: 'Internal server error processing webhook' }, 
      { status: 500 } // 500エラーを返すとStripeは後でこのイベントを再送信する
    );
  }
}
