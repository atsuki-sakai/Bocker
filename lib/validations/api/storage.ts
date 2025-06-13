import { z } from 'zod'
import { convexIdSchema, directorySchema, qualitySchema, aspectTypeSchema, gcsUrlSchema } from './common'

// Storage upload validation schema
export const storageUploadSchema = z.object({
  orgId: convexIdSchema,
  directory: directorySchema,
  aspectType: aspectTypeSchema.optional().default('mobile'),
  quality: qualitySchema.optional()
})

// Storage delete validation schema
export const storageDeleteSchema = z.object({
  originalUrl: gcsUrlSchema.optional(),
  originalUrls: z.array(gcsUrlSchema).optional(),
  withThumbnail: z.boolean().optional().default(true),
}).refine(
  (data) => data.originalUrl || (data.originalUrls && data.originalUrls.length > 0),
  { message: 'Either originalUrl or originalUrls must be provided' }
)

// Signed URL request validation
export const signedUrlRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().regex(/^(image|application|video)\/.+$/),
  orgId: convexIdSchema,
  directory: z.string().min(1).max(255), // ※ directory/thumbnail/ と directory/original/ が入ってくる
})

// File size validation (10MB max)
export const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed MIME types
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]

export const mimeTypeSchema = z.enum(ALLOWED_MIME_TYPES as [string, ...string[]])