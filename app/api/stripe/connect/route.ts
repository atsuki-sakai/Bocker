
import { NextResponse } from 'next/server';
import { stripeService } from '@/services/stripe/StripeService';

export async function POST(request: Request) {
  try {
    // リクエストからsalonIdを取得
    let { tenant_id, org_id } = await request.json();

    if (!tenant_id) {
      return NextResponse.json({ error: 'テナントIDが必要です' }, { status: 400 });
    }

    if (!org_id) {
      return NextResponse.json({ error: '組織IDが必要です' }, { status: 400 });
    }

    // StripeConnectクラスを使用してアカウント連携を行う
    const result = await stripeService.createConnectAccountLink(tenant_id, org_id);

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      account: result.data.account.id,
      accountLink: result.data.accountLink.url
    });
  } catch (error) {
    console.error('Stripe Connect APIエラー:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '不明なエラーが発生しました' },
      { status: 500 }
    );
  }
}