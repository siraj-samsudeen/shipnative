/**
 * Mock RevenueCat Implementation
 *
 * Provides a mock RevenueCat client for development without API keys.
 * Simulates subscription states and purchase flows for both mobile and web.
 */

import { Platform } from "react-native"

import * as storage from "../../utils/storage"

interface CustomerInfo {
  entitlements: {
    active: Record<string, any>
    all: Record<string, any>
    verification: any
  }
  activeSubscriptions: string[]
  allPurchasedProductIdentifiers: string[]
  latestExpirationDate: string | null
  originalAppUserId: string
  requestDate: string
  firstSeen: string
  originalApplicationVersion: string | null
  originalPurchaseDate: string | null
  managementURL: string | null
  allExpirationDates: Record<string, string | null>
  allPurchaseDates: Record<string, string | null>
  nonSubscriptionTransactions: any[]
  subscriptionsByProductIdentifier: Record<string, any>
}

interface PurchaseResult {
  customerInfo: CustomerInfo
  productIdentifier: string
  transaction: any
}

// Default free customer info factory
function createFreeCustomerInfo(userId: string = "mock-user"): CustomerInfo {
  return {
    entitlements: {
      active: {},
      all: {},
      verification: "NOT_REQUESTED" as any,
    },
    activeSubscriptions: [],
    allPurchasedProductIdentifiers: [],
    latestExpirationDate: null,
    originalAppUserId: userId,
    requestDate: new Date().toISOString(),
    firstSeen: new Date().toISOString(),
    originalApplicationVersion: "1.0",
    originalPurchaseDate: new Date().toISOString(),
    managementURL: "https://mock-revenuecat.com/manage",
    allExpirationDates: {},
    allPurchaseDates: {},
    nonSubscriptionTransactions: [],
    subscriptionsByProductIdentifier: {},
  }
}

// Storage key for persisting mock subscription state
const MOCK_STATE_KEY = "mock-revenuecat-state"

// Simulate network delay
const delay = (ms: number = 500) => new Promise((resolve) => setTimeout(resolve, ms))

// Platform-specific emoji for logging
const getLogPrefix = () => {
  if (Platform.OS === "web") return "🌐 [MockRevenueCat Web]"
  return "💰 [MockRevenueCat]"
}

// Mock subscription state (module-level for singleton behavior)
let mockIsPro = false
let mockCustomerInfo: CustomerInfo = createFreeCustomerInfo()

// Restore persisted mock state on module load
function restoreMockState() {
  try {
    const persisted = storage.load(MOCK_STATE_KEY) as
      | { isPro?: boolean; customerInfo?: CustomerInfo }
      | null
      | undefined
    if (persisted && typeof persisted === "object") {
      mockIsPro = persisted.isPro === true
      if (persisted.customerInfo) {
        mockCustomerInfo = persisted.customerInfo
      }
      if (__DEV__) {
        console.log(`${getLogPrefix()} Restored persisted state:`, mockIsPro ? "PRO" : "FREE")
      }
    }
  } catch (e) {
    // Ignore errors - start fresh if restore fails
    if (__DEV__) {
      console.warn(`${getLogPrefix()} Failed to restore state:`, e)
    }
  }
}

// Persist mock state
function persistMockState() {
  try {
    storage.save(MOCK_STATE_KEY, {
      isPro: mockIsPro,
      customerInfo: mockCustomerInfo,
    })
  } catch (e) {
    if (__DEV__) {
      console.warn(`${getLogPrefix()} Failed to persist state:`, e)
    }
  }
}

// Restore on module load
restoreMockState()

class MockRevenueCat {
  private configured = false

  async configure(apiKey: string, appUserID?: string) {
    await delay(300)

    this.configured = true

    if (__DEV__) {
      console.log(`${getLogPrefix()} Configured with mock API key`)
      console.log(`${getLogPrefix()} App User ID:`, appUserID || "anonymous")
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    await delay(200)

    if (__DEV__) {
      console.log(`${getLogPrefix()} Get customer info:`, mockIsPro ? "PRO" : "FREE")
    }

    return mockCustomerInfo
  }

  async purchasePackage(packageToPurchase: any): Promise<PurchaseResult> {
    await delay(1000)

    if (__DEV__) {
      console.log(
        `${getLogPrefix()} Purchase package:`,
        packageToPurchase?.identifier || packageToPurchase,
      )
    }

    // Simulate successful purchase
    mockIsPro = true
    const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    mockCustomerInfo = {
      entitlements: {
        active: {
          pro: {
            identifier: "pro",
            isActive: true,
            willRenew: true,
            periodType: "NORMAL",
            latestPurchaseDate: new Date().toISOString(),
            expirationDate,
            productIdentifier: "pro_monthly",
          },
        },
        all: {
          pro: {
            identifier: "pro",
            isActive: true,
          },
        },
        verification: "VERIFIED" as any,
      },
      activeSubscriptions: ["pro_monthly"],
      allPurchasedProductIdentifiers: ["pro_monthly"],
      latestExpirationDate: expirationDate,
      originalAppUserId: mockCustomerInfo.originalAppUserId,
      requestDate: new Date().toISOString(),
      firstSeen: mockCustomerInfo.firstSeen,
      originalApplicationVersion: "1.0",
      originalPurchaseDate: new Date().toISOString(),
      managementURL: "https://mock-revenuecat.com/manage",
      allExpirationDates: { pro_monthly: expirationDate },
      allPurchaseDates: { pro_monthly: new Date().toISOString() },
      nonSubscriptionTransactions: [],
      subscriptionsByProductIdentifier: {
        pro_monthly: {
          identifier: "pro_monthly",
          isActive: true,
          willRenew: true,
          periodType: "NORMAL",
          latestPurchaseDate: new Date().toISOString(),
          expirationDate,
        },
      },
    }

    // Persist state after purchase
    persistMockState()

    if (__DEV__) {
      console.log(`${getLogPrefix()} Purchase successful! Now PRO until:`, expirationDate)
    }

    return {
      customerInfo: mockCustomerInfo,
      productIdentifier: "pro_monthly",
      transaction: {
        transactionIdentifier: `mock-transaction-${Date.now()}`,
        productIdentifier: "pro_monthly",
        purchaseDate: new Date().toISOString(),
      },
    }
  }

  async restorePurchases(): Promise<CustomerInfo> {
    await delay(500)

    if (__DEV__) {
      console.log(`${getLogPrefix()} Restore purchases`)
    }

    return mockCustomerInfo
  }

  async getOfferings(): Promise<any> {
    await delay(300)

    if (__DEV__) {
      console.log(`${getLogPrefix()} Get offerings`)
    }

    // Return format that works for both mobile and web SDK
    return {
      current: {
        identifier: "default",
        availablePackages: [
          {
            identifier: "monthly",
            packageType: "MONTHLY",
            product: {
              identifier: "pro_monthly",
              description: "Pro Monthly Subscription",
              title: "Pro Monthly",
              price: 9.99,
              priceString: "$9.99",
              currencyCode: "USD",
            },
            // Web SDK format
            rcBillingProduct: {
              displayName: "Pro Monthly",
              description: "Pro Monthly Subscription",
              currentPrice: {
                amountMicros: 9990000,
                formattedPrice: "$9.99",
                currency: "USD",
              },
            },
          },
          {
            identifier: "annual",
            packageType: "ANNUAL",
            product: {
              identifier: "pro_annual",
              description: "Pro Annual Subscription - Save 20%",
              title: "Pro Annual",
              price: 99.99,
              priceString: "$99.99",
              currencyCode: "USD",
            },
            // Web SDK format
            rcBillingProduct: {
              displayName: "Pro Annual",
              description: "Pro Annual Subscription - Save 20%",
              currentPrice: {
                amountMicros: 99990000,
                formattedPrice: "$99.99",
                currency: "USD",
              },
            },
          },
        ],
      },
      all: {},
    }
  }

  async getPackages(): Promise<any[]> {
    await delay(300)
    const offerings = await this.getOfferings()
    const platform = Platform.OS === "web" ? "revenuecat-web" : "revenuecat"

    return offerings.current.availablePackages.map((pkg: any) => ({
      id: pkg.identifier,
      identifier: pkg.identifier,
      title: pkg.product.title,
      description: pkg.product.description,
      price: pkg.product.price,
      priceString: pkg.product.priceString,
      currencyCode: pkg.product.currencyCode,
      billingPeriod: pkg.packageType === "ANNUAL" ? "annual" : "monthly",
      platform,
      platformData: pkg,
    }))
  }

  async setAttributes(attributes: Record<string, string | null>) {
    if (__DEV__) {
      console.log(`${getLogPrefix()} Set attributes:`, attributes)
    }
  }

  async logIn(appUserID: string): Promise<{ customerInfo: CustomerInfo }> {
    await delay(200)

    if (__DEV__) {
      console.log(`${getLogPrefix()} Log in:`, appUserID)
    }

    // Restore persisted state for this user (if exists)
    restoreMockState()

    // Update user ID while preserving subscription state
    mockCustomerInfo.originalAppUserId = appUserID

    return { customerInfo: mockCustomerInfo }
  }

  async logOut(): Promise<{ customerInfo: CustomerInfo }> {
    await delay(200)

    if (__DEV__) {
      console.log(`${getLogPrefix()} Log out`)
    }

    // Reset to free tier
    mockIsPro = false
    mockCustomerInfo = createFreeCustomerInfo("anonymous")

    // Persist reset state
    persistMockState()

    return { customerInfo: mockCustomerInfo }
  }

  // Helper method to manually set pro status for testing
  setProStatus(isPro: boolean) {
    if (__DEV__) {
      console.log(`${getLogPrefix()} Set pro status:`, isPro)
      mockIsPro = isPro

      if (isPro) {
        const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        mockCustomerInfo.entitlements.active.pro = {
          identifier: "pro",
          isActive: true,
          willRenew: true,
          periodType: "NORMAL",
          latestPurchaseDate: new Date().toISOString(),
          expirationDate,
          productIdentifier: "pro_monthly",
        }
        mockCustomerInfo.activeSubscriptions = ["pro_monthly"]
        mockCustomerInfo.latestExpirationDate = expirationDate
      } else {
        mockCustomerInfo.entitlements.active = {}
        mockCustomerInfo.activeSubscriptions = []
        mockCustomerInfo.latestExpirationDate = null
      }

      // Persist state change
      persistMockState()
    }
  }

  addCustomerInfoUpdateListener(listener: (customerInfo: CustomerInfo) => void) {
    if (__DEV__) {
      console.log(`${getLogPrefix()} Added customer info update listener`)
    }
    // Immediately call with current info
    listener(mockCustomerInfo)

    return () => {
      if (__DEV__) {
        console.log(`${getLogPrefix()} Removed customer info update listener`)
      }
    }
  }

  /**
   * Reset all mock state (for testing/HMR)
   */
  reset() {
    mockIsPro = false
    mockCustomerInfo = createFreeCustomerInfo()
    this.configured = false

    // Clear persisted state
    try {
      storage.remove(MOCK_STATE_KEY)
    } catch {
      // Ignore errors
    }

    if (__DEV__) {
      console.log(`${getLogPrefix()} Reset to initial state`)
    }
  }

  /**
   * Check if user is Pro (for testing)
   */
  getIsPro(): boolean {
    return mockIsPro
  }

  /**
   * Get management URL for web
   */
  async getManagementUrl(): Promise<string | null> {
    return mockCustomerInfo.managementURL
  }
}

export const mockRevenueCat = new MockRevenueCat()
export { MockRevenueCat }
