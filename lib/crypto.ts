/**
 * Calculates the SHA-256 hash of a string using the Web Crypto API.
 * This is intended for client-side use.
 * @param str The string to hash.
 * @returns A promise that resolves to the hex-encoded SHA-256 hash.
 */
export const sha256 = async (str: string): Promise<string> => {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not available in this environment.')
  }
  const buffer = new TextEncoder().encode(str)
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}
