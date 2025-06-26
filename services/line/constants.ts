export const LOGIN_SESSION_KEY = 'bocker_login_session'

// LINE OAuth state parameter用の定数
export const LINE_STATE_SESSION_KEY = 'bocker_line_state'
export const LINE_STATE_EXPIRY_MS = 10 * 60 * 1000 // 10分間有効

// 弊社のLINEチャンネル情報（サロン通知用）
export const COMPANY_LINE_CHANNEL = {
  CHANNEL_ID: '2007644530',
  // Access Token は環境変数から取得（送信に必須）
  ACCESS_TOKEN: process.env.COMPANY_LINE_CHANNEL_ACCESS_TOKEN,
  // Channel Secret は署名検証用（送信には不要）
  CHANNEL_SECRET: process.env.COMPANY_LINE_CHANNEL_SECRET,
} as const
