// /lib/line-oauth.ts
import crypto from "node:crypto";

/**
 * Pre-authorization data structure for LINE OAuth flow
 * Stored in HttpOnly cookie during authorization process
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

// Constants for OAuth flow
export const OAUTH_COOKIE_PREFIX = "line_oauth_";
export const OAUTH_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL for state cookies

/**
 * Generate cryptographically secure random string in base64url format
 * @param bytes Number of random bytes to generate (default: 32)
 * @returns Base64url encoded random string
 */
export const randB64 = (bytes: number = 32): string => 
  crypto.randomBytes(bytes).toString("base64url");

/**
 * Generate PKCE code_challenge from code_verifier using S256 method
 * @param codeVerifier The code_verifier string
 * @returns Base64url encoded SHA256 hash of code_verifier
 */
export const ccFromVerifier = (codeVerifier: string): string =>
  Buffer.from(
    crypto.createHash("sha256").update(codeVerifier, "utf8").digest()
  ).toString("base64url");

/**
 * Sanitize and validate next URL parameter
 * Only allows relative paths to prevent open redirect attacks
 * @param next Raw next parameter from user input
 * @returns Safe relative path or default "/"
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
 * Extract state parameter from URL search params
 * Handles both direct state parameter and LIFF-specific liff.state parameter
 * 
 * LIFF may embed state in liff.state as "?key=value&state=abc123" format
 * This function safely extracts the state value from both formats
 * 
 * @param searchParams URLSearchParams object from request
 * @returns Extracted state value or null if not found
 */
export function extractState(searchParams: URLSearchParams): string | null {
  // First, try direct state parameter
  const directState = searchParams.get("state");
  if (directState) {
    return directState;
  }

  // Then, try LIFF-specific liff.state parameter
  const liffState = searchParams.get("liff.state");
  if (!liffState) {
    return null;
  }

  try {
    // Safely decode and parse liff.state
    const decoded = decodeURIComponent(liffState);
    // Remove leading "?" if present
    const queryString = decoded.startsWith("?") ? decoded.slice(1) : decoded;
    // Parse as URLSearchParams and extract state
    const innerParams = new URLSearchParams(queryString);
    return innerParams.get("state");
  } catch (error) {
    // If parsing fails, return null (don't throw to maintain security)
    console.warn("Failed to parse liff.state parameter:", error);
    return null;
  }
}

/**
 * Validate that a string is a valid state ID
 * Should be base64url format with minimum length
 * @param state State string to validate
 * @returns True if valid state format
 */
export function isValidState(state?: string): boolean {
  if (!state) return false;
  // Base64url should only contain [A-Za-z0-9_-] and be at least 16 characters
  return /^[A-Za-z0-9_-]{16,}$/.test(state);
}

/**
 * Validate that a string is a valid nonce
 * @param nonce Nonce string to validate
 * @returns True if valid nonce format
 */
export function isValidNonce(nonce?: string): boolean {
  if (!nonce) return false;
  return /^[A-Za-z0-9_-]{16,}$/.test(nonce);
}

/**
 * Create PKCE parameters for OAuth authorization request
 * @returns Object containing code_verifier and code_challenge
 */
export function createPKCE() {
  const codeVerifier = randB64(32); // 256 bits of entropy
  const codeChallenge = ccFromVerifier(codeVerifier);
  
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: "S256" as const
  };
}

/**
 * Generate complete PreAuth object for OAuth flow
 * @param options Optional parameters for PreAuth
 * @returns Complete PreAuth object ready for cookie storage
 */
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

/**
 * Validate PreAuth object integrity and expiration
 * @param preAuth PreAuth object from cookie
 * @returns True if valid and not expired
 */
export function validatePreAuth(preAuth: PreAuth): boolean {
  // Check if already used (replay attack protection)
  if (preAuth.used) {
    return false;
  }

  // Check expiration
  if (Date.now() - preAuth.ts > OAUTH_TTL_MS) {
    return false;
  }

  // Check required fields
  if (!preAuth.cv || !preAuth.nonce) {
    return false;
  }

  // Validate format of critical fields
  if (!isValidNonce(preAuth.nonce)) {
    return false;
  }

  return true;
}