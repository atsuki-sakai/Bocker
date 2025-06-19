import { z } from 'zod'
import { IMAGE_DIRECTORY_VALUES, IMAGE_QUALITY_VALUES, ROLE_VALUES, GENDER_VALUES, ASPECT_TYPE_VALUES } from '@/convex/types'
import { STORAGE_URL } from '@/services/gcp/cloud_storage/constants'

// Convex ID validation - minimal validation (length only)
export const convexIdSchema = z.string()
  .min(20, 'Convex ID is too short')
  .max(50, 'Convex ID is too long')

// Stripe account ID validation
export const stripeAccountIdSchema = z.string().startsWith('acct_', 'Invalid Stripe account ID')

// Stripe customer ID validation
export const stripeCustomerIdSchema = z.string().startsWith('cus_', 'Invalid Stripe customer ID')

// Stripe subscription ID validation
export const stripeSubscriptionIdSchema = z.string().startsWith('sub_', 'Invalid Stripe subscription ID')

// Role enum validation
export const roleSchema = z.enum(ROLE_VALUES)

// Gender enum validation  
export const genderSchema = z.enum(GENDER_VALUES)

// Image directory enum validation
export const directorySchema = z.enum(IMAGE_DIRECTORY_VALUES)

// Image quality enum validation
export const qualitySchema = z.enum(IMAGE_QUALITY_VALUES)

// Aspect type validation
export const aspectTypeSchema = z.enum(ASPECT_TYPE_VALUES)

// URL validation with GCS bucket check or CDN URL
export const gcsUrlSchema = z.string().url().refine(
  (url) => {
    try {
      const urlObj = new URL(url)
      // Check if it's a valid GCS URL or CDN URL
      return urlObj.hostname === STORAGE_URL.split('//')[1] ||  
             urlObj.hostname.endsWith(STORAGE_URL.split('//')[1]) ||
             urlObj.hostname === 'cdn.bocker.jp'
    } catch {
      return false
    }
  },
  'Invalid Google Cloud Storage or CDN URL'
)

// Organization ID extraction from GCS URL or CDN URL
export function extractOrgIdFromGcsUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    
    // CDN URL format: https://cdn.bocker.jp/menu/original/<convex_id>/filename.webp
    // GCS URL format: /bucket-name/<convex_id>/<directory>/...
    // Convex IDs are typically 20-50 characters
    
    // For CDN URLs, the org ID is typically the 3rd or 4th part
    if (urlObj.hostname === 'cdn.bocker.jp') {
      // pathParts will be ['', 'menu', 'original', '<convex_id>', 'filename']
      for (let i = 2; i < pathParts.length; i++) {
        const part = pathParts[i]
        if (part.length >= 20 && part.length <= 50 && /^[a-z0-9]+$/.test(part)) {
          return part
        }
      }
    } else {
      // Original logic for GCS URLs
      for (const part of pathParts) {
        if (part.length >= 20 && part.length <= 50) {
          return part
        }
      }
    }
    
    return null
  } catch {
    return null
  }
}

// Common pagination validation
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
})

// Date/time validation
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
export const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)')

// Price validation (non-negative integer)
export const priceSchema = z.number().int().min(0).max(10000000) // Max 10 million yen

// Duration validation (minutes)
export const durationSchema = z.number().int().min(5).max(480) // 5 min to 8 hours

// String length validation helpers
export const nameSchema = z.string().min(1).max(100)
export const emailSchema = z.string().email().max(255)
export const phoneSchema = z.string().regex(/^[\d-+().\s]+$/).min(10).max(20).optional()
export const descriptionSchema = z.string().max(1000)
export const shortTextSchema = z.string().max(255)

// Age validation
export const ageSchema = z.number().int().min(0).max(150).optional()

// Extra charge validation
export const extraChargeSchema = z.number().min(0).max(1000000).optional()

// Priority validation
export const prioritySchema = z.number().int().min(0).max(999).optional()

// Images array validation
export const imagesArraySchema = z.array(z.string().url()).max(10).optional()

// Safe text input validation (prevents injection)
export function sanitizeTextInput(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .trim()
}