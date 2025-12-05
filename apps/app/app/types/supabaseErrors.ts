/**
 * Supabase Error Types
 *
 * Proper type definitions for Supabase errors to avoid `as any` assertions
 */

/**
 * Supabase error interface
 */
export interface SupabaseError {
  message: string
  status?: number
  code?: string
  name?: string
  details?: string
  hint?: string
}

/**
 * Type guard to check if an error is a Supabase error
 */
export function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as any).message === "string"
  )
}

/**
 * Extract error details from an unknown error
 */
export function extractSupabaseError(error: unknown): SupabaseError | null {
  if (isSupabaseError(error)) {
    return error
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
    }
  }

  return null
}

