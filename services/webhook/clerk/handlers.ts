import type { UserJSON } from '@clerk/nextjs/server';
import { fetchAction, fetchMutation, fetchQuery } from 'convex/nextjs'; // Added fetchAction
import * as Sentry from '@sentry/nextjs';
import type { 
  WebhookDependencies, 
  EventProcessingResult, 
  LogContext 
} from '../types';
import { executeInParallel, createTask } from '../parallel';
import { WebhookMetricsCollector } from '../metrics';
import { clerkClient } from '@clerk/nextjs/server'; // Corrected import path

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
  const referral_code = unsafe_metadata?.referralCode as string | null;
  const org_name = unsafe_metadata?.orgName as string | undefined;
  const email = email_addresses[0]?.email_address || 'no-email';

  const context: LogContext = {
    eventId,
    eventType: 'user.created',
    userId: id,
  };

  console.log(`👤 [${eventId}] User Created処理開始: user_id=${id}, email=${email}`, context);

  try {
    // Stripe Customer Creation (remains the same)
    console.log(`💳 [${eventId}] Stripe顧客作成: email=${email}, user_id=${id}`, context);
    metrics.incrementApiCall('stripe');
    
    const stripeCustomer = await deps.retry(() =>
      deps.stripe.customers.create({
        email: email || undefined,
        metadata: { 
          user_id: id,
          referral_code: referral_code // Pass referral_code here
        },
      }, {
        idempotencyKey: `clerk_user_${id}_${eventId}`,
      })
    );
    console.log(`💳 [${eventId}] Stripe顧客作成成功: customerId=${stripeCustomer.id}`, { ...context, stripeCustomerId: stripeCustomer.id });

    // Call the new Convex Action to handle tenant/org setup
    console.log(`🚀 [${eventId}] Executing Convex setupNewUserWorkflow: user_id=${id}`, context);

    const { tenantId, orgId, wasExisting } = await deps.retry(() =>
      fetchAction(deps.convex.tenant.action.setupNewUserWorkflow, {
        userId: id,
        userEmail: email,
        stripeCustomerId: stripeCustomer.id,
        referralCode: referral_code, // ensure referral_code is passed
        orgName: org_name         // ensure org_name is passed
      })
    );
    metrics.incrementApiCall('convex'); // Single metrics increment for the action

    if (!tenantId || !orgId) {
      // This case should ideally be handled within the action or be an error from the action.
      // If the action can return partial success without these IDs, this check is important.
      console.error(`❌ [${eventId}] Convex action did not return tenantId or orgId. TenantId: ${tenantId}, OrgId: ${orgId}`, context);
      Sentry.captureMessage('Convex action setupNewUserWorkflow missing tenantId or orgId', {
        level: 'error',
        tags: { ...context, operation: 'setupNewUserWorkflow_missing_ids' },
        extra: { tenantId, orgId, wasExisting }
      });
      // Decide if this is a critical failure
      return {
        result: 'error',
        errorMessage: 'Failed to obtain tenantId or orgId from Convex action.'
      };
    }

    console.log(`✅ [${eventId}] Convex User Workflow completed: tenant_id=${tenantId}, org_id=${orgId}, existing_user_flow=${wasExisting}`, { ...context, tenantId, orgId });

    // Stripe顧客のメタデータ更新 (remains the same, uses tenantId, orgId from action)
    try {
      await deps.stripe.customers.update(stripeCustomer.id, {
        metadata: {
          tenant_id: tenantId,
          org_id: orgId,
          user_id: id, // Keep user_id as well
          referral_code: referral_code // Keep referral_code if needed
        },
      });
      metrics.incrementApiCall('stripe');
    } catch(error) {
      console.warn(`⚠️ [${eventId}] Stripe顧客メタデータ更新失敗（非クリティカル）: customerId=${stripeCustomer.id}`, { ...context, stripeCustomerId: stripeCustomer.id, error });
      Sentry.captureException(error, {
        level: 'warning',
        tags: { ...context, operation: 'update_stripe_customer_metadata', stripeCustomerId: stripeCustomer.id },
      });
    }

    // クラークユーザーのメタデータ更新 (remains the same, uses tenantId, orgId from action)
    try {
      const clerk = await clerkClient(); // Assuming clerkClient is available
      await clerk.users.updateUserMetadata(id, {
        publicMetadata: {
          org_id: orgId,
          role: 'admin', // Default role
          tenant_id: tenantId,
        },
      });
      metrics.incrementApiCall('clerk');
    } catch (error) {
      console.warn(`⚠️ [${eventId}] ユーザーメタデータ更新失敗（クリティカル）: user_id=${id}`, { ...context, error });
      Sentry.captureException(error, {
        level: 'critical', // This was marked as critical in original code if it failed
        tags: { ...context, operation: 'update_user_metadata', userId: id },
      });
      // Original code returned error here, so we maintain that.
      return {
        result: 'error',
        errorMessage: 'ユーザーメタデータ更新失敗（クリティカル）ログイン認証できない状態になっている可能性があります。'
      };
    }

    console.log(`✅ [${eventId}] User Created処理完了 (via Action). Tenant: ${tenantId}, Org: ${orgId}`, context);
    return {
      result: 'success',
      metadata: { 
        action: wasExisting ? 'user_existed_updated' : 'user_created_via_action',
        tenantId: tenantId,
        orgId: orgId,
        stripeCustomerId: stripeCustomer.id 
      }
    };

  } catch (error) {
    // ... (outer catch block remains mostly the same) ...
    console.error(`❌ [${eventId}] User Created処理中に致命的なエラーが発生 (Action Flow): user_id=${id}`, { ...context, error });
    Sentry.captureException(error, {
      level: 'error',
      tags: { ...context, operation: 'handleUserCreated_action_catch' },
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

  console.log(`🗑️ [${eventId}] User Deleted処理開始 (Archive by user_id): user_id=${id}`, context);
  metrics.incrementApiCall('convex'); // For the archive call

  try {
    const archiveResult = await deps.retry(() =>
      fetchMutation(deps.convex.tenant.mutation.archive, {
        user_id: id, // Pass user_id directly
      })
    );

    if (archiveResult.success && archiveResult.archived) {
      console.log(`✅ [${eventId}] テナントアーカイブ成功 (via user_id): user_id=${id}, tenant_id=${archiveResult.tenantId}`, { ...context, tenantId: archiveResult.tenantId });

      // Attempt to delete Stripe customer (non-critical, from original logic)
      // This part needs the stripe_customer_id, which is not returned by the modified archive mutation directly.
      // For simplicity of this refactor, we might have to accept that Stripe customer deletion might be skipped if we no longer fetch the full tenant record.
      // OR, the archive mutation could return stripe_customer_id if needed.
      // For now, let's keep it simple and acknowledge this potential change in behavior for Stripe deletion.
      // If stripe_customer_id is crucial, the archive mutation should return it.
      // Let's assume the original `tenantRecord.stripe_customer_id` was for this.
      // The `handleUserDeleted` function does have a `createTask` for `stripe_customer_deletion`
      // which implies it previously fetched `tenantRecord` which included `stripe_customer_id`.
      // To maintain that, the `archive` mutation in Convex should return `stripe_customer_id`.

      // The original code had a parallel task for Stripe deletion.
      // To keep Stripe deletion, we need `stripe_customer_id`.
      // The `archiveResult` should ideally contain `stripe_customer_id`.
      // The subtask for `convex/tenant/mutation.ts` will be updated to reflect this.
      // If `archiveResult.stripe_customer_id` is available:
      if (archiveResult.stripe_customer_id) {
          try {
            console.log(`💳 [${eventId}] Stripe顧客削除開始: customerId=${archiveResult.stripe_customer_id}`, { ...context, stripeCustomerId: archiveResult.stripe_customer_id });
            metrics.incrementApiCall('stripe');
            await deps.retry(() =>
              deps.stripe.customers.del(archiveResult.stripe_customer_id as string)
            );
             console.log(`💳 [${eventId}] Stripe顧客削除成功: customerId=${archiveResult.stripe_customer_id}`);
          } catch (stripeError) {
             console.warn(`⚠️ [${eventId}] Stripe顧客削除失敗（非クリティカル）: customerId=${archiveResult.stripe_customer_id}`, { ...context, error: stripeError });
             Sentry.captureException(stripeError, { level: 'warning', tags: { ...context, operation: 'stripe_customer_deletion_after_archive' }});
          }
      } else if (archiveResult.archived) {
          console.warn(`⚠️ [${eventId}] テナントはアーカイブされましたが、Stripe顧客IDがなかったためStripe顧客は削除されませんでした。 tenant_id=${archiveResult.tenantId}`, context);
      }

      return {
        result: 'success',
        metadata: { action: 'user_deleted_archived_by_userid', tenantId: archiveResult.tenantId }
      };
    } else if (archiveResult.success && archiveResult.not_found) {
      console.warn(`⚠️ [${eventId}] 削除対象のテナントが見つかりません (user_id=${id})。既に処理済みか、存在しません。`, context);
      return {
        result: 'success', // Still success as the desired state (no tenant) is achieved
        metadata: { action: 'user_deleted_not_found_by_userid' }
      };
    } else {
      // Handle unexpected result from archive mutation
      console.error(`❌ [${eventId}] テナントアーカイブ失敗 (via user_id): user_id=${id}. Result:`, archiveResult, context);
      Sentry.captureMessage('Tenant archive by user_id failed with unexpected result', {
        level: 'error',
        tags: { ...context, operation: 'archive_tenant_by_userid_unexpected_result' },
        extra: { archiveResult }
      });
      return {
        result: 'error',
        errorMessage: 'Tenant archive failed with unexpected result.'
      };
    }

  } catch (error) {
    // ... (outer catch block remains mostly the same) ...
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