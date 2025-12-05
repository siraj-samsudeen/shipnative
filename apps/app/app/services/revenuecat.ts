/**
 * RevenueCat Service
 *
 * Unified subscription management for iOS, Android, and Web using RevenueCat.
 * - Mobile: Uses react-native-purchases SDK
 * - Web: Uses @revenuecat/purchases-js SDK (Web Billing)
 */

import { Platform } from "react-native"

import { logger } from "../utils/Logger"
import { mockRevenueCat } from "./mocks/revenueCat"
import { isDevelopment } from "../config/env"
import type { PricingPackage, SubscriptionService, SubscriptionInfo } from "../types/subscription"

// API Keys
const mobileApiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
})
const webApiKey = process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY

// Determine if we should use mock
const isDevEnv = __DEV__ || isDevelopment
const useMock =
  (isDevEnv && !mobileApiKey && Platform.OS !== "web") ||
  (isDevEnv && !webApiKey && Platform.OS === "web")

// SDK instances
let MobilePurchases: any = null
let WebPurchases: any = null

// Track initialization state to prevent double configuration (e.g., on hot reload)
let isMobileConfigured = false
let isWebConfigured = false

// Load appropriate SDK based on platform
if (Platform.OS !== "web" && !useMock) {
  try {
    MobilePurchases = require("react-native-purchases").default
  } catch {
    // Failed to load react-native-purchases - will use mock
  }
}

if (Platform.OS === "web" && !useMock) {
  try {
    WebPurchases = require("@revenuecat/purchases-js")
  } catch {
    // Failed to load @revenuecat/purchases-js - will use mock
  }
}

// Web SDK instance (singleton)
let webPurchasesInstance: any = null

/**
 * Convert RevenueCat customer info to unified SubscriptionInfo
 */
function toSubscriptionInfo(
  customerInfo: any,
  platform: "revenuecat" | "revenuecat-web",
): SubscriptionInfo {
  if (!customerInfo) {
    return {
      platform,
      status: "none",
      productId: null,
      expirationDate: null,
      willRenew: false,
      isActive: false,
      isTrial: false,
    }
  }

  // Check for active "pro" entitlement
  const proEntitlement = customerInfo.entitlements?.active?.pro
  const isActive = !!proEntitlement

  return {
    platform,
    status: isActive ? "active" : "none",
    productId: proEntitlement?.productIdentifier || null,
    expirationDate: proEntitlement?.expirationDate || customerInfo.latestExpirationDate || null,
    willRenew: proEntitlement?.willRenew ?? false,
    isActive,
    isTrial: proEntitlement?.periodType === "TRIAL" || proEntitlement?.periodType === "trial",
  }
}

/**
 * RevenueCat Service for Mobile (iOS/Android)
 */
const revenueCatMobile: SubscriptionService = {
  platform: "revenuecat",

  configure: async () => {
    if (useMock) {
      await mockRevenueCat.configure("mock-api-key")
      return
    }

    // Prevent double configuration (e.g., on hot reload)
    if (isMobileConfigured) {
      if (__DEV__) {
        logger.debug("[RevenueCat] Already configured, skipping...")
      }
      return
    }

    if (MobilePurchases && mobileApiKey) {
      // Set log level BEFORE configure (best practice per RevenueCat docs)
      if (__DEV__) {
        MobilePurchases.setLogLevel(MobilePurchases.LOG_LEVEL.DEBUG)
      } else {
        MobilePurchases.setLogLevel(MobilePurchases.LOG_LEVEL.INFO)
      }

      // Set custom log handler to filter out expected errors and show helpful messages
      // This prevents "no products configured" errors from causing stack traces
      // when intercepted by Sentry's console instrumentation
      let hasShownSetupMessage = false
      MobilePurchases.setLogHandler((logLevel: number, message: string) => {
        // Filter out expected errors that are normal when products aren't configured
        // These errors occur when API keys are added but products haven't been created yet
        const expectedErrorPatterns = [
          "no products registered",
          "offerings",
          "There are no products",
          "RevenueCat SDK Configuration is not valid",
          "Your app doesn't have any products set up",
          "why-are-offerings-empty",
          "error fetching offerings",
          "operation couldn't be completed",
          "offeringsmanager.error",
          "health report",
          "configuration is not valid",
          "can't make any purchases",
          "purchases instance already set",
          "already configured",
        ]

        const isExpectedError = expectedErrorPatterns.some((pattern) =>
          message.toLowerCase().includes(pattern.toLowerCase()),
        )

        // Suppress ALL expected errors (they're normal during setup)
        // Show helpful message only once for the first occurrence
        if (isExpectedError) {
          if (!hasShownSetupMessage) {
            hasShownSetupMessage = true
            try {
              // Use console.log instead of console.error to avoid Sentry interception
              // and show a clear, actionable message
              logger.info(
                "\n📦 [RevenueCat] Setup Required\n" +
                  "─────────────────────────────────────────────\n" +
                  "To enable subscriptions, configure products in your RevenueCat dashboard:\n" +
                  "1. Go to https://app.revenuecat.com\n" +
                  "2. Navigate to Products → Product Catalog\n" +
                  "3. Create products and add them to an Offering\n" +
                  "4. See: https://rev.cat/how-to-configure-offerings\n" +
                  "\n" +
                  "⚠️  These errors are EXPECTED and NORMAL when API keys are added before products.\n" +
                  "   They will disappear once you create products in the RevenueCat dashboard.\n" +
                  "   You can safely ignore them if you're not using subscriptions yet.\n" +
                  "─────────────────────────────────────────────\n",
              )
            } catch {
              // Silently fail if logging causes issues
            }
          }
          // Suppress this error - don't log it at all
          return
        }

        // Log unexpected errors and other messages
        // Use try-catch to prevent any issues with console methods
        try {
          if (logLevel === MobilePurchases.LOG_LEVEL.ERROR) {
            // Only log unexpected errors
            logger.error(`[RevenueCat] ${message}`)
          } else if (logLevel === MobilePurchases.LOG_LEVEL.WARN) {
            logger.warn(`[RevenueCat] ${message}`)
          } else if (logLevel === MobilePurchases.LOG_LEVEL.DEBUG && __DEV__) {
            logger.debug(`[RevenueCat] ${message}`)
          } else if (logLevel === MobilePurchases.LOG_LEVEL.INFO) {
            logger.info(`[RevenueCat] ${message}`)
          }
        } catch {
          // Silently fail if logging causes issues
          // This prevents infinite loops or stack traces
        }
      })

      // Configure SDK with API key
      try {
        await MobilePurchases.configure({ apiKey: mobileApiKey })
        isMobileConfigured = true
      } catch (error: any) {
        // If already configured (e.g., on hot reload), that's okay
        const errorMessage = error?.message || error?.toString() || ""
        const isAlreadyConfigured =
          errorMessage.includes("already set") ||
          errorMessage.includes("already configured") ||
          errorMessage.includes("Purchases instance already set")

        if (isAlreadyConfigured) {
          isMobileConfigured = true
          if (__DEV__) {
            logger.debug("[RevenueCat] Already configured (hot reload detected)")
          }
        } else {
          throw error
        }
      }
    }
  },

  logIn: async (userId: string) => {
    if (useMock) {
      const result = await mockRevenueCat.logIn(userId)
      return { subscriptionInfo: toSubscriptionInfo(result.customerInfo, "revenuecat") }
    }

    const result = await MobilePurchases.logIn(userId)
    return { subscriptionInfo: toSubscriptionInfo(result.customerInfo, "revenuecat") }
  },

  logOut: async () => {
    if (useMock) {
      const result = await mockRevenueCat.logOut()
      return { subscriptionInfo: toSubscriptionInfo(result.customerInfo, "revenuecat") }
    }

    try {
      // Check if user is anonymous before attempting logout
      // RevenueCat throws an error if you try to log out an anonymous user
      const isAnonymous = await MobilePurchases.isAnonymous()
      if (isAnonymous) {
        // User is already anonymous, just get current info
        const customerInfo = await MobilePurchases.getCustomerInfo()
        return { subscriptionInfo: toSubscriptionInfo(customerInfo, "revenuecat") }
      }

      // User is authenticated, safe to log out
      const customerInfo = await MobilePurchases.logOut()
      return { subscriptionInfo: toSubscriptionInfo(customerInfo, "revenuecat") }
    } catch (error: any) {
      // If logout fails (e.g., user is anonymous), just get current info
      if (error?.message?.includes("anonymous") || error?.code === "22") {
        try {
          const customerInfo = await MobilePurchases.getCustomerInfo()
          return { subscriptionInfo: toSubscriptionInfo(customerInfo, "revenuecat") }
        } catch {
          // If getting info also fails, return empty state
          return { subscriptionInfo: toSubscriptionInfo(null, "revenuecat") }
        }
      }
      // Re-throw other errors
      throw error
    }
  },

  getSubscriptionInfo: async () => {
    if (useMock) {
      const info = await mockRevenueCat.getCustomerInfo()
      return toSubscriptionInfo(info, "revenuecat")
    }

    const info = await MobilePurchases.getCustomerInfo()
    return toSubscriptionInfo(info, "revenuecat")
  },

  getPackages: async () => {
    try {
      if (useMock) {
        return await mockRevenueCat.getPackages()
      }

      const offerings = await MobilePurchases.getOfferings()
      if (!offerings.current || !offerings.current.availablePackages) return []

      return offerings.current.availablePackages.map((pkg: any) => ({
        id: pkg.identifier,
        identifier: pkg.identifier,
        title: pkg.product.title,
        description: pkg.product.description,
        price: pkg.product.price,
        priceString: pkg.product.priceString,
        currencyCode: pkg.product.currencyCode,
        billingPeriod: pkg.packageType === "ANNUAL" ? "annual" : "monthly",
        platform: "revenuecat" as const,
        platformData: pkg,
      }))
    } catch (error: any) {
      // Handle "no products configured" error gracefully
      // This is expected when RevenueCat dashboard isn't set up yet
      if (
        error?.message?.includes("no products registered") ||
        error?.message?.includes("offerings") ||
        error?.code === "23" ||
        error?.code === "1"
      ) {
        if (__DEV__) {
          logger.info(
            "ℹ️ [RevenueCat] No products configured yet. This is normal if you haven't set up products in the RevenueCat dashboard.",
          )
        }
        return []
      }
      // Log other errors
      logger.error("Error fetching packages", {}, error as Error)
      return []
    }
  },

  purchasePackage: async (pkg: PricingPackage) => {
    try {
      if (useMock) {
        const result = await mockRevenueCat.purchasePackage(pkg.platformData)
        return { subscriptionInfo: toSubscriptionInfo(result.customerInfo, "revenuecat") }
      }

      const result = await MobilePurchases.purchasePackage(pkg.platformData)
      return { subscriptionInfo: toSubscriptionInfo(result.customerInfo, "revenuecat") }
    } catch (error: any) {
      return {
        subscriptionInfo: await revenueCatMobile.getSubscriptionInfo(),
        error,
      }
    }
  },

  restorePurchases: async () => {
    try {
      if (useMock) {
        const info = await mockRevenueCat.restorePurchases()
        return { subscriptionInfo: toSubscriptionInfo(info, "revenuecat") }
      }

      const info = await MobilePurchases.restorePurchases()
      return { subscriptionInfo: toSubscriptionInfo(info, "revenuecat") }
    } catch (error: any) {
      return {
        subscriptionInfo: await revenueCatMobile.getSubscriptionInfo(),
        error,
      }
    }
  },

  addSubscriptionUpdateListener: (listener) => {
    if (useMock) {
      return mockRevenueCat.addCustomerInfoUpdateListener((info: any) => {
        listener(toSubscriptionInfo(info, "revenuecat"))
      })
    }

    const nativeListener = (customerInfo: any) => {
      listener(toSubscriptionInfo(customerInfo, "revenuecat"))
    }

    MobilePurchases?.addCustomerInfoUpdateListener(nativeListener)

    return () => {
      MobilePurchases?.removeCustomerInfoUpdateListener(nativeListener)
    }
  },
}

/**
 * RevenueCat Service for Web (Web Billing)
 */
const revenueCatWeb: SubscriptionService = {
  platform: "revenuecat-web",

  configure: async () => {
    if (useMock) {
      await mockRevenueCat.configure("mock-api-key")
      return
    }

    // Prevent double configuration
    if (isWebConfigured) {
      if (__DEV__) {
        logger.debug("[RevenueCat Web] Already configured, skipping...")
      }
      return
    }

    // Web SDK is configured per-user in logIn
    // Mark as configured to prevent double initialization
    isWebConfigured = true
    if (__DEV__) {
      logger.info("🌐 [RevenueCat Web] Ready for configuration")
    }
  },

  logIn: async (userId: string) => {
    if (useMock) {
      const result = await mockRevenueCat.logIn(userId)
      return { subscriptionInfo: toSubscriptionInfo(result.customerInfo, "revenuecat-web") }
    }

    if (!WebPurchases || !webApiKey) {
      logger.warn("RevenueCat Web SDK not available")
      return { subscriptionInfo: toSubscriptionInfo(null, "revenuecat-web") }
    }

    try {
      // Configure Web SDK with user ID
      webPurchasesInstance = WebPurchases.Purchases.configure({
        apiKey: webApiKey,
        appUserId: userId,
      })

      if (__DEV__) {
        logger.info("🌐 [RevenueCat Web] Logged in", { userId })
      }

      const customerInfo = await webPurchasesInstance.getCustomerInfo()
      return { subscriptionInfo: toSubscriptionInfo(customerInfo, "revenuecat-web") }
    } catch (error) {
      console.error("RevenueCat Web login failed:", error)
      return { subscriptionInfo: toSubscriptionInfo(null, "revenuecat-web") }
    }
  },

  logOut: async () => {
    if (useMock) {
      const result = await mockRevenueCat.logOut()
      return { subscriptionInfo: toSubscriptionInfo(result.customerInfo, "revenuecat-web") }
    }

    webPurchasesInstance = null

    if (__DEV__) {
      logger.info("🌐 [RevenueCat Web] Logged out")
    }

    return { subscriptionInfo: toSubscriptionInfo(null, "revenuecat-web") }
  },

  getSubscriptionInfo: async () => {
    if (useMock) {
      const info = await mockRevenueCat.getCustomerInfo()
      return toSubscriptionInfo(info, "revenuecat-web")
    }

    if (!webPurchasesInstance) {
      return toSubscriptionInfo(null, "revenuecat-web")
    }

    try {
      const customerInfo = await webPurchasesInstance.getCustomerInfo()
      return toSubscriptionInfo(customerInfo, "revenuecat-web")
    } catch (error) {
      logger.error("Failed to get web customer info", {}, error as Error)
      return toSubscriptionInfo(null, "revenuecat-web")
    }
  },

  getPackages: async () => {
    try {
      if (useMock) {
        const packages = await mockRevenueCat.getPackages()
        return packages.map((pkg: any) => ({ ...pkg, platform: "revenuecat-web" as const }))
      }

      if (!webPurchasesInstance) {
        logger.warn("RevenueCat Web not initialized - call logIn first")
        return []
      }

      const offerings = await webPurchasesInstance.getOfferings()
      if (!offerings.current || !offerings.current.availablePackages) return []

      return offerings.current.availablePackages.map((pkg: any) => ({
        id: pkg.identifier,
        identifier: pkg.identifier,
        title: pkg.rcBillingProduct?.displayName || pkg.identifier,
        description: pkg.rcBillingProduct?.description || "",
        price: pkg.rcBillingProduct?.currentPrice?.amountMicros / 1_000_000 || 0,
        priceString: pkg.rcBillingProduct?.currentPrice?.formattedPrice || "",
        currencyCode: pkg.rcBillingProduct?.currentPrice?.currency || "USD",
        billingPeriod: pkg.packageType === "ANNUAL" ? "annual" : "monthly",
        platform: "revenuecat-web" as const,
        platformData: pkg,
      }))
    } catch (error: any) {
      // Handle "no products configured" error gracefully
      // This is expected when RevenueCat dashboard isn't set up yet
      if (
        error?.message?.includes("no products registered") ||
        error?.message?.includes("offerings") ||
        error?.code === "23" ||
        error?.code === "1"
      ) {
        if (__DEV__) {
          logger.info(
            "ℹ️ [RevenueCat Web] No products configured yet. This is normal if you haven't set up products in the RevenueCat dashboard.",
          )
        }
        return []
      }
      // Log other errors
      logger.error("Error fetching web packages", {}, error as Error)
      return []
    }
  },

  purchasePackage: async (pkg: PricingPackage) => {
    try {
      if (useMock) {
        const result = await mockRevenueCat.purchasePackage(pkg.platformData)
        return { subscriptionInfo: toSubscriptionInfo(result.customerInfo, "revenuecat-web") }
      }

      if (!webPurchasesInstance) {
        throw new Error("RevenueCat Web not initialized")
      }

      // Web SDK purchase - this opens a checkout modal/redirect
      const { customerInfo } = await webPurchasesInstance.purchase({ rcPackage: pkg.platformData })

      if (__DEV__) {
        logger.info("🌐 [RevenueCat Web] Purchase successful")
      }

      return { subscriptionInfo: toSubscriptionInfo(customerInfo, "revenuecat-web") }
    } catch (error: any) {
      logger.error("Web purchase failed", {}, error as Error)
      return {
        subscriptionInfo: await revenueCatWeb.getSubscriptionInfo(),
        error,
      }
    }
  },

  restorePurchases: async () => {
    // Web doesn't have "restore" in the same sense - we just refetch customer info
    const subscriptionInfo = await revenueCatWeb.getSubscriptionInfo()
    return { subscriptionInfo }
  },

  getManagementUrl: async () => {
    if (useMock) {
      return "https://mock-revenuecat.com/manage"
    }

    if (!webPurchasesInstance) {
      return null
    }

    try {
      const customerInfo = await webPurchasesInstance.getCustomerInfo()
      return customerInfo.managementURL || null
    } catch {
      return null
    }
  },
}

/**
 * Get the appropriate RevenueCat service based on platform
 */
export function getRevenueCatService(): SubscriptionService {
  if (Platform.OS === "web") {
    return revenueCatWeb
  }
  return revenueCatMobile
}

/**
 * Export the appropriate service based on platform
 */
export const revenueCat = getRevenueCatService()

/**
 * Initialize RevenueCat (call on app startup)
 */
export const initRevenueCat = async () => {
  await revenueCat.configure({})

  if (__DEV__) {
    if (useMock) {
      logger.warn("⚠️  RevenueCat running in mock mode")
      logger.info("💡 Add EXPO_PUBLIC_REVENUECAT_*_KEY to .env")
    } else {
      logger.info("💰 RevenueCat initialized", { platform: Platform.OS })
    }
  }
}

// Export both services for direct access if needed
export { revenueCatMobile, revenueCatWeb }

// Expose mock status for UI hints
export const isRevenueCatMock = useMock
