// convex/webhook_worker/processStripeEvent.ts
import { internalAction } from '../_generated/server'; // internalAction を推奨
import { api } from '../_generated/api';
import { v } from 'convex/values';
import Stripe from 'stripe';

// Stripe SDK の初期化に必要な依存関係 (Stripe API キーなど) を Convex の環境変数から取得
// これは Convex ダッシュボードで設定する必要がある
// const stripeApiKey = process.env.STRIPE_API_KEY; // Node.js の process.env は使えない
// const stripe = new Stripe(stripeApiKey!, { apiVersion: '2023-10-16' }); // 例

// 注意: 実際の Stripe SDK の利用や依存関係の注入はより複雑になる可能性があります。
// ここでは、Stripe APIキーがConvex環境変数 STRIPE_SECRET_KEY として設定されていると仮定します。
// また、services 配下のハンドラを直接呼び出す代わりに、
// このワーカー内でロジックを再実装するか、HTTP経由で呼び出す等の工夫が必要です。
// 指示書は services のハンドラを直接呼ぶように読めるため、一旦その方向で試みますが、
// 実行時エラーの可能性が高いです。

// services/stripe/webhook/handlers.subscription.ts からのインポート (パスは要調整・動作しない可能性あり)
// import { handleSubscriptionEvent } from '../../../services/stripe/webhook/handlers.subscription';
// services/stripe/webhook/handlers.connect.ts からのインポート (パスは要調整・動作しない可能性あり)
// import { handleConnectEvent } from '../../../services/stripe/webhook/handlers.connect';
// import type { WebhookDependencies } from '../../../services/webhook/types';
// import { StripeWebhookRepository } from '../../../services/stripe/repositories/StripeWebhookRepository';

// 上記の直接インポートはConvex環境では機能しないため、ハンドラロジックをここに展開するか、
// HTTP Action経由で呼び出す形にするのが現実的です。
// 今回の指示では、まず構造を作成し、詳細な実装は後続のステップ（テストやリファクタリング）で
// 調整することを想定している可能性があります。

// ダミーの Stripe インスタンスと依存関係 (実際の環境では適切に設定が必要)
// これはあくまでプレースホルダーであり、このままでは動作しません。
// const dummyStripe = {} as Stripe; 
// const dummyDeps: WebhookDependencies = {
//   stripe: dummyStripe,
//   convex: api, // これは Convex の api オブジェクトなのでOK
//   retry: async (fn) => fn(), // ダミーの retry
// };

export const processStripeEvent = internalAction({
  args: {
    id: v.string(),
    type: v.string(),
    target: v.string(), // 'subscription' or 'connect'
    payload: v.any(),   // Stripe.Event object
  },
  handler: async (ctx, args) => {
    console.log(`[Worker: processStripeEvent] Processing event ${args.id} (${args.type}) for target ${args.target}`);
    
    const { id: eventId, type: eventType, target, payload } = args;
    let processingResult: 'success' | 'error' | 'skipped' = 'error'; // デフォルトは error
    let errorMessage: string | undefined;

    // Stripe SDK のインスタンス化 (Convex 環境変数を想定)
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY; // Convexの環境変数から取得
    if (!stripeSecretKey) {
      console.error('[Worker: processStripeEvent] STRIPE_SECRET_KEY is not set in Convex environment variables.');
      errorMessage = 'STRIPE_SECRET_KEY is not configured in Convex.';
      // Ensure webhook_events table and updateEventResult mutation exist
      try {
        await ctx.runMutation(api.webhook_events.mutation.updateEventResult, {
          event_id: eventId,
          processing_result: 'error',
          error_message: errorMessage,
        });
      } catch(e: any) {
        console.error(`[Worker: processStripeEvent] Failed to record error to webhook_events: ${e.message}`);
        // If recording fails, the original error is more important to throw
      }
      // Sentry などでの通知も検討
      throw new Error(errorMessage);
    }
    
    const stripe = new Stripe(stripeSecretKey, {
       apiVersion: '2023-10-16', // 使用するStripe APIバージョンを指定
       typescript: true,
    });

    // WebhookDependencies の準備
    // retryOperation はここでは単純なものにするか、Convexの機能で代替
    // WebhookDependencies.convex は typeof api なので api (imported) を渡す
    // WebhookDependencies.retry は services/lib/utils の retryOperation をそのまま使えない可能性あり。
    // ここでは簡易的なリトライや、Convexのスケジューラを使ったリトライを検討。
    const deps: any = { // Type as any to avoid strict WebhookDependencies type issues in this context
      stripe: stripe,
      convex: api, 
      retry: async (operation: () => Promise<any>, retries: number = 1) => { 
        // This is a very basic retry, not as robust as the original utility.
        // For more complex retry logic, consider Convex's scheduler or other patterns.
        try {
          return await operation();
        } catch (error) {
          if (retries > 0) {
            console.warn(`[Worker: processStripeEvent] Retrying operation, ${retries} retries left.`);
            return deps.retry(operation, retries - 1);
          }
          throw error;
        }
      },
    };

    try {
      // payload は Stripe.Event オブジェクトそのものであると仮定
      const event = payload as Stripe.Event; 

      // StripeWebhookRepository のインスタンスを作成
      // StripeWebhookRepository は services/stripe/repositories/ にある。
      // これを Convex から直接利用するのは難しい。
      // StripeWebhookRepository のロジックを Convex の mutation/action に移植するか、
      // ここで Stripe API を直接叩く処理を実装する必要がある。
      // 指示書には「既存リポジトリを呼び出し」とあるが、アーキテクチャの制約上、工夫が必要。
      
      // **暫定対応**: ここでは、リポジトリが行うであろうDB操作（Convex Mutation）を直接呼び出す形でシミュレートします。
      // これは StripeWebhookRepository.handleWebhookEvent のロジックをここに展開するイメージに近い。
      // 実際の StripeWebhookRepository の中身（特にDB操作部分）を Convex Mutation として実装し、
      // それを呼び出す形が望ましい。

      console.log(`[Worker: processStripeEvent] Simulating repository call for event ${eventId} (${eventType})`);
      // --- StripeWebhookRepository.handleWebhookEvent(event) のロジック展開 (シミュレーション) ---
      // 例: サブスクリプション更新なら、テナントのサブスクリプション情報を更新する Convex Mutation を呼び出す
      if (target === 'subscription') {
        // const tenant = await ctx.runQuery(api.tenants.findByStripeCustomerId, { stripeCustomerId: event.data.object.customer });
        // if (tenant) {
        //   await ctx.runMutation(api.subscriptions.updateSubscriptionStatus, { tenantId: tenant._id, status: event.data.object.status });
        //   processingResult = 'success';
        // } else {
        //   processingResult = 'skipped';
        //   errorMessage = 'Tenant not found for customer ID.';
        // }
        console.warn('[Worker: processStripeEvent] Subscription handling logic needs to be implemented using Convex mutations/queries based on StripeWebhookRepository logic.');
        processingResult = 'skipped'; // 未実装のため skipped
        errorMessage = 'Subscription handling logic not fully implemented in Convex worker.';

      } else if (target === 'connect') {
        // 例: Connectアカウント更新なら、組織情報を更新する Convex Mutation を呼び出す
        // const organization = await ctx.runQuery(api.organizations.findByStripeAccountId, { stripeAccountId: event.account });
        // if (organization) {
        //   await ctx.runMutation(api.organizations.updateStripeConnectStatus, { organizationId: organization._id, status: 'active' });
        //   processingResult = 'success';
        // } else {
        //   processingResult = 'skipped';
        //   errorMessage = 'Organization not found for Stripe account ID.';
        // }
        console.warn('[Worker: processStripeEvent] Connect handling logic needs to be implemented using Convex mutations/queries based on StripeWebhookRepository logic.');
        processingResult = 'skipped'; // 未実装のため skipped
        errorMessage = 'Connect handling logic not fully implemented in Convex worker.';
      } else {
        console.warn(`[Worker: processStripeEvent] Unknown target: ${target}`);
        processingResult = 'skipped';
        errorMessage = `Unknown target type: ${target}`;
      }
      // --- ここまでシミュレーション ---

      if (processingResult === 'error' && !errorMessage) {
        errorMessage = `Processing failed for event ${eventId} in worker.`;
      }

    } catch (e: any) {
      console.error(`[Worker: processStripeEvent] Error processing event ${eventId}:`, e);
      processingResult = 'error';
      errorMessage = e.message || 'Unknown error in worker.';
      // Sentry などでのエラー報告も検討
    } finally {
      // 処理結果を webhook_events テーブル (または相当するテーブル) に記録
      // Ensure webhook_events table and updateEventResult mutation exist
      try {
        await ctx.runMutation(api.webhook_events.mutation.updateEventResult, {
          event_id: eventId, // args.id を使用
          processing_result: processingResult,
          error_message: errorMessage,
        });
      } catch(e: any) {
         console.error(`[Worker: processStripeEvent] Failed to record final result to webhook_events: ${e.message}`);
         // If this recording fails, the worker has done its best. The error is already logged.
      }
      console.log(`[Worker: processStripeEvent] Finished processing event ${args.id}. Result: ${processingResult}`);
    }
  },
});
