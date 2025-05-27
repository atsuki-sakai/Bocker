import type Stripe from 'stripe';
import type { WebhookMetricsCollector } from '@/services/webhook/metrics';
import type { LogContext, EventProcessingResult, WebhookDependencies } from '../types';
import * as Sentry from '@sentry/nextjs';
import { api } from '@/convex/_generated/api';
import { fetchMutation } from 'convex/nextjs';
import { StripeConnectStatus } from '@/convex/types';

/**
 * Stripe アカウントの各種フラグを 7 種類の運用ステータスに正規化する
 *
 * pending                  : 設定フォーム未提出（details_submitted=false）
 * incomplete               : 追加書類提出が必要だが期限切れではない
 * restricted               : past_due の書類があり機能制限中
 * active                   : 決済・振込とも有効
 * payouts_disabled         : 決済は有効だが振込が停止
 * external_account_removed : 登録済み銀行口座をユーザーが削除
 * bank_account_missing     : 銀行口座が未登録のまま
 */
export function determineAccountStatus(account: Stripe.Account): StripeConnectStatus {
  const {
    details_submitted,
    charges_enabled,
    payouts_enabled,
    requirements,
    external_accounts
  } = account;

  // 1. 銀行口座が未登録の場合（最優先で判定）
  if (external_accounts && external_accounts.data.length === 0) {
    return 'bank_account_missing';
  }

  // 2. past_due があれば即 restricted
  if (requirements?.past_due && requirements.past_due.length > 0) {
    return 'restricted';
  }

  // 3. currently_due がある場合は incomplete
  if (requirements?.currently_due && requirements.currently_due.length > 0) {
    return 'incomplete';
  }

  // 4. 申請フォーム未提出
  if (!details_submitted) {
    return 'pending';
  }

  // 5. カード決済と振込の両方が有効
  if (charges_enabled && payouts_enabled) {
    return 'active';
  }

  // 6. 振込のみ停止
  if (charges_enabled && !payouts_enabled) {
    return 'payouts_disabled';
  }

  // 7. ここに到達するのは想定外だが安全に incomplete 扱い
  return 'incomplete';
}


export async function handleAccountUpdated(
  /**
   * Stripe の Account 更新の Webhook イベントを処理
   * (account.updated)
   *
   * @param evt - Stripe イベントオブジェクト
   * @param eventId - イベントID
   * @param deps - Webhook の依存関係 (Stripe インスタンスなど)
   * @param metrics - メトリクスコレクター
   * @returns イベント処理結果 ('success', 'skipped', 'error')
   */
  evt: Stripe.AccountUpdatedEvent,
  eventId: string,
  deps: WebhookDependencies,
  metrics: WebhookMetricsCollector
): Promise<EventProcessingResult> {
  
  const context: LogContext = {
    eventId,
    eventType: 'account.updated',
    stripeAccountId: evt.data.object.id as string,
  };
  console.log(`👤 [${eventId}] AccountUpdated処理開始: stripeAccountId=${evt.data.object.id}`, context);

  try {

    const stripeAccountId = evt.data.object.id as string;
    let updateStatus = determineAccountStatus(evt.data.object);
    // ステータスを更新
    await deps.retry(() =>
      fetchMutation(api.organization.mutation.updateConnectStatus, {
        stripe_account_id: stripeAccountId,
        status: updateStatus,
      })
    );
    metrics.incrementApiCall('convex')

    return {
      result: 'success',
      metadata: {
        action: 'account.updated',
        stripeAccountId: evt.data.object.id as string,
      }
    };
  } catch (error) {
    console.error(`❌ [${eventId}] AccountUpdated処理中に致命的なエラーが発生: stripeAccountId=${evt.data.object.id}`, { ...context, error });
    Sentry.captureException(error, {
      level: 'error',
      tags: { ...context, operation: 'handleAccountUpdated_main_catch' },
    });
    return {
      result: 'error',
      errorMessage: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

export async function handleAccountExternalAccountDeleted(
  /**
   * Stripe の Account 外部口座削除の Webhook イベントを処理
   * (account.external_account.deleted)
   *
   * @param evt - Stripe イベントオブジェクト
   * @param eventId - イベントID
   * @param deps - Webhook の依存関係 (Stripe インスタンスなど)
   * @param metrics - メトリクスコレクター
   * @returns イベント処理結果 ('success', 'skipped', 'error')
   */
  evt: Stripe.AccountExternalAccountDeletedEvent,
  eventId: string,
  deps: WebhookDependencies,
  metrics: WebhookMetricsCollector
): Promise<EventProcessingResult> {
  
  // 外部口座削除イベントでは evt.account が Connect アカウント ID
  const stripeAccountId = evt.account;

  const context: LogContext = {
    eventId,
    eventType: 'account.external_account.deleted',
    stripeAccountId: stripeAccountId,
  };
  console.log(`👤 [${eventId}] AccountExternalAccountDeleted処理開始: stripeAccountId=${stripeAccountId}`, context);

  try {
    if (!stripeAccountId) {
      return {
        result: 'skipped',
        metadata: {
          action: 'account_external_account_deleted',
          stripeAccountId: stripeAccountId,
          errorMessage: '対象のstripeConnectAccountが見つかりません',
        }
      };
    }

    await deps.retry(() => 
      fetchMutation(api.organization.mutation.updateConnectStatus, {
        stripe_account_id: stripeAccountId,
        status: "external_account_removed",
      })
    );
    metrics.incrementApiCall('convex');

    return {
      result: 'success',
      metadata: {
        action: 'account_external_account_deleted',
        stripeAccountId: stripeAccountId,
      }
    };
  } catch (error) {
    console.error(`❌ [${eventId}] handleAccountExternalAccountDeletedの処理中に致命的なエラーが発生: stripeAccountId=${stripeAccountId}`, { ...context, error });
    Sentry.captureException(error, {
      level: 'error',
      tags: { ...context, operation: 'handleAccountExternalAccountDeleted_main_catch' },
    });
    return {
      result: 'error',
      errorMessage: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

export async function handleCapabilityUpdated(
  /**
   * Stripe の Capability 更新の Webhook イベントを処理
   * 主にConvexのデータベースに保存するデータと同期するためのイベント
   * (capability.updated)
   *
   * @param evt - Stripe イベントオブジェクト
   * @param eventId - イベントID
   * @param deps - Webhook の依存関係 (Stripe インスタンスなど)
   * @param metrics - メトリクスコレクター
   * @returns イベント処理結果 ('success', 'skipped', 'error')
   */
  evt: Stripe.CapabilityUpdatedEvent,
  eventId: string,
  deps: WebhookDependencies,
  metrics: WebhookMetricsCollector
): Promise<EventProcessingResult> {
 
  const context: LogContext = {
    eventId,
    eventType: 'capability.updated',
    stripeAccountId: evt.data.object.account as string,
  };
  console.log(`👤 [${eventId}] CapabilityUpdated処理開始: stripeAccountId=${evt.data.object.account}`, context);

  try {
    const stripeAccountId = evt.data.object.account as string;

    let capabilityType = evt.data.object.id;// card_payments / transfers

    // card_payments / transfers 以外の Capability はサポート対象外
    if (capabilityType !== 'card_payments' && capabilityType !== 'transfers') {
      return {
        result: 'skipped',
        metadata: {
          action: 'capability_updated',
          stripeAccountId: stripeAccountId,
        },
      };
    }

    // ここからは対象 Capability のみ -----
    let accountStatus: StripeConnectStatus = 'pending'; // デフォルトで初期化

    switch (evt.data.object.status) {
      case 'active':
        accountStatus = 'active';
        break;
      case 'disabled':
        accountStatus = 'payouts_disabled';
        break;
      case 'inactive':
      case 'unrequested':
        accountStatus = 'incomplete';
        break;
      case 'pending':
        accountStatus = 'pending';
        break;
    }

    // Convex 側に Capability ステータスを同期（冪等アップサート）
    await deps.retry(() => 
      fetchMutation(api.organization.mutation.updateConnectStatus, {
        stripe_account_id: stripeAccountId,
        status: accountStatus,
      })
    );
    metrics.incrementApiCall('convex');
    return {
      result: 'success',
      metadata: {
        action: 'capability_updated',
        stripeAccountId: stripeAccountId,
      }
    };

  } catch (error) {
    console.error(`❌ [${eventId}] handleCapabilityUpdatedの処理中に致命的なエラーが発生: stripeAccountId=${evt.data.object.id}`, { ...context, error });
    Sentry.captureException(error, {
      level: 'error',
      tags: { ...context, operation: 'handleCapabilityUpdated_main_catch' },
    });
    return {
      result: 'error',
      errorMessage: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}