import { SessionPayload } from '@/lib/types'

interface CachedSession {
  payload: SessionPayload
  timestamp: number
  expiresAt: number
}

class SessionCache {
  private static instance: SessionCache
  private cache: Map<string, CachedSession> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5分
  private cleanupInterval: NodeJS.Timeout | null = null

  private constructor() {
    // 定期的にキャッシュをクリーンアップ
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60 * 1000) // 1分ごと
  }

  static getInstance(): SessionCache {
    if (!SessionCache.instance) {
      SessionCache.instance = new SessionCache()
    }
    return SessionCache.instance
  }

  set(key: string, payload: SessionPayload, expiresAt?: number): void {
    const now = Date.now()
    this.cache.set(key, {
      payload,
      timestamp: now,
      expiresAt: expiresAt || now + this.CACHE_TTL,
    })
  }

  get(key: string): SessionPayload | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    const now = Date.now()
    if (cached.expiresAt < now) {
      this.cache.delete(key)
      return null
    }

    return cached.payload
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  invalidateAll(): void {
    this.cache.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt < now) {
        this.cache.delete(key)
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.cache.clear()
  }
}

// セッション検証の結果をキャッシュする関数
export async function getCachedSession(
  fetchSession: () => Promise<SessionPayload | null>
): Promise<SessionPayload | null> {
  const cache = SessionCache.getInstance()
  const cacheKey = 'current-session'

  // キャッシュから取得を試みる
  const cached = cache.get(cacheKey)
  if (cached) {
    return cached
  }

  // キャッシュにない場合はフェッチ
  const session = await fetchSession()
  if (session) {
    // JWTの有効期限を考慮してキャッシュ
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jwtPayload = session as any
    const expiresAt = jwtPayload.exp ? jwtPayload.exp * 1000 : undefined
    cache.set(cacheKey, session, expiresAt)
  }

  return session
}

// 顧客データのプリフェッチ
export async function prefetchCustomerData(
  customerUid: string,
  tenantId: string,
  orgId: string
): Promise<void> {
  try {
    // 並列でデータをプリフェッチ
    const [sessionRes, customerRes] = await Promise.all([
      fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      }),
      fetch(`/api/customer/${customerUid}`, {
        method: 'GET',
        headers: {
          'X-Tenant-Id': tenantId,
          'X-Org-Id': orgId,
        },
      }),
    ])

    // レスポンスを事前に解析してブラウザキャッシュに保存
    if (sessionRes.ok) await sessionRes.json()
    if (customerRes.ok) await customerRes.json()
  } catch (error) {
    // プリフェッチのエラーは無視（ベストエフォート）
    console.warn('[prefetchCustomerData] Prefetch error:', error)
  }
}

export default SessionCache