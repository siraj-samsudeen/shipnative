/**
 * Test Error Utilities
 *
 * Functions to test Sentry error tracking in development
 */

import { trackError } from "./analytics"
import { captureException, captureMessage } from "./crashReporting"

/**
 * Test different types of errors to verify Sentry is working
 */
export const testErrors = {
  /**
   * Test a simple JavaScript error
   */
  testSimpleError: () => {
    try {
      throw new Error("🧪 Test Error: Simple JavaScript error for Sentry testing")
    } catch (error) {
      captureException(error as Error, {
        tags: {
          test: "true",
          errorType: "simple_error",
        },
        level: "error",
      })
    }
  },

  /**
   * Test error via trackError (analytics hook)
   */
  testTrackError: () => {
    const error = new Error("🧪 Test Error: Error via trackError function")
    trackError(error, {
      tags: {
        test: "true",
        errorType: "track_error",
      },
    })
  },

  /**
   * Test unhandled promise rejection
   */
  testUnhandledPromise: () => {
    Promise.reject(new Error("🧪 Test Error: Unhandled promise rejection"))
  },

  /**
   * Test React component error (will be caught by ErrorBoundary)
   */
  testComponentError: () => {
    throw new Error("🧪 Test Error: React component error (should trigger ErrorBoundary)")
  },

  /**
   * Test a warning message
   */
  testWarningMessage: () => {
    captureMessage("🧪 Test Warning: This is a test warning message", {
      level: "warning",
      tags: {
        test: "true",
        messageType: "warning",
      },
    })
  },

  /**
   * Test an info message
   */
  testInfoMessage: () => {
    captureMessage("🧪 Test Info: This is a test info message", {
      level: "info",
      tags: {
        test: "true",
        messageType: "info",
      },
    })
  },

  /**
   * Test error with context
   */
  testErrorWithContext: () => {
    const error = new Error("🧪 Test Error: Error with additional context")
    captureException(error, {
      tags: {
        test: "true",
        errorType: "error_with_context",
        userId: "test-user-123",
      },
      extra: {
        testData: {
          timestamp: new Date().toISOString(),
          platform: "test",
          version: "1.0.0",
        },
      },
      level: "error",
    })
  },
}


