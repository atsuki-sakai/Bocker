import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { WebhookEvent } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { api } from '@/convex/_generated/api';
import { fetchMutation, fetchQuery } from 'convex/nextjs';
import * as Sentry from '@sentry/nextjs';
import { STRIPE_API_VERSION } from '@/lib/constants';
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

  // 3. イベントタイプに応じた処理
  const eventType = validPayload.data.type ?? evt.type;
  const data = validPayload.data.data;

  // 各イベントタイプの処理
  try {
    if (eventType === 'user.created') {
      const client = await clerkClient();
      const { id, email_addresses = [] } = data;
      const salonName = payload.data.unsafe_metadata.salonName;
      const referralCode = payload.data.unsafe_metadata.referralCode;
      const email = email_addresses[0]?.email_address || 'no-email';

      console.log('payload', payload);

      console.log(`Clerk ID: ${id} の user.created イベントを処理中です (メール: ${email})`);

      // クリティカルな操作は再試行付きで実行
      const existingSalon = await retryOperation(() =>
        fetchQuery(api.salon.core.query.findByClerkId, {
          clerkId: id,
        }).catch((err) => {
          throw err;
        })
      ).catch(() => null); // 失敗時はnullを返して進行
      if (!existingSalon) {
        console.log(`Clerk ID: ${id} のために新しいサロンを作成します`);

        try {
          try {
            // 1. Stripe顧客作成 (エラーは再試行)
            console.log(`Stripe顧客作成を開始: email=${email}, clerkId=${id}`);
            const customer = await retryOperation(() =>
              stripe.customers.create({
                email: email || undefined,
                metadata: { clerkId: id, referralCode },
              })
            );
            console.log(`Stripe顧客作成成功: customerId=${customer.id}`);

            try {
              try {
                // 組織を作成
                console.log(`組織作成を開始: salonName=${salonName}, clerkId=${id}`);
                const organization = await client.organizations.createOrganization({
                  name: salonName,
                  createdBy: id,
                });

                try {
                  // 2. Convexへのユーザー登録 (エラーは再試行)
                  console.log(
                    `Convexへのサロン登録を開始: clerkId=${id}, organizationId=${organization.id}, email=${email}, stripeCustomerId=${customer.id}`
                  );
                  const salonId = await retryOperation(() =>
                    fetchMutation(api.salon.core.mutation.create, {
                      clerkId: id,
                      organizationId: organization.id ?? 'ERROR',
                      email,
                      stripeCustomerId: customer.id,
                    })
                  );
                  await retryOperation(() =>
                    fetchMutation(api.salon.config.mutation.create, {
                      email,
                      salonId: salonId,
                      salonName: salonName,
                    })
                  );

                  try {
                    await retryOperation(() =>
                      fetchMutation(api.salon.referral.mutation.create, {
                        salonId: salonId,
                      })
                    );

                    if (referralCode) {
                      const referralBySalon = await retryOperation(() =>
                        fetchQuery(api.salon.referral.query.getByReferralCode, {
                          referralCode: referralCode,
                        })
                      );
                      if (referralBySalon) {
                        await retryOperation(() =>
                          fetchMutation(api.salon.referral.mutation.incrementReferralCount, {
                            referralId: referralBySalon._id,
                          })
                        );
                      }
                    }
                  } catch (referralError) {
                    console.error(
                      `salonId: ${salonId}のReferral作成に失敗しました:`,
                      referralError
                    );
                    console.error('Referralエラーの詳細:', JSON.stringify(referralError, null, 2));
                    Sentry.captureException(referralError, {
                      level: 'error',
                      tags: { operation: 'create_referral' },
                    });
                    // エラーをスローせず処理を続行
                  }
                  console.log('Convexへのサロン登録成功');
                } catch (error) {
                  console.error(`Clerk ID: ${id}のサロン登録に失敗しました:`, error);
                  console.error('エラーの詳細:', JSON.stringify(error, null, 2));
                  Sentry.captureException(error);
                }
              } catch (error) {
                console.error(`Clerk ID: ${id}の組織更新に失敗しました:`, error);
                Sentry.captureException(error);
              }

              // 取得したサロンIDをログに出力 (任意)
              console.log(`新しいサロンが作成されました。`); // newSalon を直接使用
            } catch (convexError) {
              // Convex登録失敗時にはStripe顧客を削除して整合性を保つ
              console.error(
                `Convexへのユーザー登録に失敗したため、Stripe顧客を削除します: ${customer.id}`
              );
              try {
                await stripe.customers.del(customer.id);
              } catch (stripeDeleteError) {
                // 削除失敗時はログのみ記録
                console.error(
                  `失敗したユーザー登録のStripe顧客削除に失敗: ${customer.id}`,
                  stripeDeleteError
                );
                Sentry.captureException(stripeDeleteError);
              }
              throw convexError; // 元のエラーを再スロー
            }
          } catch (error) {
            // すべてのエラーを適切に処理
            console.error(`Clerk ID: ${id} のサロン作成プロセスに失敗しました`, error);
            Sentry.captureException(error);
            throw error;
          }
        } catch (error) {
          console.error(`Clerk ID: ${id} のサロンの作成に失敗しました:`, error);
          // 重大なエラーが発生した場合は包括的にログを残す
          Sentry.captureException(error, {
            level: 'error',
            tags: {
              clerkId: id,
              eventType: 'user.created',
            },
          });
          throw error; // エラーを上位に伝播
        }
      } else {
        console.log(`Clerk ID: ${id} のサロンは既に存在します。メールを更新します`);

        // 既存の場合はメールアドレスのみ更新
        await retryOperation(() =>
          fetchMutation(api.salon.core.mutation.update, {
            id: existingSalon._id,
            email,
            stripeCustomerId: existingSalon.stripeCustomerId,
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
      let existingSalon;
      try {
        existingSalon = await retryOperation(() =>
          fetchQuery(api.salon.core.query.findByClerkId, {
            clerkId: id,
          })
        );
      } catch (error) {
        Sentry.captureException(error, {
          level: 'error',
          tags: {
            clerkId: id,
            eventType: 'user.updated',
          },
        });
        existingSalon = null;
      }

      if (existingSalon) {
        try {
          // Stripeの顧客情報も同期的に更新
          if (
            existingSalon.stripeCustomerId &&
            typeof existingSalon.stripeCustomerId === 'string'
          ) {
            await retryOperation(() =>
              stripe.customers.update(existingSalon.stripeCustomerId!, {
                email: email || undefined,
                metadata: { clerkId: id, updated: new Date().toISOString() },
              })
            );
          }

          // Convexのサロン情報を更新
          await retryOperation(() =>
            fetchMutation(api.salon.core.mutation.update, {
              id: existingSalon._id,
              clerkId: id,
              email,
              stripeCustomerId: existingSalon.stripeCustomerId,
            })
          );

          console.log(`Clerk ID: ${id} のサロンのメールアドレスを ${email} に更新しました`);
        } catch (error) {
          console.error(`Clerk ID: ${id} のサロンの更新に失敗しました:`, error);
          Sentry.captureException(error, {
            level: 'error',
            tags: {
              clerkId: id,
              eventType: 'user.updated',
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
          // 念のための復旧処理として新規作成
          const customer = await retryOperation(() =>
            stripe.customers.create({
              email: email || undefined,
              metadata: { clerkId: id },
            })
          );

          await retryOperation(() =>
            fetchMutation(api.salon.core.mutation.create, {
              clerkId: id,
              email,
              stripeCustomerId: customer.id,
            })
          );
        } catch (recoveryError) {
          console.error(`Clerk ID: ${id} の復旧処理に失敗しました:`, recoveryError);
          Sentry.captureException(recoveryError, {
            level: 'error',
            tags: {
              clerkId: id,
              eventType: 'user.updated',
            },
          });
        }
      }
    } else if (eventType === 'user.deleted') {
      const { id } = data as { id: string };

      let salonRecord;
      try {
        salonRecord = await retryOperation(() =>
          fetchQuery(api.salon.core.query.findByClerkId, {
            clerkId: id,
          })
        );
      } catch (error) {
        console.error(`Clerk ID: ${id} のサロンの取得に失敗しました:`, error);
        Sentry.captureException(error, {
          level: 'error',
          tags: {
            clerkId: id,
            eventType: 'user.deleted',
          },
        });
        salonRecord = null;
      }

      if (salonRecord) {
        console.log(`Clerk ID: ${id} のサロンとStripe顧客データを削除します`);

        if (salonRecord.stripeCustomerId && typeof salonRecord.stripeCustomerId === 'string') {
          try {
            // Stripe顧客データの削除
            await retryOperation(() => stripe.customers.del(salonRecord.stripeCustomerId!));
          } catch (stripeError) {
            // Stripe削除エラーの詳細なログ
            console.error('Stripe削除エラー:', stripeError);
            Sentry.captureException(stripeError, {
              level: 'error',
              tags: {
                clerkId: id,
                eventType: 'user.deleted',
              },
            });
          }
        }

        try {
          // Convexサロンデータの削除
          await retryOperation(() =>
            fetchMutation(api.salon.core.mutation.archive, {
              id: salonRecord._id,
            })
          );
        } catch (convexError) {
          console.error('Convex削除エラー:', convexError);
          Sentry.captureException(convexError, {
            level: 'error',
            tags: {
              clerkId: id,
              eventType: 'user.deleted',
            },
          });
          throw convexError; // Convex削除エラーは上位に伝播
        }
      } else {
        console.warn(`No salon found for deleted Clerk user with ID: ${id}`);
      }
    } else if (eventType === 'email.created') {
      const { id, email_addresses, primary_email_address_id } = data;
      if (!email_addresses) {
        console.log(
          `Clerk ID: ${id} のメールアドレス作成イベントを受信しましたが、メールアドレスが存在しません`
        );
        return;
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
        const existingSalon = await retryOperation(() =>
          fetchQuery(api.salon.core.query.findByClerkId, {
            clerkId: id,
          })
        );

        if (existingSalon) {
          // Stripeの顧客情報を更新
          if (
            existingSalon.stripeCustomerId &&
            typeof existingSalon.stripeCustomerId === 'string'
          ) {
            await retryOperation(() =>
              stripe.customers.update(existingSalon.stripeCustomerId!, {
                email: email || undefined,
                metadata: { clerkId: id, updated: new Date().toISOString() },
              })
            );
          }

          // Convexのサロン情報を更新
          await retryOperation(() =>
            fetchMutation(api.salon.core.mutation.update, {
              id: existingSalon._id,
              clerkId: id,
              email,
              stripeCustomerId: existingSalon.stripeCustomerId,
            })
          );

          console.log(`Clerk ID: ${id} のサロンとStripeのメールアドレスを ${email} に更新しました`);
        } else {
          console.warn(`メールアドレス更新対象のサロンが見つかりませんでした: ${id}`);
        }
      } catch (error) {
        console.error(`Clerk ID: ${id} のメールアドレス更新処理中にエラーが発生しました:`, error);
        Sentry.captureException(error, {
          level: 'error',
          tags: {
            clerkId: id,
            eventType: 'email.created',
          },
        });
      }
    }
  } catch (error) {
    // 全体的なエラーハンドリング
    console.error(`Clerk webhook（${eventType}）の処理中にエラーが発生しました:`, error);
    Sentry.captureException(error, {
      level: 'error',
      tags: {
        eventType,
        clerkUserId: data.id,
      },
    });
  }

  return NextResponse.json({ status: 'success' }, { status: 200 });
}

export async function GET() {
  return NextResponse.json(
    { message: 'Clerk webhook endpoint is working. Please use POST for webhooks.' },
    { status: 200 }
  );
}
