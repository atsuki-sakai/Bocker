import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { WebhookEvent, verifyWebhook } from '@clerk/nextjs/webhooks';
import Stripe from 'stripe';
import { api } from '@/convex/_generated/api';
import { fetchMutation } from 'convex/nextjs';
import * as Sentry from '@sentry/nextjs';
import { STRIPE_API_VERSION } from '@/services/stripe/constants';
import { retryOperation } from '@/lib/utils';
import type { UserJSON, OrganizationJSON } from '@clerk/nextjs/server';
import { z } from 'zod';

// 🔧 依存性とハンドラーのインポート
import type { WebhookDependencies, ProcessingResult } from './types';
import { isUserEvent, isOrganizationEvent } from './types';
import { WebhookMetricsCollector } from './metrics';
import {
  handleUserCreated,
  handleUserUpdated,
  handleUserDeleted,
  handleOrganizationCreated,
  handleOrganizationUpdated,
  handleOrganizationDeleted,
} from './handlers';

// 🔒 環境変数の検証
const env = z.object({
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(10),
}).parse(process.env);

// 🎯 Webhook処理のメインクラス
export class ClerkWebhookProcessor {
  private stripe: Stripe;
  private dependencies: WebhookDependencies;

  constructor() {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY!, {
      apiVersion: STRIPE_API_VERSION,
    });

    this.dependencies = {
      stripe: this.stripe,
      convex: api,
      retry: retryOperation,
    };
  }

  // 🔐 Webhook署名の検証
  async verifyWebhookSignature(req: NextRequest): Promise<WebhookEvent> {
    const SIGNING_SECRET = env.CLERK_WEBHOOK_SIGNING_SECRET;
    if (!SIGNING_SECRET) {
      throw new Error('Clerk署名用シークレットが設定されていません');
    }

    try {
      return await verifyWebhook(req, {
        signingSecret: SIGNING_SECRET,
      });
    } catch (err) {
      Sentry.captureMessage('Clerk webhook署名の検証に失敗', { level: 'error' });
      throw new Error('Invalid signature');
    }
  }

  // 🔄 冪等性チェック
  async checkIdempotency(eventId: string, eventType: string): Promise<boolean> {
    const processedCheck = await fetchMutation(api.webhook_events.mutation.checkProcessedEvent, {
      event_id: eventId,
    });

    if (processedCheck.isProcessed) {
      console.log(`Clerkイベント ${eventId} は既に処理済みです。スキップします。`);
      return true;
    }

    // イベント処理開始を記録
    await fetchMutation(api.webhook_events.mutation.recordEvent, {
      event_id: eventId,
      event_type: eventType,
      processing_result: 'processing',
    });

    return false;
  }

  // 🎯 イベント処理のディスパッチ
  async processEvent(
    eventType: string,
    data: any,
    eventId: string,
    metrics: WebhookMetricsCollector
  ): Promise<ProcessingResult> {
    console.log(`🎯 イベント処理開始: ${eventType} (ID: ${eventId})`);

    try {
      switch (eventType) {
        case 'user.created':
          if (!isUserEvent(data)) {
            throw new Error('Invalid user event data');
          }
          const createResult = await handleUserCreated(data, eventId, this.dependencies, metrics);
          return createResult.result;

        case 'user.updated':
          if (!isUserEvent(data)) {
            throw new Error('Invalid user event data');
          }
          const updateResult = await handleUserUpdated(data, eventId, this.dependencies, metrics);
          return updateResult.result;

        case 'user.deleted':
          if (!isUserEvent(data)) {
            throw new Error('Invalid user event data');
          }
          const deleteResult = await handleUserDeleted(data, eventId, this.dependencies, metrics);
          return deleteResult.result;

        case 'organization.created':
          if (!isOrganizationEvent(data)) {
            throw new Error('Invalid organization event data');
          }
          const orgCreateResult = await handleOrganizationCreated(data, eventId, this.dependencies, metrics);
          return orgCreateResult.result;

        case 'organization.updated':
          if (!isOrganizationEvent(data)) {
            throw new Error('Invalid organization event data');
          }
          const orgUpdateResult = await handleOrganizationUpdated(data, eventId, this.dependencies, metrics);
          return orgUpdateResult.result;

        case 'organization.deleted':
          if (!isOrganizationEvent(data)) {
            throw new Error('Invalid organization event data');
          }
          const orgDeleteResult = await handleOrganizationDeleted(data, eventId, this.dependencies, metrics);
          return orgDeleteResult.result;

        default:
          console.log(`未対応のClerkイベントタイプ: ${eventType}`);
          return 'skipped';
      }
    } catch (error) {
      console.error(`イベント処理エラー: ${eventType}`, error);
      throw error;
    }
  }

  // 📝 処理結果の記録
  async recordProcessingResult(
    eventId: string,
    result: ProcessingResult,
    errorMessage?: string
  ): Promise<void> {
    try {
      await fetchMutation(api.webhook_events.mutation.updateEventResult, {
        event_id: eventId,
        processing_result: result,
        error_message: errorMessage,
      });
    } catch (recordError) {
      console.error('イベント結果の記録中にエラーが発生しました:', recordError);
    }
  }

  // 🎯 メインの処理エントリーポイント
  async processWebhook(req: NextRequest): Promise<NextResponse> {
    let eventId = '';
    let eventType = '';

    try {
      // 1. 署名検証
      const evt = await this.verifyWebhookSignature(req);
      
      // 2. イベントIDの生成
      const svixId = req.headers.get('svix-id');
      if (!svixId) {
        return NextResponse.json({ error: 'Missing svix-id' }, { status: 400 });
      }
      
      const headerPayload = await headers();
      const svixTimestamp = headerPayload.get('svix-timestamp');
      eventId = `clerk_${svixId}_${svixTimestamp}`;
      eventType = evt.type;

      // 3. 冪等性チェック
      const isAlreadyProcessed = await this.checkIdempotency(eventId, eventType);
      if (isAlreadyProcessed) {
        return NextResponse.json({ 
          received: true, 
          message: `イベント ${eventId} は既に処理済みです` 
        }, { status: 200 });
      }

      // 4. メトリクス収集開始
      const metrics = new WebhookMetricsCollector({
        eventId,
        eventType,
        userId: isUserEvent(evt.data) ? evt.data.id : undefined,
        organizationId: isOrganizationEvent(evt.data) ? evt.data.id : undefined,
      });

      // 5. イベント処理
      let processingResult: ProcessingResult = 'success';
      let errorMessage: string | undefined;

      try {
        processingResult = await this.processEvent(eventType, evt.data, eventId, metrics);
      } catch (error) {
        processingResult = 'error';
        errorMessage = error instanceof Error ? error.message : '不明なエラー';
        throw error;
      } finally {
        // 6. 結果記録とメトリクス送信
        await this.recordProcessingResult(eventId, processingResult, errorMessage);
        await metrics.collectAndSend(processingResult);
      }

      return NextResponse.json({ 
        received: true, 
        message: `Clerk イベント ${eventId} の処理が完了しました` 
      }, { status: 200 });

    } catch (error) {
      console.error(`Clerk webhook event ${eventId} 処理で致命的エラー:`, error);
      
      // エラー時も記録を更新
      if (eventId) {
        await this.recordProcessingResult(
          eventId, 
          'error', 
          error instanceof Error ? error.message : '不明なエラー'
        );
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
}

// 🎯 シングルトンインスタンス
const webhookProcessor = new ClerkWebhookProcessor();

// 🚀 エクスポート用のヘルパー関数
export async function processClerkWebhook(req: NextRequest): Promise<NextResponse> {
  return webhookProcessor.processWebhook(req);
} 