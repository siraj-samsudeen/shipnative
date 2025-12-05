/**
 * Mock PostHog Implementation
 *
 * Provides a mock PostHog client for development without API keys.
 * Implements the full AnalyticsService interface with console logging.
 */

import type {
  AnalyticsService,
  AnalyticsConfig,
  EventProperties,
  UserProperties,
  ScreenProperties,
  GroupProperties,
} from "../../types/analytics"
import { logger } from "../../utils/Logger"

interface MockEvent {
  type: "event" | "screen" | "identify"
  name: string
  properties?: Record<string, any>
  timestamp: number
}

class MockPostHog implements AnalyticsService {
  platform = "mock" as const
  private apiKey: string
  private host: string
  private enabled: boolean = true
  private userId: string | null = null
  private userProperties: UserProperties = {}
  private featureFlags: Record<string, any> = {}
  private events: MockEvent[] = []

  constructor(config: AnalyticsConfig) {
    this.apiKey = config.apiKey || "mock-api-key"
    this.host = config.host || "https://app.posthog.com"

    // Simulate some feature flags for testing
    this.featureFlags = {
      "new-feature": true,
      "beta-feature": false,
      "test-variant": "control",
    }

    if (__DEV__) {
      console.log("📊 [MockPostHog] Initialized with mock analytics")
      console.log("📊 [MockPostHog] Feature flags:", this.featureFlags)
    }
  }

  async initialize(config: AnalyticsConfig): Promise<void> {
    this.apiKey = config.apiKey || this.apiKey
    this.host = config.host || this.host

    if (__DEV__) {
      logger.debug("📊 [MockPostHog] Initialized")
    }
  }

  track(event: string, properties?: EventProperties): void {
    if (!this.enabled) return

    const mockEvent: MockEvent = {
      type: "event",
      name: event,
      properties: {
        ...properties,
        userId: this.userId,
        timestamp: new Date().toISOString(),
      },
      timestamp: Date.now(),
    }

    this.events.push(mockEvent)

    if (__DEV__) {
      logger.debug(`📊 [MockPostHog] Event: ${event}`, properties || {})
    }
  }

  screen(name: string, properties?: ScreenProperties): void {
    if (!this.enabled) return

    const mockEvent: MockEvent = {
      type: "screen",
      name,
      properties: {
        ...properties,
        userId: this.userId,
        timestamp: new Date().toISOString(),
      },
      timestamp: Date.now(),
    }

    this.events.push(mockEvent)

    if (__DEV__) {
      logger.debug(`📊 [MockPostHog] Screen: ${name}`, properties || {})
    }
  }

  identify(userId: string, properties?: UserProperties): void {
    if (!this.enabled) return

    this.userId = userId
    this.userProperties = { ...this.userProperties, ...properties }

    const mockEvent: MockEvent = {
      type: "identify",
      name: userId,
      properties,
      timestamp: Date.now(),
    }

    this.events.push(mockEvent)

    if (__DEV__) {
      logger.debug(`📊 [MockPostHog] Identify: ${userId}`, properties || {})
    }
  }

  reset(): void {
    this.userId = null
    this.userProperties = {}

    if (__DEV__) {
      logger.debug("📊 [MockPostHog] Reset user")
    }
  }

  setUserProperties(properties: UserProperties): void {
    this.userProperties = { ...this.userProperties, ...properties }

    if (__DEV__) {
      logger.debug("📊 [MockPostHog] Set user properties", properties)
    }
  }

  group(type: string, id: string, properties?: GroupProperties): void {
    if (!this.enabled) return

    if (__DEV__) {
      logger.debug(`📊 [MockPostHog] Group: ${type}:${id}`, properties || {})
    }
  }

  isFeatureEnabled(flag: string): boolean {
    const enabled = this.featureFlags[flag] === true

    if (__DEV__) {
      logger.debug(`📊 [MockPostHog] Feature flag "${flag}"`, { enabled })
    }

    return enabled
  }

  getFeatureFlag(flag: string): any {
    const value = this.featureFlags[flag]

    if (__DEV__) {
      logger.debug(`📊 [MockPostHog] Get feature flag "${flag}"`, { value })
    }

    return value
  }

  onFeatureFlags(callback: (flags: Record<string, any>) => void): void {
    // Immediately call with current flags
    callback(this.featureFlags)

    if (__DEV__) {
      logger.debug("📊 [MockPostHog] Feature flags callback registered")
    }
  }

  optIn(): void {
    this.enabled = true

    if (__DEV__) {
      logger.debug("📊 [MockPostHog] Opted in to tracking")
    }
  }

  optOut(): void {
    this.enabled = false

    if (__DEV__) {
      logger.debug("📊 [MockPostHog] Opted out of tracking")
    }
  }

  async flush(): Promise<void> {
    if (__DEV__) {
      logger.debug("📊 [MockPostHog] Flush (no-op)")
    }
  }

  async shutdown(): Promise<void> {
    if (__DEV__) {
      logger.debug("📊 [MockPostHog] Shutdown")
    }
  }

  // Helper methods for testing

  /**
   * Set a feature flag value (for testing)
   */
  setFeatureFlag(flag: string, value: any): void {
    this.featureFlags[flag] = value

    if (__DEV__) {
      logger.debug(`📊 [MockPostHog] Set feature flag "${flag}"`, { value })
    }
  }

  /**
   * Get all tracked events (for testing)
   */
  getEvents(): MockEvent[] {
    return this.events
  }

  /**
   * Clear all tracked events (for testing)
   */
  clearEvents(): void {
    this.events = []

    if (__DEV__) {
      logger.debug("📊 [MockPostHog] Cleared event history")
    }
  }

  /**
   * Get current user info (for testing)
   */
  getUserInfo(): { userId: string | null; properties: UserProperties } {
    return {
      userId: this.userId,
      properties: this.userProperties,
    }
  }
}

export { MockPostHog }
