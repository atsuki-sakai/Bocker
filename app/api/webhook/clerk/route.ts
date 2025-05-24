
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { WebhookEvent } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { api } from '@/convex/_generated/api';
import { fetchMutation, fetchQuery } from 'convex/nextjs';
import * as Sentry from '@sentry/nextjs';
import { STRIPE_API_VERSION } from '@/services/stripe/constants';
import { retryOperation } from '@/lib/utils';
import { z } from 'zod';
import { clerkClient } from '@clerk/nextjs/server';

const clerkWebhookSchema = z.object({
  type: z.string().min(1, { message: 'イベントタイプが空です' }),
  data: z.object({
    id: z.string().min(1, { message: 'ユーザーIDが空です' }),
    email_addresses: z
      .array(
        z.object({
          id: z.string(),
          email_address: z.string().email({ message: 'メールアドレスが無効です' }),
        })
      )
      .optional(),
    primary_email_address_id: z.string().optional(),
  }),
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
});

export async function POST(req: Request) {
  // 1. Clerk署名検証の準備
  const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!SIGNING_SECRET) {
    console.error('Clerk署名用シークレットが設定されていません');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const wh = new Webhook(SIGNING_SECRET);

  // Svix署名ヘッダーを取得
  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) {
    Sentry.captureMessage('Clerk signing secret not configured', { level: 'error' });
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  // リクエストボディを取得（文字列化して後で検証）
  const payload = await req.json();
  const payloadString = JSON.stringify(payload);

  // 2. 署名検証
  let evt: WebhookEvent;
  try {
    evt = wh.verify(payloadString, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    Sentry.captureMessage('Missing svix headers', { level: 'error' });
    console.error('Clerk webhook署名の検証に失敗しました:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const validPayload = clerkWebhookSchema.safeParse(payload);
  if (!validPayload.success) {
    Sentry.captureMessage('Clerk webhook payload のバリデーションエラー', { level: 'error' });
    console.error('Clerk webhookペイロードの検証エラー:', validPayload.error);
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }

  // 🆕 3. 冪等性チェック - Clerkイベントの重複処理を防止
  const eventId = `clerk_${svixId}_${svixTimestamp}`;
  const eventType = validPayload.data.type ?? evt.type;
  
  console.log(`Processing Clerk webhook event: ${eventType} (ID: ${eventId})`);

  try {
    // 冪等性チェック: 既に処理済みのイベントかどうか確認
    const processedCheck = await fetchMutation(api.webhook_events.mutation.checkProcessedEvent, {
      event_id: eventId,
    });

    if (processedCheck.isProcessed) {
      console.log(`Clerkイベント ${eventId} は既に処理済みです。スキップします。`);
      return NextResponse.json({ 
        received: true, 
        message: `イベント ${eventId} は既に処理済みです (結果: ${processedCheck.result})` 
      }, { status: 200 });
    }

    // イベント処理開始を記録
    await fetchMutation(api.webhook_events.mutation.recordEvent, {
      event_id: eventId,
      event_type: eventType,
      processing_result: 'processing',
    });

    let processingResult = 'success';
    let errorMessage: string | undefined;

    // 4. イベントタイプに応じた処理
    const data = validPayload.data.data;

    try {
      if (eventType === 'user.created') {
        const { id, email_addresses = [] } = data;
        const org_name = payload.data.unsafe_metadata.orgName as string;
        const use_referral_code = payload.data.unsafe_metadata.useReferralCode as string;
        const email = email_addresses[0]?.email_address || 'no-email';
        
        // クリティカルな操作は再試行付きで実行
        const existingTenant = await retryOperation(() =>
          fetchQuery(api.tenant.query.findByUserId, {
            user_id: id,
          }).catch((err) => {
            throw err;
          })
        ).catch(() => null); // 失敗時はnullを返して進行

        if (!existingTenant) {
          try {
            // 🆕 1. Stripe顧客作成（冪等性キー付き）
            console.log(`Stripe顧客作成を開始: email=${email}, user_id=${id}`);
            const customer = await retryOperation(() =>
              stripe.customers.create({
                email: email || undefined,
                metadata: { user_id: id, use_referral_code: use_referral_code },
              }, {
                idempotencyKey: `clerk_user_${id}_${eventId}`, // 🆕 冪等性キー追加
              })
            );
            console.log(`Stripe顧客作成成功: customerId=${customer.id}`);

            try {
              // 2. Convexへのユーザー登録 (エラーは再試行)
              console.log(
                `Convexへのテナント登録を開始: user_id=${id}, email=${email}, stripeCustomerId=${customer.id}`
              );

              const clerk = await clerkClient();
              const org = await retryOperation(() =>
                clerk.organizations.createOrganization({
                  name: org_name,
                  createdBy: id,
                })
              );
              
              if (!org) {
                throw new Error('Organization creation failed');
              }
              const tenantId = await retryOperation(() =>
                fetchMutation(api.tenant.mutation.create, {
                  user_id: id,
                  user_email: email,
                  stripe_customer_id: customer.id,
                })
              );

              const user = await clerk.users.getUser(id);
              // 既存のroleを取得（存在する場合）
              const existingRole = user.privateMetadata?.role || 'org:admin';
              await clerk.users.updateUserMetadata(id, {
                privateMetadata: {
                  tenant_id: tenantId,
                  org_id: org.id,
                  role: existingRole,
                },
              })

              await retryOperation(() =>
                fetchMutation(api.organization.config.mutation.create, {
                  tenant_id: tenantId,
                  org_id: org.id,
                  org_name: org_name,
                  org_email: email,
                })
              );

              try {
                await retryOperation(() =>
                  fetchMutation(api.tenant.referral.mutation.create, {
                    tenant_id: tenantId,
                  })
                );
              } catch (referralError) {
                console.error(`tenantId: ${tenantId}のReferral作成に失敗しました:`, referralError);
                console.error('Referralエラーの詳細:', JSON.stringify(referralError, null, 2));
                Sentry.captureException(referralError, {
                  level: 'error',
                  tags: { operation: 'create_referral', eventId },
                });
                // エラーをスローせず処理を続行
              }
              console.log('Convexへのテナント登録成功');
            } catch (error) {
              console.error(`Clerk ID: ${id}のテナント登録に失敗しました:`, error);
              console.error('エラーの詳細:', JSON.stringify(error, null, 2));
              Sentry.captureException(error, {
                level: 'error',
                tags: { eventId, user_id: id },
              });
              throw error; // Convex失敗は上位に伝播
            }
          } catch (error) {
            // すべてのエラーを適切に処理
            console.error(`Clerk ID: ${id} のテナント作成プロセスに失敗しました`, error);
            Sentry.captureException(error, {
              level: 'error',
              tags: { eventId, user_id: id },
            });
            throw error;
          }
        } else {
          console.log(`Clerk ID: ${id} のテナントは既に存在します。メールを更新します`);

          // 既存の場合はメールアドレスのみ更新
          await retryOperation(() =>
            fetchMutation(api.tenant.mutation.upsert, {
              user_id: id,
              user_email: email
            })
          );
        }
      } else if (eventType === 'user.updated') {
        const { id, email_addresses = [], primary_email_address_id } = data;

        // プライマリーメールアドレスを取得
        let email = 'no-email';
        if (primary_email_address_id && email_addresses.length > 0) {
          // primary_email_address_idに一致するメールアドレスを検索
          const primaryEmail = email_addresses.find((e) => e.id === primary_email_address_id);
          if (primaryEmail) {
            email = primaryEmail.email_address;
          } else {
            // 見つからない場合は最初のメールを使用（フォールバック）
            email = email_addresses[0]?.email_address || 'no-email';
          }
        } else {
          // 後方互換性のため
          email = email_addresses[0]?.email_address || 'no-email';
        }

        console.log(
          `Clerk ID: ${id} の user.updated イベントを処理中です (プライマリーメール: ${email})`
        );

        // クエリはエラーでも続行するため、retryOperationを使用
        let existingTenant;
        try {
          existingTenant = await retryOperation(() =>
            fetchQuery(api.tenant.query.findByUserId, {
              user_id: id,
            })
          );
        } catch (error) {
          Sentry.captureException(error, {
            level: 'error',
            tags: {
              user_id: id,
              eventType: 'user.updated',
              eventId,
            },
          });
          existingTenant = null;
        }

        if (existingTenant) {
          try {
            // 🆕 Stripeの顧客情報も同期的に更新（冪等性キー付き）
            if (
              existingTenant.stripe_customer_id &&
              typeof existingTenant.stripe_customer_id === 'string'
            ) {
              await retryOperation(() =>
                stripe.customers.update(existingTenant.stripe_customer_id!, {
                  email: email || undefined,
                  metadata: { user_id: id, updated: new Date().toISOString() },
                }, {
                  idempotencyKey: `clerk_update_${id}_${eventId}`, // 🆕 冪等性キー追加
                })
              );
            }

            // Convexのテナント情報を更新
            await retryOperation(() =>
              fetchMutation(api.tenant.mutation.upsert, {
                user_id: id,
                user_email: email,
                stripe_customer_id: existingTenant.stripe_customer_id,
              })
            );

            console.log(`Clerk ID: ${id} のテナントのメールアドレスを ${email} に更新しました`);
          } catch (error) {
            console.error(`Clerk ID: ${id} のテナントの更新に失敗しました:`, error);
            Sentry.captureException(error, {
              level: 'error',
              tags: {
                user_id: id,
                eventType: 'user.updated',
                eventId,
              },
            });
            throw error;
          }
        } else {
          // 存在しないユーザーの更新リクエスト - 異常ケース
          console.warn(
            `Clerk user.updated イベントを受信しましたが、該当するユーザーが見つかりませんでした: ${id}`
          );
          try {
            // 🆕 念のための復旧処理として新規作成（冪等性キー付き）
            const customer = await retryOperation(() =>
              stripe.customers.create({
                email: email || undefined,
                metadata: { user_id: id },
              }, {
                idempotencyKey: `clerk_recovery_${id}_${eventId}`, // 🆕 冪等性キー追加
              })
            );

            await retryOperation(() =>
              fetchMutation(api.tenant.mutation.create, {
                user_id: id,
                user_email: email,
                stripe_customer_id: customer.id,
              })
            );
          } catch (recoveryError) {
            console.error(`Clerk ID: ${id} の復旧処理に失敗しました:`, recoveryError);
            Sentry.captureException(recoveryError, {
              level: 'error',
              tags: {
                user_id: id,
                eventType: 'user.updated',
                eventId,
              },
            });
          }
        }
      } else if (eventType === 'user.deleted') {
        const { id } = data as { id: string };

        let tenantRecord;
        try {
          tenantRecord = await retryOperation(() =>
            fetchQuery(api.tenant.query.findByUserId, {
              user_id: id,
            })
          );
        } catch (error) {
          console.error(`Clerk ID: ${id} のテナントの取得に失敗しました:`, error);
          Sentry.captureException(error, {
            level: 'error',
            tags: {
              user_id: id,
              eventType: 'user.deleted',
              eventId,
            },
          });
          tenantRecord = null;
        }

        if (tenantRecord) {
          console.log(`Clerk ID: ${id} のテナントとStripe顧客データを削除します`);

          if (tenantRecord.stripe_customer_id && typeof tenantRecord.stripe_customer_id === 'string') {
            try {
              // 🆕 Stripe顧客データの削除（冪等性キー付き）
              await retryOperation(() => 
                stripe.customers.del(tenantRecord.stripe_customer_id!, {
                  idempotencyKey: `clerk_delete_${id}_${eventId}`, // 🆕 冪等性キー追加
                })
              );
            } catch (stripeError) {
              // Stripe削除エラーの詳細なログ
              console.error('Stripe削除エラー:', stripeError);
              Sentry.captureException(stripeError, {
                level: 'error',
                tags: {
                  user_id: id,
                  eventType: 'user.deleted',
                  eventId,
                },
              });
            }
          }

          try {
            // Convexサロンデータの削除
            await retryOperation(() =>
              fetchMutation(api.tenant.mutation.archive, {
                tenant_id: tenantRecord._id,
              })
            );
          } catch (convexError) {
            console.error('Convex削除エラー:', convexError);
            Sentry.captureException(convexError, {
              level: 'error',
              tags: {
                user_id: id,
                eventType: 'user.deleted',
                eventId,
              },
            });
            throw convexError; // Convex削除エラーは上位に伝播
          }
        } else {
          console.warn(`No tenant found for deleted Clerk user with ID: ${id}`);
        }
      } else if (eventType === 'email.created') {
        const { id, email_addresses, primary_email_address_id } = data;
        if (!email_addresses) {
          console.log(
            `Clerk ID: ${id} のメールアドレス作成イベントを受信しましたが、メールアドレスが存在しません`
          );
          return NextResponse.json({ received: true }, { status: 200 });
        }

        // プライマリーメールアドレスを取得
        let email = 'no-email';
        if (primary_email_address_id && email_addresses.length > 0) {
          const primaryEmail = email_addresses.find((e) => e.id === primary_email_address_id);
          if (primaryEmail) {
            email = primaryEmail.email_address;
          } else {
            email = email_addresses[0]?.email_address || 'no-email';
          }
        } else {
          email = email_addresses[0]?.email_address || 'no-email';
        }

        console.log(`Clerk ID: ${id} のメールアドレスが作成されました: ${email}`);

        try {
          // サロン情報を取得
          const existingTenant = await retryOperation(() =>
            fetchQuery(api.tenant.query.findByUserId, {
              user_id: id,
            })
          );

          if (existingTenant) {
            // 🆕 Stripeの顧客情報を更新（冪等性キー付き）
            if (
              existingTenant.stripe_customer_id &&
              typeof existingTenant.stripe_customer_id === 'string'
            ) {
              await retryOperation(() =>
                stripe.customers.update(existingTenant.stripe_customer_id!, {
                  email: email || undefined,
                  metadata: { user_id: id, updated: new Date().toISOString() },
                }, {
                  idempotencyKey: `clerk_email_${id}_${eventId}`, // 🆕 冪等性キー追加
                })
              );
            }

            // Convexのサロン情報を更新
            await retryOperation(() =>
              fetchMutation(api.tenant.mutation.upsert, {
                user_id: id,
                user_email: email,
                stripe_customer_id: existingTenant.stripe_customer_id,
              })
            );

            console.log(`Clerk ID: ${id} のテナントとStripeのメールアドレスを ${email} に更新しました`);
          } else {
            console.warn(`メールアドレス更新対象のテナントが見つかりませんでした: ${id}`);
          }
        } catch (error) {
          console.error(`Clerk ID: ${id} のメールアドレス更新処理中にエラーが発生しました:`, error);
          Sentry.captureException(error, {
            level: 'error',
            tags: {
              user_id: id,
              eventType: 'email.created',
              eventId,
            },
          });
          throw error;
        }
      } else {
        console.log(`未対応のClerkイベントタイプ: ${eventType}`);
        processingResult = 'skipped';
      }
    } catch (error) {
      processingResult = 'error';
      errorMessage = error instanceof Error ? error.message : '不明なエラー';
      console.error(`Clerk イベント ${eventId} の処理中にエラーが発生しました:`, error);
      throw error;
    } finally {
      // 🆕 5. 処理結果を記録
      try {
        await fetchMutation(api.webhook_events.mutation.updateEventResult, {
          event_id: eventId,
          processing_result: processingResult,
          error_message: errorMessage,
        });
      } catch (recordError) {
        console.error('Clerkイベント結果の記録中にエラーが発生しました:', recordError);
      }
    }

    return NextResponse.json({ 
      received: true, 
      message: `Clerk イベント ${eventId} の処理が完了しました` 
    }, { status: 200 });

  } catch (error) {
    console.error(`Clerk webhook event ${eventId} 処理で致命的エラー:`, error);
    
    // エラー時も記録を更新
    try {
      await fetchMutation(api.webhook_events.mutation.updateEventResult, {
        event_id: eventId,
        processing_result: 'error',
        error_message: error instanceof Error ? error.message : '不明なエラー',
      });
    } catch (recordError) {
      console.error('Clerkイベント結果の記録中にエラーが発生しました:', recordError);
    }

    // 全体的なエラーハンドリング
    Sentry.captureException(error, {
      level: 'error',
      tags: {
        eventType,
        eventId,
        source: 'clerk_webhook',
      },
    });

    return NextResponse.json(
      { error: 'Internal server error processing webhook' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Clerk webhook endpoint is working. Please use POST for webhooks.' },
    { status: 200 }
  );
}
