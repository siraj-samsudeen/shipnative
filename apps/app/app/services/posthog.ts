/**
 * PostHog Analytics Service
 *
 * Handles analytics tracking across web and mobile platforms.
 * Falls back to mock service when API key is missing or on unsupported platforms.
 */

import { Platform } from "react-native"

import type {
  AnalyticsService,
  AnalyticsConfig,
  EventProperties,
  UserProperties,
  ScreenProperties,
  GroupProperties,
} from "../types/analytics"
import { MockPostHog } from "./mocks/posthog"
import { logger } from "../utils/Logger"

// PostHog SDKs (platform-specific)
let PostHogRN: any = null // React Native
let PostHogJS: any = null // Web

// Load appropriate SDK based on platform
// Note: Errors during SDK loading are logged in initialize() method, not at module load time
if (Platform.OS === "web") {
  try {
    // posthog-js can be imported in different ways depending on the build
    const posthogModule = require("posthog-js")
    // Try different export patterns
    if (posthogModule.default) {
      // ES module default export
      PostHogJS = posthogModule.default
    } else if (typeof posthogModule.init === "function") {
      // CommonJS export with init method
      PostHogJS = posthogModule
    } else if (posthogModule.posthog) {
      // Sometimes wrapped in a posthog property
      PostHogJS = posthogModule.posthog
    } else {
      // Fallback: use the module itself
      PostHogJS = posthogModule
    }
  } catch (e) {
    // SDK loading failed - will be logged during initialization
    // Using console here since logger might not be ready during module load
    if (__DEV__) {
      console.warn("Failed to load posthog-js. Will use mock if API key is missing.")
    }
  }
} else {
  try {
    const module = require("posthog-react-native")
    PostHogRN = module.default || module.PostHog
  } catch (e) {
    // SDK loading failed - will be logged during initialization
    // Using console here since logger might not be ready during module load
    if (__DEV__) {
      console.warn("Failed to load posthog-react-native. Will use mock if API key is missing.")
    }
  }
}

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY || ""
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://app.posthog.com"

// Use mock if API key is missing in development
const useMock = __DEV__ && !apiKey

class PostHogService implements AnalyticsService {
  platform = "posthog" as const
  private client: any = null
  private initialized = false

  async initialize(config?: AnalyticsConfig): Promise<void> {
    if (this.initialized) return

    const key = config?.apiKey || apiKey
    const apiHost = config?.host || host

    if (!key) {
      logger.warn("PostHog API key not provided")
      return
    }

    // Log SDK loading errors during initialization (when logger is ready)
    if (Platform.OS === "web" && !PostHogJS) {
      logger.error("PostHog web SDK not available. Make sure posthog-js is installed", {})
      return
    }
    if (Platform.OS !== "web" && !PostHogRN) {
      logger.error("PostHog React Native SDK not available. Make sure posthog-react-native is installed", {})
      return
    }

    try {
      if (Platform.OS === "web" && PostHogJS) {
        // Initialize PostHog for web
        // Check if init method exists
        if (typeof PostHogJS.init === "function") {
          // posthog-js init method - returns void, client is accessed via PostHogJS
          PostHogJS.init(key, {
            api_host: apiHost,
            autocapture: config?.captureClicks ?? true,
            capture_pageview: config?.captureScreens ?? true,
            loaded: (posthog: any) => {
              this.client = posthog
              this.initialized = true
              if (__DEV__) {
                logger.debug("📊 [PostHog] Initialized for web")
              }
            },
          })
          // Set client to PostHogJS instance if callback hasn't fired yet
          // posthog-js exposes itself as the client after init
          if (!this.client && PostHogJS) {
            this.client = PostHogJS
            this.initialized = true
            if (__DEV__) {
              logger.debug("📊 [PostHog] Initialized for web")
            }
          }
        } else {
          // PostHogJS loaded but init method not found
          // This might happen if the module structure is different
          logger.error("PostHogJS.init is not a function. PostHogJS structure", {
            keys: Object.keys(PostHogJS || {}),
          })
          // Try to use PostHogJS directly as the client if it has capture method
          if (PostHogJS && typeof PostHogJS.capture === "function") {
            this.client = PostHogJS
            this.initialized = true
            if (__DEV__) {
              logger.warn("📊 [PostHog] Using PostHogJS directly (init method not found)")
            }
          }
        }
      } else if (PostHogRN) {
        // Initialize PostHog for React Native
        this.client = new PostHogRN(key, { host: apiHost })
        this.initialized = true
        if (__DEV__) {
          logger.debug("📊 [PostHog] Initialized for mobile")
        }
      }
    } catch (error) {
      logger.error("Failed to initialize PostHog", {}, error as Error)
    }
  }

  track(event: string, properties?: EventProperties): void {
    if (!this.client) return

    try {
      if (Platform.OS === "web") {
        this.client.capture(event, properties)
      } else {
        this.client.capture(event, properties)
      }

      if (__DEV__) {
        logger.debug(`📊 [PostHog] Event: ${event}`, properties || {})
      }
    } catch (error) {
      logger.error("PostHog track error", {}, error as Error)
    }
  }

  screen(name: string, properties?: ScreenProperties): void {
    if (!this.client) return

    try {
      if (Platform.OS === "web") {
        this.client.capture("$pageview", {
          $current_url: name,
          ...properties,
        })
      } else {
        this.client.screen(name, properties)
      }

      if (__DEV__) {
        logger.debug(`📊 [PostHog] Screen: ${name}`, properties || {})
      }
    } catch (error) {
      logger.error("PostHog screen error", {}, error as Error)
    }
  }

  identify(userId: string, properties?: UserProperties): void {
    if (!this.client) return

    try {
      this.client.identify(userId, properties)

      if (__DEV__) {
        logger.debug(`📊 [PostHog] Identify: ${userId}`, properties || {})
      }
    } catch (error) {
      logger.error("PostHog identify error", {}, error as Error)
    }
  }

  reset(): void {
    if (!this.client) return

    try {
      this.client.reset()

      if (__DEV__) {
        logger.debug("📊 [PostHog] Reset user")
      }
    } catch (error) {
      logger.error("PostHog reset error", {}, error as Error)
    }
  }

  setUserProperties(properties: UserProperties): void {
    if (!this.client) return

    try {
      // PostHog uses setPersonProperties for both web and mobile
      this.client.setPersonProperties(properties)

      if (__DEV__) {
        logger.debug("📊 [PostHog] Set user properties", properties)
      }
    } catch (error) {
      logger.error("PostHog setUserProperties error", {}, error as Error)
    }
  }

  group(type: string, id: string, properties?: GroupProperties): void {
    if (!this.client) return

    try {
      this.client.group(type, id, properties)

      if (__DEV__) {
        logger.debug(`📊 [PostHog] Group: ${type}:${id}`, properties || {})
      }
    } catch (error) {
      logger.error("PostHog group error", {}, error as Error)
    }
  }

  isFeatureEnabled(flag: string): boolean {
    if (!this.client) return false

    try {
      return this.client.isFeatureEnabled(flag) ?? false
    } catch (error) {
      logger.error("PostHog isFeatureEnabled error", {}, error as Error)
      return false
    }
  }

  getFeatureFlag(flag: string): any {
    if (!this.client) return undefined

    try {
      return this.client.getFeatureFlag(flag)
    } catch (error) {
      logger.error("PostHog getFeatureFlag error", {}, error as Error)
      return undefined
    }
  }

  onFeatureFlags(callback: (flags: Record<string, any>) => void): void {
    if (!this.client) return

    try {
      this.client.onFeatureFlags(callback)
    } catch (error) {
      logger.error("PostHog onFeatureFlags error", {}, error as Error)
    }
  }

  optIn(): void {
    if (!this.client) return

    try {
      this.client.optIn()

      if (__DEV__) {
        logger.debug("📊 [PostHog] Opted in to tracking")
      }
    } catch (error) {
      logger.error("PostHog optIn error", {}, error as Error)
    }
  }

  optOut(): void {
    if (!this.client) return

    try {
      this.client.optOut()

      if (__DEV__) {
        logger.debug("📊 [PostHog] Opted out of tracking")
      }
    } catch (error) {
      logger.error("PostHog optOut error", {}, error as Error)
    }
  }

  async flush(): Promise<void> {
    if (!this.client) return

    try {
      await this.client.flush?.()

      if (__DEV__) {
        logger.debug("📊 [PostHog] Flushed events")
      }
    } catch (error) {
      logger.error("PostHog flush error", {}, error as Error)
    }
  }

  async shutdown(): Promise<void> {
    if (!this.client) return

    try {
      await this.client.shutdown?.()
      this.initialized = false

      if (__DEV__) {
        logger.debug("📊 [PostHog] Shutdown")
      }
    } catch (error) {
      logger.error("PostHog shutdown error", {}, error as Error)
    }
  }
}

// Export singleton instance
export const posthog: AnalyticsService = useMock
  ? new MockPostHog({ apiKey: "mock-key", host })
  : new PostHogService()

// Export initialization function
export const initPosthog = async () => {
  if (useMock) {
    if (__DEV__) {
      logger.warn("⚠️  PostHog API key not found - using mock analytics")
      logger.info("💡 Add EXPO_PUBLIC_POSTHOG_API_KEY to .env to use real PostHog")
    }
    return
  }

  await posthog.initialize({ apiKey, host })
  
  // Log mock mode status during initialization (when logger is ready)
  if (useMock && __DEV__) {
    logger.warn("⚠️  PostHog running in mock mode")
  }
}
