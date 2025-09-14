// /lib/line-oauth.ts
import crypto from "node:crypto";

/**
 * LINE OAuth フロー用の事前認証データ構造
 * 認可処理中は HttpOnly クッキーに保存される
 */
export type PreAuth = {
  ts: number;           // Timestamp (ms) when state was created
  cv: string;           // PKCE code_verifier
  nonce: string;        // OIDC nonce for replay protection
  next?: string;        // Safe redirect path after successful auth
  used?: boolean;       // Flag to prevent replay attacks
  tenantId?: string;    // Multi-tenant support
  orgId?: string;       // Organization ID for multi-tenant
};

// OAuth フローで使用する定数
export const OAUTH_COOKIE_PREFIX = "line_oauth_";

// 環境ごとの TTL 設定
const getOAuthTTLMinutes = (): number => {
  // Allow custom TTL via environment variable
  const customTTL = process.env.LINE_OAUTH_TTL_MINUTES;
  if (customTTL && !isNaN(Number(customTTL))) {
    return Number(customTTL);
  }
  
  // Default TTL based on environment
  return process.env.NODE_ENV === 'production' ? 20 : 30; // 20min prod, 30min dev
};

export const OAUTH_TTL_MS = getOAuthTTLMinutes() * 60 * 1000;

// 追加ログを出すデバッグモード
export const OAUTH_DEBUG_MODE = true;

/**
 * base64url 形式の暗号学的に安全な乱数文字列を生成
 * @param bytes 生成する乱数バイト数（既定: 32）
 * @returns base64url エンコード済み文字列
 */
export const randB64 = (bytes: number = 32): string => 
  crypto.randomBytes(bytes).toString("base64url");

/**
 * PKCE の code_verifier から S256 で code_challenge を生成
 * @param codeVerifier code_verifier 文字列
 * @returns base64url エンコード済みの SHA256 ハッシュ
 */
export const ccFromVerifier = (codeVerifier: string): string =>
  Buffer.from(
    crypto.createHash("sha256").update(codeVerifier, "utf8").digest()
  ).toString("base64url");

/**
 * next パラメータのサニタイズ／検証
 * オープンリダイレクト防止のため相対パスのみ許可
 * @param next ユーザー入力の next
 * @returns 安全な相対パス（またはデフォルト "/"）
 */
export function safeNext(next?: string): string {
  if (!next) return "/";
  // Allow only relative paths, reject protocol-relative URLs
  if (next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/";
}

/**
 * URL から state を抽出
 * 直接の `state` と、LIFF の `liff.state` の両方に対応
 * `liff.state` は `?key=value&state=...` の形式で埋め込まれるため安全に展開する
 * @param searchParams リクエストの URLSearchParams
 * @returns 見つかった state（なければ null）
 */
export function extractState(searchParams: URLSearchParams): string | null {
  // First, try direct state parameter
  const directState = searchParams.get("state");
  if (directState && isValidState(directState)) {
    if (OAUTH_DEBUG_MODE) {
      console.log('[LineOAuth:ExtractState] Found direct state parameter', {
        stateLength: directState.length,
        statePrefix: directState.substring(0, 8) + '...',
        isValid: isValidState(directState)
      })
    }
    return directState;
  }

  // Then, try LIFF-specific liff.state parameter
  const liffState = searchParams.get("liff.state");
  if (!liffState) {
    if (OAUTH_DEBUG_MODE) {
      console.log('[LineOAuth:ExtractState] No state parameter found', {
        hasDirectState: !!directState,
        directStateValid: directState ? isValidState(directState) : false,
        hasLiffState: false,
        allParams: Object.fromEntries(searchParams.entries())
      })
    }
    return null;
  }

  try {
    // Safely decode and parse liff.state
    const decoded = decodeURIComponent(liffState);
    // Remove leading "?" if present
    const queryString = decoded.startsWith("?") ? decoded.slice(1) : decoded;
    // Parse as URLSearchParams and extract state
    const innerParams = new URLSearchParams(queryString);
    const extractedState = innerParams.get("state");
    
    if (OAUTH_DEBUG_MODE) {
      console.log('[LineOAuth:ExtractState] Processed LIFF state parameter', {
        liffStateLength: liffState.length,
        decodedLength: decoded.length,
        queryStringLength: queryString.length,
        extractedState: extractedState?.substring(0, 8) + '...',
        isValidState: extractedState ? isValidState(extractedState) : false,
        innerParamsCount: Array.from(innerParams.keys()).length,
        innerKeys: Array.from(innerParams.keys())
      })
    }
    
    return extractedState && isValidState(extractedState) ? extractedState : null;
  } catch (error) {
    // If parsing fails, return null (don't throw to maintain security)
    if (OAUTH_DEBUG_MODE) {
      console.warn('[LineOAuth:ExtractState] Failed to parse liff.state parameter:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.name : typeof error,
        liffStateLength: liffState?.length,
        liffStatePrefix: liffState?.slice(0, 50) + '...',
      });
    }
    return null;
  }
}

/**
 * state の形式検証（base64url かつ最小長）
 */
export function isValidState(state?: string): boolean {
  if (!state) return false;
  // Base64url should only contain [A-Za-z0-9_-] and be at least 16 characters
  return /^[A-Za-z0-9_-]{16,}$/.test(state);
}

/** nonce の形式検証 */
export function isValidNonce(nonce?: string): boolean {
  if (!nonce) return false;
  return /^[A-Za-z0-9_-]{16,}$/.test(nonce);
}

/** PKCE（code_verifier/code_challenge）を生成 */
export function createPKCE() {
  const codeVerifier = randB64(32); // 256 bits of entropy
  const codeChallenge = ccFromVerifier(codeVerifier);
  
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: "S256" as const
  };
}

/** OAuth フロー用の PreAuth を生成 */
export function createPreAuth(options: Partial<PreAuth> = {}): {
  stateId: string;
  preAuth: PreAuth;
} {
  const stateId = randB64(16);
  const { codeVerifier } = createPKCE();
  const nonce = randB64(16);
  
  const preAuth: PreAuth = {
    ts: Date.now(),
    cv: codeVerifier,
    nonce,
    next: safeNext(options.next),
    tenantId: options.tenantId,
    orgId: options.orgId,
    used: false
  };

  return { stateId, preAuth };
}

// エラー分類を含む詳細な検証結果
export interface PreAuthValidationResult {
  isValid: boolean;
  error?: 'already_used' | 'expired' | 'missing_fields' | 'invalid_format' | 'malformed_data';
  details?: string;
  age?: number; // Age in milliseconds
  timeRemaining?: number; // Time remaining until expiration in milliseconds
}

/** 詳細な PreAuth 検証（エラー分類つき） */
export function validatePreAuthEnhanced(preAuth: PreAuth): PreAuthValidationResult {
  const now = Date.now()
  const age = now - preAuth.ts
  const timeRemaining = OAUTH_TTL_MS - age

  // 既使用チェック（リプレイ攻撃防止）
  if (preAuth.used) {
    if (OAUTH_DEBUG_MODE) {
      console.warn('[LineOAuth:ValidatePreAuth] State already used (replay attack protection)')
    }
    return {
      isValid: false,
      error: 'already_used',
      details: 'This authentication state has already been used',
      age,
      timeRemaining,
    }
  }

  // 期限切れチェック（時間情報付き）
  if (age > OAUTH_TTL_MS) {
    if (OAUTH_DEBUG_MODE) {
      console.warn('[LineOAuth:ValidatePreAuth] State expired:', {
        ageMinutes: Math.round(age / (60 * 1000)),
        ttlMinutes: Math.round(OAUTH_TTL_MS / (60 * 1000)),
        expiredAgo: Math.round((age - OAUTH_TTL_MS) / 1000) + 's',
      })
    }
    return {
      isValid: false,
      error: 'expired',
      details: `Authentication state expired ${Math.round((age - OAUTH_TTL_MS) / 1000)}s ago`,
      age,
      timeRemaining,
    }
  }

  // 必須フィールドの検証
  if (!preAuth.cv || !preAuth.nonce) {
    if (OAUTH_DEBUG_MODE) {
      console.warn('[LineOAuth:ValidatePreAuth] Missing required fields:', {
        hasCodeVerifier: !!preAuth.cv,
        hasNonce: !!preAuth.nonce,
      })
    }
    return {
      isValid: false,
      error: 'missing_fields',
      details: 'Missing required authentication parameters (code_verifier or nonce)',
      age,
      timeRemaining,
    }
  }

  // 重要フィールドの形式検証
  if (!isValidNonce(preAuth.nonce)) {
    if (OAUTH_DEBUG_MODE) {
      console.warn('[LineOAuth:ValidatePreAuth] Invalid nonce format')
    }
    return {
      isValid: false,
      error: 'invalid_format',
      details: 'Invalid nonce format',
      age,
      timeRemaining,
    }
  }

  // code_verifier の追加検証
  if (!preAuth.cv || preAuth.cv.length < 43 || preAuth.cv.length > 128) {
    if (OAUTH_DEBUG_MODE) {
      console.warn('[LineOAuth:ValidatePreAuth] Invalid code verifier length:', preAuth.cv?.length)
    }
    return {
      isValid: false,
      error: 'invalid_format',
      details: 'Invalid code verifier format',
      age,
      timeRemaining,
    }
  }

  if (OAUTH_DEBUG_MODE) {
    console.log('[LineOAuth:ValidatePreAuth] State validation successful:', {
      ageMinutes: Math.round(age / (60 * 1000)),
      remainingMinutes: Math.round(timeRemaining / (60 * 1000)),
    })
  }

  return {
    isValid: true,
    age,
    timeRemaining,
  }
}

/** 後方互換用の簡易検証（有効かつ未期限切れ） */
export function validatePreAuth(preAuth: PreAuth): boolean {
  return validatePreAuthEnhanced(preAuth).isValid
}

/**
 * 環境に応じた最適なクッキー設定を取得
 * 開発トンネル／localhost／本番に対応
 */
export function getOptimalCookieConfig(
  isProduction: boolean = process.env.NODE_ENV === 'production'
) {
  const config = {
    httpOnly: true,
    secure: isProduction,
    path: '/',
    maxAge: Math.floor(OAUTH_TTL_MS / 1000), // Convert to seconds
    sameSite: 'lax' as const,
  }

  // 開発環境ではトンネル（ngrok 等）を考慮
  if (!isProduction) {
    const host = typeof window !== 'undefined' ? window.location.hostname : ''

    // トンネル環境では SameSite の扱いを緩和
    if (
      host &&
      (host.includes('.ngrok.io') || host.includes('.tunnel.') || host.includes('.localhost.run'))
    ) {
      config.sameSite = 'lax'
      config.secure = true // Required for SameSite=None

      if (OAUTH_DEBUG_MODE) {
        console.log('[LineOAuth:CookieConfig] Tunnel environment detected, using SameSite=None', {
          host,
        })
      }
    }
  }

  if (OAUTH_DEBUG_MODE) {
    console.log('[LineOAuth:CookieConfig] Cookie configuration:', {
      ...config,
      maxAgeMinutes: Math.round(config.maxAge / 60),
      ttlMs: OAUTH_TTL_MS,
    })
  }

  return config
}

/** デバッグ用に OAuth 設定サマリーを返す */
export function getOAuthConfigSummary() {
  return {
    environment: process.env.NODE_ENV,
    cookiePrefix: OAUTH_COOKIE_PREFIX,
    customTTL: process.env.LINE_OAUTH_TTL_MINUTES,
    debugEnvVar: process.env.LINE_OAUTH_DEBUG,
    ttlMs: OAUTH_TTL_MS,
    ttlMinutes: Math.round(OAUTH_TTL_MS / (60 * 1000)),
    debugMode: OAUTH_DEBUG_MODE,
  }
}

/** LINE OAuth フロー用の拡張デバッグロガー（構造化・時刻付き） */
export class OAuthDebugLogger {
  private static instance: OAuthDebugLogger
  private sessionId: string
  private logs: Array<{
    timestamp: number
    level: 'info' | 'warn' | 'error' | 'debug'
    phase: string
    message: string
    data?: Record<string, unknown>
  }> = []

  constructor() {
    this.sessionId = `oauth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static getInstance(): OAuthDebugLogger {
    if (!OAuthDebugLogger.instance) {
      OAuthDebugLogger.instance = new OAuthDebugLogger()
    }
    return OAuthDebugLogger.instance
  }

  private log(
    level: 'info' | 'warn' | 'error' | 'debug',
    phase: string,
    message: string,
    data?: Record<string, unknown>
  ) {
    const timestamp = Date.now()
    const logEntry = { timestamp, level, phase, message, data }

    this.logs.push(logEntry)

    if (OAUTH_DEBUG_MODE) {
      const timeStr = new Date(timestamp).toISOString()
      const sessionStr = `[${this.sessionId.substring(6, 15)}]`
      const phaseStr = `[${phase}]`

      const logFn =
        level === 'error'
          ? console.error
          : level === 'warn'
            ? console.warn
            : level === 'debug'
              ? console.debug
              : console.log

      if (data) {
        logFn(`${timeStr} ${sessionStr} ${phaseStr} ${message}`, data)
      } else {
        logFn(`${timeStr} ${sessionStr} ${phaseStr} ${message}`)
      }
    }

    // Keep only last 100 logs to prevent memory leaks
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100)
    }
  }

  info(phase: string, message: string, data?: Record<string, unknown>) {
    this.log('info', phase, message, data)
  }

  warn(phase: string, message: string, data?: Record<string, unknown>) {
    this.log('warn', phase, message, data)
  }

  error(phase: string, message: string, data?: Record<string, unknown>) {
    this.log('error', phase, message, data)
  }

  debug(phase: string, message: string, data?: Record<string, unknown>) {
    this.log('debug', phase, message, data)
  }

  /** デバッグ用に全ログを取得 */
  getLogs() {
    return {
      sessionId: this.sessionId,
      totalLogs: this.logs.length,
      logs: this.logs,
      summary: {
        errors: this.logs.filter((l) => l.level === 'error').length,
        warnings: this.logs.filter((l) => l.level === 'warn').length,
        ...getOAuthConfigSummary(),
      },
    }
  }

  /** ログを整形文字列としてエクスポート */
  exportLogs(): string {
    const summary = this.getLogs()

    let output = `=== LINE OAuth Debug Report ===\n`
    output += `Session ID: ${summary.sessionId}\n`
    output += `Total Logs: ${summary.totalLogs}\n`
    output += `Errors: ${summary.summary.errors}, Warnings: ${summary.summary.warnings}\n`
    output += `Debug Mode: ${summary.summary.debugMode}\n`
    output += `Environment: ${summary.summary.environment}\n`
    output += `TTL: ${summary.summary.ttlMinutes} minutes\n`
    output += `Timestamp: ${new Date().toISOString()}\n\n`

    summary.logs.forEach((log, index) => {
      const timeStr = new Date(log.timestamp).toISOString()
      output += `[${index + 1}] ${timeStr} [${log.level.toUpperCase()}] [${log.phase}] ${log.message}\n`
      if (log.data) {
        output += `    Data: ${JSON.stringify(log.data, null, 2)}\n`
      }
      output += '\n'
    })

    return output
  }

  /** 全ログをクリア（テスト用） */
  clearLogs() {
    this.logs = []
  }
}

// 使いやすいようにシングルトンをエクスポート
export const debugLogger = OAuthDebugLogger.getInstance();
