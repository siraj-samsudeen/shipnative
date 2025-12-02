/**
 * RevenueCat Service
 *
 * Unified subscription management for iOS, Android, and Web using RevenueCat.
 * - Mobile: Uses react-native-purchases SDK
 * - Web: Uses @revenuecat/purchases-js SDK (Web Billing)
 */

import { Platform } from "react-native"

import { mockRevenueCat } from "./mocks/revenueCat"
import type { PricingPackage, SubscriptionService, SubscriptionInfo } from "../types/subscription"
import { isDevelopment } from "../config/env"

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

// Load appropriate SDK based on platform
if (Platform.OS !== "web" && !useMock) {
  try {
    MobilePurchases = require("react-native-purchases").default
  } catch (e) {
    console.warn("Failed to load react-native-purchases", e)
  }
}

if (Platform.OS === "web" && !useMock) {
  try {
    WebPurchases = require("@revenuecat/purchases-js")
  } catch (e) {
    console.warn("Failed to load @revenuecat/purchases-js", e)
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

    if (MobilePurchases && mobileApiKey) {
      await MobilePurchases.configure({ apiKey: mobileApiKey })
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

    const customerInfo = await MobilePurchases.logOut()
    return { subscriptionInfo: toSubscriptionInfo(customerInfo, "revenuecat") }
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
    } catch (error) {
      console.error("Error fetching packages:", error)
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

    // Web SDK is configured per-user in logIn
    if (__DEV__) {
      console.log("🌐 [RevenueCat Web] Ready for configuration")
    }
  },

  logIn: async (userId: string) => {
    if (useMock) {
      const result = await mockRevenueCat.logIn(userId)
      return { subscriptionInfo: toSubscriptionInfo(result.customerInfo, "revenuecat-web") }
    }

    if (!WebPurchases || !webApiKey) {
      console.warn("RevenueCat Web SDK not available")
      return { subscriptionInfo: toSubscriptionInfo(null, "revenuecat-web") }
    }

    try {
      // Configure Web SDK with user ID
      webPurchasesInstance = WebPurchases.Purchases.configure({
        apiKey: webApiKey,
        appUserId: userId,
      })

      if (__DEV__) {
        console.log("🌐 [RevenueCat Web] Logged in:", userId)
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
      console.log("🌐 [RevenueCat Web] Logged out")
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
      console.error("Failed to get web customer info:", error)
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
        console.warn("RevenueCat Web not initialized - call logIn first")
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
    } catch (error) {
      console.error("Error fetching web packages:", error)
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
        console.log("🌐 [RevenueCat Web] Purchase successful")
      }

      return { subscriptionInfo: toSubscriptionInfo(customerInfo, "revenuecat-web") }
    } catch (error: any) {
      console.error("Web purchase failed:", error)
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
      console.warn("⚠️  RevenueCat running in mock mode")
      console.log("💡 Add EXPO_PUBLIC_REVENUECAT_*_KEY to .env")
    } else {
      console.log("💰 RevenueCat initialized for", Platform.OS)
    }
  }
}

// Export both services for direct access if needed
export { revenueCatMobile, revenueCatWeb }

// Expose mock status for UI hints
export const isRevenueCatMock = useMock
