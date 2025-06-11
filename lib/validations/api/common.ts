import { z } from 'zod'

// Convex ID validation - 16 character alphanumeric string
export const convexIdSchema = z.string().regex(/^[a-z0-9]{16}$/, 'Invalid Convex ID format')

// Stripe account ID validation
export const stripeAccountIdSchema = z.string().startsWith('acct_', 'Invalid Stripe account ID')

// Stripe customer ID validation
export const stripeCustomerIdSchema = z.string().startsWith('cus_', 'Invalid Stripe customer ID')

// Stripe subscription ID validation
export const stripeSubscriptionIdSchema = z.string().startsWith('sub_', 'Invalid Stripe subscription ID')

// Role enum validation
export const roleSchema = z.enum(['admin', 'owner', 'manager', 'staff'])

// Gender enum validation  
export const genderSchema = z.enum(['unselected', 'male', 'female'])

// Image directory enum validation
export const directorySchema = z.enum(['staff', 'menu', 'option', 'carte', 'customer', 'other'])

// Image quality enum validation
export const qualitySchema = z.enum(['low', 'medium', 'high'])

// Aspect type validation
export const aspectTypeSchema = z.enum(['mobile', 'desktop', 'square'])

// URL validation with GCS bucket check
export const gcsUrlSchema = z.string().url().refine(
  (url) => {
    try {
      const urlObj = new URL(url)
      // Check if it's a valid GCS URL
      return urlObj.hostname === 'storage.googleapis.com' || 
             urlObj.hostname.endsWith('.storage.googleapis.com')
    } catch {
      return false
    }
  },
  'Invalid Google Cloud Storage URL'
)

// Organization ID extraction from GCS URL
export function extractOrgIdFromGcsUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    
    // Expected format: /bucket-name/org_<id>/...
    for (const part of pathParts) {
      if (part.startsWith('org_') && part.length === 20) { // org_ + 16 chars
        return part
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