/**
 * Supabase操作のパフォーマンス計測ユーティリティ
 */

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics: number;
  private readonly slowQueryThreshold: number;
  private readonly enableLogging: boolean;

  constructor(options: {
    maxMetrics?: number;
    slowQueryThreshold?: number;
    enableLogging?: boolean;
  } = {}) {
    this.maxMetrics = options.maxMetrics ?? 1000;
    this.slowQueryThreshold = options.slowQueryThreshold ?? 100; // デフォルト100ms
    this.enableLogging = options.enableLogging ?? process.env.NODE_ENV === 'development';
  }

  /**
   * パフォーマンス計測を開始
   */
  startMeasure(operation: string, metadata?: Record<string, any>): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric({
        operation,
        duration,
        timestamp: Date.now(),
        success: true,
        metadata
      });
    };
  }

  /**
   * メトリクスを記録
   */
  recordMetric(metric: PerformanceMetrics): void {
    // メトリクス配列に追加
    this.metrics.push(metric);
    
    // 最大数を超えたら古いものから削除
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // 遅いクエリの警告
    if (metric.duration > this.slowQueryThreshold) {
      console.warn(
        `[Performance] Slow operation detected: ${metric.operation} took ${metric.duration.toFixed(2)}ms`,
        metric.metadata
      );
    }

    // ログ出力
    if (this.enableLogging) {
      const status = metric.success ? 'SUCCESS' : 'FAILED';
      console.log(
        `[Performance] ${metric.operation} - ${status} - ${metric.duration.toFixed(2)}ms`,
        metric.metadata
      );
    }
  }

  /**
   * 統計情報を取得
   */
  getStats(operation?: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    successRate: number;
    slowQueries: number;
  } {
    const targetMetrics = operation
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;

    if (targetMetrics.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0,
        slowQueries: 0
      };
    }

    const durations = targetMetrics.map(m => m.duration);
    const successCount = targetMetrics.filter(m => m.success).length;
    const slowQueries = targetMetrics.filter(m => m.duration > this.slowQueryThreshold).length;

    return {
      count: targetMetrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: (successCount / targetMetrics.length) * 100,
      slowQueries
    };
  }

  /**
   * 操作別の統計情報を取得
   */
  getStatsByOperation(): Record<string, ReturnType<typeof this.getStats>> {
    const operations = new Set(this.metrics.map(m => m.operation));
    const stats: Record<string, ReturnType<typeof this.getStats>> = {};

    for (const operation of operations) {
      stats[operation] = this.getStats(operation);
    }

    return stats;
  }

  /**
   * メトリクスをクリア
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * 最近のスローク��リを取得
   */
  getRecentSlowQueries(limit: number = 10): PerformanceMetrics[] {
    return this.metrics
      .filter(m => m.duration > this.slowQueryThreshold)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}

/**
 * グローバルパフォーマンスモニター（シングルトン）
 */
export const globalPerformanceMonitor = new PerformanceMonitor({
  maxMetrics: 1000,
  slowQueryThreshold: 100,
  enableLogging: process.env.NODE_ENV === 'development'
});

/**
 * パフォーマンス計測デコレータ
 * TypeScriptのメソッドデコレータとして使用
 */
export function measurePerformance(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = async function(...args: any[]) {
    const monitor = globalPerformanceMonitor;
    const operation = `${target.constructor.name}.${propertyKey}`;
    const metadata = {
      args: args.length > 0 ? args[0] : undefined // 最初の引数のみ記録（セキュリティ考慮）
    };

    const startTime = performance.now();
    let success = true;
    let error: string | undefined;

    try {
      const result = await originalMethod.apply(this, args);
      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const duration = performance.now() - startTime;
      
      monitor.recordMetric({
        operation,
        duration,
        timestamp: Date.now(),
        success,
        error,
        metadata
      });
    }
  };

  return descriptor;
}

/**
 * 非同期関数のパフォーマンスを計測するラッパー
 */
export async function withPerformanceMeasure<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const monitor = globalPerformanceMonitor;
  const startTime = performance.now();
  let success = true;
  let error: string | undefined;

  try {
    const result = await fn();
    return result;
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    const duration = performance.now() - startTime;
    
    monitor.recordMetric({
      operation,
      duration,
      timestamp: Date.now(),
      success,
      error,
      metadata
    });
  }
}