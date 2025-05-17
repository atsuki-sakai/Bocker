import { NextResponse } from 'next/server';
import { stripeService } from '@/services/stripe/StripeService'; // stripeServiceが存在し、createCheckoutSessionメソッドを持つと仮定

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received body for /api/stripe/connect/checkout:', JSON.stringify(body, null, 2));

    const { stripeConnectId, reservationId, salonId, customerEmail, lineItems, couponId, pointsUsedAmount } = body;

    if (!stripeConnectId) {
      console.error('Missing stripeConnectId');
      return NextResponse.json({ error: 'stripeConnectId が不足しています' }, { status: 400 });
    }
    if (!reservationId) {
      console.error('Missing reservationId');
      return NextResponse.json({ error: 'reservationId が不足しています' }, { status: 400 });
    }
    if (!salonId) {
      console.error('Missing salonId');
      return NextResponse.json({ error: 'salonId が不足しています' }, { status: 400 });
    }
    if (!customerEmail) {
      console.error('Missing customerEmail');
      return NextResponse.json({ error: 'customerEmail が不足しています' }, { status: 400 });
    }
    if (!lineItems) {
      console.error('Missing lineItems');
      return NextResponse.json({ error: 'lineItems が不足しています' }, { status: 400 });
    }

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
        console.error('Invalid lineItems format: not an array or empty', JSON.stringify(lineItems, null, 2));
        return NextResponse.json({ error: 'lineItemsの形式が不正です。配列で、空であってはいけません。' }, { status: 400 });
    }

    for (const item of lineItems) {
        if (!item.price_data ||
            typeof item.price_data.unit_amount !== 'number' ||
            typeof item.price_data.currency !== 'string' ||
            !item.price_data.product_data ||
            typeof item.price_data.product_data.name !== 'string') {
            console.error('Invalid lineItem content:', JSON.stringify(item, null, 2));
            return NextResponse.json({ error: 'lineItemsの内容が不正です。price_data (unit_amount, currencyを含む), product_data (nameを含む) を確認してください。' }, { status: 400 });
        }
        // Stripeでは多くの通貨で最低支払金額が設定されています。JPYの場合は50円です。
        // 0円以下の場合はもちろん、50円未満の場合もエラーになる可能性があります。
        if (item.price_data.unit_amount <= 0) {
            console.error('Invalid unit_amount in lineItem. Amount must be greater than 0:', JSON.stringify(item, null, 2));
            return NextResponse.json({ error: '支払い金額 (unit_amount) は0より大きい値である必要があります。' }, { status: 400 });
        }
         if (item.price_data.currency.toLowerCase() === 'jpy' && item.price_data.unit_amount < 50) {
            console.warn('Warning: unit_amount for JPY is less than 50. This might cause issues with Stripe:', JSON.stringify(item, null, 2));
            // Stripeの最低金額は50円なので、警告を出すが、エラーにはしない。Stripe側でエラーになる可能性がある。
        }
    }

    const baseUrl =
  process.env.NEXT_PUBLIC_NODE_ENV === 'development'
    ? process.env.NEXT_PUBLIC_DEVELOP_URL
    : process.env.NEXT_PUBLIC_DEPLOY_URL;

    const successUrl = `${baseUrl}/reservation/${salonId}/calendar/complete?reservation_id=${reservationId}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/reservation/${salonId}/calendar?canceled=true&reservation_id=${reservationId}`;

    const checkoutSessionArgs = {
      stripeConnectId,
      reservationId, // これはStripeのmetadataなどに含める想定かもしれません
      salonId,       // これもStripeのmetadataなどに含める想定かもしれません
      customerEmail,
      lineItems,
      successUrl,
      cancelUrl,
      metadata: {
        reservationId,
        salonId,
        couponId: couponId || '',
        pointsUsedAmount: pointsUsedAmount || 0,
      }
    };
    console.log('Calling stripeService.createCheckoutSession with args:', JSON.stringify(checkoutSessionArgs, null, 2));

    const result = await stripeService.createCheckoutSession(checkoutSessionArgs);
    console.log('Stripe service result:', JSON.stringify(result, null, 2));

    if (!result.success || !result.data?.url || !result.data?.sessionId) {
      console.error('Stripe Checkout session creation failed:', result.error, result.data);
      const statusCode = (result.data && typeof result.data === 'object' && 'statusCode' in result.data && typeof result.data.statusCode === 'number') ? result.data.statusCode : 400;
      return NextResponse.json({ error: result.error || 'Checkoutセッションの作成に失敗しました' }, { status: statusCode });
    }

    return NextResponse.json({ sessionId: result.data.sessionId, checkoutUrl: result.data.url });
  } catch (error) {
    console.error('Stripe Checkout APIエラー (catch block):', error);
    const message = error instanceof Error ? error.message : '不明なエラーが発生しました';
    const statusCode = (error && typeof error === 'object' && 'statusCode' in error && typeof (error as { statusCode: number }).statusCode === 'number') ? (error as { statusCode: number }).statusCode : 500;
    return NextResponse.json(
      { error: message },
      { status: statusCode }
    );
  }
} 