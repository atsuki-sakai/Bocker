import { NextResponse } from 'next/server';
import { stripeService } from '@/services/stripe/StripeService';

export async function POST(request: Request) {
  try {
    // リクエストからsalonIdを取得
    let salonId;
    try {
      const body = await request.json();
      console.log('Stripe Connect API: Request body ->', body);
      salonId = body.salonId;
      console.log('Stripe Connect API: salonId extracted ->', salonId);
    } catch (err) {
      console.error('Stripe Connect API: Failed to parse JSON ->', err);
    }

    if (!salonId) {
      return NextResponse.json({ error: 'サロンIDが必要です' }, { status: 400 });
    }

    // StripeConnectクラスを使用してアカウント連携を行う
    console.log('Stripe Connect API: Calling createConnectAccountLink with salonId:', salonId);
    const result = await stripeService.createConnectAccountLink(salonId);
    console.log('Stripe Connect API: createConnectAccountLink result ->', result);

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      account: result.data.account.id,
      accountLink: result.data.accountLink.url,
      isNew: true,
    });
  } catch (error) {
    console.error('Stripe Connect APIエラー:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '不明なエラーが発生しました' },
      { status: 500 }
    );
  }
}
