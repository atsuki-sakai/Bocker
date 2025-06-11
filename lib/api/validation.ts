import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'

/**
 * Validates request body against a Zod schema
 * @param req - Next.js request object
 * @param schema - Zod validation schema
 * @returns Validated data or error response
 */
export async function validateRequest<T extends z.ZodTypeAny>(
  req: NextRequest,
  schema: T
): Promise<
  | { success: true; data: z.infer<T>; error: null }
  | { success: false; data: null; error: ZodError }
> {
  try {
    const body = await req.json()
    const data = schema.parse(body)
    return { success: true, data, error: null }
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, data: null, error }
    }
    // Re-throw non-validation errors
    throw error
  }
}

/**
 * Creates a NextResponse with validation error details
 * @param error - Zod validation error
 * @returns NextResponse with 400 status and error details
 */
export function createValidationErrorResponse(error: ZodError): NextResponse {
  const errorMessages = error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }))

  return NextResponse.json(
    {
      error: 'Validation failed',
      details: errorMessages,
    },
    { status: 400 }
  )
}

/**
 * Wrapper function for API routes with automatic validation
 * @param schema - Zod validation schema
 * @param handler - API route handler function
 * @returns Wrapped API route handler
 */
export function withValidation<T extends z.ZodTypeAny>(
  schema: T,
  handler: (
    req: NextRequest,
    data: z.infer<T>,
    params?: unknown
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest, params?: unknown): Promise<NextResponse> => {
    const validation = await validateRequest(req, schema)
    
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }
    
    return handler(req, validation.data, params)
  }
}

/**
 * Validates query parameters from URL
 * @param url - URL string or URL object
 * @param schema - Zod validation schema
 * @returns Validated query parameters
 */
export function validateQueryParams<T extends z.ZodTypeAny>(
  url: string | URL,
  schema: T
): z.infer<T> | null {
  try {
    const urlObj = typeof url === 'string' ? new URL(url) : url
    const params = Object.fromEntries(urlObj.searchParams)
    return schema.parse(params)
  } catch (error) {
    if (error instanceof ZodError) {
      return null
    }
    throw error
  }
}

/**
 * Common error response creator
 * @param message - Error message
 * @param status - HTTP status code
 * @param details - Optional error details
 * @returns NextResponse with error
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      ...(details !== undefined ? { details } : {}),
    },
    { status }
  )
}

/**
 * Success response creator
 * @param data - Response data
 * @param status - HTTP status code
 * @returns NextResponse with data
 */
export function createSuccessResponse(
  data: unknown,
  status: number = 200
): NextResponse {
  return NextResponse.json(data, { status })
}