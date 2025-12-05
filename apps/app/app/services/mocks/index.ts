/**
 * Mock Services Configuration
 *
 * This module provides mock implementations of external services for development
 * without API keys. Mocks are automatically enabled when API keys are missing.
 */

import { Platform } from "react-native"

import { logger } from "../../utils/Logger"

// Check if we should use mock services
export const USE_MOCK_SERVICES =
  __DEV__ &&
  (!process.env.EXPO_PUBLIC_SUPABASE_URL ||
    !process.env.EXPO_PUBLIC_POSTHOG_API_KEY ||
    (!process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY &&
      !process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY &&
      !process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY) ||
    !process.env.EXPO_PUBLIC_SENTRY_DSN)

export const USE_MOCK_SUPABASE = __DEV__ && !process.env.EXPO_PUBLIC_SUPABASE_URL
export const USE_MOCK_POSTHOG = __DEV__ && !process.env.EXPO_PUBLIC_POSTHOG_API_KEY

// RevenueCat mock based on platform
export const USE_MOCK_REVENUECAT =
  __DEV__ &&
  ((Platform.OS === "web" && !process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY) ||
    (Platform.OS !== "web" &&
      !process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY &&
      !process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY))

export const USE_MOCK_SENTRY = __DEV__ && !process.env.EXPO_PUBLIC_SENTRY_DSN

/**
 * Log mock service status
 * Call this during app initialization (after logger is ready)
 */
export function logMockServicesStatus(): void {
  if (__DEV__) {
    logger.info("🔧 Mock Services Status", {
      Supabase: USE_MOCK_SUPABASE ? "MOCK" : "REAL",
      PostHog: USE_MOCK_POSTHOG ? "MOCK" : "REAL",
      RevenueCat: `${USE_MOCK_REVENUECAT ? "MOCK" : "REAL"} (${Platform.OS})`,
      Sentry: USE_MOCK_SENTRY ? "MOCK" : "REAL",
    })
  }
}
