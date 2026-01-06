/**
 * Platform-agnostic subscription types
 *
 * These types provide a unified interface for subscription management
 * across all platforms using RevenueCat (iOS, Android, and Web)
 */

export type SubscriptionPlatform = "revenuecat" | "revenuecat-web" | "mock"

export type SubscriptionStatus = "active" | "cancelled" | "expired" | "trial" | "none"

/**
 * Subscription lifecycle events
 */
export type SubscriptionLifecycleEvent =
  | "trial_started"
  | "trial_converted"
  | "trial_cancelled"
  | "subscription_started"
  | "subscription_renewed"
  | "subscription_cancelled"
  | "subscription_expired"
  | "subscription_paused"
  | "subscription_restored"
  | "billing_issue"

export interface SubscriptionLifecycleData {
  event: SubscriptionLifecycleEvent
  timestamp: string
  productId: string | null
  expirationDate: string | null
  cancellationReason?: string
}

export interface SubscriptionInfo {
  platform: SubscriptionPlatform
  status: SubscriptionStatus
  productId: string | null
  expirationDate: string | null
  willRenew: boolean
  isActive: boolean
  isTrial: boolean
  // Enhanced fields
  introPrice?: string | null // Introductory pricing (e.g., "$0.99 for first month")
  introPricePeriod?: string | null // "1 month", "3 months", etc.
  freeTrialPeriod?: string | null // "7 days", "14 days", etc.
  originalPurchaseDate?: string | null
  billingIssueDetectedAt?: string | null
  gracePeriodExpiresAt?: string | null
}

export interface PricingPackage {
  id: string
  identifier: string
  title: string
  description: string
  price: number
  priceString: string
  currencyCode: string
  billingPeriod: "monthly" | "annual" | "lifetime"
  platform: SubscriptionPlatform
  // Platform-specific data
  platformData?: unknown
  // Enhanced pricing information
  introPrice?: number | null // Intro price amount (e.g., 0.99)
  introPriceString?: string | null // Formatted intro price (e.g., "$0.99")
  introPricePeriod?: string | null // "1 month", "3 months"
  introPricePeriodUnit?: "day" | "week" | "month" | "year" | null
  introPricePeriodCount?: number | null // Number of periods (e.g., 3 for "3 months")
  freeTrialPeriod?: string | null // Formatted trial period (e.g., "7 days")
  freeTrialPeriodUnit?: "day" | "week" | "month" | "year" | null
  freeTrialPeriodCount?: number | null
}

export interface SubscriptionService {
  platform: SubscriptionPlatform

  // Initialization
  configure(config: Record<string, unknown>): Promise<void>

  // User management
  logIn(userId: string): Promise<{ subscriptionInfo: SubscriptionInfo }>
  logOut(): Promise<{ subscriptionInfo: SubscriptionInfo }>

  // Subscription info
  getSubscriptionInfo(): Promise<SubscriptionInfo>

  // Packages/Products
  getPackages(): Promise<PricingPackage[]>

  // Purchase
  purchasePackage(pkg: PricingPackage): Promise<{
    subscriptionInfo: SubscriptionInfo
    error?: Error
  }>

  // Restore
  restorePurchases(): Promise<{
    subscriptionInfo: SubscriptionInfo
    error?: Error
  }>

  // Management
  getManagementUrl?(): Promise<string | null>

  // Listeners
  addSubscriptionUpdateListener?(listener: (info: SubscriptionInfo) => void): () => void
  addLifecycleEventListener?(listener: (event: SubscriptionLifecycleData) => void): () => void
}

/**
 * Helper to convert platform-specific data to unified SubscriptionInfo
 */
export function createSubscriptionInfo(
  platform: SubscriptionPlatform,
  data: unknown,
): SubscriptionInfo {
  // Default empty state
  const defaultInfo: SubscriptionInfo = {
    platform,
    status: "none",
    productId: null,
    expirationDate: null,
    willRenew: false,
    isActive: false,
    isTrial: false,
  }

  if (!data) return defaultInfo

  // Platform-specific parsing will be done in each service
  return defaultInfo
}
