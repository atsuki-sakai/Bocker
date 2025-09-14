export const LOGIN_SESSION_KEY = 'bocker_login_session'

// LINE OAuth state parameter用の定数
export const LINE_STATE_SESSION_KEY = 'bocker_line_state'
// 新しいOAuth 2.1システムと同じTTLに統一 (本番: 20分, 開発: 30分)
const getLineStateTTLMs = (): number => {
  // Allow custom TTL via environment variable
  const customTTL = process.env.LINE_OAUTH_TTL_MINUTES
  if (customTTL && !isNaN(Number(customTTL))) {
    return Number(customTTL) * 60 * 1000
  }
  
  // Default TTL based on environment (same as OAuth 2.1 system)
  return process.env.NODE_ENV === 'production' ? 20 * 60 * 1000 : 30 * 60 * 1000 // 20min prod, 30min dev
}
export const LINE_STATE_EXPIRY_MS = getLineStateTTLMs()

// 弊社のLINEチャンネル情報（サロン通知用）
export const COMPANY_LINE_CHANNEL = {
  CHANNEL_ID: '2007644530',
  // Access Token は環境変数から取得（送信に必須）
  ACCESS_TOKEN: process.env.COMPANY_LINE_CHANNEL_ACCESS_TOKEN,
  // Channel Secret は署名検証用（送信には不要）
  CHANNEL_SECRET: process.env.COMPANY_LINE_CHANNEL_SECRET,
} as const
