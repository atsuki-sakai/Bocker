import { NextRequest, NextResponse } from 'next/server';
import { processClerkWebhook } from '@/services/webhook/clerk/ClerkWebhookProcessor';

// 🎯 Clerk Webhook エンドポイント
// 新しいアーキテクチャを使用した改善版実装
// 
// 改善点:
// ✅ Pure Function分割とDI（依存性注入）
// ✅ 並列処理によるI/O最適化
// ✅ 詳細なメトリクス収集とモニタリング
// ✅ 型安全性の向上
// ✅ テスト容易性の向上
// ✅ エラーハンドリングの強化

/**
 * ClerkからのWebhookイベントを処理するPOSTリクエストハンドラ
 * @param req NextRequest - Next.jsのリクエストオブジェクト
 * @returns NextResponse - Next.jsのレスポンスオブジェクト
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // デバッグ用ログ追加
  console.log('🚨 Clerk Webhook received:', {
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    env: {
      hasSecret: !!process.env.CLERK_WEBHOOK_SIGNING_SECRET,
      secretLength: process.env.CLERK_WEBHOOK_SIGNING_SECRET?.length,
      secretPrefix: process.env.CLERK_WEBHOOK_SIGNING_SECRET?.substring(0, 10),
    }
  });

  try {
    // Webhook処理サービスを呼び出し
    const response = await processClerkWebhook(req);
    console.log('✅ Webhook processed successfully');
    return response;
  } catch (error) {
    console.error('❌ Webhook processing failed:', error);
    throw error;
  }
}

/**
 * Webhookエンドポイントの動作確認用GETリクエストハンドラ
 * @returns NextResponse - エンドポイントの状態を示すJSONレスポンス
 */
export async function GET(): Promise<NextResponse> {
  // エンドポイントが動作していることを示すメッセージと、
  // 現在の実装バージョン、主要な機能リストを返す
  return NextResponse.json(
    {
      message: 'Clerk webhook endpoint is working. Please use POST for webhooks.',
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