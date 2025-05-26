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

/**
 * Stripe Connect Statusエンドポイントの動作確認用GETリクエストハンドラ
 * @returns NextResponse - エンドポイントの状態を示すJSONレスポンス
 */
export async function GET(): Promise<NextResponse> {
  // エンドポイントが動作していることを示すメッセージと、
  // 現在の実装バージョン、主要な機能リストを返す
  return NextResponse.json(
    {
      message: 'Stripe Connect Status endpoint is working. Please use POST for webhooks.',
      version: '2.0.0', // 現在のWebhook処理ロジックのバージョン
      status: 'healthy', // エンドポイントの健康状態
      timestamp: new Date().toISOString(), // 現在時刻
      features: [
        'Pure Function Architecture', // 関数型プログラミングに基づいた設計
        'Parallel Processing for I/O bound tasks', // I/O処理の並列実行
        'Advanced Metrics Collection (Sentry)', // Sentryによる詳細なメトリクス収集
        'Enhanced Type Safety (TypeScript, Zod)', // TypeScriptとZodによる型安全性
        'Dependency Injection for Testability', // DIによるテスト容易性の向上
        'Idempotency Handling', // 冪等性担保
        'Retry Logic for Critical Operations', // クリティカルな操作のリトライ処理
      ],
    },
    { status: 200 }
  );
}