import { NextResponse } from 'next/server';
import { stripeService } from '@/services/stripe/StripeService';

export async function POST(request: Request) {
  try {
    // リクエストからsalonIdとaccountIdを取得
    const { stripe_account_id } = await request.json();

    if (!stripe_account_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'stripe_account_idが必要です',
        },
        { status: 400 }
      );
    }

    // StripeServiceを使用してステータスを更新
    const result = await stripeService.checkAndUpdateConnectAccountStatus(stripe_account_id);

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