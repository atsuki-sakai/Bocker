import { action } from '@/convex/_generated/server';
import { v } from 'convex/values';
import { api } from '../_generated/api';
import { StripeError } from '@/services/convex/shared/utils/error';
import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/lib/constants';
import { Doc } from '../_generated/dataModel';

const BASE_DISCOUNT_AMOUNT = 3000;
const SLEEP_DURATION_MS = 6 * 1000; // 6秒間のスリープ

// 指定時間スリープする関数
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 毎月一回実行する。
// 紹介一回につき月額3000円の割引を適用する。割引適用時にreferralCountを一つ減らす。
export const applyDiscount = action({
  args: {
    emails: v.array(v.string()),
    isApplyAll: v.boolean(),
    isApplyMaxUseReferral: v.boolean(),
    isAlreadyUpdated: v.boolean(),
  },
  handler: async (ctx, args) => {
    // 結果保存用の配列
    const results: { email: string; success: boolean; error?: string }[] = [];

    // Stripeインスタンスを一度だけ作成
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: STRIPE_API_VERSION,
    });

    // 処理するメールアドレスのバッチを小さなグループに分ける
    const BATCH_SIZE = 10; // 一度に処理するバッチサイズ
    const emailBatches: string[][] = [];

    for (let i = 0; i < args.emails.length; i += BATCH_SIZE) {
      emailBatches.push(args.emails.slice(i, i + BATCH_SIZE));
    }

    // 現在の年月を取得（当月判定用）
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // バッチごとに処理
    for (let batchIndex = 0; batchIndex < emailBatches.length; batchIndex++) {
      const batch = emailBatches[batchIndex];

      // バッチ内の各メールを処理
      for (const email of batch) {
        try {
          // サブスクリプション情報の取得
          const subscription = (await ctx.runQuery(api.subscription.query.getByEmail, {
            email,
          })) as Doc<'subscription'> | null;

          if (!subscription) {
            results.push({
              email,
              success: false,
              error: 'Subscription not found',
            });
            continue;
          }

          // 紹介コード情報の取得（先に取得してリソースを無駄にしないようにする）
          const previousReferral = await ctx.runQuery(
            api.salon.referral.query.findReferralCodeByCustomerId,
            {
              stripeCustomerId: subscription.stripeCustomerId,
            }
          );

          if (!previousReferral) {
            results.push({
              email,
              success: false,
              error: 'Salon Referral not found',
            });
            continue;
          }


          // totalReferralCountが5以上の場合は処理をスキップ（上限チェック）
          if (previousReferral.totalReferralCount && previousReferral.totalReferralCount >= 5) {
            results.push({
              email,
              success: false,
              error: 'Total referral count exceeded maximum limit of 5',
            });
            continue;
          }

          // isApplyAllがfalseの場合、updatedAtが当月かどうかを確認
          if (!args.isApplyAll && !args.isAlreadyUpdated && previousReferral.updatedAt) {
            const updatedDate = new Date(previousReferral.updatedAt);
            const isCurrentMonth =
              updatedDate.getFullYear() === currentYear && updatedDate.getMonth() === currentMonth;

            // 当月の場合はスキップ（ただし、強制的に再適用する場合はスキップしない）
            if (isCurrentMonth) {
              results.push({
                email,
                success: false,
                error: 'Referral was already updated this month',
              });
              continue;
            }
          }

          // 一意のクーポンコードを生成（メールアドレスをハッシュに含めて識別性を高める）
          const emailHash = email.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5);
          const couponId = `ref_${Date.now()}_${emailHash}_${Math.random().toString(36).substring(2, 5)}`;

          // クーポンを作成（エラーハンドリングを強化）
          let coupon;
          try {
            coupon = await stripe.coupons.create({
              name: `紹介割引 - ¥${BASE_DISCOUNT_AMOUNT.toLocaleString()} - 残りの継続月: ${(previousReferral.referralCount ?? 1) - 1}回`,
              amount_off: BASE_DISCOUNT_AMOUNT,
              currency: 'jpy',
              duration: 'once',
              id: couponId,
            });
          } catch (stripeErr) {
            results.push({
              email,
              success: false,
              error: `Stripe coupon creation failed: ${stripeErr instanceof Error ? stripeErr.message : String(stripeErr)}`,
            });
            continue;
          }

          // サブスクリプションに作成したクーポンを適用
          try {
            await stripe.subscriptions.update(subscription.subscriptionId, {
              coupon: coupon.id,
            });

            // 割引適用後に紹介数を減らす
            const isDecreaseSuccess = await ctx.runMutation(
              api.admin.mutation.decreaseBalanceReferralCount,
              {
                email,
              }
            );

            // クーポンを削除
            await stripe.coupons.del(coupon.id);

            if (isDecreaseSuccess) {
              results.push({
                email,
                success: true,
              });
            } else {
              results.push({
                email,
                success: false,
                error: 'Failed to update referral count',
              });
              // クーポンを削除（ロールバック）
              await stripe.coupons.del(couponId);
            }
          } catch (stripeErr) {
            results.push({
              email,
              success: false,
              error: `Stripe subscription update failed: ${stripeErr instanceof Error ? stripeErr.message : String(stripeErr)}`,
            });
            // クーポンを削除（ロールバック）
            try {
              await stripe.coupons.del(couponId);
            } catch (deleteErr) {
              // クーポン削除のエラーはログに残すが処理は継続
              console.error(`Failed to delete coupon ${couponId}:`, deleteErr);
            }
          }
        } catch (error) {
          // 全体的なエラーハンドリング
          results.push({
            email,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // 最後のバッチでなければスリープを挟む
      if (batchIndex < emailBatches.length - 1) {
        await sleep(SLEEP_DURATION_MS);
      }
    }

    return {
      results,
      totalProcessed: args.emails.length,
      successCount: results.filter((r) => r.success).length,
      failureCount: results.filter((r) => !r.success).length,
      processingTime: new Date().toISOString(),
    };
  },
});
