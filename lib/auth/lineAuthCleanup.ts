import type { Liff } from '@line/liff'

/**
 * LINE認証関連のクリーンアップ処理
 * 古いクッキーやセッション情報を削除
 */
export async function cleanupLineAuthState(): Promise<void> {
  try {
    // サーバー側でクッキーを削除
    const response = await fetch('/api/auth/line-state/cleanup', {
      method: 'POST',
      credentials: 'include',
    })
    
    if (!response.ok) {
      console.warn('[cleanupLineAuthState] Failed to cleanup server-side:', response.status)
    }
    
    // クライアント側のローカルストレージもクリーンアップ
    if (typeof window !== 'undefined') {
      // LINE LIFF関連のローカルストレージをクリア
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('liff') || key.includes('line'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
    }
    
    console.log('[cleanupLineAuthState] Cleanup completed')
  } catch (error) {
    console.error('[cleanupLineAuthState] Error during cleanup:', error)
  }
}

/**
 * JWTトークンの有効期限を取得（秒単位）
 */
export function getTokenExpiry(idToken: string | null): number | null {
  if (!idToken) return null
  
  try {
    const payload = idToken.split('.')[1]
    const decodedPayload = JSON.parse(atob(payload))
    return decodedPayload.exp || null
  } catch (error) {
    console.error('[getTokenExpiry] Error decoding token:', error)
    return null
  }
}

/**
 * LINEトークンの有効性を事前チェック
 */
export async function isLineTokenValid(idToken: string | null): Promise<boolean> {
  if (!idToken) return false
  
  try {
    const expiryTime = getTokenExpiry(idToken)
    if (!expiryTime) return false
    
    // 有効期限をチェック（exp は秒単位）
    const currentTime = Math.floor(Date.now() / 1000)
    
    // 有効期限の10秒前には無効と判定（バッファを持たせる）
    return currentTime < (expiryTime - 10)
  } catch (error) {
    console.error('[isLineTokenValid] Error checking token validity:', error)
    return false
  }
}

/**
 * LINEトークンの残り有効時間を取得（ミリ秒単位）
 */
export function getTokenRemainingTime(idToken: string | null): number {
  const expiryTime = getTokenExpiry(idToken)
  if (!expiryTime) return 0
  
  const currentTime = Math.floor(Date.now() / 1000)
  const remainingSeconds = expiryTime - currentTime
  
  return Math.max(0, remainingSeconds * 1000)
}

/**
 * LINEトークンをリフレッシュ
 */
export async function refreshLineToken(liff: Liff | null): Promise<string | null> {
  if (!liff || !liff.isLoggedIn()) {
    console.warn('[refreshLineToken] User not logged in')
    return null
  }
  
  try {
    console.log('[refreshLineToken] Attempting to refresh LINE token...')
    
    // LIFFの仕様上、getIDToken()を再度呼ぶことで新しいトークンが取得できる
    const newToken = liff.getIDToken()
    
    if (newToken && await isLineTokenValid(newToken)) {
      console.log('[refreshLineToken] Successfully refreshed token')
      return newToken
    }
    
    // トークンが取得できない、または無効な場合は再ログインが必要
    console.warn('[refreshLineToken] Failed to get valid token, re-login required')
    return null
  } catch (error) {
    console.error('[refreshLineToken] Error refreshing token:', error)
    return null
  }
}