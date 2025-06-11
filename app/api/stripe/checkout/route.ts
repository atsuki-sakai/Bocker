import { NextRequest, NextResponse } from 'next/server';
import { stripeService } from '@/services/stripe/StripeService';
import { validateRequest, createValidationErrorResponse } from '@/lib/api/validation';
import { stripeCheckoutSchema } from '@/lib/validations/api';
import { BASE_URL } from '@/lib/constants';
import { Id } from '@/convex/_generated/dataModel';

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequest(request, stripeCheckoutSchema);
    if (!validation.success) {
      console.error('Validation error:', validation.error);
      return createValidationErrorResponse(validation.error);
    }

    const { 
      stripeConnectId, 
      reservationId, 
      tenantId, 
      orgId, 
      customerEmail, 
      lineItems, 
      couponId, 
      pointsUsedAmount 
    } = validation.data;

    console.log('Creating Stripe Checkout session:', {
      stripeConnectId,
      reservationId,
      tenantId,
      orgId,
      customerEmail,
      lineItemsCount: lineItems.length,
      couponId,
      pointsUsedAmount
    });

    const successUrl = `${BASE_URL}/reservation/${orgId}/calendar/complete?reservation_id=${reservationId}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${BASE_URL}/reservation/${orgId}/calendar?canceled=true&reservation_id=${reservationId}`;

    // Create checkout session arguments
    const checkoutSessionArgs = {
      stripe_account_id: stripeConnectId,
      tenant_id: tenantId as Id<'tenant'>,
      org_id: orgId as Id<'organization'>,
      reservation_id: reservationId as Id<'reservation'>,
      line_items: lineItems,
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        reservationId,
        tenantId,
        orgId,
        couponId: couponId || '',
        pointsUsedAmount: pointsUsedAmount?.toString() || '0',
      }
    };

    console.log('Calling stripeService.createCheckoutSession with args:', JSON.stringify(checkoutSessionArgs, null, 2));

    // Create checkout session
    const result = await stripeService.createCheckoutSession(checkoutSessionArgs);
    console.log('Stripe service result:', {
      success: result.success,
      hasData: !!result.data,
      error: result.error
    });

    if (!result.success || !result.data?.url || !result.data?.sessionId) {
      console.error('Stripe Checkout session creation failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Checkoutセッションの作成に失敗しました' },
        { status: 400 }
      );
    }

    // Return successful response
    return NextResponse.json({
      sessionId: result.data.sessionId,
      checkoutUrl: result.data.url
    });

  } catch (error) {
    console.error('Stripe Checkout API error:', error);
    
    // Determine error message and status code
    const message = error instanceof Error ? error.message : '不明なエラーが発生しました';
    const statusCode = (error && typeof error === 'object' && 'statusCode' in error) 
      ? (error as { statusCode: number }).statusCode 
      : 500;

    return NextResponse.json(
      { error: message },
      { status: statusCode }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}