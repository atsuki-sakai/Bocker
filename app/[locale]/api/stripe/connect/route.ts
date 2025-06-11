import { NextResponse } from 'next/server';
import { stripeService } from '@/services/stripe/StripeService';
import { withAuthAndValidation } from '@/lib/api/middleware';
import { stripeConnectRequestSchema } from '@/lib/validations/api/stripe';
import { Id } from '@/convex/_generated/dataModel';

/**
 * Stripe Connect アカウント連携APIのPOSTエンドポイント
 * テナントIDと組織IDを受け取り、Stripeアカウント連携用のアカウントリンクを生成する
 * @param request - HTTPリクエストオブジェクト（tenant_id, org_idを含むJSON）
 * @returns Stripeアカウント情報とアカウントリンクURL
 */
export const POST = withAuthAndValidation(
  stripeConnectRequestSchema,
  async (request, auth, data) => {
    if (!data) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }
    
    const { tenant_id, org_id } = data;

    // Verify that the user has permission to create Stripe Connect for this organization
    if (org_id !== auth.orgId) {
      return NextResponse.json(
        { error: 'この組織のStripe連携を設定する権限がありません' },
        { status: 403 }
      );
    }

    // Only admin and owner can setup Stripe Connect
    if (!['admin', 'owner'].includes(auth.role)) {
      return NextResponse.json(
        { error: 'Stripe連携の設定には管理者権限が必要です' },
        { status: 403 }
      );
    }

    // StripeConnectクラスを使用してアカウント連携を行う
    const result = await stripeService.createConnectAccountLink(tenant_id as Id<'tenant'>, org_id as Id<'organization'>);

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      account: result.data.account.id,
      accountLink: result.data.accountLink.url
    });
  }
);

/**
 * Stripe Connectエンドポイントの動作確認用GETリクエストハンドラ
 * @returns NextResponse - エンドポイントの状態を示すJSONレスポンス
 */
export async function GET(): Promise<NextResponse> {
  // エンドポイントが動作していることを示すメッセージと、
  // 現在の実装バージョン、主要な機能リストを返す
  return NextResponse.json(
    {
      message: 'Stripe connect endpoint is working. Please use POST for webhooks.',
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