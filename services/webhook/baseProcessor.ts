import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchMutation } from 'convex/nextjs';
import * as Sentry from '@sentry/nextjs';
import type { ProcessingResult } from './types';
import { WebhookMetricsCollector } from './metrics';

export abstract class WebhookProcessor {
  protected abstract verifySignature(req: NextRequest, secret: string): Promise<any>;
  protected abstract makeEventId(evt: any, req: NextRequest): string;
  protected abstract dispatch(evt: any, id: string, metrics: WebhookMetricsCollector, req: NextRequest): Promise<ProcessingResult>;
  protected abstract getMetricsMetadata(evt: any): { userId?: string, organizationId?: string };

  protected async checkIdempotency(eventId: string, eventType: string): Promise<boolean> {
    const processedCheck = await fetchMutation(api.webhook_events.mutation.checkProcessedEvent, {
      event_id: eventId,
    });

    if (processedCheck.isProcessed) {
      console.log(`Event ${eventId} (${eventType}) is already processed. Skipping.`);
      return true;
    }

    await fetchMutation(api.webhook_events.mutation.recordEvent, {
      event_id: eventId,
      event_type: eventType,
      processing_result: 'processing',
    });

    return false;
  }

  protected async recordProcessingResult(
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
      console.error(`Failed to record processing result for event ${eventId}:`, recordError);
      Sentry.captureException(recordError, {
        level: 'warning',
        tags: {
          eventId,
          source: `${this.constructor.name}.recordProcessingResult`,
          context: 'Error while recording webhook event processing result to Convex.'
        }
      });
    }
  }

  public async process(req: NextRequest, secret: string): Promise<NextResponse> {
    let eventId = '';
    let eventType = '';
    let evt: any;

    try {
      evt = await this.verifySignature(req, secret);
      
      if (!evt || typeof evt.type !== 'string') {
        console.error('Event object or event type is invalid after signature verification.');
        Sentry.captureMessage('Invalid event object or type after signature verification', {
          level: 'error',
          tags: { source: `${this.constructor.name}.process` }
        });
        return NextResponse.json({ error: 'Invalid event data' }, { status: 400 });
      }
      eventType = evt.type;
      
      eventId = this.makeEventId(evt, req);

      const isAlreadyProcessed = await this.checkIdempotency(eventId, eventType);
      if (isAlreadyProcessed) {
        return NextResponse.json({ 
          received: true, 
          message: `Event ${eventId} already processed.` 
        }, { status: 200 });
      }

      const metricMetadata = this.getMetricsMetadata(evt);
      const metrics = new WebhookMetricsCollector({
        eventId,
        eventType,
        userId: metricMetadata.userId,
        organizationId: metricMetadata.organizationId,
      });

      let processingResult: ProcessingResult = 'success';
      let errorMessage: string | undefined;

      try {
        processingResult = await this.dispatch(evt, eventId, metrics, req);
      } catch (dispatchError: any) {
        processingResult = 'error';
        errorMessage = dispatchError instanceof Error ? dispatchError.message : 'Unknown error in dispatch';
        Sentry.captureException(dispatchError, {
          level: 'error',
          tags: { eventType, eventId, source: `${this.constructor.name}.dispatch` },
        });
        throw dispatchError; // Re-throw to be caught by the main try-catch
      } finally {
        await this.recordProcessingResult(eventId, processingResult, errorMessage);
        await metrics.collectAndSend(processingResult);
      }

      return NextResponse.json({ 
        received: true, 
        message: `Event ${eventId} processed successfully by ${this.constructor.name}.` 
      }, { status: 200 });

    } catch (error: any) {
      console.error(`Webhook event ${eventId || 'unknown'} processing failed in ${this.constructor.name}:`, error);
      
      const SentryTags: { eventType: string, eventId: string, source: string, [key: string]: string } = {
        eventType: eventType || 'unknown',
        eventId: eventId || 'unknown',
        source: `${this.constructor.name}.process`,
      };

      if (error.message && (error.message.toLowerCase().includes('signature') || error.message.toLowerCase().includes('verification failed'))) {
        Sentry.captureMessage(`Webhook signature verification failed for ${this.constructor.name}: ${error.message}`, {
          level: 'error',
          tags: SentryTags,
        });
        return NextResponse.json({ error: `Signature verification failed: ${error.message}` }, { status: 400 });
      }

      if (eventId && eventType) { // Ensure eventId and eventType are available before recording error
        await this.recordProcessingResult(
          eventId, 
          'error', 
          error instanceof Error ? error.message : 'Unknown error in processor'
        );
      } else {
        // If eventId or eventType is not available, we can't record the specific event,
        // but we still log the general error to Sentry.
         SentryTags.context = 'Error occurred before eventId or eventType could be determined.';
      }


      Sentry.captureException(error, {
        level: 'error',
        tags: SentryTags,
      });

      return NextResponse.json(
        { error: 'Internal server error processing webhook' },
        { status: 500 }
      );
    }
  }
}
