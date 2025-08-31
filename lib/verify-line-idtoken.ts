// /lib/verify-line-idtoken.ts
import * as jose from "jose";

/**
 * LINE Official constants for ID token verification
 */
const LINE_ISSUER = "https://access.line.me";
const LINE_JWKS_URL = "https://api.line.me/oauth2/v2.1/certs";

/**
 * Cached JWKS for ES256 verification (LIFF/SDK)
 * This reduces latency by not fetching JWKS on every verification
 */
const LINE_JWKS = jose.createRemoteJWKSet(new URL(LINE_JWKS_URL));

/**
 * LINE ID Token payload structure based on OpenID Connect standard
 */
export interface LineIdTokenPayload {
  iss: string;        // Issuer - always "https://access.line.me"
  sub: string;        // Subject - LINE User ID
  aud: string;        // Audience - LINE Channel ID
  exp: number;        // Expiration time (Unix timestamp)
  iat: number;        // Issued at time (Unix timestamp)
  nonce?: string;     // Nonce for replay protection
  name?: string;      // User display name (requires profile scope)
  picture?: string;   // User profile picture URL (requires profile scope)
  email?: string;     // User email (requires email scope)
}

/**
 * Verification options for ID token
 */
export interface VerificationOptions {
  channelId: string;        // LINE Channel ID for audience verification
  expectedNonce?: string;   // Expected nonce value for replay protection
  clockTolerance?: number;  // Clock skew tolerance in seconds (default: 60)
}

/**
 * Verify LINE ID Token according to official LINE Login specifications
 * 
 * LINE uses two different signing algorithms:
 * - Web Login: HS256 (HMAC with Channel Secret)
 * - LIFF/SDK: ES256 (Elliptic Curve with JWKS)
 * 
 * This function automatically detects the algorithm and uses appropriate verification method.
 * 
 * @param idToken JWT ID token from LINE
 * @param options Verification options including channelId and expectedNonce
 * @returns Verified payload if valid, throws error if invalid
 * @throws Error with descriptive message if verification fails
 */
export async function verifyLineIdToken(
  idToken: string,
  options: VerificationOptions
): Promise<LineIdTokenPayload> {
  const { channelId, expectedNonce, clockTolerance = 60 } = options;

  if (!idToken) {
    throw new Error("ID token is required");
  }

  if (!channelId) {
    throw new Error("Channel ID is required for verification");
  }

  try {
    // Decode the header to determine the signing algorithm
    const header = jose.decodeProtectedHeader(idToken);
    
    if (!header.alg) {
      throw new Error("ID token header missing algorithm");
    }

    let payload: jose.JWTPayload;

    switch (header.alg) {
      case "HS256":
        // Web Login: Verify with Channel Secret (HMAC-SHA256)
        payload = await verifyHS256Token(idToken, channelId, clockTolerance);
        break;

      case "ES256":
        // LIFF/SDK: Verify with JWKS (Elliptic Curve)
        payload = await verifyES256Token(idToken, channelId, clockTolerance);
        break;

      default:
        throw new Error(`Unsupported signing algorithm: ${header.alg}`);
    }

    // Cast to our expected payload structure
    const linePayload = payload as LineIdTokenPayload;

    // Verify LINE-specific claims
    await verifyLineClaims(linePayload, channelId, expectedNonce);

    return linePayload;

  } catch (error) {
    // Enhance error messages for better debugging
    if (error instanceof Error) {
      throw new Error(`ID token verification failed: ${error.message}`);
    }
    throw new Error("ID token verification failed with unknown error");
  }
}

/**
 * Verify HS256 signed ID token using Channel Secret
 * Used for Web Login flow
 */
async function verifyHS256Token(
  idToken: string,
  channelId: string,
  clockTolerance: number
): Promise<jose.JWTPayload> {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    throw new Error("LINE_CHANNEL_SECRET environment variable is required for HS256 verification");
  }

  const secret = new TextEncoder().encode(channelSecret);

  const { payload } = await jose.jwtVerify(idToken, secret, {
    issuer: LINE_ISSUER,
    audience: channelId,
    clockTolerance
  });

  return payload;
}

/**
 * Verify ES256 signed ID token using JWKS
 * Used for LIFF/SDK flow
 */
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

/**
 * Verify LINE-specific claims in the ID token payload
 */
async function verifyLineClaims(
  payload: LineIdTokenPayload,
  channelId: string,
  expectedNonce?: string
): Promise<void> {
  // Verify issuer
  if (payload.iss !== LINE_ISSUER) {
    throw new Error(`Invalid issuer: expected ${LINE_ISSUER}, got ${payload.iss}`);
  }

  // Verify audience
  if (payload.aud !== channelId) {
    throw new Error(`Invalid audience: expected ${channelId}, got ${payload.aud}`);
  }

  // Verify subject (LINE User ID) exists
  if (!payload.sub) {
    throw new Error("Missing subject (LINE User ID) in ID token");
  }

  // Verify nonce if provided (critical for replay protection)
  if (expectedNonce) {
    if (!payload.nonce) {
      throw new Error("Expected nonce in ID token but none found");
    }
    if (payload.nonce !== expectedNonce) {
      throw new Error(`Nonce mismatch: expected ${expectedNonce}, got ${payload.nonce}`);
    }
  }

  // Additional validation: check if required times are valid numbers
  if (typeof payload.exp !== "number" || payload.exp <= 0) {
    throw new Error("Invalid expiration time in ID token");
  }

  if (typeof payload.iat !== "number" || payload.iat <= 0) {
    throw new Error("Invalid issued at time in ID token");
  }
}

/**
 * Extract LINE User ID from verified ID token payload
 * Convenience function for common use case
 */
export function extractLineUserId(payload: LineIdTokenPayload): string {
  return payload.sub;
}

/**
 * Extract user profile information from verified ID token payload
 * Returns available profile data (name, picture, email)
 */
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

/**
 * Check if ID token is expired without full verification
 * Useful for quick expiration checks before expensive verification
 * 
 * @param idToken JWT ID token
 * @param clockTolerance Clock skew tolerance in seconds
 * @returns True if token is expired
 */
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