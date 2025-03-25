import { action } from "../_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";
import { STRIPE_API_VERSION } from "@/lib/constants";
import { ConvexError } from "convex/values";
import { ERROR_CODES } from "../errors";
import { MAX_TEXT_LENGTH } from "../../lib/constants";
// サプスクリプション更新のバリデーション
const validateSubscriptionUpdate = (args: {
    subscriptionId?: string;
    newPriceId?: string;
    customerId?: string;
}) => {
  if (args.subscriptionId && args.subscriptionId === "") {
    throw new ConvexError({message: "サブスクリプションIDは必須です", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.subscriptionId && args.subscriptionId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({message: `サブスクリプションIDは${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.customerId && args.customerId === "") {
    throw new ConvexError({message: "顧客IDは必須です", code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.customerId && args.customerId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({message: `顧客IDは${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  if (args.newPriceId && args.newPriceId.length > MAX_TEXT_LENGTH) {
    throw new ConvexError({message: `新しい価格IDは${MAX_TEXT_LENGTH}文字以内で入力してください`, code: ERROR_CODES.INVALID_ARGUMENT});
  }
  
  
}

// サブスクリプションの変更のプレビューを取得
export const getSubscriptionUpdatePreview = action({
    args: {
        subscriptionId: v.string(),
        newPriceId: v.string(),
        customerId: v.string(),
    },
    handler: async (ctx, args) => {

        try {
            validateSubscriptionUpdate(args)

            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
                apiVersion: STRIPE_API_VERSION,
            });
            const { subscriptionId, newPriceId, customerId } = args;

            const prorationDate = Math.floor(Date.now() / 1000);
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const items = [{
                id: subscription.items.data[0].id,
                price: newPriceId,
            }];

            // 更新前に請求書プレビューのみを取得
            const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
                customer: customerId,
                subscription: subscriptionId,
                subscription_items: items,
                subscription_proration_date: prorationDate
            });

            return {
                success: true,
                previewInvoice: upcomingInvoice,
                status: subscription.status,
                items,
                prorationDate
            };
        } catch (error) {
            console.error("サブスクリプションの更新プレビューの表示に失敗しました", error);
            const errorDetails = error instanceof Stripe.errors.StripeError
                ? {
                    type: error.type,
                    code: error.code,
                    message: error.message,
                    param: error.param
                  }
                : {
                    message: error instanceof Error ? error.message : "不明なエラー"
                  };
                
            return {
                success: false,
                error: error instanceof Error ? error.message : "不明なエラー",
                errorDetails
            };
        }
    },
});

// サブスクリプションの変更を実行
export const confirmSubscriptionUpdate = action({
    args: {
        subscriptionId: v.string(),
        newPriceId: v.string(),
        items: v.array(v.object({ id: v.string(), price: v.string() })),
        prorationDate: v.number(),
    },
    handler: async (ctx, args) => {
        validateSubscriptionUpdate(args)
        const { subscriptionId, items, prorationDate } = args;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
            apiVersion: STRIPE_API_VERSION,
        });

        try {
            // ユーザーが確認した後、実際にサブスクリプションを更新
            const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
                items,
                proration_date: prorationDate,
            });

            // Stripeの形式をアプリの形式に変換する処理
            const intervalMapping: Record<string, "monthly" | "yearly"> = {
                "month": "monthly",
                "year": "yearly"
            };

            let billingPeriod: "monthly" | "yearly" = "monthly";
            
            if (updatedSubscription.items.data && 
                updatedSubscription.items.data[0] && 
                updatedSubscription.items.data[0].plan && 
                updatedSubscription.items.data[0].plan.interval) {
                    const interval = updatedSubscription.items.data[0].plan.interval;
                    billingPeriod = intervalMapping[interval] || "monthly";
            }
            
            return {
                success: true,
                subscription: updatedSubscription,
                billingPeriod
            };
        } catch (error) {
            console.error("サブスクリプションの変更に失敗しました", error);
            const errorDetails = error instanceof Stripe.errors.StripeError
                ? {
                    type: error.type,
                    code: error.code,
                    message: error.message,
                    param: error.param
                  }
                : {
                    message: error instanceof Error ? error.message : "不明なエラー"
                  };
                
            return {
                success: false,
                error: error instanceof Error ? error.message : "不明なエラー",
                errorDetails,
                // プラン変更が失敗した場合、再試行のためのコンテキストを提供
                context: {
                    subscriptionId,
                    prorationDate
                }
            };
        }
    },
});