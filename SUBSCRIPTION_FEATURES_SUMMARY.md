# Subscription Features Summary

This document summarizes the advanced subscription features added to the Shipnative boilerplate.

## ✅ Features Implemented

### 1. Subscription Lifecycle Events

Automatically detect and track subscription state changes.

**Events Available:**
- `trial_started` - User started free trial
- `trial_converted` - Trial converted to paid subscription
- `trial_cancelled` - Trial cancelled before conversion
- `subscription_started` - New paid subscription (no trial)
- `subscription_renewed` - Subscription auto-renewed
- `subscription_cancelled` - User cancelled (still active until expiry)
- `subscription_expired` - Subscription expired/ended
- `subscription_restored` - Subscription restored from previous purchase
- `billing_issue` - Billing problem detected

**Usage:**
```typescript
const addLifecycleListener = useSubscriptionStore(s => s.addLifecycleListener)

useEffect(() => {
  return addLifecycleListener((event) => {
    // event.event, event.productId, event.expirationDate, etc.
    analytics.track('Subscription Event', { event: event.event })
  })
}, [])
```

**Files:**
- Types: `apps/app/app/types/subscription.ts` (lines 15-33)
- Detection logic: `apps/app/app/utils/subscriptionHelpers.ts` (lines 96-238)
- Store integration: `apps/app/app/stores/subscriptionStore.ts`

---

### 2. Promotional Offers & Intro Pricing

Full support for free trials and introductory pricing from RevenueCat.

**Package Data Enhanced:**
```typescript
interface PricingPackage {
  // ... existing fields

  // Free trial
  freeTrialPeriod: "7 days"
  freeTrialPeriodUnit: "day"
  freeTrialPeriodCount: 7

  // Intro pricing
  introPriceString: "$0.99"
  introPrice: 0.99
  introPricePeriod: "1 month"
  introPricePeriodUnit: "month"
  introPricePeriodCount: 1
}
```

**Display Helpers:**
```typescript
import { getPromotionalOfferText, getFullPricingDescription } from '@/utils'

// "7 days free, then $0.99 for first month, then $9.99/mo"
const promoText = getPromotionalOfferText(pkg)

// "7 days free • $0.99 for first month • $9.99/mo"
const fullDescription = getFullPricingDescription(pkg)
```

**Files:**
- Types: `apps/app/app/types/subscription.ts` (lines 52-73)
- RevenueCat extraction: `apps/app/app/services/revenuecat.ts` (lines 424-492, 695-750)
- Mock data: `apps/app/app/services/mocks/revenueCat.ts` (lines 244-318)
- Helpers: `apps/app/app/utils/subscriptionHelpers.ts`

---

### 3. Price Localization Helpers

Utility functions for international pricing and formatting.

**Available Functions:**

```typescript
// Currency formatting
formatLocalizedPrice(9.99, 'USD', 'en-US') // "$9.99"
formatLocalizedPrice(9.99, 'EUR', 'de-DE') // "9,99 €"

// Savings calculation
calculateSavings(119.88, 99.99) // 17 (percentage)

// Monthly equivalent
getMonthlyEquivalent(99.99, 'annual') // 8.33

// Period formatting
formatPeriod(7, 'day') // "7 days"
formatPeriod(1, 'month') // "month"

// Expiration status
formatExpirationStatus(customerInfo) // "Renews in 5 days"

// Status checks
getDaysRemaining(customerInfo) // 30
isExpiringWithin(customerInfo, 7) // true/false
isInGracePeriod(customerInfo) // true/false
```

**File:** `apps/app/app/utils/subscriptionHelpers.ts` (lines 14-294)

---

## 📝 Documentation Updates

All documentation has been updated per project requirements:

1. **Mintlify Docs** (`mintlify_docs/docs/core-features/payments.mdx`)
   - Added lifecycle events section with examples
   - Added price localization section
   - Enhanced custom pricing UI examples
   - Updated testing section with mock promotional offers

2. **AGENTS.md** (`boilerplate/AGENTS.md`)
   - Added "Subscription Features" section
   - Listed all helper functions
   - Added lifecycle events reference
   - Added package data structure

3. **CHANGELOG.md** (`boilerplate/CHANGELOG.md`)
   - Comprehensive changelog entry in [Unreleased] section
   - Listed all new features
   - Documented all file changes

4. **Vibe Docs** (`boilerplate/vibe/SUBSCRIPTION_ADVANCED.md`)
   - Complete guide with usage examples
   - 4 comprehensive examples (pricing cards, status display, analytics, mock testing)
   - Best practices section
   - Troubleshooting guide

---

## 🧪 Mock Mode Enhancements

The mock RevenueCat service now includes realistic promotional offers for testing:

**Monthly Plan:**
- 7-day free trial
- $9.99/month regular price

**Annual Plan:**
- 14-day free trial
- $49.99 introductory price for first year (50% off!)
- $99.99/year regular price

**Developer Toggle:**
- Profile screen includes mock subscription toggle (dev mode only)
- Easily test Pro/Free states in simulator
- Shows "(Mock)" badge when using mock RevenueCat

---

## 🎯 Use Cases

### 1. Display Free Trial Badge
```typescript
{pkg.freeTrialPeriod && (
  <Badge>🎉 {pkg.freeTrialPeriod} free</Badge>
)}
```

### 2. Show Savings for Annual Plans
```typescript
const savings = calculateSavings(monthlyPkg.price * 12, annualPkg.price)
{savings > 0 && <Badge>Save {savings}%</Badge>}
```

### 3. Track Trial Conversions
```typescript
addLifecycleListener((event) => {
  if (event.event === 'trial_converted') {
    analytics.track('Trial Converted', { productId: event.productId })
    sendThankYouEmail()
  }
})
```

### 4. Retention Campaigns
```typescript
addLifecycleListener((event) => {
  if (event.event === 'subscription_cancelled') {
    showWinBackOffer()
  }
})
```

### 5. Billing Issue Alerts
```typescript
addLifecycleListener((event) => {
  if (event.event === 'billing_issue') {
    showUpdatePaymentMethodAlert()
  }
})
```

---

## 🚀 Next Steps

To use these features in production:

1. **Configure RevenueCat Products:**
   - Add free trials to your products in App Store Connect / Google Play Console
   - Configure introductory pricing in store dashboards
   - RevenueCat will automatically detect and expose this data

2. **Update Pricing UI:**
   - Use `getPromotionalOfferText()` to show offers
   - Display `freeTrialPeriod` badges prominently
   - Show savings percentages for annual plans

3. **Set Up Analytics:**
   - Add lifecycle event listeners
   - Track trial conversions, cancellations, billing issues
   - Set up retention campaigns

4. **Localize Prices:**
   - Use `formatLocalizedPrice()` for all price displays
   - Test with different locales and currencies

---

## 📚 Reference

- **Main Guide:** `vibe/SUBSCRIPTION_ADVANCED.md`
- **Monetization Setup:** `vibe/MONETIZATION.md`
- **Helper Functions:** `apps/app/app/utils/subscriptionHelpers.ts`
- **Type Definitions:** `apps/app/app/types/subscription.ts`
- **Mintlify Docs:** `mintlify_docs/docs/core-features/payments.mdx`

---

## ✅ Standards Compliance

All implementations follow RevenueCat's official patterns and best practices:
- Proper SDK type definitions
- Platform-specific handling (iOS, Android, Web)
- Graceful fallbacks for missing data
- Mock mode for development testing
- Type-safe throughout
