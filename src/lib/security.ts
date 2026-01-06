/**
 * Security utilities for input sanitization and validation
 */

/**
 * Sanitize user input to prevent XSS attacks
 * Escapes HTML special characters
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Validate that a string doesn't contain potential injection patterns
 * Returns true if the input appears safe
 */
export function isInputSafe(input: string): boolean {
  // Check for common injection patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /data:\s*text\/html/i,
  ]

  return !dangerousPatterns.some((pattern) => pattern.test(input))
}

/**
 * Validate and sanitize a suggestion content string
 */
export function sanitizeSuggestion(content: string): {
  valid: boolean
  sanitized: string
  error?: string
} {
  if (!content || typeof content !== 'string') {
    return { valid: false, sanitized: '', error: 'Content is required' }
  }

  const trimmed = content.trim()

  if (trimmed.length < 10) {
    return {
      valid: false,
      sanitized: '',
      error: 'Suggestion must be at least 10 characters',
    }
  }

  if (trimmed.length > 500) {
    return {
      valid: false,
      sanitized: '',
      error: 'Suggestion must be less than 500 characters',
    }
  }

  if (!isInputSafe(trimmed)) {
    return {
      valid: false,
      sanitized: '',
      error: 'Suggestion contains disallowed content',
    }
  }

  return {
    valid: true,
    sanitized: sanitizeInput(trimmed),
  }
}

/**
 * Check if a value is a safe integer for use as an ID
 */
export function isValidId(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0 &&
    value < Number.MAX_SAFE_INTEGER
  )
}
