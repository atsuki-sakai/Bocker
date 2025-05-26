import type { UserJSON, OrganizationJSON } from '@clerk/nextjs/server';
import { fetchMutation, fetchQuery } from 'convex/nextjs';
import * as Sentry from '@sentry/nextjs';
import type { 
  WebhookDependencies, 
  EventProcessingResult, 
  LogContext 
} from '../types';
import { executeInParallel, createTask } from '../parallel';
import { WebhookMetricsCollector } from '../metrics';

/**
 * `user.created` Webhookイベントを処理するハンドラー関数。
 * 新規ユーザーの情報をStripeおよびConvexに登録する。
 * 既存ユーザーの場合はメールアドレスを更新する。
 * @param data UserJSON - Clerkから送信されたユーザーデータ
 * @param eventId string - Webhookイベントの一意なID
 * @param deps WebhookDependencies - 外部サービスへの依存関係
 * @param metrics WebhookMetricsCollector - メトリクス収集用インスタンス
 * @returns Promise<EventProcessingResult> - 処理結果
 */
export async function handleUserCreated(
  data: UserJSON,
  eventId: string,
  deps: WebhookDependencies,
  metrics: WebhookMetricsCollector
): Promise<EventProcessingResult> {
  const { id, email_addresses = [], unsafe_metadata } = data;
  const referral_code = unsafe_metadata?.referralCode as string;
  const email = email_addresses[0]?.email_address || 'no-email';
  
  const context: LogContext = {
    eventId,
    eventType: 'user.created',
    userId: id,
  };

  console.log(`👤 [${eventId}] User Created処理開始: user_id=${id}, email=${email}`, context);

  try {
    // 1. 既存テナントの確認
    const existingTenant = await deps.retry(() =>
      fetchQuery(deps.convex.tenant.query.findByUserId, { user_id: id })
    ).catch((error) => {
      console.warn(`⚠️ [${eventId}] 既存テナントの確認中にエラー（無視して続行）: user_id=${id}`, { ...context, error });
      return null;
    });

    if (existingTenant) {
      console.log(`👤 [${eventId}] 既存テナント (${existingTenant._id}) が見つかりました: user_id=${id}。メールアドレスを ${email} に更新します。`, { ...context, tenantId: existingTenant._id });
      
      // メールアドレスのみ更新
      await deps.retry(() =>
        fetchMutation(deps.convex.tenant.mutation.upsert, {
          user_id: id,
          user_email: email
        })
      );
      
      metrics.incrementApiCall('convex');
      
      console.log(`✅ [${eventId}] 既存テナント (${existingTenant._id}) のメールアドレス更新成功。`, { ...context, tenantId: existingTenant._id });
      
      return {
        result: 'success',
        metadata: { action: 'email_updated', existingTenantId: existingTenant._id, newEmail: email }
      };
    }

    // 2. Stripe顧客作成
    console.log(`💳 [${eventId}] Stripe顧客作成: email=${email}, user_id=${id}`, context);
    metrics.incrementApiCall('stripe');
    
    const stripeCustomer = await deps.retry(() =>
      deps.stripe.customers.create({
        email: email || undefined,
        metadata: { user_id: id, referral_code: referral_code },
      }, {
        idempotencyKey: `clerk_user_${id}_${eventId}`,
      })
    );

    console.log(`💳 [${eventId}] Stripe顧客作成成功: customerId=${stripeCustomer.id}`, { ...context, stripeCustomerId: stripeCustomer.id });

    // 3. テナント作成
    console.log(`🏢 [${eventId}] テナント作成開始: user_id=${id}, stripeCustomerId=${stripeCustomer.id}`, { ...context, stripeCustomerId: stripeCustomer.id });
    metrics.incrementApiCall('convex');
    const tenantId = await deps.retry(() =>
      fetchMutation(deps.convex.tenant.mutation.create, {
        user_id: id,
        user_email: email,
        stripe_customer_id: stripeCustomer.id,
      })
    );
    console.log(`🏢 [${eventId}] テナント作成成功: tenant_id=${tenantId}`, { ...context, tenantId });

    // 4. Referral作成（非クリティカル）
    try {
      console.log(`🎁 [${eventId}] Referral作成開始: tenant_id=${tenantId}`, { ...context, tenantId });
      metrics.incrementApiCall('convex');
      await deps.retry(() =>
        fetchMutation(deps.convex.tenant.referral.mutation.create, {
          tenant_id: tenantId,
        })
      );
      console.log(`🎁 [${eventId}] Referral作成成功。`, { ...context, tenantId });
    } catch (referralError) {
      console.warn(`⚠️ [${eventId}] Referral作成失敗（非クリティカル）: tenant_id=${tenantId}`, { ...context, tenantId, error: referralError });
      Sentry.captureException(referralError, {
        level: 'warning',
        tags: { ...context, operation: 'create_referral', tenant_id: tenantId },
        extra: { tenantId }
      });
    }

    console.log(`✅ [${eventId}] User Created処理完了。`, { ...context, tenantId, stripeCustomerId: stripeCustomer.id });
    return {
      result: 'success',
      metadata: { 
        action: 'user_created', 
        tenantId: tenantId,
        stripeCustomerId: stripeCustomer.id 
      }
    };

  } catch (error) {
    console.error(`❌ [${eventId}] User Created処理中に致命的なエラーが発生: user_id=${id}`, { ...context, error });
    
    Sentry.captureException(error, {
      level: 'error',
      tags: { ...context, operation: 'handleUserCreated_main_catch' },
    });

    return {
      result: 'error',
      errorMessage: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

/**
 * `user.updated` Webhookイベントを処理するハンドラー関数。
 * ユーザーのメールアドレス変更などをStripeおよびConvexに同期する。
 * テナントが存在しない場合は、復旧処理として新規作成を試みる。
 * @param data UserJSON - Clerkから送信されたユーザーデータ
 * @param eventId string - Webhookイベントの一意なID
 * @param deps WebhookDependencies - 外部サービスへの依存関係
 * @param metrics WebhookMetricsCollector - メトリクス収集用インスタンス
 * @returns Promise<EventProcessingResult> - 処理結果
 */
export async function handleUserUpdated(
  data: UserJSON,
  eventId: string,
  deps: WebhookDependencies,
  metrics: WebhookMetricsCollector
): Promise<EventProcessingResult> {
  const { id, email_addresses = [], primary_email_address_id } = data;

  // プライマリーメールアドレスを取得
  let email = 'no-email';
  if (primary_email_address_id && email_addresses.length > 0) {
    const primaryEmail = email_addresses.find((e: any) => e.id === primary_email_address_id);
    email = primaryEmail?.email_address || email_addresses[0]?.email_address || 'no-email';
  } else {
    email = email_addresses[0]?.email_address || 'no-email';
  }
  const context: LogContext = {
    eventId,
    eventType: 'user.updated',
    userId: id,
  };

  console.log(`🔄 [${eventId}] User Updated処理開始: user_id=${id}, new_email=${email}`, context);

  try {
    // 既存テナントの確認
    const existingTenant = await deps.retry(() =>
      fetchQuery(deps.convex.tenant.query.findByUserId, { user_id: id })
    ).catch(() => null);

    metrics.incrementApiCall('convex');

    if (existingTenant) {
      // 並列でStripeとConvexを更新
      const updateTasks = [
        createTask(
          'stripe_customer_update',
          async () => {
            if (existingTenant.stripe_customer_id && typeof existingTenant.stripe_customer_id === 'string') {
              console.log(`💳 [${eventId}] Stripe顧客更新開始: customerId=${existingTenant.stripe_customer_id}, new_email=${email}`, { ...context, stripeCustomerId: existingTenant.stripe_customer_id });
              metrics.incrementApiCall('stripe');
              
              return deps.retry(() =>
                deps.stripe.customers.update(existingTenant.stripe_customer_id!, {
                  email: email || undefined,
                  metadata: { user_id: id, updated_at: new Date().toISOString() },
                }, {
                  idempotencyKey: `clerk_update_user_${id}_${eventId}`,
                })
              );
            }
            console.log(`ℹ️ [${eventId}] Stripe顧客IDが存在しないため、Stripe顧客更新をスキップ。user_id=${id}`, { ...context, tenantId: existingTenant._id });
            return null;
          },
          false // Stripe更新は失敗してもConvex更新は試みるため非クリティカル
        ),
        createTask(
          'convex_tenant_update',
          async () => {
            console.log(`🏢 [${eventId}] テナント更新開始: tenant_id=${existingTenant._id}, new_email=${email}`, { ...context, tenantId: existingTenant._id });
            metrics.incrementApiCall('convex');
            
            return deps.retry(() =>
              fetchMutation(deps.convex.tenant.mutation.upsert, {
                user_id: id,
                user_email: email,
                stripe_customer_id: existingTenant.stripe_customer_id,
              })
            );
          },
          true // クリティカル
        )
      ];

      await executeInParallel(updateTasks, context);

      console.log(`✅ [${eventId}] User Updated処理完了。user_id=${id}`, { ...context, tenantId: existingTenant._id });
      return {
        result: 'success',
        metadata: { action: 'user_updated', tenantId: existingTenant._id, newEmail: email }
      };

    } else {
      // 復旧処理として新規作成
      console.warn(`⚠️ [${eventId}] User Updatedイベント受信: テナントが見つかりません (user_id=${id})。復旧処理を試みます。`, context);
      Sentry.captureMessage('User Updated: Tenant not found, attempting recovery.', {
        level: 'warning',
        tags: { ...context, operation: 'handleUserUpdated_recovery' },
        extra: { userId: id, email }
      });
      
      // 復旧処理: Stripe顧客とConvexテナントを新規作成
      console.log(`🛠️ [${eventId}] 復旧処理: Stripe顧客作成開始 user_id=${id}, email=${email}`, context);
      metrics.incrementApiCall('stripe');
      const customer = await deps.retry(() =>
        deps.stripe.customers.create({
          email: email || undefined,
          metadata: { user_id: id, recovered_at: new Date().toISOString() },
        }, {
          idempotencyKey: `clerk_recovery_user_${id}_${eventId}`,
        })
      );
      console.log(`🛠️ [${eventId}] 復旧処理: Stripe顧客作成成功 (customerId=${customer.id})`, { ...context, stripeCustomerId: customer.id });

      console.log(`🛠️ [${eventId}] 復旧処理: Convexテナント作成開始 user_id=${id}, stripe_customer_id=${customer.id}`, { ...context, stripeCustomerId: customer.id });
      metrics.incrementApiCall('convex');
      const recoveredTenantId = await deps.retry(() =>
        fetchMutation(deps.convex.tenant.mutation.create, {
          user_id: id,
          user_email: email,
          stripe_customer_id: customer.id,
        })
      );
      console.log(`🛠️ [${eventId}] 復旧処理: Convexテナント作成成功 (tenantId=${recoveredTenantId})`, { ...context, tenantId: recoveredTenantId });

      console.log(`✅ [${eventId}] User Updated復旧処理完了。user_id=${id}`, { ...context, tenantId: recoveredTenantId, stripeCustomerId: customer.id });
      return {
        result: 'success',
        metadata: { action: 'recovery_created', tenantId: recoveredTenantId, stripeCustomerId: customer.id }
      };
    }

  } catch (error) {
    console.error(`❌ [${eventId}] User Updated処理中に致命的なエラーが発生: user_id=${id}`, { ...context, error });
    
    Sentry.captureException(error, {
      level: 'error',
      tags: { ...context, operation: 'handleUserUpdated_main_catch' },
    });

    return {
      result: 'error',
      errorMessage: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

/**
 * `user.deleted` Webhookイベントを処理するハンドラー関数。
 * Stripe顧客データ（オプション）とConvexテナントデータを削除（アーカイブ）する。
 * @param data UserJSON - Clerkから送信されたユーザーデータ
 * @param eventId string - Webhookイベントの一意なID
 * @param deps WebhookDependencies - 外部サービスへの依存関係
 * @param metrics WebhookMetricsCollector - メトリクス収集用インスタンス
 * @returns Promise<EventProcessingResult> - 処理結果
 */
export async function handleUserDeleted(
  data: UserJSON,
  eventId: string,
  deps: WebhookDependencies,
  metrics: WebhookMetricsCollector
): Promise<EventProcessingResult> {
  const { id } = data;
  const context: LogContext = {
    eventId,
    eventType: 'user.deleted',
    userId: id,
  };

  console.log(`🗑️ [${eventId}] User Deleted処理開始: user_id=${id}`, context);

  try {
    // テナント情報の取得
    const tenantRecord = await deps.retry(() =>
      fetchQuery(deps.convex.tenant.query.findByUserId, { user_id: id })
    ).catch(() => null);

    metrics.incrementApiCall('convex');

    if (!tenantRecord) {
      console.warn(`⚠️ [${eventId}] 削除対象のテナントが見つかりません: user_id=${id}`);
      return {
        result: 'success',
        metadata: { action: 'no_tenant_found' }
      };
    }

    // 並列でStripeとConvexから削除
    const deleteTasks = [
      createTask(
        'stripe_customer_deletion',
        async () => {
          if (tenantRecord.stripe_customer_id && typeof tenantRecord.stripe_customer_id === 'string') {
            console.log(`💳 [${eventId}] Stripe顧客削除開始: customerId=${tenantRecord.stripe_customer_id}`, { ...context, stripeCustomerId: tenantRecord.stripe_customer_id });
            metrics.incrementApiCall('stripe');
            
            return deps.retry(() => 
              deps.stripe.customers.del(tenantRecord.stripe_customer_id!)
            );
          }
          console.log(`ℹ️ [${eventId}] Stripe顧客IDが存在しないため、Stripe顧客削除をスキップ。user_id=${id}`, { ...context, tenantId: tenantRecord._id });
          return null;
        },
        false // 非クリティカル
      ),
      createTask(
        'convex_tenant_archive',
        async () => {
          console.log(`🏢 [${eventId}] テナントアーカイブ開始: tenant_id=${tenantRecord._id}`, { ...context, tenantId: tenantRecord._id });
          metrics.incrementApiCall('convex');
          
          return deps.retry(() =>
            fetchMutation(deps.convex.tenant.mutation.archive, {
              tenant_id: tenantRecord._id,
            })
          );
        },
        true // クリティカル
      )
    ];

    await executeInParallel(deleteTasks, context);

    return {
      result: 'success',
      metadata: { action: 'user_deleted', tenantId: tenantRecord._id }
    };

  } catch (error) {
    console.error(`❌ [${eventId}] User Deleted処理中に致命的なエラーが発生: user_id=${id}`, { ...context, error });
    
    Sentry.captureException(error, {
      level: 'error',
      tags: { ...context, operation: 'handleUserDeleted_main_catch' },
    });

    return {
      result: 'error',
      errorMessage: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

/**
 * `organization.created` Webhookイベントを処理するハンドラー関数。
 * 新規組織の情報をConvexに登録する。
 * @param data OrganizationJSON - Clerkから送信された組織データ
 * @param eventId string - Webhookイベントの一意なID
 * @param deps WebhookDependencies - 外部サービスへの依存関係
 * @param metrics WebhookMetricsCollector - メトリクス収集用インスタンス
 * @returns Promise<EventProcessingResult> - 処理結果
 */
export async function handleOrganizationCreated(
  data: OrganizationJSON,
  eventId: string,
  deps: WebhookDependencies,
  metrics: WebhookMetricsCollector
): Promise<EventProcessingResult> {
  const { id, name, created_by } = data;

  if (!created_by) {
    console.warn(`⚠️ [${eventId}] 組織の作成者が見つかりません: org_id=${id}`);
    return {
      result: 'skipped',
      metadata: { action: 'no_creator' }
    };
  }

  console.log(`🏢 [${eventId}] Organization Created処理開始: org_id=${id}, name=${name}, creator=${created_by}`);

  try {
    // 作成者のテナント確認
    const existingTenant = await deps.retry(() =>
      fetchQuery(deps.convex.tenant.query.findByUserId, { user_id: created_by })
    ).catch(() => null);

    metrics.incrementApiCall('convex');

    if (!existingTenant) {
      console.warn(`⚠️ [${eventId}] 組織作成者のテナントが見つかりません: creator=${created_by}`);
      return {
        result: 'skipped',
        metadata: { action: 'no_tenant_for_creator' }
      };
    }

    // 組織作成
    await deps.retry(() =>
      fetchMutation(deps.convex.organization.mutation.create, {
        tenant_id: existingTenant._id,
        org_id: id,
        org_name: name,
      })
    );

    metrics.incrementApiCall('convex');

    return {
      result: 'success',
      metadata: { action: 'organization_created', orgId: id, tenantId: existingTenant._id }
    };

  } catch (error) {
    console.error(`❌ Organization Created処理失敗: org_id=${id}`, error);
    
    Sentry.captureException(error, {
      level: 'error',
      tags: { eventId, organizationId: id, operation: 'organization_created' },
    });

    return {
      result: 'error',
      errorMessage: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

// 🔄 Organization Updated イベントハンドラー（Pure Function）
export async function handleOrganizationUpdated(
  data: OrganizationJSON,
  eventId: string,
  deps: WebhookDependencies,
  metrics: WebhookMetricsCollector
): Promise<EventProcessingResult> {
  const { id, name, created_by } = data;

  if (!created_by) {
    console.warn(`⚠️ 組織の作成者が見つかりません: org_id=${id}`);
    return {
      result: 'skipped',
      metadata: { action: 'no_creator' }
    };
  }

  console.log(`🔄 Organization Updated処理開始: org_id=${id}, name=${name}`);

  try {
    const existingTenant = await deps.retry(() =>
      fetchQuery(deps.convex.tenant.query.findByUserId, { user_id: created_by })
    ).catch(() => null);

    metrics.incrementApiCall('convex');

    if (!existingTenant) {
      console.warn(`⚠️ 組織更新: テナントが見つかりません: creator=${created_by}`);
      return {
        result: 'skipped',
        metadata: { action: 'no_tenant_for_creator' }
      };
    }

    await deps.retry(() =>
      fetchMutation(deps.convex.organization.mutation.update, {
        tenant_id: existingTenant._id,
        org_id: id,
        org_name: name,
      })
    );

    metrics.incrementApiCall('convex');

    return {
      result: 'success',
      metadata: { action: 'organization_updated', orgId: id }
    };

  } catch (error) {
    console.error(`❌ Organization Updated処理失敗: org_id=${id}`, error);
    
    Sentry.captureException(error, {
      level: 'error',
      tags: { eventId, organizationId: id, operation: 'organization_updated' },
    });

    return {
      result: 'error',
      errorMessage: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

// 🗑️ Organization Deleted イベントハンドラー（Pure Function）
export async function handleOrganizationDeleted(
  data: OrganizationJSON,
  eventId: string,
  deps: WebhookDependencies,
  metrics: WebhookMetricsCollector
): Promise<EventProcessingResult> {
  const { id } = data;

  console.log(`🗑️ Organization Deleted処理開始: org_id=${id}`);

  try {
    await deps.retry(() =>
      fetchMutation(deps.convex.organization.mutation.kill, { org_id: id })
    );

    metrics.incrementApiCall('convex');

    return {
      result: 'success',
      metadata: { action: 'organization_deleted', orgId: id }
    };

  } catch (error) {
    console.error(`❌ Organization Deleted処理失敗: org_id=${id}`, error);
    
    Sentry.captureException(error, {
      level: 'error',
      tags: { eventId, organizationId: id, operation: 'organization_deleted' },
    });

    return {
      result: 'error',
      errorMessage: error instanceof Error ? error.message : '不明なエラー'
    };
  }
} 