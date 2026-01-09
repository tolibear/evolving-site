import { NextResponse } from 'next/server'

/**
 * Wrapper for API route handlers with standardized error handling
 */
export function apiHandler<T>(
  handler: (request: Request) => Promise<T>,
  errorMessage: string
) {
  return async (request: Request) => {
    try {
      const result = await handler(request)
      return NextResponse.json(result)
    } catch (error) {
      console.error(`${errorMessage}:`, error)
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  }
}

/**
 * Parse a numeric query parameter with optional default
 */
export function getNumberParam(
  searchParams: URLSearchParams,
  name: string,
  defaultValue?: number
): number | undefined {
  const value = searchParams.get(name)
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Parse a boolean query parameter
 */
export function getBooleanParam(
  searchParams: URLSearchParams,
  name: string,
  defaultValue = false
): boolean {
  const value = searchParams.get(name)
  if (!value) return defaultValue
  return value === 'true' || value === '1'
}
