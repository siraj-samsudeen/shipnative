/**
 * Subscription Helper Utilities
 *
 * Provides helper functions for:
 * - Price localization and formatting
 * - Subscription lifecycle event detection
 * - Promotional offer formatting
 */

import type {
  PricingPackage,
  SubscriptionInfo,
  SubscriptionLifecycleEvent,
  SubscriptionLifecycleData,
} from "../types/subscription"

// =============================================================================
// PRICE LOCALIZATION HELPERS
// =============================================================================

/**
 * Format a price with proper localization
 * Falls back to the package's priceString if localization fails
 */
export function formatLocalizedPrice(
  price: number,
  currencyCode: string,
  locale?: string,
): string {
  try {
    return new Intl.NumberFormat(locale || "en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  } catch (error) {
    // Fallback to simple format
    return `${currencyCode} ${price.toFixed(2)}`
  }
}

/**
 * Get a human-readable period string
 */
export function formatPeriod(
  count: number,
  unit: "day" | "week" | "month" | "year",
): string {
  if (count === 1) {
    return unit
  }

  // Handle pluralization
  const pluralMap: Record<string, string> = {
    day: "days",
    week: "weeks",
    month: "months",
    year: "years",
  }

  return `${count} ${pluralMap[unit] || unit}`
}

/**
 * Calculate savings percentage between two prices
 */
export function calculateSavings(regularPrice: number, salePrice: number): number {
  if (regularPrice <= 0) return 0
  return Math.round(((regularPrice - salePrice) / regularPrice) * 100)
}

/**
 * Get a formatted promotional offer description
 * Example: "3 days free, then $9.99/month"
 */
export function getPromotionalOfferText(pkg: PricingPackage, locale?: string): string | null {
  const parts: string[] = []

  // Free trial
  if (pkg.freeTrialPeriod) {
    parts.push(`${pkg.freeTrialPeriod} free`)
  }

  // Intro pricing
  if (pkg.introPriceString && pkg.introPricePeriod) {
    parts.push(`then ${pkg.introPriceString} for ${pkg.introPricePeriod}`)
  }

  // Regular price
  if (parts.length > 0) {
    parts.push(`then ${pkg.priceString}/${getBillingPeriodShort(pkg.billingPeriod)}`)
  }

  return parts.length > 0 ? parts.join(", ") : null
}

/**
 * Get short billing period string for display
 */
export function getBillingPeriodShort(period: "monthly" | "annual" | "lifetime"): string {
  const map: Record<string, string> = {
    monthly: "mo",
    annual: "yr",
    lifetime: "lifetime",
  }
  return map[period] || period
}

/**
 * Get monthly equivalent price for annual plans
 */
export function getMonthlyEquivalent(price: number, billingPeriod: string): number | null {
  if (billingPeriod === "annual") {
    return price / 12
  }
  return null
}

/**
 * Format a complete pricing card description with all offers
 * Example: "7 days free • $0.99 for first month • Then $9.99/month"
 */
export function getFullPricingDescription(pkg: PricingPackage): string {
  const parts: string[] = []

  // Free trial
  if (pkg.freeTrialPeriod) {
    parts.push(`${pkg.freeTrialPeriod} free`)
  }

  // Intro price
  if (pkg.introPriceString && pkg.introPricePeriod) {
    parts.push(`${pkg.introPriceString} for ${pkg.introPricePeriod}`)
  }

  // Regular price
  parts.push(`${pkg.priceString}/${getBillingPeriodShort(pkg.billingPeriod)}`)

  return parts.join(" • ")
}

// =============================================================================
// SUBSCRIPTION LIFECYCLE EVENT DETECTION
// =============================================================================

/**
 * Detect lifecycle events by comparing old and new subscription info
 */
export function detectLifecycleEvent(
  oldInfo: SubscriptionInfo | null,
  newInfo: SubscriptionInfo,
): SubscriptionLifecycleData | null {
  // No previous state - initial subscription check
  if (!oldInfo) {
    if (newInfo.isActive && newInfo.isTrial) {
      return {
        event: "trial_started",
        timestamp: new Date().toISOString(),
        productId: newInfo.productId,
        expirationDate: newInfo.expirationDate,
      }
    }
    if (newInfo.isActive && !newInfo.isTrial) {
      return {
        event: "subscription_started",
        timestamp: new Date().toISOString(),
        productId: newInfo.productId,
        expirationDate: newInfo.expirationDate,
      }
    }
    return null
  }

  // Trial converted to paid subscription
  if (oldInfo.isTrial && !newInfo.isTrial && newInfo.isActive) {
    return {
      event: "trial_converted",
      timestamp: new Date().toISOString(),
      productId: newInfo.productId,
      expirationDate: newInfo.expirationDate,
    }
  }

  // Trial cancelled
  if (oldInfo.isTrial && oldInfo.isActive && !newInfo.isActive) {
    return {
      event: "trial_cancelled",
      timestamp: new Date().toISOString(),
      productId: oldInfo.productId,
      expirationDate: newInfo.expirationDate,
    }
  }

  // Subscription renewed (expiration date extended)
  if (
    oldInfo.isActive &&
    newInfo.isActive &&
    oldInfo.expirationDate &&
    newInfo.expirationDate &&
    new Date(newInfo.expirationDate) > new Date(oldInfo.expirationDate)
  ) {
    return {
      event: "subscription_renewed",
      timestamp: new Date().toISOString(),
      productId: newInfo.productId,
      expirationDate: newInfo.expirationDate,
    }
  }

  // Subscription cancelled (willRenew changed from true to false)
  if (oldInfo.willRenew && !newInfo.willRenew && newInfo.isActive) {
    return {
      event: "subscription_cancelled",
      timestamp: new Date().toISOString(),
      productId: newInfo.productId,
      expirationDate: newInfo.expirationDate,
    }
  }

  // Subscription expired
  if (oldInfo.isActive && !newInfo.isActive && !newInfo.willRenew) {
    return {
      event: "subscription_expired",
      timestamp: new Date().toISOString(),
      productId: oldInfo.productId,
      expirationDate: newInfo.expirationDate,
    }
  }

  // Billing issue detected
  if (!oldInfo.billingIssueDetectedAt && newInfo.billingIssueDetectedAt) {
    return {
      event: "billing_issue",
      timestamp: new Date().toISOString(),
      productId: newInfo.productId,
      expirationDate: newInfo.expirationDate,
    }
  }

  // Subscription restored (became active again)
  if (!oldInfo.isActive && newInfo.isActive) {
    return {
      event: "subscription_restored",
      timestamp: new Date().toISOString(),
      productId: newInfo.productId,
      expirationDate: newInfo.expirationDate,
    }
  }

  return null
}

/**
 * Get a human-readable description of a lifecycle event
 */
export function getLifecycleEventDescription(event: SubscriptionLifecycleEvent): string {
  const descriptions: Record<SubscriptionLifecycleEvent, string> = {
    trial_started: "Free trial started",
    trial_converted: "Trial converted to paid subscription",
    trial_cancelled: "Trial cancelled",
    subscription_started: "Subscription started",
    subscription_renewed: "Subscription renewed",
    subscription_cancelled: "Subscription cancelled",
    subscription_expired: "Subscription expired",
    subscription_paused: "Subscription paused",
    subscription_restored: "Subscription restored",
    billing_issue: "Billing issue detected",
  }

  return descriptions[event] || "Unknown event"
}

// =============================================================================
// SUBSCRIPTION STATUS HELPERS
// =============================================================================

/**
 * Check if subscription is in grace period
 */
export function isInGracePeriod(info: SubscriptionInfo): boolean {
  if (!info.gracePeriodExpiresAt) return false

  const gracePeriodExpiry = new Date(info.gracePeriodExpiresAt)
  return gracePeriodExpiry > new Date()
}

/**
 * Get days remaining in subscription
 */
export function getDaysRemaining(info: SubscriptionInfo): number | null {
  if (!info.expirationDate) return null

  const expiry = new Date(info.expirationDate)
  const now = new Date()
  const diff = expiry.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  return days > 0 ? days : 0
}

/**
 * Check if subscription is about to expire (within X days)
 */
export function isExpiringWithin(info: SubscriptionInfo, days: number): boolean {
  const remaining = getDaysRemaining(info)
  return remaining !== null && remaining <= days && remaining > 0
}

/**
 * Format expiration date relative to now
 * Examples: "expires in 5 days", "renews on Jan 15", "expired 3 days ago"
 */
export function formatExpirationStatus(
  info: SubscriptionInfo,
  locale?: string,
): string | null {
  if (!info.expirationDate) return null

  const remaining = getDaysRemaining(info)
  if (remaining === null) return null

  const expiryDate = new Date(info.expirationDate)
  const formattedDate = expiryDate.toLocaleDateString(locale || "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  // Expired
  if (remaining === 0) {
    return `Expired on ${formattedDate}`
  }

  // Expiring soon
  if (!info.willRenew) {
    if (remaining === 1) return "Expires tomorrow"
    if (remaining <= 7) return `Expires in ${remaining} days`
    return `Expires on ${formattedDate}`
  }

  // Will renew
  if (remaining === 1) return "Renews tomorrow"
  if (remaining <= 7) return `Renews in ${remaining} days`
  return `Renews on ${formattedDate}`
}
