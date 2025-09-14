/**
 * 完全ログアウト処理（セッション削除 + LINEログアウト）
 */
export function performCompleteLogout(): void {
  console.log('[Logout] 完全ログアウト処理を開始...')
  
  // 1. セッションクッキーを削除
  document.cookie = 'bocker_login_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
  console.log('[Logout] セッションクッキーを削除しました')
  
  // 2. LINEからもログアウト（LIFF環境の場合）
  if (typeof window !== 'undefined' && window.liff) {
    try {
      if (window.liff.isLoggedIn && window.liff.isLoggedIn()) {
        console.log('[Logout] LIFFからログアウトします...')
        window.liff.logout?.()
      }
    } catch (error) {
      console.warn('[Logout] LIFF logout failed:', error)
    }
  }
  
  // 3. LINE access tokenも削除
  localStorage.removeItem('line_access_token')
  sessionStorage.removeItem('line_access_token')
  console.log('[Logout] LINE access tokenを削除しました')
  
  // 4. その他の認証関連データも削除
  localStorage.removeItem('line_ctx_tid')
  localStorage.removeItem('line_ctx_oid')
  sessionStorage.removeItem('line_ctx_tid')
  sessionStorage.removeItem('line_ctx_oid')
  
  console.log('[Logout] 完全ログアウト処理が完了しました')
}

/**
 * セッションクッキーの存在確認
 */
export function hasSessionCookie(): boolean {
  return document.cookie.includes('bocker_login_session=')
}

/**
 * LINEログイン状態の確認
 */
export function isLineLoggedIn(): boolean {
  try {
    if (typeof window !== 'undefined' && window.liff && window.liff.isLoggedIn) {
      return window.liff.isLoggedIn()
    }
  } catch (error) {
    console.warn('[Auth] LINE login status check failed:', error)
  }
  return false
}
