import type { ParallelTask, LogContext } from './types';
import * as Sentry from '@sentry/nextjs';

/**
 * 複数の非同期タスクを並列に実行するためのエンジンクラス。
 * クリティカルなタスクと非クリティカルなタスクの扱いを分け、
 * Sentryと連携してエラー監視を行う。
 */
export class ParallelTaskExecutor {
  /**
   * ParallelTaskExecutorのコンストラクタ
   * @param context LogContext - ログとメトリクス収集のためのコンテキスト情報
   */
  constructor(private context: LogContext) {}

  /**
   * 複数のタスクを並列に実行する。
   * いずれかのクリティカルタスクが失敗した場合、全体の処理を停止しエラーをスローする。
   * @param tasks ParallelTask[] - 実行するタスクの配列
   * @returns Promise<Map<string, any | Error>> - 各タスク名と実行結果（またはエラー）のマップ
   * @throws クリティカルタスクが失敗した場合にエラーをスロー
   */
  async executeParallel(tasks: ParallelTask[]): Promise<Map<string, any | Error>> {
    const results = new Map<string, any | Error>(); // タスク名と結果/エラーを格納するマップ
    
    console.log(`🚀 並列タスク実行開始: ${tasks.length}個のタスク (eventId: ${this.context.eventId})`, this.context);
    
    try {
      // すべてのタスクをPromiseとして非同期に実行開始
      const promises = tasks.map(async (task) => {
        const startTime = Date.now(); // タスク開始時刻
        
        try {
          console.log(`⚡ タスク開始: ${task.name}`, { ...this.context, taskName: task.name });
          const result = await task.operation(); // タスクの本体処理を実行
          
          const duration = Date.now() - startTime; // タスク処理時間
          console.log(`✅ タスク完了: ${task.name} (${duration}ms)`, { ...this.context, taskName: task.name, duration });
          
          results.set(task.name, result); // 結果をマップに格納
          return { task, result, error: null }; // タスク情報と結果を返す
        } catch (error) {
          const duration = Date.now() - startTime;
          console.error(`❌ タスク失敗: ${task.name} (${duration}ms)`, { ...this.context, taskName: task.name, duration, error });
          
          results.set(task.name, error as Error); // エラーをマップに格納
          Sentry.captureException(error, { // Sentryにエラーを送信
            tags: { ...this.context, taskName: task.name, critical: task.critical.toString() },
            extra: { taskDetails: task }
          });
          return { task, result: null, error: error as Error }; // タスク情報とエラーを返す
        }
      });

      // すべてのタスクの完了を待つ (Promise.all)
      const taskResults = await Promise.all(promises);
      
      // クリティカルなタスクの失敗をチェック
      const criticalFailures = taskResults.filter(
        ({ task, error }) => task.critical && error !== null
      );

      // クリティカルな失敗があれば、エラーをスローして全体の処理を中断
      if (criticalFailures.length > 0) {
        const failureMessages = criticalFailures.map(
          ({ task, error }) => `${task.name}: ${error?.message}`
        ).join(', ');
        
        const criticalError = new Error(
          `クリティカルタスクが失敗しました: ${failureMessages}`
        );
        
        // Sentryにクリティカルエラーとして送信
        Sentry.captureException(criticalError, {
          level: 'error',
          tags: {
            ...this.context,
            criticalFailures: criticalFailures.length.toString(),
            operation: 'parallel_critical_failure'
          },
          extra: { criticalFailuresDetails: criticalFailures.map(f => ({ name: f.task.name, error: f.error?.message })) }
        });
        
        throw criticalError;
      }

      // 実行結果のサマリーをログに出力
      const successCount = taskResults.filter(({ error }) => error === null).length;
      const failureCount = taskResults.filter(({ error }) => error !== null).length;
      console.log(`🎯 並列タスク実行完了: 成功=${successCount}, 失敗=${failureCount}`, { ...this.context, successCount, failureCount });
      
      return results;
      
    } catch (error) {
      // 並列処理全体の予期せぬエラー
      console.error('🚨 並列タスク実行で致命的エラー:', { ...this.context, error });
      
      Sentry.captureException(error, {
        level: 'fatal', // より深刻なエラーとして記録
        tags: {
          ...this.context,
          operation: 'parallel_execution_fatal',
        },
      });
      
      throw error; // エラーを再スロー
    }
  }

  /**
   * 非クリティカルなタスクのみを並列に実行する。
   * タスクの失敗は許容され、全体の処理は停止しない。
   * @param tasks ParallelTask[] - 実行するタスクの配列
   * @returns Promise<Map<string, any | null>> - 各タスク名と実行結果（またはnull）のマップ
   */
  async executeNonCriticalParallel(
    tasks: ParallelTask[]
  ): Promise<Map<string, any | null>> {
    // criticalフラグがfalseのタスクのみをフィルタリング
    const nonCriticalTasks = tasks.filter(task => !task.critical);
    const results = new Map<string, any | null>(); // 結果格納用マップ
    
    if (nonCriticalTasks.length === 0) {
      console.log('ℹ️ 実行対象の非クリティカルタスクはありません。', this.context);
      return results;
    }

    console.log(`🔄 非クリティカルタスク実行開始: ${nonCriticalTasks.length}個`, { ...this.context, taskCount: nonCriticalTasks.length });
    
    const promises = nonCriticalTasks.map(async (task) => {
      try {
        const result = await task.operation();
        results.set(task.name, result);
        console.log(`✅ 非クリティカルタスク完了: ${task.name}`, { ...this.context, taskName: task.name });
        return { task, success: true, result };
      } catch (error) {
        console.warn(`⚠️ 非クリティカルタスク失敗 (許容): ${task.name}`, { ...this.context, taskName: task.name, error });
        results.set(task.name, null); // 失敗時はnullを格納
        Sentry.captureException(error, { // Sentryには警告レベルで送信
          level: 'warning',
          tags: { ...this.context, taskName: task.name, critical: 'false' },
          extra: { taskDetails: task }
        });
        return { task, success: false, error };
      }
    });

    // Promise.allSettled を使用して、すべてのタスクの完了（成功または失敗）を待つ
    await Promise.allSettled(promises);
    console.log(`🏁 非クリティカルタスク実行完了。`, { ...this.context });
    return results;
  }
}

/**
 * ParallelTaskExecutorクラスのインスタンスを生成し、executeParallelメソッドを呼び出すヘルパー関数。
 * @param tasks ParallelTask[] - 実行するタスクの配列
 * @param context LogContext - ログとメトリクス収集のためのコンテキスト情報
 * @returns Promise<Map<string, any | Error>> - 各タスク名と実行結果（またはエラー）のマップ
 */
export async function executeInParallel(
  tasks: ParallelTask[],
  context: LogContext
): Promise<Map<string, any | Error>> {
  const executor = new ParallelTaskExecutor(context);
  return executor.executeParallel(tasks);
}

/**
 * ParallelTaskオブジェクトを簡単に作成するためのヘルパー関数。
 * @param name string - タスクの識別名
 * @param operation () => Promise<T> - 実行する非同期処理
 * @param critical boolean - このタスクがクリティカルかどうか (デフォルトはtrue)
 * @returns ParallelTask<T> - 生成されたタスクオブジェクト
 */
export function createTask<T = any>(
  name: string,
  operation: () => Promise<T>,
  critical = true
): ParallelTask<T> {
  return { name, operation, critical };
} 