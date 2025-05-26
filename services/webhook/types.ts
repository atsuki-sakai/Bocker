
import type Stripe from 'stripe';
import type { api } from '@/convex/_generated/api';
import type { retryOperation } from '@/lib/utils';

// 🔧 依存性注入のためのインターフェース定義
// Webhookハンドラーが必要とする外部サービスやユーティリティ関数をまとめた型。
// これにより、テスト時にモックを注入しやすくなる。
export interface WebhookDependencies {
  stripe: Stripe; // Stripe APIクライアント
  convex: typeof api; // Convex APIクライアント
  retry: typeof retryOperation; // リトライ処理ユーティリティ
}

// 📊 Webhook処理結果のステータスを表す型
// 各イベント処理が成功したか、失敗したか、スキップされたかを示す。
export type ProcessingResult = 'success' | 'error' | 'skipped';

// 🎯 イベント処理の結果を詳細に表す型
// 処理ステータスに加え、エラーメッセージやメタデータを含むことができる。
export interface EventProcessingResult {
  result: ProcessingResult; // 処理結果のステータス
  errorMessage?: string;   // エラー発生時のメッセージ
  metadata?: Record<string, any>; // 処理に関する追加情報（例: 作成されたIDなど）
}

// 📝 ログやメトリクス収集で使用するコンテキスト情報
// イベントIDやタイプなど、処理の追跡に必要な情報を含む。
export interface LogContext {
  eventId: string;        // Webhookイベントの一意なID
  eventType: string;      // Webhookイベントのタイプ (例: 'user.created')
  userId?: string;         // 関連するユーザーID (ユーザー関連イベントの場合)
  organizationId?: string; // 関連する組織ID (組織関連イベントの場合)
  stripeAccountId?: string; // 関連するStripeアカウントID (Stripe Connect関連イベントの場合)
  stripeCustomerId?: string; // 関連するStripe顧客ID (Stripe Connect関連イベントの場合)
  stripeSubscriptionId?: string; // 関連するStripeサブスクリプションID (Stripe Connect関連イベントの場合)
}

// 🔄 並列処理フレームワークで使用するタスク定義の型
// 各タスクは名前、実行する非同期操作、クリティカルかどうか（失敗時に全体を止めるか）を持つ。
export interface ParallelTask<T = any> {
  name: string; // タスクの識別名
  operation: () => Promise<T>; // 実行する非同期処理
  critical: boolean; // このタスクの失敗が全体の処理を停止させるべきかを示すフラグ
}

// 📈 メトリクス収集用のデータ構造を定義する型
// イベントタイプ、処理時間、結果、リトライ回数、外部API呼び出し回数などを含む。
export interface WebhookMetrics {
  eventType: string; // イベントタイプ
  processingTimeMs: number; // 処理にかかった時間（ミリ秒）
  result: ProcessingResult; // 処理結果
  retryCount?: number; // リトライ回数 (リトライが発生した場合のみ)
  externalApiCalls: { // 外部API呼び出しの回数
    stripe: number; // Stripe API呼び出し回数
    clerk: number; // Clerk API呼び出し回数
    convex: number; // Convex API呼び出し回数
  };
}
