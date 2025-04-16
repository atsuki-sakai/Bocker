import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { Id } from '@/convex/_generated/dataModel';
import { stripeService } from '@/services/stripe/StripeService';
import { api } from '@/convex/_generated/api';
import { fetchQuery, fetchMutation } from 'convex/nextjs';

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
      if (event.type === 'customer.subscription.created') {
        const referralCode = event?.data?.object.metadata?.referralCode;
        const customerId = event?.data?.object.customer;
        const inviteSubscriptionId = event?.data?.object.id;

        if (referralCode) {
          const referral = await fetchQuery(api.salon.referral.query.getByReferralCode, {
            referralCode: referralCode,
          });

          if (referral) {
            const salon = await fetchQuery(api.salon.core.query.get, {
              id: referral.salonId as Id<'salon'>,
            });

            if (salon.stripeCustomerId !== customerId) {
              const subscription = await fetchQuery(api.subscription.query.findByStripeCustomerId, {
                stripeCustomerId: salon.stripeCustomerId as Id<'customer'>,
              });

              // FIXME: 招待を受けたサロンと招待したサロンに対してサブスクリプションに対しても5000円の割引を適応する
              // この紹介者のサブスクリプションにIDに対応するStripeのサブスクリプションに対して5000円の割引を適応する
              console.log('referralSubscription', subscription?.subscriptionId);
              //　以下の招待を受けたサブスクリプションに対しても5000円の割引を適応する
              console.log('inviteSubscriptionId', inviteSubscriptionId);

              // 紹介者と招待されたサロンのサブスクリプションに5000円の割引を適用
              if (subscription?.subscriptionId && inviteSubscriptionId) {
                try {
                  // 紹介者（既存ユーザー）のサブスクリプションに割引適用
                  const referrerResult = await stripeService.applyDiscount(
                    subscription.subscriptionId,
                    5000 // 5000円の割引
                  );

                  if (!referrerResult.success) {
                    console.error(
                      '紹介者サブスクリプションへの割引適用に失敗:',
                      referrerResult.error
                    );
                  }

                  // 招待された新規ユーザーのサブスクリプションに割引適用
                  const inviteeResult = await stripeService.applyDiscount(
                    inviteSubscriptionId,
                    5000 // 5000円の割引
                  );

                  if (!inviteeResult.success) {
                    console.error(
                      '招待されたユーザーサブスクリプションへの割引適用に失敗:',
                      inviteeResult.error
                    );
                  }

                  // 紹介情報を更新（紹介カウントを増やす）
                  await fetchMutation(api.salon.referral.mutation.incrementReferralCount, {
                    referralId: referral._id as Id<'salon_referral'>,
                  });

                  console.log('紹介プログラムの割引適用が完了しました');
                } catch (error) {
                  console.error('紹介プログラムの割引適用に失敗しました:', error);
                  Sentry.captureException(error, {
                    level: 'error',
                    tags: {
                      function: 'referralDiscount',
                      referralCode: referralCode,
                    },
                  });
                }
              }
            }
          }
        }
      }

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
