import type Stripe from 'stripe';
import type { ProcessingResult, WebhookDependencies } from '@/services/webhook/types';
import type { WebhookMetricsCollector } from '@/services/webhook/metrics';
// Corrected import path based on ls output
import { StripeWebhookRepository } from '@/services/stripe/repositories/StripeWebhookRepository';

/**
 * Stripe の Subscription 関連の Webhook イベントを処理します。
 * (例: customer.subscription.*, invoice.*)
 *
 * @param evt - Stripe イベントオブジェクト
 * @param eventId - イベントID
 * @param deps - Webhook の依存関係 (Stripe インスタンスなど)
 * @param metrics - メトリクスコレクター
 * @returns イベント処理結果 ('success', 'skipped', 'error')
 */
export async function handleSubscriptionEvent(
  evt: Stripe.Event,
  eventId: string, // eventId はログや将来的な拡張のために渡されますが、現在の指示では直接使用されません
  deps: WebhookDependencies,
  metrics: WebhookMetricsCollector // metrics も同様に渡されます
): Promise<ProcessingResult> {
  console.log(`[Stripe Subscription Handler] Event ${eventId} (${evt.type}) received.`);
  
  // 既存の StripeWebhookRepository を使用してイベントを処理
  // StripeWebhookRepository.getInstance() が deps.stripe (Stripe SDKインスタンス) を引数に取ることを想定
  const repo = StripeWebhookRepository.getInstance(deps.stripe);

  try {
    // リポジトリのメソッドを呼び出し、ビジネスロジックを実行
    // repo.handleWebhookEvent(evt) が evt (Stripe イベントオブジェクト) のみを取り、
    // { success: boolean, message?: string } という形式のオブジェクトを返すことを前提とします。
    const result = await repo.handleWebhookEvent(evt); 

    // メトリクスに処理時間を記録 (オプション) - 将来的な拡張のためにコメントアウト
    // const startTime = Date.now(); // 開始時間を記録する場合
    // metrics.recordHandlerDuration('handleSubscriptionEvent', Date.now() - startTime);

    if (result.success) {
      console.log(`[Stripe Subscription Handler] Event ${eventId} (${evt.type}) processed successfully.`);
      return 'success';
    } else if (result.message === 'skipped') { // 'skipped' の判定を result.message で行う
      console.log(`[Stripe Subscription Handler] Event ${eventId} (${evt.type}) was skipped: ${result.message}`);
      return 'skipped';
    } else {
      // result.success が false で、message が 'skipped' でない場合、エラーとして扱う
      console.error(`[Stripe Subscription Handler] Error processing event ${eventId} (${evt.type}): ${result.message}`);
      return 'error';
    }
  } catch (error) {
    console.error(`[Stripe Subscription Handler] Critical error processing event ${eventId} (${evt.type}):`, error);
    // メトリクスにエラーを記録 (オプション) - 将来的な拡張のためにコメントアウト
    // metrics.recordError('handleSubscriptionEvent');
    
    // エラーは呼び出し元の dispatch メソッドでキャッチされ、Sentry に報告されるため、ここでは再スローする
    throw error;
  }
}
