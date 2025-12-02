import { Linking } from "react-native"
import type * as Notifications from "expo-notifications"

import { logger } from "./Logger"
import { supabase } from "../services/supabase"

// Note: Navigation will be handled by React Navigation in the app
// This file provides utility functions for parsing deep links
// Actual navigation should be done via navigationRef in your navigators

/**
 * Deep link URL scheme
 * Format: shipnative://screen/path?param=value
 */
export const DEEP_LINK_SCHEME = "shipnative"

/**
 * Parse deep link URL into components
 */
export function parseDeepLink(url: string): {
  screen?: string
  path?: string
  params?: Record<string, string>
} | null {
  try {
    const parsedUrl = new URL(url)

    // Check if it's our scheme
    if (parsedUrl.protocol !== `${DEEP_LINK_SCHEME}:`) {
      return null
    }

    // Extract screen/path
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean)
    const screen = pathParts[0]
    const path = pathParts.slice(1).join("/")

    // Extract query params
    const params: Record<string, string> = {}
    parsedUrl.searchParams.forEach((value, key) => {
      params[key] = value
    })

    return {
      screen,
      path: path || undefined,
      params: Object.keys(params).length > 0 ? params : undefined,
    }
  } catch (error) {
    logger.error("[DeepLinking] Error parsing deep link", {}, error as Error)
    return null
  }
}

/**
 * Validate token for sensitive deep links (reset-password, verify-email)
 * SECURITY: Basic validation - full validation happens when user submits the form
 * 
 * Note: We perform basic checks here (format, length) but defer full validation
 * to the actual password reset/email verification flows where Supabase validates
 * the token server-side.
 */
async function validateDeepLinkToken(
  screen: string,
  token?: string,
): Promise<boolean> {
  if (!token) {
    return false
  }

  // Only validate tokens for sensitive screens
  if (screen !== "reset-password" && screen !== "verify-email") {
    return true
  }

  try {
    // Basic token validation - check format and length
    // Full validation happens in the actual reset/verify flows
    if (screen === "reset-password") {
      // Password reset tokens are typically JWT or similar format
      // Basic check: token should be non-empty and have reasonable length
      return token.length > 10 && token.length < 1000
    }

    if (screen === "verify-email") {
      // Email verification tokens are typically UUIDs or similar
      // Basic check: token should be non-empty and have reasonable length
      return token.length > 10 && token.length < 1000
    }

    return false
  } catch (error) {
    logger.error("[DeepLinking] Token validation failed", { screen }, error as Error)
    return false
  }
}

/**
 * Handle deep link navigation
 * Returns parsed link data for the app to handle navigation
 * SECURITY: Validates tokens for sensitive operations
 */
export async function handleDeepLink(url: string): Promise<{
  screen: string
  params?: Record<string, string>
} | null> {
  const parsed = parseDeepLink(url)

  if (!parsed || !parsed.screen) {
    if (__DEV__) {
      logger.warn("[DeepLinking] Invalid deep link", { url })
    }
    return null
  }

  // SECURITY: Validate tokens for sensitive deep links
  if (parsed.params?.token) {
    const isValid = await validateDeepLinkToken(parsed.screen, parsed.params.token)
    if (!isValid) {
      logger.warn("[DeepLinking] Invalid token in deep link", {
        screen: parsed.screen,
        // Don't log the actual token
      })
      return null
    }
  }

  if (__DEV__) {
    logger.debug("[DeepLinking] Parsed deep link", {
      screen: parsed.screen,
      hasParams: !!parsed.params,
      // Don't log params as they may contain tokens
    })
  }

  // Return parsed data for app to handle navigation with React Navigation
  return {
    screen: parsed.screen,
    params: parsed.params,
  }
}

/**
 * Generate deep link URL
 */
export function generateDeepLink(screen: string, params?: Record<string, string>): string {
  let url = `${DEEP_LINK_SCHEME}://${screen}`

  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params).toString()
    url += `?${queryString}`
  }

  return url
}

/**
 * Common deep link routes
 */
export const DeepLinkRoutes = {
  // Auth
  RESET_PASSWORD: (token: string) => generateDeepLink("reset-password", { token }),
  VERIFY_EMAIL: (token: string) => generateDeepLink("verify-email", { token }),

  // App screens
  PROFILE: () => generateDeepLink("profile"),
  PAYWALL: () => generateDeepLink("paywall"),
  SETTINGS: () => generateDeepLink("settings"),

  // Referral
  REFERRAL: (code: string) => generateDeepLink("referral", { code }),

  // Share
  SHARE_CONTENT: (id: string) => generateDeepLink("share", { id }),
}

/**
 * Handle deep link from notification
 * Returns parsed link for app to handle navigation
 */
export function handleNotificationDeepLink(response: Notifications.NotificationResponse): {
  screen: string
  params?: Record<string, string>
} | null {
  const data = response.notification.request.content.data

  if (data?.deepLink) {
    // If notification has full deep link URL
    return handleDeepLink(data.deepLink as string)
  } else if (data?.screen) {
    // If notification has screen and params
    return {
      screen: data.screen as string,
      params: data.params as Record<string, string>,
    }
  }

  return null
}

/**
 * Initialize deep linking
 * Pass a callback to handle navigation with React Navigation
 */
export async function initializeDeepLinking(
  onDeepLink?: (linkData: { screen: string; params?: Record<string, string> }) => void,
) {
  // Handle app opened from deep link (app was closed)
  const initialUrl = await Linking.getInitialURL()
  if (initialUrl) {
    if (__DEV__) {
      logger.debug("[DeepLinking] App opened with URL", {
        // Don't log full URL as it may contain tokens
        hasUrl: !!initialUrl,
      })
    }
    const parsed = await handleDeepLink(initialUrl)
    if (parsed && onDeepLink) {
      onDeepLink(parsed)
    }
  }

  // Handle deep links while app is running
  const subscription = Linking.addEventListener("url", async ({ url }) => {
    if (__DEV__) {
      logger.debug("[DeepLinking] Received URL while running", {
        // Don't log full URL as it may contain tokens
        hasUrl: !!url,
      })
    }
    const parsed = await handleDeepLink(url)
    if (parsed && onDeepLink) {
      onDeepLink(parsed)
    }
  })

  return subscription
}

/**
 * Deep linking utilities export
 */
export const deepLinking = {
  parse: parseDeepLink,
  handle: handleDeepLink,
  generate: generateDeepLink,
  initialize: initializeDeepLinking,
  handleNotification: handleNotificationDeepLink,
  routes: DeepLinkRoutes,
  scheme: DEEP_LINK_SCHEME,
}
