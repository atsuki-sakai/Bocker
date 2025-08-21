/**
 * Supabase用のインメモリキャッシュユーティリティ
 * TTL（Time To Live）機能付きで、一定時間後に自動的にキャッシュをクリアします
 */

export interface CacheOptions {
  /** キャッシュの有効期限（ミリ秒） */
  ttl?: number
  /** キャッシュの最大エントリ数 */
  maxSize?: number
  /** キャッシュヒット/ミスのログを出力するか */
  enableLogging?: boolean
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  hitCount: number
}

export class MemoryCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>()
  private readonly ttl: number
  private readonly maxSize: number
  private readonly enableLogging: boolean
  private hitCount = 0
  private missCount = 0

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl ?? 5 * 60 * 1000 // デフォルト5分
    this.maxSize = options.maxSize ?? 1000 // デフォルト1000エントリ
    this.enableLogging = options.enableLogging ?? false
  }

  /**
   * キャッシュから値を取得
   */
  get(key: string): T | null {
    // Lazy cleanup: 期限切れエントリをクリーンアップ
    this.cleanupExpiredEntries()

    const entry = this.cache.get(key)

    if (!entry) {
      this.missCount++
      if (this.enableLogging) {
        console.log(`[Cache] MISS: ${key}`)
      }
      return null
    }

    // TTLチェック
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      this.missCount++
      if (this.enableLogging) {
        console.log(`[Cache] EXPIRED: ${key}`)
      }
      return null
    }

    // ヒットカウントを更新
    entry.hitCount++
    this.hitCount++

    if (this.enableLogging) {
      console.log(`[Cache] HIT: ${key} (hits: ${entry.hitCount})`)
    }

    return entry.data
  }

  /**
   * キャッシュに値を設定
   */
  set(key: string, data: T): void {
    // 最大サイズチェック
    if (this.cache.size >= this.maxSize) {
      // LRU: 最も古いエントリを削除
      const oldestKey = this.findOldestEntry()
      if (oldestKey) {
        this.cache.delete(oldestKey)
        if (this.enableLogging) {
          console.log(`[Cache] EVICTED: ${oldestKey} (size limit)`)
        }
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hitCount: 0,
    })

    if (this.enableLogging) {
      console.log(`[Cache] SET: ${key}`)
    }
  }

  /**
   * キャッシュから特定のキーを削除
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key)
    if (this.enableLogging && result) {
      console.log(`[Cache] DELETE: ${key}`)
    }
    return result
  }

  /**
   * キャッシュを完全にクリア
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    this.hitCount = 0
    this.missCount = 0

    if (this.enableLogging) {
      console.log(`[Cache] CLEAR: ${size} entries removed`)
    }
  }

  /**
   * キャッシュ統計情報を取得
   */
  getStats() {
    const hitRate =
      this.hitCount + this.missCount > 0
        ? (this.hitCount / (this.hitCount + this.missCount)) * 100
        : 0

    return {
      size: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: hitRate.toFixed(2) + '%',
      maxSize: this.maxSize,
      ttl: this.ttl,
    }
  }

  /**
   * パターンにマッチするキーを削除
   */
  deletePattern(pattern: RegExp): number {
    let deletedCount = 0

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key)
        deletedCount++
      }
    }

    if (this.enableLogging && deletedCount > 0) {
      console.log(`[Cache] DELETE_PATTERN: ${deletedCount} entries removed`)
    }

    return deletedCount
  }

  /**
   * 非同期関数の結果をキャッシュするラッパー
   */
  async wrap<R>(key: string, fn: () => Promise<R>): Promise<R> {
    // キャッシュチェック
    const cached = this.get(key)
    if (cached !== null) {
      return cached as R
    }

    // キャッシュミスの場合、関数を実行
    const result = await fn()

    // 結果をキャッシュ（型アサーション追加）
    this.set(key, result as T)

    return result
  }

  /**
   * 最も古いエントリのキーを見つける
   */
  private findOldestEntry(): string | null {
    let oldestKey: string | null = null
    let oldestTimestamp = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp
        oldestKey = key
      }
    }

    return oldestKey
  }

  /**
   * 期限切れエントリをクリーンアップ（lazy cleanup）
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now()
    let cleanedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key)
        cleanedCount++
      }
    }

    if (this.enableLogging && cleanedCount > 0) {
      console.log(`[Cache] CLEANUP: ${cleanedCount} expired entries removed`)
    }
  }
}

/**
 * グローバルキャッシュインスタンス（シングルトン）
 */
let _globalCache: MemoryCache | null = null

export function getGlobalCache(): MemoryCache {
  if (!_globalCache) {
    _globalCache = new MemoryCache({
      ttl: 5 * 60 * 1000, // 5分
      maxSize: 1000, // 1000エントリ
      enableLogging: process.env.NODE_ENV === 'development',
    })
  }
  return _globalCache
}

/**
 * キャッシュキー生成ヘルパー
 */
export function createCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}:${JSON.stringify(params[key])}`)
    .join('|')

  return `${prefix}:${sortedParams}`
}