import { NextResponse } from 'next/server';
import { stripeConnect } from '@/services/stripe/StripeConnect';

export async function POST(request: Request) {
  try {
    // リクエストからsalonIdとaccountIdを取得
    const { salonId, accountId } = await request.json();

    if (!salonId || !accountId) {
      return NextResponse.json(
        {
          success: false,
          error: 'サロンIDとアカウントIDが必要です',
        },
        { status: 400 }
      );
    }

    // StripeServiceを使用してステータスを更新
    const result = await stripeConnect.checkAndUpdateAccountStatus(salonId, accountId);

    // 結果を返す
    if (result.success && result.data) {
      return NextResponse.json({
        success: true,
        status: result.data.status,
        details: result.data.details,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating Stripe Connect status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
