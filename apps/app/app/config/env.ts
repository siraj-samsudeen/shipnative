/**
 * Environment Configuration
 *
 * Type-safe access to environment variables with validation
 */

import Constants from "expo-constants"

import { logger } from "../utils/Logger"

/**
 * Environment variable schema
 */
interface EnvConfig {
  // Supabase
  supabaseUrl: string
  supabasePublishableKey: string

  // RevenueCat
  revenueCatIosKey: string
  revenueCatAndroidKey: string
  revenueCatWebKey: string

  // PostHog
  posthogApiKey: string
  posthogHost: string

  // Sentry
  sentryDsn: string

  // Google OAuth
  googleClientId: string
  googleClientSecret: string

  // Apple Sign-In
  appleServicesId: string
  appleTeamId: string
  applePrivateKey: string
  appleKeyId: string

  // App
  appEnv: "development" | "staging" | "production"
  appVersion: string
}

/**
 * Required environment variables
 * These must be present in production
 */
const REQUIRED_IN_PRODUCTION: Array<keyof EnvConfig> = ["supabaseUrl", "supabasePublishableKey"]

/**
 * Get environment variable from expo config
 */
function getEnvVar(key: string): string | undefined {
  return (
    process.env[`EXPO_PUBLIC_${key.toUpperCase()}`] ||
    Constants.expoConfig?.extra?.[key] ||
    undefined
  )
}

/**
 * Get environment configuration
 */
function getEnvConfig(): EnvConfig {
  return {
    // Supabase
    supabaseUrl: getEnvVar("supabase_url") || "",
    supabasePublishableKey: getEnvVar("supabase_publishable_key") || "",

    // RevenueCat
    revenueCatIosKey: getEnvVar("revenuecat_ios_key") || "",
    revenueCatAndroidKey: getEnvVar("revenuecat_android_key") || "",
    revenueCatWebKey: getEnvVar("revenuecat_web_key") || "",

    // PostHog
    posthogApiKey: getEnvVar("posthog_api_key") || "",
    posthogHost: getEnvVar("posthog_host") || "https://app.posthog.com",

    // Sentry
    sentryDsn: getEnvVar("sentry_dsn") || "",

    // Google OAuth
    googleClientId: getEnvVar("google_client_id") || "",
    googleClientSecret: getEnvVar("google_client_secret") || "",

    // Apple Sign-In
    appleServicesId: getEnvVar("apple_services_id") || "",
    appleTeamId: getEnvVar("apple_team_id") || "",
    applePrivateKey: getEnvVar("apple_private_key") || "",
    appleKeyId: getEnvVar("apple_key_id") || "",

    // App
    appEnv: (getEnvVar("app_env") as any) || (__DEV__ ? "development" : "production"),
    appVersion: Constants.expoConfig?.version || "1.0.0",
  }
}

/**
 * Validate environment configuration
 */
function validateEnvConfig(config: EnvConfig): {
  isValid: boolean
  missing: string[]
  warnings: string[]
} {
  const missing: string[] = []
  const warnings: string[] = []

  // Check required variables in production
  if (config.appEnv === "production") {
    for (const key of REQUIRED_IN_PRODUCTION) {
      if (!config[key]) {
        missing.push(key)
      }
    }
  }

  // Check optional but recommended variables
  const hasRevenueCat =
    config.revenueCatIosKey || config.revenueCatAndroidKey || config.revenueCatWebKey
  if (!hasRevenueCat && config.appEnv !== "development") {
    warnings.push("No RevenueCat keys are set - payments will not work")
  }

  if (!config.posthogApiKey && config.appEnv !== "development") {
    warnings.push("posthogApiKey is not set - analytics will not work")
  }

  if (!config.sentryDsn && config.appEnv !== "development") {
    warnings.push("sentryDsn is not set - error tracking will not work")
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  }
}

// Get and validate configuration
const env = getEnvConfig()
const validation = validateEnvConfig(env)

// Store validation results for logging during app initialization
// (logger might not be ready during module load)
export const envValidation = validation

// Export configuration
export { env }

/**
 * Check if running in development mode
 */
export const isDevelopment = env.appEnv === "development"

/**
 * Check if running in production mode
 */
export const isProduction = env.appEnv === "production"

/**
 * Check if running in staging mode
 */
export const isStaging = env.appEnv === "staging"

/**
 * Check if a service is configured
 */
export function isServiceConfigured(
  service: "supabase" | "revenuecat" | "posthog" | "sentry" | "google" | "apple",
): boolean {
  switch (service) {
    case "supabase":
      return !!(env.supabaseUrl && env.supabasePublishableKey)
    case "revenuecat":
      return !!(env.revenueCatIosKey || env.revenueCatAndroidKey || env.revenueCatWebKey)
    case "posthog":
      return !!env.posthogApiKey
    case "sentry":
      return !!env.sentryDsn
    case "google":
      // Google OAuth requires at least the client ID
      // Note: For Supabase OAuth, the provider must also be enabled in Supabase dashboard
      return !!env.googleClientId
    case "apple":
      // Apple Sign-In requires services ID and team ID at minimum
      // Note: For Supabase OAuth, the provider must also be enabled in Supabase dashboard
      return !!(env.appleServicesId && env.appleTeamId)
    default:
      return false
  }
}

/**
 * Log environment validation results
 * Call this during app initialization (after logger is ready)
 */
export function logEnvValidation(): void {
  if (!validation.isValid) {
    logger.error("Environment configuration is invalid", {
      missing: validation.missing,
    })
  }

  if (validation.warnings.length > 0 && __DEV__) {
    logger.warn("Environment configuration warnings", {
      warnings: validation.warnings,
    })
  }
}
