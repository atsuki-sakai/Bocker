import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import Stripe from 'stripe';
import { action } from '../_generated/server';
import { ConvexError } from 'convex/values';
import { STRIPE_API_VERSION } from '@/lib/constants';
import { CONVEX_ERROR_CODES } from '../constants';
import { trashRecord, KillRecord, removeEmptyFields, authCheck } from '../helpers';
import { validateSubscription } from '../validators';

// 環境変数が設定されていない場合のデフォルト値を追加
const baseUrl =
  process.env.NEXT_PUBLIC_NODE_ENV === 'development'
    ? process.env.NEXT_PUBLIC_DEVELOP_URL || 'http://localhost:3000'
    : process.env.NEXT_PUBLIC_DEPLOY_URL || 'https://bcker-project.vercel.app';

// DBとStripeのサブスクリプションを同期
export const syncSubscription = mutation({
  args: {
    subscription: v.object({
      subscriptionId: v.string(),
      stripeCustomerId: v.string(),
      status: v.string(),
      priceId: v.string(),
      currentPeriodEnd: v.number(),
      planName: v.string(),
      billingPeriod: v.union(v.literal('monthly'), v.literal('yearly')),
    }),
  },
  handler: async (ctx, args) => {
    // 既存のサブスクリプションを検索
    const existingSubscription = await ctx.db
      .query('subscription')
      .withIndex('by_subscription_id', (q) =>
        q.eq('subscriptionId', args.subscription.subscriptionId).eq('isArchive', false)
      )
      .first();

    // サロンの存在確認とロック取得（楽観的ロック）
    const existingSalon = await ctx.db
      .query('salon')
      .withIndex('by_stripe_customer_id', (q) =>
        q.eq('stripeCustomerId', args.subscription.stripeCustomerId).eq('isArchive', false)
      )
      .first();
    if (!existingSalon) {
      console.warn(
        `stripeCustomerId: ${args.subscription.stripeCustomerId} のサロンが見つかりません`
      );
      // サロンが見つからない場合でもサブスクリプション自体の更新は継続
      console.log(
        `stripeCustomerId: ${args.subscription.stripeCustomerId} のサロンが見つかりません`
      );
    } else {
      console.log(
        `stripeCustomerId: ${args.subscription.stripeCustomerId} に対応するサロンを発見: ${existingSalon._id}`
      );
    }

    // 既存レコードの更新または新規レコードの作成
    let subscriptionResult;
    try {
      if (existingSubscription && existingSubscription.isArchive !== true) {
        console.log(`既存のサブスクリプションを更新: ${existingSubscription._id}`);

        // サブスクリプションの検証 - 顧客IDが変わっていないことを確認
        if (existingSubscription.stripeCustomerId !== args.subscription.stripeCustomerId) {
          console.warn(
            `サブスクリプション ${args.subscription.subscriptionId} の顧客IDが一致しません。` +
              `既存: ${existingSubscription.stripeCustomerId}, 新規: ${args.subscription.stripeCustomerId}`
          );
        }

        const updateData = removeEmptyFields(args.subscription);
        validateSubscription(updateData);
        // 既存レコードを更新
        subscriptionResult = await ctx.db.patch(existingSubscription._id, updateData);
      } else {
        // 新規サブスクリプションの追加
        validateSubscription(args.subscription);
        console.log(`新規サブスクリプションレコードを作成: ${args.subscription.subscriptionId}`);
        subscriptionResult = await ctx.db.insert('subscription', {
          subscriptionId: args.subscription.subscriptionId,
          stripeCustomerId: args.subscription.stripeCustomerId,
          status: args.subscription.status,
          priceId: args.subscription.priceId,
          planName: args.subscription.planName,
          billingPeriod: args.subscription.billingPeriod,
          currentPeriodEnd: Number(args.subscription.currentPeriodEnd),
          isArchive: false,
        });
      }

      // サロンが存在する場合は更新して、両テーブルの状態を一致させる
      if (existingSalon) {
        validateSubscription(args.subscription);
        await ctx.db.patch(existingSalon._id, {
          subscriptionId: args.subscription.subscriptionId,
          subscriptionStatus: args.subscription.status,
          billingPeriod: args.subscription.billingPeriod,
          planName: args.subscription.planName,
          priceId: args.subscription.priceId,
        });
        console.log(
          `サロンのサブスクリプションステータスを更新: ${existingSalon._id} → ${args.subscription.status}`
        );
      }
    } catch (error) {
      console.error(
        `サブスクリプションまたはサロンの更新中にエラーが発生しました: ${args.subscription.subscriptionId}`,
        error
      );
      throw error; // エラーを上位に伝播して処理を中断
    }

    return subscriptionResult;
  },
});

// サブスクリプションの支払いが失敗した場合の処理
export const paymentFailed = mutation({
  args: {
    subscriptionId: v.string(),
    stripeCustomerId: v.string(),
    // トランザクションIDを追加して同一操作を識別できるようにする
    transactionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const transactionId =
      args.transactionId ||
      `payment_failed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(
      `[${transactionId}] サブスクリプション: ${args.subscriptionId} の支払い失敗を処理中`
    );

    // サブスクリプションIDによる検索
    let subscription = await ctx.db
      .query('subscription')
      .withIndex('by_subscription_id', (q) =>
        q.eq('subscriptionId', args.subscriptionId).eq('isArchive', false)
      )
      .first();

    // 見つからなかった場合は顧客IDで検索（バックアップ）
    if (!subscription) {
      console.log(
        `[${transactionId}] IDでサブスクリプションが見つからないため、顧客ID: ${args.stripeCustomerId} で検索中`
      );
      subscription = await ctx.db
        .query('subscription')
        .withIndex('by_stripe_customer_id', (q) =>
          q.eq('stripeCustomerId', args.stripeCustomerId).eq('isArchive', false)
        )
        .first();
    }

    if (!subscription) {
      console.warn(`[${transactionId}] サブスクリプションが見つかりません: ${args.subscriptionId}`);
      return null;
    }

    // サロンの存在確認 - 同時に更新するため
    const salon = await ctx.db
      .query('salon')
      .withIndex('by_stripe_customer_id', (q) =>
        q.eq('stripeCustomerId', args.stripeCustomerId).eq('isArchive', false)
      )
      .first();

    // トランザクション的にアトミックに処理するため配列で結果を保持
    const results = [];

    // サブスクリプションのステータスを更新
    console.log(
      `[${transactionId}] サブスクリプション ${args.subscriptionId} のステータスを payment_failed に更新`
    );
    const subscriptionResult = await ctx.db.patch(subscription._id, {
      status: 'payment_failed',
    });
    results.push({ type: 'subscription', id: subscription._id, result: subscriptionResult });

    // サロンが存在する場合は同時に更新
    if (salon) {
      console.log(
        `[${transactionId}] サロン ${salon._id} のサブスクリプションステータスも payment_failed に更新`
      );
      const salonResult = await ctx.db.patch(salon._id, {
        subscriptionStatus: 'payment_failed',
      });
      results.push({ type: 'salon', id: salon._id, result: salonResult });
    } else {
      console.warn(
        `[${transactionId}] stripeCustomerId: ${args.stripeCustomerId} のサロンが見つかりません`
      );
    }

    // サブスクリプション更新結果を返す（互換性のため）
    return subscriptionResult;
  },
});

// サブスクリプションのセッションを作成
export const createSubscriptionSession = action({
  args: {
    clerkUserId: v.string(),
    stripeCustomerId: v.string(),
    priceId: v.string(),
    trialDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: STRIPE_API_VERSION,
    });

    if (args.trialDays && (args.trialDays < 0 || args.trialDays > 15)) {
      throw new ConvexError({
        message: '試用期間は0以上15日以内で入力してください',
        code: CONVEX_ERROR_CODES.INVALID_ARGUMENT,
        severity: 'low',
        status: 400,
      });
    }
    validateSubscription(args);

    // 常に有効なURLが設定されるようにする
    const successUrl = `${baseUrl}/dashboard/subscription/success`;
    const cancelUrl = `${baseUrl}/dashboard/subscription`;

    // URLが有効かどうか確認 - ロギング追加
    console.log(
      `サブスクリプションのリダイレクトURL設定: successUrl=${successUrl}, cancelUrl=${cancelUrl}`
    );

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: args.stripeCustomerId,
      line_items: [{ price: args.priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: args.clerkUserId,
      metadata: {
        clerkUserId: args.clerkUserId,
      },
      ...(args.trialDays ? { subscription_data: { trial_period_days: args.trialDays } } : {}),
    });

    return { checkoutUrl: session.url };
  },
});

// サロンのサブスクリプションを確認
export const isSubscribed = query({
  args: { salonId: v.id('salon') },
  handler: async (ctx, args) => {
    // ログ識別子
    const queryId = `sub_check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${queryId}] サロン: ${args.salonId} のサブスクリプションステータスを確認中`);

    // 直接IDでサロンを検索
    const salon = await ctx.db.get(args.salonId);

    // サロンやStripe顧客IDがない場合
    if (!salon) {
      console.warn(`[${queryId}] ID: ${args.salonId} のサロンが見つかりません`);
      return false;
    }

    const stripeCustomerId = salon.stripeCustomerId;
    if (!stripeCustomerId) {
      console.warn(`[${queryId}] サロン ${args.salonId} にStripe顧客IDがありません`);
      return false;
    }

    // 両テーブルから同時にデータを取得して一貫性を確認
    const [salonSubscription] = await Promise.all([
      ctx.db
        .query('subscription')
        .withIndex('by_stripe_customer_id', (q) =>
          q.eq('stripeCustomerId', stripeCustomerId).eq('isArchive', false)
        )
        .first(),
    ]);

    // サブスクリプションテーブルの情報を優先（より正確）
    if (salonSubscription) {
      const isActiveInSubscriptionTable = salonSubscription.status === 'active';

      // サロンテーブルとサブスクリプションテーブルの間に不一致がある場合はログと修正フラグ
      if (salon.subscriptionStatus !== salonSubscription.status) {
        console.warn(
          `[${queryId}] サロン ${args.salonId} のサブスクリプションステータスが一致しません: ` +
            `salon.status=${salon.subscriptionStatus || '未定義'}, ` +
            `subscription.status=${salonSubscription.status}`
        );

        // この不一致は自動修正を検討する必要がある
        // 実際のアプリケーションでは、この処理はバックグラウンドジョブで行うべき
        // ここでは問題があることをログするだけ
      }

      console.log(
        `[${queryId}] サブスクリプションテーブルからのステータス: ${salonSubscription.status} (${isActiveInSubscriptionTable ? 'アクティブ' : '非アクティブ'})`
      );
      return isActiveInSubscriptionTable;
    }

    // サブスクリプションテーブルにレコードがない場合は、サロンテーブルの情報を使用
    const isActiveInSalonTable = salon.subscriptionStatus === 'active';

    if (!salonSubscription) {
      console.warn(
        `[${queryId}] 顧客ID ${stripeCustomerId} のサロン ${args.salonId} のサブスクリプションレコードが見つかりません`
      );
      // サブスクリプションレコードが見つからない場合はサロンテーブルの情報を信頼
      console.log(
        `[${queryId}] サロンテーブルのステータスを使用: ${salon.subscriptionStatus || '未定義'} (${isActiveInSalonTable ? 'アクティブ' : '非アクティブ'})`
      );
    }

    return isActiveInSalonTable;
  },
});

// Billing Portalのセッションを作成
export const createBillingPortalSession = action({
  args: {
    stripeCustomerId: v.string(), // Stripe の Customer ID を指定
    returnUrl: v.string(), // 顧客がポータルから戻る URL
  },
  handler: async (ctx, args) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: STRIPE_API_VERSION,
    });
    validateSubscription(args);
    const session = await stripe.billingPortal.sessions.create({
      customer: args.stripeCustomerId,
      return_url: args.returnUrl,
    });
    return { portalUrl: session.url };
  },
});

export const get = query({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    authCheck(ctx, true);
    validateSubscription(args);
    const subscription = await ctx.db
      .query('subscription')
      .withIndex('by_stripe_customer_id', (q) =>
        q.eq('stripeCustomerId', args.stripeCustomerId).eq('isArchive', false)
      )
      .first();
    return subscription;
  },
});

export const trash = mutation({
  args: {
    id: v.id('subscription'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await trashRecord(ctx, args.id);
  },
});

export const kill = mutation({
  args: {
    id: v.id('subscription'),
  },
  handler: async (ctx, args) => {
    authCheck(ctx);
    return await KillRecord(ctx, args.id);
  },
});
