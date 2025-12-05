/**
 * Mock Sentry Implementation
 *
 * Provides a mock Sentry client for development without DSN.
 * Implements the full ErrorTrackingService interface with console logging.
 */

import type {
  ErrorTrackingService,
  ErrorTrackingConfig,
  ErrorContext,
  UserContext,
  Breadcrumb,
  ErrorLevel,
} from "../../types/errorTracking"
import { logger } from "../../utils/Logger"

interface MockError {
  type: "exception" | "message"
  error?: Error
  message?: string
  level?: ErrorLevel
  context?: ErrorContext
  timestamp: number
}

class MockSentry implements ErrorTrackingService {
  platform = "mock" as const
  private user: UserContext | null = null
  private tags: Record<string, string> = {}
  private extras: Record<string, any> = {}
  private breadcrumbs: Breadcrumb[] = []
  private errors: MockError[] = []

  initialize(config: ErrorTrackingConfig): void {
    if (__DEV__) {
      logger.debug("🐛 [MockSentry] Initialized with mock error tracking")
      logger.debug("🐛 [MockSentry] Environment", {
        environment: config.environment || "development",
      })
    }
  }

  captureException(error: Error, context?: ErrorContext): string | undefined {
    const mockError: MockError = {
      type: "exception",
      error,
      level: context?.level || "error",
      context,
      timestamp: Date.now(),
    }

    this.errors.push(mockError)

    if (__DEV__) {
      logger.error("🐛 [MockSentry] Exception", { message: error.message }, error)
      if (error.stack) {
        logger.debug("🐛 [MockSentry] Stack", { stack: error.stack })
      }
      if (context?.tags) {
        logger.debug("🐛 [MockSentry] Tags", context.tags)
      }
      if (context?.extra) {
        logger.debug("🐛 [MockSentry] Extra", context.extra)
      }
      if (this.breadcrumbs.length > 0) {
        logger.debug("🐛 [MockSentry] Breadcrumbs", {
          count: this.breadcrumbs.length,
          breadcrumbs: this.breadcrumbs,
        })
      }
    }

    return `mock-error-${Date.now()}`
  }

  captureMessage(message: string, level?: ErrorLevel, context?: ErrorContext): string | undefined {
    const mockError: MockError = {
      type: "message",
      message,
      level: level || "info",
      context,
      timestamp: Date.now(),
    }

    this.errors.push(mockError)

    const logLevel = level || "info"

    if (__DEV__) {
      if (logLevel === "error") {
        logger.error(`🐛 [MockSentry] Message [${logLevel}]`, { message })
      } else if (logLevel === "warning") {
        logger.warn(`🐛 [MockSentry] Message [${logLevel}]`, { message })
      } else {
        logger.debug(`🐛 [MockSentry] Message [${logLevel}]`, { message })
      }
      if (context?.tags) {
        logger.debug("🐛 [MockSentry] Tags", context.tags)
      }
      if (context?.extra) {
        logger.debug("🐛 [MockSentry] Extra", context.extra)
      }
    }

    return `mock-message-${Date.now()}`
  }

  setUser(user: UserContext | null): void {
    this.user = user

    if (__DEV__) {
      if (user) {
        logger.debug("🐛 [MockSentry] Set user", { userId: user.id || user.email || "unknown" })
      } else {
        logger.debug("🐛 [MockSentry] Cleared user")
      }
    }
  }

  setContext(key: string, value: any): void {
    if (__DEV__) {
      logger.debug(`🐛 [MockSentry] Set context "${key}"`, { [key]: value })
    }
  }

  setTag(key: string, value: string): void {
    this.tags[key] = value

    if (__DEV__) {
      logger.debug(`🐛 [MockSentry] Set tag "${key}"`, { [key]: value })
    }
  }

  setTags(tags: Record<string, string>): void {
    this.tags = { ...this.tags, ...tags }

    if (__DEV__) {
      logger.debug("🐛 [MockSentry] Set tags", tags)
    }
  }

  setExtra(key: string, value: any): void {
    this.extras[key] = value

    if (__DEV__) {
      logger.debug(`🐛 [MockSentry] Set extra "${key}"`, { [key]: value })
    }
  }

  setExtras(extras: Record<string, any>): void {
    this.extras = { ...this.extras, ...extras }

    if (__DEV__) {
      logger.debug("🐛 [MockSentry] Set extras", extras)
    }
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    this.breadcrumbs.push(breadcrumb)

    // Keep only last 100 breadcrumbs
    if (this.breadcrumbs.length > 100) {
      this.breadcrumbs.shift()
    }

    if (__DEV__) {
      logger.debug(`🐛 [MockSentry] Breadcrumb [${breadcrumb.type || "default"}]`, {
        message: breadcrumb.message || breadcrumb.category,
      })
    }
  }

  withScope(callback: (scope: any) => void): void {
    // Create a mock scope object
    const mockScope = {
      setTag: this.setTag.bind(this),
      setTags: this.setTags.bind(this),
      setExtra: this.setExtra.bind(this),
      setExtras: this.setExtras.bind(this),
      setUser: this.setUser.bind(this),
      setContext: this.setContext.bind(this),
      addBreadcrumb: this.addBreadcrumb.bind(this),
    }

    callback(mockScope)
  }

  startTransaction(name: string, op?: string): any {
    if (__DEV__) {
      logger.debug(`🐛 [MockSentry] Start transaction "${name}"`, { op: op || "custom" })
    }

    // Return a mock transaction
    return {
      name,
      op: op || "custom",
      startTime: Date.now(),
      finish: () => {
        if (__DEV__) {
          logger.debug(`🐛 [MockSentry] Finish transaction "${name}"`)
        }
      },
      setStatus: (status: string) => {
        if (__DEV__) {
          logger.debug(`🐛 [MockSentry] Transaction "${name}" status`, { status })
        }
      },
    }
  }

  async close(timeout?: number): Promise<boolean> {
    if (__DEV__) {
      logger.debug(`🐛 [MockSentry] Close`, { timeout: timeout || "none" })
    }
    return true
  }

  // Helper methods for testing

  /**
   * Get all captured errors (for testing)
   */
  getErrors(): MockError[] {
    return this.errors
  }

  /**
   * Clear all captured errors (for testing)
   */
  clearErrors(): void {
    this.errors = []

    if (__DEV__) {
      logger.debug("🐛 [MockSentry] Cleared error history")
    }
  }

  /**
   * Get all breadcrumbs (for testing)
   */
  getBreadcrumbs(): Breadcrumb[] {
    return this.breadcrumbs
  }

  /**
   * Clear all breadcrumbs (for testing)
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs = []

    if (__DEV__) {
      logger.debug("🐛 [MockSentry] Cleared breadcrumbs")
    }
  }

  /**
   * Get current user context (for testing)
   */
  getUser(): UserContext | null {
    return this.user
  }

  /**
   * Get all tags (for testing)
   */
  getTags(): Record<string, string> {
    return this.tags
  }

  /**
   * Get all extras (for testing)
   */
  getExtras(): Record<string, any> {
    return this.extras
  }
}

export const mockSentry = new MockSentry()
export { MockSentry }
