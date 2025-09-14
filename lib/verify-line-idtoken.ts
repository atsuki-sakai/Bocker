// /lib/verify-line-idtoken.ts
import * as jose from "jose";

/** LINE IDトークン検証に使用するLINE公式定数 */
const LINE_ISSUER = "https://access.line.me";
const LINE_JWKS_URL = "https://api.line.me/oauth2/v2.1/certs";

/** ES256 検証用の JWKS（LIFF/SDK）をキャッシュ */
const LINE_JWKS = jose.createRemoteJWKSet(new URL(LINE_JWKS_URL));

/** OpenID Connect に基づく LINE ID トークンのペイロード構造 */
export interface LineIdTokenPayload {
  iss: string;        // 発行者（常に "https://access.line.me"）
  sub: string;        // サブジェクト（LINEユーザーID）
  aud: string;        // 受信者（LINE チャンネルID）
  exp: number;        // 有効期限（Unix 時刻）
  iat: number;        // 発行時刻（Unix 時刻）
  nonce?: string;     // リプレイ攻撃対策の nonce
  name?: string;      // 表示名（profile スコープが必要）
  picture?: string;   // プロフィール画像URL（profile スコープが必要）
  email?: string;     // メール（email スコープが必要）
}

/** IDトークン検証のオプション */
export interface VerificationOptions {
  channelId: string;        // 受信者検証用の LINE チャンネルID
  expectedNonce?: string;   // 期待する nonce 値（リプレイ対策）
  clockTolerance?: number;  // 時刻ずれ許容秒（既定: 60）
  channelSecret?: string;   // HS256 検証に使うチャンネルシークレット（DB由来）
}

/**
 * 公式仕様に基づき LINE の IDトークンを検証
 * - Web Login: HS256（チャンネルシークレット）
 * - LIFF/SDK : ES256（JWKS）
 * 署名アルゴリズムを自動判別して適切に検証する。
 */
export async function verifyLineIdToken(
  idToken: string,
  options: VerificationOptions
): Promise<LineIdTokenPayload> {
  const { channelId, expectedNonce, clockTolerance = 60, channelSecret } = options;

  if (!idToken) {
    throw new Error("ID token is required");
  }

  if (!channelId) {
    throw new Error("Channel ID is required for verification");
  }

  try {
    // 署名アルゴリズム判定のためヘッダをデコード
    const header = jose.decodeProtectedHeader(idToken);
    
    if (!header.alg) {
      throw new Error("ID token header missing algorithm");
    }

    let payload: jose.JWTPayload;

    switch (header.alg) {
      case "HS256":
        // Web Login: チャンネルシークレットで検証（HMAC-SHA256）
        payload = await verifyHS256Token(idToken, channelId, clockTolerance, channelSecret);
        break;

      case "ES256":
        // LIFF/SDK: JWKS で検証（楕円曲線）
        payload = await verifyES256Token(idToken, channelId, clockTolerance);
        break;

      default:
        throw new Error(`Unsupported signing algorithm: ${header.alg}`);
    }

    // 期待するペイロード構造にキャスト
    const linePayload = payload as LineIdTokenPayload;

    // LINE 固有クレームの検証
    await verifyLineClaims(linePayload, channelId, expectedNonce);

    return linePayload;

  } catch (error) {
    // デバッグ容易化のためエラーメッセージを整形
    if (error instanceof Error) {
      throw new Error(`ID token verification failed: ${error.message}`);
    }
    throw new Error("ID token verification failed with unknown error");
  }
}

/** HS256 署名 IDトークンをチャンネルシークレットで検証（Web Login 用） */
async function verifyHS256Token(
  idToken: string,
  channelId: string,
  clockTolerance: number,
  providedChannelSecret?: string
): Promise<jose.JWTPayload> {
  const channelSecret = providedChannelSecret ?? process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    throw new Error("LINE channel secret is required for HS256 verification");
  }

  const secret = new TextEncoder().encode(channelSecret);

  const { payload } = await jose.jwtVerify(idToken, secret, {
    issuer: LINE_ISSUER,
    audience: channelId,
    clockTolerance
  });

  return payload;
}

/** ES256 署名 IDトークンを JWKS で検証（LIFF/SDK 用） */
async function verifyES256Token(
  idToken: string,
  channelId: string,
  clockTolerance: number
): Promise<jose.JWTPayload> {
  const { payload } = await jose.jwtVerify(idToken, LINE_JWKS, {
    issuer: LINE_ISSUER,
    audience: channelId,
    clockTolerance
  });

  return payload;
}

/** IDトークンの LINE 固有クレームを検証 */
async function verifyLineClaims(
  payload: LineIdTokenPayload,
  channelId: string,
  expectedNonce?: string
): Promise<void> {
  // 発行者検証
  if (payload.iss !== LINE_ISSUER) {
    throw new Error(`Invalid issuer: expected ${LINE_ISSUER}, got ${payload.iss}`);
  }

  // 受信者検証
  if (payload.aud !== channelId) {
    throw new Error(`Invalid audience: expected ${channelId}, got ${payload.aud}`);
  }

  // サブジェクト（LINEユーザーID）の存在確認
  if (!payload.sub) {
    throw new Error("Missing subject (LINE User ID) in ID token");
  }

  // nonce があれば検証（リプレイ対策）
  if (expectedNonce) {
    if (!payload.nonce) {
      throw new Error("Expected nonce in ID token but none found");
    }
    if (payload.nonce !== expectedNonce) {
      throw new Error(`Nonce mismatch: expected ${expectedNonce}, got ${payload.nonce}`);
    }
  }

  // 追加: exp/iat の数値検証
  if (typeof payload.exp !== "number" || payload.exp <= 0) {
    throw new Error("Invalid expiration time in ID token");
  }

  if (typeof payload.iat !== "number" || payload.iat <= 0) {
    throw new Error("Invalid issued at time in ID token");
  }
}

/** 検証済みペイロードから LINE ユーザーIDを取り出すユーティリティ */
export function extractLineUserId(payload: LineIdTokenPayload): string {
  return payload.sub;
}

/** 検証済みペイロードからプロフィール情報（name/picture/email）を抽出 */
export function extractUserProfile(payload: LineIdTokenPayload): {
  lineUserId: string;
  name?: string;
  picture?: string;
  email?: string;
} {
  return {
    lineUserId: payload.sub,
    name: payload.name,
    picture: payload.picture,
    email: payload.email
  };
}

/** 完全検証なしで IDトークンの期限切れを簡易チェック */
export function isIdTokenExpired(idToken: string, clockTolerance: number = 60): boolean {
  try {
    const payload = jose.decodeJwt(idToken);
    
    if (typeof payload.exp !== "number") {
      return true; // Consider invalid exp as expired
    }

    const now = Math.floor(Date.now() / 1000);
    return payload.exp < (now - clockTolerance);
    
  } catch {
    return true; // Consider malformed token as expired
  }
}
