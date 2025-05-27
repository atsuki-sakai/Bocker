import * as Sentry from '@sentry/nextjs';
import type { WebhookMetrics, LogContext, ProcessingResult } from './types';

/**
 * Webhook処理のメトリクスを収集し、Sentryに送信するクラス。
 * 処理時間、外部API呼び出し回数、リトライ回数などを追跡する。
 */
export class WebhookMetricsCollector {
  private startTime: number; // 処理開始時刻のタイムスタンプ
  private externalApiCalls = { stripe: 0, convex: 0, clerk: 0 }; // 外部API呼び出し回数のカウンター
  private retryCount = 0; // リトライ処理の実行回数カウンター

  /**
   * WebhookMetricsCollectorのコンストラクタ
   * @param context LogContext - ログとメトリクス収集のためのコンテキスト情報
   */
  constructor(private context: LogContext) {
    // 処理開始時刻を記録
    this.startTime = Date.now();
    // 初期メトリクス情報をログ出力
    console.log('📊 メトリクス収集開始:', { ...this.context, startTime: new Date(this.startTime).toISOString() });
  }

  /**
   * 外部API（StripeまたはConvex）の呼び出し回数をインクリメントする。
   * @param service 'stripe' | 'convex' - 呼び出されたサービス名
   */
  incrementApiCall(service: 'stripe' | 'convex' | 'clerk'): void {
    this.externalApiCalls[service]++;
    console.log(`📞 API Call: ${service} (total: ${this.externalApiCalls[service]})`, this.context);
  }

  /**
   * リトライ処理の実行回数をインクリメントする。
   */
  incrementRetry(): void {
    this.retryCount++;
    console.log(`🔄 Retry Attempt: ${this.retryCount}`, this.context);
  }

  /**
   * 処理の最終的なメトリクスを収集し、Sentryに送信、コンソールにログ出力する。
   * @param result ProcessingResult - Webhook処理の最終結果
   */
  async collectAndSend(result: ProcessingResult): Promise<void> {
    // 処理時間を計算
    const processingTimeMs = Date.now() - this.startTime;
    
    // 送信するメトリクスオブジェクトを構築
    const metrics: WebhookMetrics = {
      eventType: this.context.eventType,
      processingTimeMs,
      result,
      retryCount: this.retryCount > 0 ? this.retryCount : undefined, // リトライがあった場合のみ記録
      externalApiCalls: this.externalApiCalls,
    };

    // Sentryにブレッドクラムとしてメトリクス情報を追加
    // これにより、エラー発生時のSentryのレポートに詳細なメトリクスが含まれる
    Sentry.addBreadcrumb({
      category: 'webhook.metrics',
      message: `Webhook処理完了: ${this.context.eventType}`,
      level: result === 'error' ? 'error' : 'info', // 結果に応じてレベルを設定
      data: metrics, // 詳細なメトリクスデータ
    });

    // Sentryのカスタムメトリクスとして主要な値を送信 (setMeasurementは現在2引数のみサポート)
    // TODO: Sentry SDKのバージョンや設定を確認し、setMeasurementの引数仕様に合わせる
    // Sentry.setMeasurement('webhook.processing_time', processingTimeMs, 'millisecond');
    // Sentry.setMeasurement('webhook.stripe_calls', this.externalApiCalls.stripe, 'none');
    // Sentry.setMeasurement('webhook.convex_calls', this.externalApiCalls.convex, 'none');
    // if (this.retryCount > 0) {
    //   Sentry.setMeasurement('webhook.retry_count', this.retryCount, 'none');
    // }

    // 処理時間が閾値を超過した場合、Sentryに警告メッセージを送信
    if (processingTimeMs > 10000) { // 例: 10秒
      Sentry.captureMessage('Webhook処理時間が閾値を超過', {
        level: 'warning',
        tags: {
          eventType: this.context.eventType,
          processingTime: processingTimeMs.toString(),
        },
        extra: { metrics } // 詳細なメトリクスをextra情報として付与
      });
    }

    // リトライ回数が閾値を超過した場合、Sentryに警告メッセージを送信
    if (this.retryCount > 2) { // 例: 2回を超えるリトライ
      Sentry.captureMessage('Webhook処理で多数のリトライが発生', {
        level: 'warning',
        tags: {
          eventType: this.context.eventType,
          retryCount: this.retryCount.toString(),
        },
        extra: { metrics }
      });
    }

    // 構造化ログとして最終的なメトリクス情報をコンソールに出力
    // これにより、CloudWatch Logs Insightsなどで集計・分析が可能になる
    console.log('📊 Webhook処理メトリクス (最終):', {
      ...this.context,
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 指定された非同期関数にメトリクス収集機能を付加する高階関数 (デコレータ)。
 * 関数の実行前後でメトリクスを自動的に収集・送信する。
 * @param fn Tの引数を取りRを返すPromiseを返す非同期関数
 * @param context LogContext - ログとメトリクス収集のためのコンテキスト情報
 * @returns メトリクス収集機能が追加された新しい非同期関数
 */
export function withMetrics<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: LogContext
) {
  return async (...args: T): Promise<R> => {
    // メトリクスコレクターを初期化
    const metrics = new WebhookMetricsCollector(context);
    
    try {
      // 元の関数を実行
      const result = await fn(...args);
      // 成功メトリクスを送信
      await metrics.collectAndSend('success');
      return result;
    } catch (error) {
      // エラーメトリクスを送信
      await metrics.collectAndSend('error');
      // エラーを再スローして呼び出し元に伝える
      throw error;
    }
  };
} 