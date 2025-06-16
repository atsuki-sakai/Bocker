/**
 * 移行処理のパフォーマンスモニタリング設定
 */

export interface MigrationMetrics {
  // 処理時間メトリクス
  totalDuration: number;          // 全体の処理時間（ms）
  convexQueryTime: number;        // Convexクエリの累積時間
  supabaseInsertTime: number;     // Supabaseインサートの累積時間
  convexDeleteTime: number;       // Convex削除の累積時間
  
  // データ量メトリクス
  totalRecordsProcessed: number;  // 処理したレコード数
  totalRecordsMigrated: number;   // 移行成功したレコード数
  totalRecordsDeleted: number;    // Convexから削除したレコード数
  totalRecordsFailed: number;     // 移行失敗したレコード数
  
  // バッチ処理メトリクス
  batchCount: number;             // 実行したバッチ数
  averageBatchSize: number;       // 平均バッチサイズ
  maxBatchProcessTime: number;    // 最大バッチ処理時間
  
  // エラーメトリクス
  errorCount: number;             // エラー発生回数
  errorTypes: Record<string, number>; // エラータイプ別の集計
  
  // リソース使用量（可能な場合）
  peakMemoryUsage?: number;       // ピークメモリ使用量（MB）
  avgCpuUsage?: number;          // 平均CPU使用率（%）
}

/**
 * パフォーマンストラッカークラス
 */
export class MigrationPerformanceTracker {
  private metrics: MigrationMetrics;
  private startTime: number;
  private batchStartTimes: number[] = [];
  
  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      totalDuration: 0,
      convexQueryTime: 0,
      supabaseInsertTime: 0,
      convexDeleteTime: 0,
      totalRecordsProcessed: 0,
      totalRecordsMigrated: 0,
      totalRecordsDeleted: 0,
      totalRecordsFailed: 0,
      batchCount: 0,
      averageBatchSize: 0,
      maxBatchProcessTime: 0,
      errorCount: 0,
      errorTypes: {}
    };
  }
  
  /**
   * Convexクエリ時間を記録
   */
  trackConvexQuery(duration: number) {
    this.metrics.convexQueryTime += duration;
  }
  
  /**
   * Supabaseインサート時間を記録
   */
  trackSupabaseInsert(duration: number) {
    this.metrics.supabaseInsertTime += duration;
  }
  
  /**
   * Convex削除時間を記録
   */
  trackConvexDelete(duration: number) {
    this.metrics.convexDeleteTime += duration;
  }
  
  /**
   * バッチ処理開始
   */
  startBatch() {
    this.batchStartTimes.push(Date.now());
    this.metrics.batchCount++;
  }
  
  /**
   * バッチ処理完了
   */
  endBatch(recordsProcessed: number) {
    const batchDuration = Date.now() - this.batchStartTimes.pop()!;
    this.metrics.maxBatchProcessTime = Math.max(
      this.metrics.maxBatchProcessTime, 
      batchDuration
    );
    this.metrics.totalRecordsProcessed += recordsProcessed;
  }
  
  /**
   * 成功レコードを記録
   */
  trackSuccess(migrated: number, deleted: number) {
    this.metrics.totalRecordsMigrated += migrated;
    this.metrics.totalRecordsDeleted += deleted;
  }
  
  /**
   * エラーを記録
   */
  trackError(error: Error, recordCount: number) {
    this.metrics.errorCount++;
    this.metrics.totalRecordsFailed += recordCount;
    
    const errorType = error.constructor.name;
    this.metrics.errorTypes[errorType] = 
      (this.metrics.errorTypes[errorType] || 0) + 1;
  }
  
  /**
   * 最終的なメトリクスを取得
   */
  getMetrics(): MigrationMetrics {
    this.metrics.totalDuration = Date.now() - this.startTime;
    
    if (this.metrics.batchCount > 0) {
      this.metrics.averageBatchSize = 
        this.metrics.totalRecordsProcessed / this.metrics.batchCount;
    }
    
    // Node.js環境でのメモリ使用量取得
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.metrics.peakMemoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
    }
    
    return { ...this.metrics };
  }
  
  /**
   * メトリクスをログ出力
   */
  logMetrics() {
    const metrics = this.getMetrics();
    console.log('\n========== Migration Performance Report ==========');
    console.log(`Total Duration: ${metrics.totalDuration}ms`);
    console.log(`Records Processed: ${metrics.totalRecordsProcessed}`);
    console.log(`Records Migrated: ${metrics.totalRecordsMigrated}`);
    console.log(`Records Deleted: ${metrics.totalRecordsDeleted}`);
    console.log(`Records Failed: ${metrics.totalRecordsFailed}`);
    console.log(`\nBatch Statistics:`);
    console.log(`- Batch Count: ${metrics.batchCount}`);
    console.log(`- Average Batch Size: ${metrics.averageBatchSize.toFixed(2)}`);
    console.log(`- Max Batch Process Time: ${metrics.maxBatchProcessTime}ms`);
    console.log(`\nTime Breakdown:`);
    console.log(`- Convex Query Time: ${metrics.convexQueryTime}ms`);
    console.log(`- Supabase Insert Time: ${metrics.supabaseInsertTime}ms`);
    console.log(`- Convex Delete Time: ${metrics.convexDeleteTime}ms`);
    
    if (metrics.errorCount > 0) {
      console.log(`\nErrors: ${metrics.errorCount}`);
      console.log('Error Types:', metrics.errorTypes);
    }
    
    if (metrics.peakMemoryUsage) {
      console.log(`\nPeak Memory Usage: ${metrics.peakMemoryUsage.toFixed(2)}MB`);
    }
    console.log('==================================================\n');
  }
}

/**
 * Supabase側のモニタリング設定
 * 
 * 以下のメトリクスをSupabase側で監視：
 * 1. reservation, reservation_detailテーブルの行数増加
 * 2. インサート処理のレイテンシ
 * 3. データベース接続数
 * 4. ストレージ使用量
 */
export const SUPABASE_MONITORING_QUERIES = {
  // 日次移行レコード数の確認
  dailyMigrationCount: `
    SELECT 
      DATE(created_at) as migration_date,
      COUNT(*) as records_migrated
    FROM reservation
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(created_at)
    ORDER BY migration_date DESC;
  `,
  
  // 移行エラーの確認
  migrationErrors: `
    SELECT 
      _convex_id,
      created_at,
      status
    FROM reservation
    WHERE created_at >= NOW() - INTERVAL '1 day'
      AND (_convex_id IS NULL OR created_at IS NULL)
    LIMIT 100;
  `,
  
  // テーブルサイズの監視
  tableSize: `
    SELECT 
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
      pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
    FROM pg_tables
    WHERE tablename IN ('reservation', 'reservation_detail')
    ORDER BY size_bytes DESC;
  `,
  
  // インデックス使用状況
  indexUsage: `
    SELECT 
      schemaname,
      tablename,
      indexname,
      idx_scan,
      idx_tup_read,
      idx_tup_fetch
    FROM pg_stat_user_indexes
    WHERE tablename IN ('reservation', 'reservation_detail')
    ORDER BY idx_scan DESC;
  `
};

/**
 * アラート設定の推奨値
 */
export const ALERT_THRESHOLDS = {
  // 処理時間アラート
  maxTotalDuration: 3600000,        // 1時間（ms）
  maxBatchProcessTime: 60000,       // 1分（ms）
  
  // エラー率アラート
  maxErrorRate: 0.01,               // 1%
  maxConsecutiveErrors: 5,          // 連続エラー数
  
  // パフォーマンスアラート
  minRecordsPerSecond: 10,          // 最小処理速度
  maxMemoryUsageMB: 1024,           // 最大メモリ使用量（1GB）
  
  // Supabase側アラート
  maxInsertLatencyMs: 1000,         // 最大インサートレイテンシ
  maxConnectionCount: 50,           // 最大同時接続数
  maxStorageGrowthGB: 10            // 日次最大ストレージ増加量
};

/**
 * 監視ダッシュボード用のメトリクス取得関数
 */
export async function getMigrationDashboardMetrics(
  supabase: any,
  convexClient: any
): Promise<{
  lastMigrationMetrics: MigrationMetrics | null;
  supabaseStats: any;
  convexStats: any;
  healthStatus: 'healthy' | 'warning' | 'critical';
}> {
  // 実装は省略（実際のダッシュボードツールに依存）
  return {
    lastMigrationMetrics: null,
    supabaseStats: {},
    convexStats: {},
    healthStatus: 'healthy'
  };
}
