"use node"

import { internalAction } from '@/convex/_generated/server'
import { v } from 'convex/values'
import { api } from '@/convex/_generated/api'
import {
  BASE_REFERRAL_DISCOUNT_AMOUNT,
  MAX_REFERRAL_COUNT,
} from '@/lib/constants'
import { Stripe } from 'stripe'
import { STRIPE_API_VERSION } from '@/services/stripe/constants'
/**
 * テナント紹介割引適用アクション
 * 
 * テナントの紹介割引を適用するためのアクションを提供します。
 * サービス層を利用して、データアクセスとビジネスロジックを分離します。
 */

interface CronApplyReferralDiscountResultItem {
  email: string
  success: boolean
  error?: string
}

interface CronApplyReferralDiscountHandlerReturn {
  results: CronApplyReferralDiscountResultItem[]
  total_processed: number
  success_count: number
  failure_count: number
  processing_time: string
}

const SLEEP_DURATION_MS = 5 * 1000 // 5秒間のスリープ

// 指定時間スリープする関数
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const applyReferralDiscount = internalAction({
  args: {
    user_emails: v.array(v.string()),
    is_apply_max_use_referral: v.boolean(),
    is_already_updated: v.boolean(),
  },
  handler: async (ctx, args) => {
    // 結果保存用の配列
    const results: { email: string; success: boolean; error?: string }[] = []

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: STRIPE_API_VERSION,
    });
    // 処理するメールアドレスのバッチを小さなグループに分ける
    const BATCH_SIZE = 20 // 一度に処理するバッチサイズ
    const emailBatches: string[][] = []

    for (let i = 0; i < args.user_emails.length; i += BATCH_SIZE) {
      emailBatches.push(args.user_emails.slice(i, i + BATCH_SIZE))
    }

    // 現在の年月を取得（当月判定用）
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    // バッチごとに処理
    for (let batchIndex = 0; batchIndex < emailBatches.length; batchIndex++) {
      const batch = emailBatches[batchIndex]

      // バッチ内の各メールを処理
      for (const email of batch) {
        try {
          // サブスクリプション情報の取得
          const subscription = (await ctx.runQuery(api.tenant.subscription.query.getByUserEmail, {
            user_email: email,
          }))

          if (!subscription) {
            results.push({
              email,
              success: false,
              error: 'サブスクリプションが見つかりません。',
            })
            continue
          }

          if (!subscription.stripe_customer_id) {
            results.push({
              email,
              success: false,
              error: 'Stripe顧客IDが見つかりません。',
            })
            continue
          }
          // 紹介コード情報の取得（先に取得してリソースを無駄にしないようにする）
          const previousReferral = await ctx.runQuery(
            api.tenant.referral.query.findReferralCodeByCustomerId,
            {
              stripe_customer_id: subscription.stripe_customer_id,
            }
          )
          if (!previousReferral) {
            results.push({
              email,
              success: false,
              error: 'Salon Referral not found',
            })
            continue
          }

          // referralCountが0以下の場合は処理をスキップ
          if (previousReferral.referral_point === undefined || previousReferral.referral_point <= 0) {
            results.push({
              email,
              success: false,
              error: 'Referral count is 0 or negative',
            })
            continue
          }

          // totalReferralCountが5以上の場合は処理をスキップ（上限チェック）- isApplyMaxUseReferral=trueの場合は除外
          if (
            !args.is_apply_max_use_referral &&
            previousReferral.total_referral_count &&
            previousReferral.total_referral_count >= MAX_REFERRAL_COUNT
          ) {
            results.push({
              email,
              success: false,
              error: `Total referral count exceeded maximum limit of ${MAX_REFERRAL_COUNT}`,
            })
            continue
          }

          // isApplyAllがfalseの場合、updatedAtが当月かどうかを確認
          if (!args.is_already_updated && previousReferral.updated_at) {
            const updatedDate = new Date(previousReferral.updated_at)
            const isCurrentMonth =
              updatedDate.getFullYear() === currentYear && updatedDate.getMonth() === currentMonth

            // 当月の場合はスキップ（ただし、強制的に再適用する場合はスキップしない）
            if (isCurrentMonth) {
              results.push({
                email,
                success: false,
                error: 'Referral was already updated this month',
              })
              continue
            }
          }

          // 一意のクーポンコードを生成（メールアドレスをハッシュに含めて識別性を高める）
          const emailHash = email.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5)
          const couponId = `ref_${Date.now()}_${emailHash}_${Math.random().toString(36).substring(2, 5)}`

          // クーポンを作成（エラーハンドリングを強化）
          let coupon
          try {
            coupon = await stripe.coupons.create({
              name: `紹介割引 - ¥${BASE_REFERRAL_DISCOUNT_AMOUNT.toLocaleString()} - 残りの継続月: ${(previousReferral.referral_point ?? 1) - 1}回`,
              amount_off: BASE_REFERRAL_DISCOUNT_AMOUNT,
              currency: 'jpy',
              duration: 'once',
              id: couponId,
            })
          } catch (stripeErr) {
            results.push({
              email,
              success: false,
              error: `Stripe coupon creation failed: ${stripeErr instanceof Error ? stripeErr.message : String(stripeErr)}`,
            })
            continue
          }

          // サブスクリプションに作成したクーポンを適用
          try {
            if (!subscription.stripe_subscription_id) {
              results.push({
                email,
                success: false,
                error: 'サブスクリプションIDが見つかりません。',
              })
              continue
            }
            await stripe.subscriptions.update(subscription.stripe_subscription_id, {
              coupon: coupon.id,
            })

            // 割引適用後に紹介数を減らす（冪等性対応）
            const appliedMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
            const transactionId = `discount_${Date.now()}_${emailHash}`;
            
            const isDecreaseSuccess = await ctx.runMutation(
              api.tenant.referral.mutation.decreaseBalanceReferralCount,
              {
                user_email: email,
                transaction_id: transactionId, // 冪等性確保用
                applied_month: appliedMonth,    // 適用月（YYYY-MM形式）
              }
            )

            // クーポンを削除
            await stripe.coupons.del(coupon.id)

            if (isDecreaseSuccess.success && !isDecreaseSuccess.alreadyProcessed) {
              results.push({
                email,
                success: true,
              })
            } else if (isDecreaseSuccess.alreadyProcessed) {
              results.push({
                email,
                success: true,
                error: `Already processed: ${isDecreaseSuccess.message}`,
              })
            } else {
              results.push({
                email,
                success: false,
                error: 'Failed to update referral count',
              })
              // クーポンを削除（ロールバック）
              await stripe.coupons.del(couponId)
            }
          } catch (stripeErr) {
            results.push({
              email,
              success: false,
              error: `Stripe subscription update failed: ${stripeErr instanceof Error ? stripeErr.message : String(stripeErr)}`,
            })
            // クーポンを削除（ロールバック）
            try {
              await stripe.coupons.del(couponId)
            } catch (deleteErr) {
              // クーポン削除のエラーはログに残すが処理は継続
              console.error(`Failed to delete coupon ${couponId}:`, deleteErr)
            }
          }
        } catch (error) {
          // 全体的なエラーハンドリング
          results.push({
            email,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      // 最後のバッチでなければスリープを挟む
      if (batchIndex < emailBatches.length - 1) {
        await sleep(SLEEP_DURATION_MS)
      }
    }

    return {
      results,
      totalProcessed: args.user_emails.length,
      successCount: results.filter((r) => r.success).length,
      failureCount: results.filter((r) => !r.success).length,
      processingTime: new Date().toISOString(),
    }
  },
})

export const cronApplyReferralDiscount = internalAction({
  args: {},
  handler: async (ctx): Promise<CronApplyReferralDiscountHandlerReturn> => {
    const { all_tenant_emails }: { all_tenant_emails: string[] } = await ctx.runQuery(
      api.tenant.referral.query.getEmailsByReferralCount,
      {
        include_updated: false,
        is_apply_max_use_referral: false,
      }
    )
    // 結果保存用の配列
    const results: { email: string; success: boolean; error?: string }[] = []

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: STRIPE_API_VERSION,
    });

    // 処理するメールアドレスのバッチを小さなグループに分ける
    const BATCH_SIZE = 10 // 一度に処理するバッチサイズ
    const emailBatches: string[][] = []

    for (let i = 0; i < all_tenant_emails.length; i += BATCH_SIZE) {
      emailBatches.push(all_tenant_emails.slice(i, i + BATCH_SIZE))
    }

    // 現在の年月を取得（当月判定用）
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    // バッチごとに処理
    for (let batchIndex = 0; batchIndex < emailBatches.length; batchIndex++) {
      const batch = emailBatches[batchIndex]

      // バッチ内の各メールを処理
      for (const email of batch) {
        try {
          // サブスクリプション情報の取得
          const subscription = (await ctx.runQuery(api.tenant.subscription.query.getByUserEmail, {
            user_email: email,
          }))

          if (!subscription) {
            results.push({
              email,
              success: false,
              error: 'サブスクリプションが見つかりません。',
            })
            continue
          }

          if (!subscription.stripe_customer_id) {
            results.push({
              email,
              success: false,
              error: 'Stripe顧客IDが見つかりません。',
            })
            continue
          }

          // 紹介コード情報の取得（先に取得してリソースを無駄にしないようにする）
          const previousReferral = await ctx.runQuery(
            api.tenant.referral.query.findReferralCodeByCustomerId,
            {
              stripe_customer_id: subscription.stripe_customer_id,
            }
          )
          if (!previousReferral) {
            results.push({
              email,
              success: false,
              error: 'Salon Referral not found',
            })
            continue
          }

          // referralCountが0以下の場合は処理をスキップ
          if (previousReferral.referral_point === undefined || previousReferral.referral_point <= 0) {
            results.push({
              email,
              success: false,
              error: 'Referral count is 0 or negative',
            })
            continue
          }

          // totalReferralCountが5以上の場合は処理をスキップ（上限チェック）- isApplyMaxUseReferral=trueの場合は除外
          if (
            previousReferral.total_referral_count &&
            previousReferral.total_referral_count >= MAX_REFERRAL_COUNT
          ) {
            results.push({
              email,
              success: false,
              error: `Total referral count exceeded maximum limit of ${MAX_REFERRAL_COUNT}`,
            })
            continue
          }

          // isApplyAllがfalseの場合、updatedAtが当月かどうかを確認
          if (previousReferral.updated_at) {
            const updatedDate = new Date(previousReferral.updated_at)
            const isCurrentMonth =
              updatedDate.getFullYear() === currentYear && updatedDate.getMonth() === currentMonth

            // 当月の場合はスキップ（ただし、強制的に再適用する場合はスキップしない）
            if (isCurrentMonth) {
              results.push({
                email,
                success: false,
                error: 'Referral was already updated this month',
              })
              continue
            }
          }

          // 一意のクーポンコードを生成（メールアドレスをハッシュに含めて識別性を高める）
          const emailHash = email.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5)
          const couponId = `ref_${Date.now()}_${emailHash}_${Math.random().toString(36).substring(2, 5)}`

          // クーポンを作成（エラーハンドリングを強化）
          let coupon
          try {
            coupon = await stripe.coupons.create({
              name: `紹介割引 - ¥${BASE_REFERRAL_DISCOUNT_AMOUNT.toLocaleString()} - 残りの継続月: ${(previousReferral.referral_point ?? 1) - 1}回`,
              amount_off: BASE_REFERRAL_DISCOUNT_AMOUNT,
              currency: 'jpy',
              duration: 'once',
              id: couponId,
            })
          } catch (stripeErr) {
            results.push({
              email,
              success: false,
              error: `Stripe coupon creation failed: ${stripeErr instanceof Error ? stripeErr.message : String(stripeErr)}`,
            })
            continue
          }

          // サブスクリプションに作成したクーポンを適用
          try {
            if (!subscription.stripe_subscription_id) {
              results.push({
                email,
                success: false,
                error: 'サブスクリプションIDが見つかりません。',
              })
              continue
            }
            await stripe.subscriptions.update(subscription.stripe_subscription_id, {
              coupon: coupon.id,
            })

            // 割引適用後に紹介数を減らす（冪等性対応）
            const appliedMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
            const transactionId = `discount_${Date.now()}_${emailHash}`;
            
            const isDecreaseSuccess = await ctx.runMutation(
              api.tenant.referral.mutation.decreaseBalanceReferralCount,
              {
                user_email: email,
                transaction_id: transactionId, // 冪等性確保用
                applied_month: appliedMonth,    // 適用月（YYYY-MM形式）
              }
            )

            // クーポンを削除
            await stripe.coupons.del(coupon.id)

            if (isDecreaseSuccess.success && !isDecreaseSuccess.alreadyProcessed) {
              results.push({
                email,
                success: true,
              })
            } else if (isDecreaseSuccess.alreadyProcessed) {
              results.push({
                email,
                success: true,
                error: `Already processed: ${isDecreaseSuccess.message}`,
              })
            } else {
              results.push({
                email,
                success: false,
                error: 'Failed to update referral count',
              })
              // クーポンを削除（ロールバック）
              await stripe.coupons.del(couponId)
            }
          } catch (stripeErr) {
            results.push({
              email,
              success: false,
              error: `Stripe subscription update failed: ${stripeErr instanceof Error ? stripeErr.message : String(stripeErr)}`,
            })
            // クーポンを削除（ロールバック）
            try {
              await stripe.coupons.del(couponId)
            } catch (deleteErr) {
              // クーポン削除のエラーはログに残すが処理は継続
              console.error(`Failed to delete coupon ${couponId}:`, deleteErr)
            }
          }
        } catch (error) {
          // 全体的なエラーハンドリング
          results.push({
            email,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      // 最後のバッチでなければスリープを挟む
      if (batchIndex < emailBatches.length - 1) {
        await sleep(SLEEP_DURATION_MS)
      }
    }

    return {
      results,
      total_processed: all_tenant_emails.length,
      success_count: results.filter((r) => r.success).length,
      failure_count: results.filter((r) => !r.success).length,
      processing_time: new Date().toISOString(),
    }
  },
})
