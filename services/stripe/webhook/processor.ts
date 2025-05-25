import Stripe from 'stripe';
import { NextRequest } from 'next/server'; // NextResponse might not be needed here if not used directly
import { WebhookProcessor } from '@/services/webhook/baseProcessor';
import type { ProcessingResult, WebhookDependencies } from '@/services/webhook/types';
import { WebhookMetricsCollector } from '@/services/webhook/metrics';
import { api } from '@/convex/_generated/api'; // For Convex dependency
import { retryOperation } from '@/lib/utils'; // For retry dependency
import { STRIPE_API_VERSION } from '@/services/stripe/constants';

// TODO: Adjust paths for these handlers once they are created in subsequent steps.
// Assuming they will be in the same directory for now:
import { handleSubscriptionEvent } from './handlers.subscription';
import { handleConnectEvent } from './handlers.connect';

/**
 * Processor for handling Stripe webhooks.
 * Extends the base WebhookProcessor to leverage common webhook processing logic.
 */
export class StripeWebhookProcessor extends WebhookProcessor {
  private stripe: Stripe;
  protected dependencies: WebhookDependencies;

  constructor() {
    // super(); // WebhookProcessor does not have an explicit constructor.
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      // This error will prevent the application from starting if the key is not configured,
      // which is a fail-fast approach.
      throw new Error('Stripe secret key (STRIPE_SECRET_KEY) is not configured in environment variables.');
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true, // Recommended for Stripe's TypeScript users for better type safety.
    });

    // Initialize dependencies needed by Stripe event handlers.
    // The WebhookDependencies type is reused from services/webhook/types.ts.
    this.dependencies = {
      stripe: this.stripe,     // The initialized Stripe instance.
      convex: api,             // Convex API for database operations.
      retry: retryOperation,   // Utility for retrying operations, if needed by handlers.
      // mail: mailService,    // Example: if a mail service was a dependency.
    };
  }

  /**
   * Verifies the signature of an incoming Stripe webhook request.
   * @param req The NextRequest object.
   * @param secret The Stripe webhook signing secret.
   * @returns The verified Stripe.Event object.
   * @throws Error if the signature is missing or invalid.
   */
  protected async verifySignature(req: NextRequest, secret: string): Promise<Stripe.Event> {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('Missing stripe-signature header. Cannot verify Stripe webhook.');
    }

    // Stripe requires the raw request body for signature verification.
    const rawBody = await req.text();

    try {
      // Use Stripe's library to construct and verify the event.
      // This ensures the event is genuinely from Stripe and has not been tampered with.
      return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err: any) {
      // Catches errors thrown by stripe.webhooks.constructEvent (e.g., Stripe.errors.StripeSignatureVerificationError)
      console.error('Stripe webhook signature verification failed:', err.message);
      // The error is re-thrown and will be caught by the baseProcessor's process method,
      // which handles Sentry logging and returns an appropriate HTTP response.
      throw new Error(`Stripe signature verification failed: ${err.message}`);
    }
  }

  /**
   * Creates a unique event ID for Stripe events.
   * This ID is used for idempotency checks and logging.
   * @param evt The Stripe.Event object.
   * @param req The NextRequest object (currently unused for Stripe ID generation but part of the abstract signature).
   * @returns A string representing the unique event ID.
   */
  protected makeEventId(evt: Stripe.Event, req: NextRequest): string {
    // Format: stripe_eventID_timestamp (e.g., stripe_evt_12345_1678886400)
    // Stripe event IDs (evt.id) are unique, and combining with created timestamp adds context.
    return `stripe_${evt.id}_${evt.created}`;
  }

  /**
   * Retrieves metadata for metrics collection for a Stripe event.
   * For Stripe events, direct user or organization IDs common in other systems (like Clerk)
   * may not be present or relevant in the same way.
   * @param evt The Stripe.Event object.
   * @returns An object containing metadata for metrics. Currently returns empty.
   */
  protected getMetricsMetadata(evt: Stripe.Event): { userId?: string, organizationId?: string } {
    // Stripe events often relate to customers, subscriptions, or connected accounts.
    // If specific metadata like a Stripe Customer ID or Connected Account ID becomes useful
    // for metrics, it can be extracted from evt.data.object and returned here.
    // For now, no common user/org ID is extracted.
    return {};
  }

  /**
   * Dispatches a verified Stripe event to the appropriate handler.
   * @param evt The Stripe.Event object.
   * @param eventId The unique ID for this event.
   * @param metrics A WebhookMetricsCollector instance for recording event metrics.
   * @param req The NextRequest object (available if handlers need more request details).
   * @returns A ProcessingResult ('success', 'skipped', 'error').
   * @throws Error if event processing fails within a handler.
   */
  protected async dispatch(
    evt: Stripe.Event,
    eventId: string,
    metrics: WebhookMetricsCollector,
    req: NextRequest 
  ): Promise<ProcessingResult> {
    console.log(`🎯 Stripe event dispatch: ${evt.type} (ID: ${eventId})`);

    // For debugging, consider logging the event object if necessary, respecting data privacy.
    // console.log('Stripe Event Object:', JSON.stringify(evt, null, 2));

    try {
      // Route event to the appropriate handler based on its type.
      if (evt.type.startsWith('customer.subscription.') || evt.type.startsWith('invoice.')) {
        // Handle events related to customer subscriptions and invoices.
        // These are typically core to SaaS billing.
        return await handleSubscriptionEvent(evt, eventId, this.dependencies, metrics);
      } else {
        // As per original issue specification, all other events are routed to handleConnectEvent.
        // This is a broad catch-all. If more specific routing or skipping of other event
        // categories is needed, this logic should be refined.
        // For example, 'checkout.session.completed', 'payment_intent.succeeded', etc.,
        // might warrant their own handlers or be explicitly skipped.
        console.log(`Routing event type ${evt.type} to handleConnectEvent.`);
        return await handleConnectEvent(evt, eventId, this.dependencies, metrics);
      }
      // Note: The original instruction implied any event not matching the first condition goes to handleConnectEvent.
      // A more robust approach for a production system might be:
      // else if (evt.type.startsWith('account.') || evt.type.startsWith('capability.') || evt.type.startsWith('person.')) {
      //   return await handleConnectEvent(evt, eventId, this.dependencies, metrics);
      // } else {
      //   console.log(`Unsupported Stripe event type: ${evt.type}. Marking as skipped.`);
      //   return 'skipped';
      // }
    } catch (error) {
      console.error(`Error dispatching Stripe event ${evt.type} (ID: ${eventId}):`, error);
      // Re-throw the error. It will be caught by the baseProcessor.process method,
      // which ensures consistent error logging (including Sentry) and response handling.
      throw error;
    }
  }
}
