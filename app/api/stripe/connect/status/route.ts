import { NextResponse } from 'next/server';
import { stripeService } from '@/services/stripe';

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
    const result = await stripeService.checkAndUpdateAccountStatus(salonId, accountId);

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
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
