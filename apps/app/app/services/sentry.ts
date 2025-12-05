/**
 * Sentry Error Tracking Service
 *
 * Handles error tracking and performance monitoring across web and mobile platforms.
 * Falls back to mock service when DSN is missing.
 */

import { Platform } from "react-native"

import type {
  ErrorTrackingService,
  ErrorTrackingConfig,
  ErrorContext,
  UserContext,
  Breadcrumb,
  ErrorLevel,
} from "../types/errorTracking"
import { mockSentry } from "./mocks/sentry"
import { logger } from "../utils/Logger"

// Sentry SDKs (platform-specific)
let SentryRN: any = null // React Native

// Load Sentry SDK based on platform
// Note: @sentry/react-native works on all platforms including web (via React Native Web)
// Note: Errors during SDK loading are logged in initialize() method, not at module load time
try {
  SentryRN = require("@sentry/react-native")
} catch (e) {
  // SDK loading failed - will be logged during initialization
  // Using console here since logger might not be ready during module load
  if (__DEV__) {
    console.warn("Failed to load @sentry/react-native. Will use mock if DSN is missing.")
  }
}

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN || ""

// Use mock if DSN is missing in development
const useMock = __DEV__ && !dsn

class SentryService implements ErrorTrackingService {
  platform = "sentry" as const
  private initialized = false
  private Sentry: any = null

  initialize(config: ErrorTrackingConfig): void {
    if (this.initialized) return

    const sentryDsn = config.dsn || dsn

    if (!sentryDsn) {
      logger.warn("Sentry DSN not provided")
      return
    }

    // Initialize Sentry for all platforms (iOS/Android/Web)
    // Note: Sentry supports React 19 - see https://docs.sentry.io/platforms/javascript/guides/react/
    // @sentry/react-native works on web via React Native Web, but for production web-only apps,
    // consider using @sentry/react for better web-specific features
    if (!SentryRN) {
      logger.error("Sentry React Native SDK not available. Make sure @sentry/react-native is installed", {})
      return
    }

    try {
      const isWeb = Platform.OS === "web"
      
      SentryRN.init({
        dsn: sentryDsn,
        environment: config.environment || (__DEV__ ? "development" : "production"),
        release: config.release,
        dist: config.dist,
        enableInExpoDevelopment: config.enableInDevelopment ?? false,
        tracesSampleRate: config.tracesSampleRate ?? 1.0,
        beforeSend: config.beforeSend,

        // Performance monitoring (per Sentry best practices)
        enableAutoPerformanceTracing: config.enableAutoPerformanceTracing ?? true,
        enableAppStartTracking: config.enableAppStartTracking ?? true,
        // Native-specific performance tracking (ignored on web by SDK)
        enableNativeFramesTracking: isWeb ? false : (config.enableNativeFramesTracking ?? true),
        enableStallTracking: isWeb ? false : (config.enableStallTracking ?? true),

        // Error attachments
        attachScreenshot: config.attachScreenshot ?? true,
        attachViewHierarchy: config.attachViewHierarchy ?? false, // Can be expensive

        // Native configuration (ignored on web by SDK, but set conditionally for clarity)
        enableNative: isWeb ? false : (config.enableNative ?? true),
        enableNativeCrashHandling: isWeb ? false : (config.enableNativeCrashHandling ?? true),
        enableNdk: isWeb ? false : (config.enableNdk ?? true),
      })

      this.Sentry = SentryRN
      this.initialized = true

      if (__DEV__) {
        const platform = Platform.OS === "web" ? "web" : "mobile"
        logger.debug(`🐛 [Sentry] Initialized for ${platform} with performance monitoring`)
      }
    } catch (error) {
      logger.error("Failed to initialize Sentry", {}, error as Error)
    }
  }

  captureException(error: Error, context?: ErrorContext): string | undefined {
    if (!this.Sentry) return undefined

    try {
      return this.Sentry.captureException(error, {
        tags: context?.tags,
        extra: context?.extra,
        level: context?.level,
        fingerprint: context?.fingerprint,
        user: context?.user,
      })
    } catch (err) {
      logger.error("Sentry captureException error", {}, err as Error)
      return undefined
    }
  }

  captureMessage(message: string, level?: ErrorLevel, context?: ErrorContext): string | undefined {
    if (!this.Sentry) return undefined

    try {
      return this.Sentry.captureMessage(message, {
        level: level || "info",
        tags: context?.tags,
        extra: context?.extra,
        fingerprint: context?.fingerprint,
        user: context?.user,
      })
    } catch (error) {
      logger.error("Sentry captureMessage error", {}, error as Error)
      return undefined
    }
  }

  setUser(user: UserContext | null): void {
    if (!this.Sentry) return

    try {
      this.Sentry.setUser(user)

      if (__DEV__ && user) {
        logger.debug("🐛 [Sentry] Set user", { userId: user.id || user.email })
      }
    } catch (error) {
      logger.error("Sentry setUser error", {}, error as Error)
    }
  }

  setContext(key: string, value: any): void {
    if (!this.Sentry) return

    try {
      this.Sentry.setContext(key, value)
    } catch (error) {
      logger.error("Sentry setContext error", {}, error as Error)
    }
  }

  setTag(key: string, value: string): void {
    if (!this.Sentry) return

    try {
      this.Sentry.setTag(key, value)
    } catch (error) {
      logger.error("Sentry setTag error", {}, error as Error)
    }
  }

  setTags(tags: Record<string, string>): void {
    if (!this.Sentry) return

    try {
      this.Sentry.setTags(tags)
    } catch (error) {
      logger.error("Sentry setTags error", {}, error as Error)
    }
  }

  setExtra(key: string, value: any): void {
    if (!this.Sentry) return

    try {
      this.Sentry.setExtra(key, value)
    } catch (error) {
      logger.error("Sentry setExtra error", {}, error as Error)
    }
  }

  setExtras(extras: Record<string, any>): void {
    if (!this.Sentry) return

    try {
      this.Sentry.setExtras(extras)
    } catch (error) {
      logger.error("Sentry setExtras error", {}, error as Error)
    }
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    if (!this.Sentry) return

    try {
      this.Sentry.addBreadcrumb({
        type: breadcrumb.type,
        category: breadcrumb.category,
        message: breadcrumb.message,
        data: breadcrumb.data,
        level: breadcrumb.level,
        timestamp: breadcrumb.timestamp,
      })
    } catch (error) {
      logger.error("Sentry addBreadcrumb error", {}, error as Error)
    }
  }

  withScope(callback: (scope: any) => void): void {
    if (!this.Sentry) return

    try {
      this.Sentry.withScope(callback)
    } catch (error) {
      logger.error("Sentry withScope error", {}, error as Error)
    }
  }

  startTransaction(name: string, op?: string): any {
    if (!this.Sentry) return null

    try {
      return this.Sentry.startTransaction({
        name,
        op: op || "custom",
      })
    } catch (error) {
      logger.error("Sentry startTransaction error", {}, error as Error)
      return null
    }
  }

  async close(timeout?: number): Promise<boolean> {
    if (!this.Sentry) return true

    try {
      return await this.Sentry.close(timeout)
    } catch (error) {
      logger.error("Sentry close error", {}, error as Error)
      return false
    }
  }
}

// Export singleton instance
export const sentry: ErrorTrackingService = useMock ? mockSentry : new SentryService()

// Export initialization function
export const initSentry = () => {
  if (useMock) {
    if (__DEV__) {
      logger.warn("⚠️  Sentry DSN not found - using mock error tracking")
      logger.info("💡 Add EXPO_PUBLIC_SENTRY_DSN to .env to use real Sentry")
    }
    return
  }

  sentry.initialize({
    dsn,
    environment: __DEV__ ? "development" : "production",
    enableInDevelopment: false,
  })
  
  // Log mock mode status during initialization (when logger is ready)
  if (useMock && __DEV__) {
    logger.warn("⚠️  Sentry running in mock mode")
    return
  }

  // Note: @sentry/react-native automatically sets up global error handlers
  // No need for manual setup - Sentry captures unhandled errors automatically
  if (__DEV__) {
    logger.debug("🐛 [Sentry] Initialized - automatic error capture enabled")
  }
}
