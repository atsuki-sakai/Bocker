import { NextRequest, NextResponse } from 'next/server';
import { WebhookEvent, verifyWebhook } from '@clerk/nextjs/webhooks';
import Stripe from 'stripe';
import { api } from '@/convex/_generated/api';
// Removed fetchMutation as it's now handled in baseProcessor
import * as Sentry from '@sentry/nextjs';
import { STRIPE_API_VERSION } from '@/services/stripe/constants';
import { retryOperation } from '@/lib/utils';
import type { UserJSON, OrganizationJSON } from '@clerk/nextjs/server';
import { z } from 'zod';

import { WebhookProcessor } from '../BaseProcessor'; // Added
import type { WebhookDependencies, ProcessingResult } from '../types';
import { isUserEvent, isOrganizationEvent } from './types';
import { WebhookMetricsCollector } from '../metrics';
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
export class ClerkWebhookProcessor extends WebhookProcessor {
  private stripe: Stripe;
  private dependencies: WebhookDependencies;

  constructor() {
    super(); 
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY!, {
      apiVersion: STRIPE_API_VERSION,
    });

    this.dependencies = {
      stripe: this.stripe,
      convex: api,
      retry: retryOperation,
    };
  }

  // 🔐 Webhook署名の検証 (Adapted from verifyWebhookSignature)
  protected async verifySignature(req: NextRequest, secret: string): Promise<WebhookEvent> {
    if (!secret) {
      // This error will be caught by the main error handler in baseProcessor.process
      // and result in a 400 or 500 response.
      throw new Error('Clerk signing secret is not provided to verifySignature method.');
    }
    try {
      return await verifyWebhook(req, {
        signingSecret: secret,
      });
    } catch (err: any) {
      // Log specifics for debugging, but throw a generic message for the client
      // The base processor will handle Sentry capture for this re-thrown error.
      console.error('Clerk webhook signature verification failed:', err);
      Sentry.captureMessage('Clerk webhook signature verification failed', { level: 'error' });
      throw new Error('Clerk webhook signature verification failed: ' + (err.message || 'Unknown error'));
    }
  }

  // 🆔 イベントIDの生成
  protected makeEventId(evt: WebhookEvent, req: NextRequest): string {
    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    if (!svixId || !svixTimestamp) {
      // This error will be caught by the main error handler in baseProcessor.process
      throw new Error('Missing svix-id or svix-timestamp headers for Clerk event ID generation.');
    }
    return `clerk_${svixId}_${svixTimestamp}`;
  }

  // 📊 メトリクス用メタデータの取得
  protected getMetricsMetadata(evt: WebhookEvent): { userId?: string, organizationId?: string } {
    if (isUserEvent(evt.data)) {
      return { userId: evt.data.id };
    }
    if (isOrganizationEvent(evt.data)) {
      return { organizationId: evt.data.id };
    }
    return {};
  }

  // 🎯 イベント処理のディスパッチ (Adapted from old processEvent)
  protected async dispatch(
    evt: WebhookEvent,
    eventId: string,
    metrics: WebhookMetricsCollector,
    req: NextRequest // req is part of the abstract signature, kept for compliance
  ): Promise<ProcessingResult> {
    console.log(`🎯 Clerk event dispatch: ${evt.type} (ID: ${eventId})`);
    // req is available if needed by handlers, but currently they don't use it directly.
    try {
      switch (evt.type) {
        case 'user.created':
          if (!isUserEvent(evt.data)) throw new Error('Invalid user event data for user.created');
          return (await handleUserCreated(evt.data, eventId, this.dependencies, metrics)).result;

        case 'user.updated':
          if (!isUserEvent(evt.data)) throw new Error('Invalid user event data for user.updated');
          return (await handleUserUpdated(evt.data, eventId, this.dependencies, metrics)).result;

        case 'user.deleted':
          // As per type WebhookEvent<UserJSON, 'user.deleted'>, evt.data is UserJSON.
          if (!isUserEvent(evt.data)) throw new Error('Invalid user event data for user.deleted');
          return (await handleUserDeleted(evt.data as UserJSON, eventId, this.dependencies, metrics)).result;

        case 'organization.created':
          if (!isOrganizationEvent(evt.data)) throw new Error('Invalid org event data for organization.created');
          return (await handleOrganizationCreated(evt.data, eventId, this.dependencies, metrics)).result;

        case 'organization.updated':
          if (!isOrganizationEvent(evt.data)) throw new Error('Invalid org event data for organization.updated');
          return (await handleOrganizationUpdated(evt.data, eventId, this.dependencies, metrics)).result;

        case 'organization.deleted':
          // As per type WebhookEvent<OrganizationJSON, 'organization.deleted'>, evt.data is OrganizationJSON.
          if (!isOrganizationEvent(evt.data)) throw new Error('Invalid org event data for organization.deleted');
          return (await handleOrganizationDeleted(evt.data as OrganizationJSON, eventId, this.dependencies, metrics)).result;

        default:
          console.log(`Unsupported Clerk event type: ${evt.type}`);
          return 'skipped';
      }
    } catch (error) {
      console.error(`Error dispatching Clerk event ${evt.type} (ID: ${eventId}):`, error);
      // This error will be caught by baseProcessor.process, which will log to Sentry
      // and record the processing result.
      throw error;
    }
  }

  // Removed processWebhook method
  // Removed checkIdempotency method
  // Removed recordProcessingResult method
}

// 🎯 シングルトンインスタンス
const webhookProcessor = new ClerkWebhookProcessor();

// 🚀 エクスポート用のヘルパー関数
export async function processClerkWebhook(req: NextRequest): Promise<NextResponse> {
  const SIGNING_SECRET = env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!SIGNING_SECRET) {
    console.error('Clerk signing secret is not set in environment variables.');
    // Critical error: webhook processing cannot proceed.
    Sentry.captureMessage('Clerk signing secret not configured', { level: "fatal" });
    return NextResponse.json({ error: 'Clerk signing secret not configured. Webhook processing aborted.' }, { status: 500 });
  }
  // The 'process' method is inherited from WebhookProcessor.
  return webhookProcessor.process(req, SIGNING_SECRET);
} 