import Stripe from 'stripe';
import { NextRequest } from 'next/server'; // NextResponseはここで直接使用しない場合は不要かもしれません
import { WebhookProcessor } from '@/services/webhook/BaseProcessor';
import type { ProcessingResult, WebhookDependencies } from '@/services/webhook/types';
import { WebhookMetricsCollector } from '@/services/webhook/metrics';
import { api } from '@/convex/_generated/api'; // Convex依存用
import { retryOperation } from '@/lib/utils'; // リトライ依存用
import { STRIPE_API_VERSION } from '@/services/stripe/constants';

import { handleAccountUpdated, handleAccountExternalAccountDeleted, handleCapabilityUpdated } from './handlers.connect';
import { handleSubscriptionUpdated, handleSubscriptionDeleted, handleInvoicePaymentSucceeded, handleInvoicePaymentFailed } from './handlers.subscription';
import { handleCheckoutSessionCompleted, handlePaymentIntentFailed, handleCheckoutSessionExpired } from './handlers.checkout';

/**
 * Stripeウェブフックを処理するプロセッサー。
 * 共通のウェブフック処理ロジックを活用するためにBaseProcessorを拡張しています。
 */
export class StripeWebhookProcessor extends WebhookProcessor {
  private stripe: Stripe;
  protected dependencies: WebhookDependencies;

  constructor() {
    super(); // WebhookProcessorには明示的なコンストラクターはありません。
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      // このエラーはキーが設定されていない場合にアプリケーションの起動を防ぎます。
      // これはフェイルファーストのアプローチです。
      throw new Error('環境変数にStripeのシークレットキー(STRIPE_SECRET_KEY)が設定されていません。');
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true, // StripeのTypeScriptユーザーに推奨される型安全性向上のための設定です。
    });

    // Stripeイベントハンドラーが必要とする依存関係を初期化します。
    // WebhookDependencies型はservices/webhook/types.tsから再利用しています。
    this.dependencies = {
      stripe: this.stripe,     // 初期化済みのStripeインスタンス。
      convex: api,             // データベース操作用のConvex API。
      retry: retryOperation,   // ハンドラーで必要に応じてリトライ操作を行うためのユーティリティ。
      // mail: mailService,    // 例: メールサービスが依存関係の場合。
    };
  }

  /**
   * 受信したStripeウェブフックリクエストの署名を検証します。
   * @param req NextRequestオブジェクト。
   * @param secret Stripeのウェブフック署名シークレット。
   * @returns 検証済みのStripe.Eventオブジェクト。
   * @throws 署名がないか無効な場合にエラーをスローします。
   */
  protected async verifySignature(req: NextRequest, secret: string): Promise<Stripe.Event> {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('stripe-signatureヘッダーがありません。Stripeウェブフックを検証できません。');
    }

    // Stripeは署名検証のためにリクエストの生のボディを必要とします。
    const rawBody = await req.text();

    try {
      // Stripeのライブラリを使ってイベントの構築と検証を行います。
      // これによりイベントがStripeからの本物で改ざんされていないことを保証します。
      return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err: any) {
      // stripe.webhooks.constructEventがスローするエラーをキャッチします（例: Stripe.errors.StripeSignatureVerificationError）
      console.error('Stripeウェブフックの署名検証に失敗しました:', err.message);
      // エラーは再スローされ、baseProcessorのprocessメソッドでキャッチされます。
      // ここでSentryへのログ記録や適切なHTTPレスポンス処理が行われます。
      throw new Error(`Stripe署名検証に失敗しました: ${err.message}`);
    }
  }

  /**
   * Stripeイベントの一意なイベントIDを作成します。
   * このIDは冪等性チェックやログ記録に使用されます。
   * @param evt Stripe.Eventオブジェクト。
   * @param req NextRequestオブジェクト（現在はStripe ID生成に使用していませんが抽象メソッドの署名の一部です）。
   * @returns 一意のイベントIDを表す文字列。
   */
  protected makeEventId(evt: Stripe.Event, req: NextRequest): string {
    return evt.id;
  }

  /**
   * Stripeイベントのメトリクス収集用のメタデータを取得します。
   * StripeイベントにはClerkのような他のシステムで一般的な直接的なユーザーIDや組織IDが
   * 同じ形で存在しないかもしれません。
   * @param evt Stripe.Eventオブジェクト。
   * @returns メトリクス用のメタデータを含むオブジェクト。現在は空を返します。
   */
  protected getMetricsMetadata(evt: Stripe.Event): { stripeAccountId?: string, stripeCustomerId?: string, stripeSubscriptionId?: string } {
    // Stripeイベントはカスタマー、サブスクリプション、接続アカウントに関連することが多いです。
    // メトリクスに役立つStripeカスタマーIDや接続アカウントIDのような特定のメタデータが
    // 必要になった場合はevt.data.objectから抽出してここで返すことが可能です。
    // 今のところ共通のユーザー/組織IDは抽出していません。

    let stripeAccountId = evt.account;
    let stripeCustomerId;
    let stripeSubscriptionId;
    // Subscription
    if(evt.type === 'customer.deleted'){
      stripeCustomerId = evt.data.object.id;
    }
    if(evt.type === 'customer.subscription.updated'){
      stripeCustomerId = evt.data.object.customer as string;
      stripeSubscriptionId = evt.data.object.id;
    }
    if(evt.type === 'customer.subscription.deleted'){
      stripeCustomerId = evt.data.object.customer as string;
      stripeSubscriptionId = evt.data.object.id;
    }
    if(evt.type === 'invoice.payment_failed'){
      stripeCustomerId = evt.data.object.customer as string;
      stripeSubscriptionId = evt.data.object.subscription as string;
    }
    if(evt.type === 'invoice.payment_succeeded'){
      stripeCustomerId = evt.data.object.customer as string;
      stripeSubscriptionId = evt.data.object.subscription as string;
    }

    // Stripe Connect
    if(evt.type === 'account.updated'){
      stripeAccountId = evt.data.object.id;
    }
    if(evt.type === 'account.external_account.deleted'){
      stripeAccountId = evt.data.object.id;
    }
    if(evt.type === 'capability.updated'){
      stripeAccountId = evt.data.object.id;
    }
    
    // Checkout & Payment Intent
    if(evt.type === 'checkout.session.completed' || evt.type === 'checkout.session.expired'){
      const session = evt.data.object as any;
      stripeCustomerId = session.customer as string;
      // metadataも記録（サロン予約の識別用）
    }
    if(evt.type === 'payment_intent.payment_failed'){
      const paymentIntent = evt.data.object as any;
      stripeCustomerId = paymentIntent.customer as string;
    }
    
    return {
      stripeAccountId: stripeAccountId ?? undefined,
      stripeCustomerId: stripeCustomerId ?? undefined,
        stripeSubscriptionId: stripeSubscriptionId ?? undefined
    };
  }

  /**
   * 検証済みのStripeイベントを適切なハンドラーに振り分けます。
   * @param evt Stripe.Eventオブジェクト。
   * @param eventId このイベントの一意ID。
   * @param metrics イベントメトリクス記録用のWebhookMetricsCollectorインスタンス。
   * @param req NextRequestオブジェクト（ハンドラーがリクエストの詳細を必要とする場合に利用可能）。
   * @returns ProcessingResult ('success', 'skipped', 'error')。
   * @throws ハンドラー内でイベント処理に失敗した場合にエラーをスローします。
   */
  protected async dispatch(
    evt: Stripe.Event,
    eventId: string,
    metrics: WebhookMetricsCollector,
    req: NextRequest 
  ): Promise<ProcessingResult> {
    console.log(`🎯 Stripeイベントの振り分け: ${evt.type} (ID: ${eventId})`);

    try {
      switch (evt.type) {
        // サブスクリプション更新時
        case 'customer.subscription.updated':
          // As per type WebhookEvent<OrganizationJSON, 'organization.deleted'>, evt.data is OrganizationJSON.
          return (await handleSubscriptionUpdated(evt, eventId, this.dependencies, metrics)).result;
        // サブスクリプションが削除された場合
        case 'customer.subscription.deleted':
          // As per type WebhookEvent<OrganizationJSON, 'organization.deleted'>, evt.data is OrganizationJSON.
          return (await handleSubscriptionDeleted(evt, eventId, this.dependencies, metrics)).result;
        // 請求書の支払いが失敗した場合
        case 'invoice.payment_failed':
          return (await handleInvoicePaymentFailed(evt, eventId, this.dependencies, metrics)).result;
        // 請求書の支払いが成功した場合
        case 'invoice.payment_succeeded':
          return (await handleInvoicePaymentSucceeded(evt, eventId, this.dependencies, metrics)).result;
        // Stripe Connectのアカウントが更新された場合
        case 'account.updated':
          return (await handleAccountUpdated(evt, eventId, this.dependencies, metrics)).result;
        // Stripe Connectの銀行口座やカードといった外部支払い手段がアカウントから削除されたときに送信される
        case 'account.external_account.deleted':
          return (await handleAccountExternalAccountDeleted(evt, eventId, this.dependencies, metrics)).result;
        // Stripe Connectの口座が支払い／振込機能が変更された際に送信される
        case 'capability.updated':
          return (await handleCapabilityUpdated(evt, eventId, this.dependencies, metrics)).result;
        // Checkout Session が完了した場合（決済成功）
        case 'checkout.session.completed':
          return (await handleCheckoutSessionCompleted(evt, eventId, this.dependencies, metrics)).result;
        // Payment Intent が失敗した場合（決済失敗）
        case 'payment_intent.payment_failed':
          return (await handlePaymentIntentFailed(evt, eventId, this.dependencies, metrics)).result;
        // Checkout Session が期限切れになった場合
        case 'checkout.session.expired':
          return (await handleCheckoutSessionExpired(evt, eventId, this.dependencies, metrics)).result;
        default:
          console.log(`Unsupported Stripe event type: ${evt.type}`);
          return 'skipped';
      }
    } catch (error) {
      console.error(`Error dispatching Stripe event ${evt.type} (ID: ${eventId}):`, error);
      // This error will be caught by baseProcessor.process, which will log to Sentry
      // and record the processing result.
      throw error;
    }
  }
}