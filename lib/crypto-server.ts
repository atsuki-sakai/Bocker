// Server-side Node.js crypto utilities for token encryption
import crypto from "node:crypto";

/**
 * AES-256-GCM encryption utility for sensitive data protection
 * 
 * This module provides secure encryption/decryption for sensitive tokens
 * like refresh tokens before storing them in HTTP-only cookies.
 * 
 * Uses AES-256-GCM which provides both confidentiality and authenticity.
 * The authentication tag prevents tampering with encrypted data.
 */

// Derive encryption key from environment secret
const getEncryptionKey = (): Buffer => {
  const secret = process.env.LINE_REFRESH_SECRET;
  if (!secret) {
    throw new Error("LINE_REFRESH_SECRET environment variable is required");
  }
  
  // Create a consistent 32-byte key from the secret
  return crypto.createHash("sha256").update(secret, "utf8").digest();
};

/**
 * Seal (encrypt) a plaintext string using AES-256-GCM
 * 
 * @param plaintext The string to encrypt
 * @returns Base64url encoded encrypted data (IV + Auth Tag + Ciphertext)
 * @throws Error if encryption fails
 */
export function seal(plaintext: string): string {
  if (typeof window !== 'undefined') {
    throw new Error("seal() is for server-side use only");
  }
  
  if (!plaintext) {
    throw new Error("Cannot encrypt empty plaintext");
  }

  try {
    const key = getEncryptionKey();
    
    // Generate a random 96-bit (12-byte) IV for GCM mode
    const iv = crypto.randomBytes(12);
    
    // Create cipher with AES-256-GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    
    // Encrypt the plaintext
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final()
    ]);
    
    // Get the authentication tag (16 bytes for GCM)
    const authTag = cipher.getAuthTag();
    
    // Combine: IV (12) + Auth Tag (16) + Encrypted Data (N)
    const combined = Buffer.concat([iv, authTag, encrypted]);
    
    // Return as base64url for safe storage in cookies/URLs
    return combined.toString("base64url");
    
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Open (decrypt) a sealed string using AES-256-GCM
 * 
 * @param sealedData Base64url encoded encrypted data
 * @returns Decrypted plaintext string
 * @throws Error if decryption fails or data is tampered
 */
export function open(sealedData: string): string {
  if (typeof window !== 'undefined') {
    throw new Error("open() is for server-side use only");
  }
  
  if (!sealedData) {
    throw new Error("Cannot decrypt empty sealed data");
  }

  try {
    const key = getEncryptionKey();
    
    // Decode from base64url
    const buffer = Buffer.from(sealedData, "base64url");
    
    // Minimum size check: IV (12) + Auth Tag (16) + at least 1 byte data
    if (buffer.length < 29) {
      throw new Error("Sealed data is too short to be valid");
    }
    
    // Extract components
    const iv = buffer.subarray(0, 12);          // First 12 bytes: IV
    const authTag = buffer.subarray(12, 28);    // Next 16 bytes: Auth Tag
    const encrypted = buffer.subarray(28);      // Remaining: Encrypted data
    
    // Create decipher with AES-256-GCM
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    
    // Set the authentication tag for verification
    decipher.setAuthTag(authTag);
    
    // Decrypt and verify authenticity
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return decrypted.toString("utf8");
    
  } catch {
    // Don't leak specific decryption errors for security
    throw new Error("Decryption failed - data may be corrupted or tampered");
  }
}

/**
 * Securely compare two strings in constant time
 * Prevents timing attacks when comparing sensitive values
 * 
 * @param a First string
 * @param b Second string
 * @returns True if strings are equal
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof window !== 'undefined') {
    throw new Error("constantTimeEqual() is for server-side use only");
  }
  
  if (a.length !== b.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(a, "utf8"),
    Buffer.from(b, "utf8")
  );
}

/**
 * Generate a cryptographically secure random token
 * Server-side implementation using Node.js crypto
 * 
 * @param bytes Number of random bytes (default: 32)
 * @param encoding Output encoding (default: 'base64url')
 * @returns Random token string
 */
export function generateSecureToken(
  bytes: number = 32,
  encoding: BufferEncoding = "base64url"
): string {
  if (typeof window !== 'undefined') {
    throw new Error("generateSecureToken() is for server-side use only");
  }
  
  return crypto.randomBytes(bytes).toString(encoding);
}