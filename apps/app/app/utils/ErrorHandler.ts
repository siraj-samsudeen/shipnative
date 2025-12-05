/**
 * Centralized Error Handling System
 *
 * Provides consistent error handling across the app with:
 * - Error classification and categorization
 * - User-friendly error messages
 * - Automatic retry logic for transient failures
 * - Integration with crash reporting
 */

import { TIMING } from "@/config/constants"

import { captureException, captureMessage } from "./crashReporting"
import { logger } from "./Logger"

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  NETWORK = "NETWORK",
  AUTH = "AUTH",
  VALIDATION = "VALIDATION",
  PERMISSION = "PERMISSION",
  NOT_FOUND = "NOT_FOUND",
  SERVER = "SERVER",
  CLIENT = "CLIENT",
  UNKNOWN = "UNKNOWN",
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = "LOW", // Minor issues, app continues normally
  MEDIUM = "MEDIUM", // Noticeable issues, some features may not work
  HIGH = "HIGH", // Major issues, core functionality affected
  CRITICAL = "CRITICAL", // App may crash or be unusable
}

/**
 * Structured error information
 */
export interface AppError {
  category: ErrorCategory
  severity: ErrorSeverity
  message: string
  userMessage: string
  originalError?: Error
  code?: string
  retryable: boolean
  metadata?: Record<string, any>
}

/**
 * Error recovery strategies
 */
export interface RecoveryStrategy {
  canRecover: boolean
  shouldRetry: boolean
  retryDelay?: number
  maxRetries?: number
  fallbackAction?: () => void
}

/**
 * Map common error patterns to categories
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp | string
  category: ErrorCategory
  severity: ErrorSeverity
}> = [
  // Network errors
  { pattern: /network/i, category: ErrorCategory.NETWORK, severity: ErrorSeverity.MEDIUM },
  { pattern: /timeout/i, category: ErrorCategory.NETWORK, severity: ErrorSeverity.MEDIUM },
  { pattern: /fetch failed/i, category: ErrorCategory.NETWORK, severity: ErrorSeverity.MEDIUM },
  { pattern: /ECONNREFUSED/i, category: ErrorCategory.NETWORK, severity: ErrorSeverity.MEDIUM },

  // Auth errors
  { pattern: /unauthorized/i, category: ErrorCategory.AUTH, severity: ErrorSeverity.HIGH },
  { pattern: /forbidden/i, category: ErrorCategory.AUTH, severity: ErrorSeverity.HIGH },
  { pattern: /invalid.*token/i, category: ErrorCategory.AUTH, severity: ErrorSeverity.HIGH },
  { pattern: /session.*expired/i, category: ErrorCategory.AUTH, severity: ErrorSeverity.HIGH },

  // Validation errors
  { pattern: /validation/i, category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW },
  { pattern: /invalid.*input/i, category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW },

  // Not found errors
  { pattern: /not found/i, category: ErrorCategory.NOT_FOUND, severity: ErrorSeverity.LOW },
  { pattern: /404/i, category: ErrorCategory.NOT_FOUND, severity: ErrorSeverity.LOW },

  // Server errors
  { pattern: /500/i, category: ErrorCategory.SERVER, severity: ErrorSeverity.HIGH },
  { pattern: /503/i, category: ErrorCategory.SERVER, severity: ErrorSeverity.HIGH },
  { pattern: /internal.*server/i, category: ErrorCategory.SERVER, severity: ErrorSeverity.HIGH },
]

/**
 * User-friendly error messages by category
 */
const USER_MESSAGES: Record<ErrorCategory, string> = {
  [ErrorCategory.NETWORK]:
    "Unable to connect. Please check your internet connection and try again.",
  [ErrorCategory.AUTH]: "Your session has expired. Please sign in again.",
  [ErrorCategory.VALIDATION]: "Please check your input and try again.",
  [ErrorCategory.PERMISSION]: "You don't have permission to perform this action.",
  [ErrorCategory.NOT_FOUND]: "The requested resource was not found.",
  [ErrorCategory.SERVER]: "Something went wrong on our end. Please try again later.",
  [ErrorCategory.CLIENT]: "Something went wrong. Please try again.",
  [ErrorCategory.UNKNOWN]: "An unexpected error occurred. Please try again.",
}

/**
 * Sanitize error message to prevent information leakage
 * Removes sensitive information like stack traces, file paths, etc.
 */
function sanitizeErrorMessage(message: string, isProduction: boolean): string {
  if (!isProduction) {
    // In development, allow more details for debugging
    return message
  }

  // Remove file paths
  let sanitized = message.replace(/\/[^\s]+/g, "[path]")

  // Remove stack trace indicators
  sanitized = sanitized.replace(/at\s+[^\n]+/g, "")

  // Remove line numbers
  sanitized = sanitized.replace(/:\d+:\d+/g, "")

  // Remove common sensitive patterns
  sanitized = sanitized.replace(/password|token|secret|key|api[_-]?key/gi, "[redacted]")

  // Limit message length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200) + "..."
  }

  return sanitized.trim() || "An error occurred"
}

/**
 * Classify an error based on its message and properties
 */
function classifyError(error: Error | string): {
  category: ErrorCategory
  severity: ErrorSeverity
} {
  const errorMessage = typeof error === "string" ? error : error.message

  for (const { pattern, category, severity } of ERROR_PATTERNS) {
    const regex = typeof pattern === "string" ? new RegExp(pattern, "i") : pattern
    if (regex.test(errorMessage)) {
      return { category, severity }
    }
  }

  return { category: ErrorCategory.UNKNOWN, severity: ErrorSeverity.MEDIUM }
}

/**
 * Determine if an error is retryable
 */
function isRetryable(category: ErrorCategory): boolean {
  return [ErrorCategory.NETWORK, ErrorCategory.SERVER].includes(category)
}

/**
 * Get recovery strategy for an error
 */
function getRecoveryStrategy(error: AppError): RecoveryStrategy {
  const { category } = error

  // Network errors are retryable
  if (category === ErrorCategory.NETWORK) {
    return {
      canRecover: true,
      shouldRetry: true,
      retryDelay: TIMING.RETRY_DELAY_NETWORK,
      maxRetries: 3,
    }
  }

  // Server errors are retryable with longer delay
  if (category === ErrorCategory.SERVER) {
    return {
      canRecover: true,
      shouldRetry: true,
      retryDelay: TIMING.RETRY_DELAY_SERVER,
      maxRetries: 2,
    }
  }

  // Auth errors need user action
  if (category === ErrorCategory.AUTH) {
    return {
      canRecover: false,
      shouldRetry: false,
    }
  }

  // Default: not retryable
  return {
    canRecover: false,
    shouldRetry: false,
  }
}

/**
 * Main error handler class
 */
class ErrorHandler {
  /**
   * Handle an error with full processing
   */
  handle(error: Error | string, context?: Record<string, any>): AppError {
    const originalError = typeof error === "string" ? new Error(error) : error
    const { category, severity } = classifyError(originalError)

    // Sanitize error message for production
    const isProduction = !__DEV__
    const sanitizedMessage = sanitizeErrorMessage(originalError.message, isProduction)

    const appError: AppError = {
      category,
      severity,
      message: sanitizedMessage, // Use sanitized message
      userMessage: USER_MESSAGES[category],
      originalError,
      retryable: isRetryable(category),
      metadata: context,
    }

    // Log the error (with full details in dev, sanitized in production)
    this.logError(appError)

    // Report to crash reporting if severity is high or critical
    // Always send full error to crash reporting for debugging
    if (severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL) {
      this.reportError(appError)
    }

    return appError
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: AppError): void {
    const logData = {
      category: error.category,
      severity: error.severity,
      message: error.message,
      retryable: error.retryable,
      metadata: error.metadata,
    }

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        logger.error("Error occurred", logData, error.originalError)
        break
      case ErrorSeverity.MEDIUM:
        logger.warn("Error occurred", logData)
        break
      case ErrorSeverity.LOW:
        logger.info("Error occurred", logData)
        break
    }
  }

  /**
   * Report error to crash reporting service
   */
  private reportError(error: AppError): void {
    if (error.originalError) {
      captureException(error.originalError, {
        tags: {
          category: error.category,
          severity: error.severity,
        },
        extra: error.metadata,
      })
    } else {
      captureMessage(error.message, {
        level: error.severity === ErrorSeverity.CRITICAL ? "fatal" : "error",
        tags: {
          category: error.category,
        },
        extra: error.metadata,
      })
    }
  }

  /**
   * Get recovery strategy for an error
   */
  getRecoveryStrategy(error: AppError): RecoveryStrategy {
    return getRecoveryStrategy(error)
  }

  /**
   * Create a custom error with specific category
   */
  createError(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    metadata?: Record<string, any>,
  ): AppError {
    return {
      category,
      severity,
      message,
      userMessage: USER_MESSAGES[category],
      retryable: isRetryable(category),
      metadata,
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler()

/**
 * Utility function to handle async operations with error handling
 */
export async function handleAsync<T>(
  operation: () => Promise<T>,
  context?: Record<string, any>,
): Promise<{ data?: T; error?: AppError }> {
  try {
    const data = await operation()
    return { data }
  } catch (err) {
    const error = errorHandler.handle(err as Error, context)
    return { error }
  }
}

/**
 * Utility function to retry an operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = TIMING.RETRY_DELAY_NETWORK,
  context?: Record<string, any>,
): Promise<{ data?: T; error?: AppError }> {
  let lastError: AppError | undefined

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await handleAsync(operation, {
      ...context,
      attempt: attempt + 1,
      maxRetries,
    })

    if (result.data) {
      return result
    }

    lastError = result.error

    // Don't retry if error is not retryable
    if (lastError && !lastError.retryable) {
      break
    }

    // Don't wait after last attempt
    if (attempt < maxRetries - 1) {
      const delay = initialDelay * Math.pow(2, attempt)
      logger.info(`Retrying operation after ${delay}ms`, {
        attempt: attempt + 1,
        maxRetries,
      })
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  return { error: lastError }
}
