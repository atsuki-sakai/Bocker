import { NextResponse } from 'next/server';
import { stripeService } from '@/services/stripe/StripeService';

export async function POST(request: Request) {
  try {
    // リクエストからsalonIdを取得
    let salonId;
    try {
      const body = await request.json();
      salonId = body.salonId;
    } catch {
      // JSONでない場合は処理継続（後でsalonIdをチェック）
    }

    if (!salonId) {
      return NextResponse.json({ error: 'サロンIDが必要です' }, { status: 400 });
    }

    // StripeConnectクラスを使用してアカウント連携を行う
    const result = await stripeService.createConnectAccountLink(salonId);

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
