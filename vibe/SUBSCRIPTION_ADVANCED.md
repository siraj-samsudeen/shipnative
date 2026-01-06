# Advanced Subscription Features

This guide covers advanced subscription features including lifecycle events, promotional offers, and price localization.

## Table of Contents

- [Lifecycle Events](#lifecycle-events)
- [Promotional Offers & Intro Pricing](#promotional-offers--intro-pricing)
- [Price Localization](#price-localization)
- [Usage Examples](#usage-examples)

## Lifecycle Events

Track subscription lifecycle events to understand user behavior and trigger actions.

### Available Events

```typescript
type SubscriptionLifecycleEvent =
  | "trial_started"           // User started free trial
  | "trial_converted"         // Trial converted to paid subscription
  | "trial_cancelled"         // Trial cancelled before conversion
  | "subscription_started"    // New paid subscription (no trial)
  | "subscription_renewed"    // Subscription auto-renewed
  | "subscription_cancelled"  // User cancelled (but still has access until expiry)
  | "subscription_expired"    // Subscription expired/ended
  | "subscription_paused"     // Subscription paused (Android)
  | "subscription_restored"   // Subscription restored from previous purchase
  | "billing_issue"           // Billing problem detected
```

### Listening to Lifecycle Events

```typescript
import { useSubscriptionStore } from './stores/subscriptionStore'
import { useEffect } from 'react'

function MyComponent() {
  const addLifecycleListener = useSubscriptionStore(
    (state) => state.addLifecycleListener
  )

  useEffect(() => {
    const unsubscribe = addLifecycleListener((event) => {
      console.log('Subscription event:', event.event)
      console.log('Product:', event.productId)
      console.log('Expiration:', event.expirationDate)

      // Trigger actions based on event
      switch (event.event) {
        case 'trial_started':
          // Send analytics, show onboarding
          analytics.track('Trial Started')
          break

        case 'trial_converted':
          // Celebrate! Send thank you email
          analytics.track('Trial Converted')
          break

        case 'subscription_cancelled':
          // Show feedback survey, offer discount
          showCancellationSurvey()
          break

        case 'billing_issue':
          // Alert user to update payment method
          showBillingIssueAlert()
          break
      }
    })

    return unsubscribe
  }, [addLifecycleListener])

  return <YourComponent />
}
```

### Event Detection

Events are automatically detected by comparing subscription state changes:

- **trial_started**: User becomes active with trial flag
- **trial_converted**: Trial flag changes from true to false while active
- **subscription_renewed**: Expiration date extends while active
- **subscription_cancelled**: willRenew changes from true to false
- **subscription_expired**: Active changes from true to false

## Promotional Offers & Intro Pricing

RevenueCat supports free trials and introductory pricing. This information is automatically extracted and included in package data.

### Package Data Structure

```typescript
interface PricingPackage {
  // Standard pricing
  price: number
  priceString: string
  currencyCode: string
  billingPeriod: "monthly" | "annual" | "lifetime"

  // Intro pricing (e.g., "$0.99 for first month")
  introPrice?: number | null
  introPriceString?: string | null
  introPricePeriod?: string | null        // "1 month"
  introPricePeriodUnit?: "day" | "week" | "month" | "year" | null
  introPricePeriodCount?: number | null   // 1

  // Free trial (e.g., "7 days")
  freeTrialPeriod?: string | null         // "7 days"
  freeTrialPeriodUnit?: "day" | "week" | "month" | "year" | null
  freeTrialPeriodCount?: number | null    // 7
}
```

### Displaying Promotional Offers

```typescript
import { getPromotionalOfferText, getFullPricingDescription } from './utils/subscriptionHelpers'
import { useSubscriptionStore } from './stores/subscriptionStore'

function PricingCard() {
  const packages = useSubscriptionStore((state) => state.packages)

  return (
    <>
      {packages.map((pkg) => (
        <View key={pkg.id}>
          <Text>{pkg.title}</Text>

          {/* Simple promotional text */}
          {pkg.freeTrialPeriod && (
            <Text>🎉 {pkg.freeTrialPeriod} free trial</Text>
          )}

          {/* Full promotional description */}
          <Text>{getPromotionalOfferText(pkg)}</Text>
          {/* Example: "7 days free, then $0.99 for first month, then $9.99/mo" */}

          {/* Or complete pricing description */}
          <Text>{getFullPricingDescription(pkg)}</Text>
          {/* Example: "7 days free • $0.99 for first month • $9.99/mo" */}

          {/* Manual formatting */}
          {pkg.introPrice && (
            <View>
              <Text>First {pkg.introPricePeriod}: {pkg.introPriceString}</Text>
              <Text>Then: {pkg.priceString}/{pkg.billingPeriod}</Text>
            </View>
          )}

          <Button onPress={() => purchasePackage(pkg)}>
            Subscribe
          </Button>
        </View>
      ))}
    </>
  )
}
```

### Configuring Offers in RevenueCat

1. **Free Trials**:
   - Go to RevenueCat Dashboard → Products
   - Select your product
   - Set "Free Trial Duration" (e.g., 7 days, 14 days)

2. **Introductory Pricing**:
   - In App Store Connect (iOS) or Google Play Console (Android)
   - Configure intro pricing for your subscription
   - RevenueCat will automatically detect and expose this

3. **Web Billing**:
   - Configure promotional offers in RevenueCat Billing settings
   - Add intro pricing periods and amounts

## Price Localization

Helper functions for formatting prices with proper localization.

### Format Localized Price

```typescript
import { formatLocalizedPrice } from './utils/subscriptionHelpers'

// Format price with user's locale
const price = formatLocalizedPrice(9.99, 'USD') // "$9.99"
const euroPrice = formatLocalizedPrice(9.99, 'EUR', 'de-DE') // "9,99 €"
const yenPrice = formatLocalizedPrice(1200, 'JPY', 'ja-JP') // "¥1,200"
```

### Calculate Savings

```typescript
import { calculateSavings, getMonthlyEquivalent } from './utils/subscriptionHelpers'

// Show annual savings
const monthlyCost = 9.99
const annualCost = 99.99
const savings = calculateSavings(monthlyCost * 12, annualCost) // 17% (rounded)

// Show monthly equivalent for annual
const monthlyEquiv = getMonthlyEquivalent(99.99, 'annual') // 8.33

// Display
<Text>Save {savings}%</Text>
<Text>Only ${monthlyEquiv?.toFixed(2)}/month</Text>
```

### Format Period Strings

```typescript
import { formatPeriod, getBillingPeriodShort } from './utils/subscriptionHelpers'

formatPeriod(1, 'month')  // "month"
formatPeriod(3, 'month')  // "3 months"
formatPeriod(7, 'day')    // "7 days"

getBillingPeriodShort('monthly')  // "mo"
getBillingPeriodShort('annual')   // "yr"
```

## Usage Examples

### Example 1: Complete Pricing Card with All Features

```typescript
import {
  getPromotionalOfferText,
  calculateSavings,
  getMonthlyEquivalent,
} from './utils/subscriptionHelpers'
import { useSubscriptionStore } from './stores/subscriptionStore'

function PricingCards() {
  const packages = useSubscriptionStore((state) => state.packages)
  const purchasePackage = useSubscriptionStore((state) => state.purchasePackage)

  return (
    <View style={styles.container}>
      {packages.map((pkg, index) => {
        const isAnnual = pkg.billingPeriod === 'annual'
        const monthlyPkg = packages.find(p => p.billingPeriod === 'monthly')

        // Calculate savings for annual plan
        const savings = isAnnual && monthlyPkg
          ? calculateSavings(monthlyPkg.price * 12, pkg.price)
          : null

        // Get monthly equivalent
        const monthlyEquiv = isAnnual
          ? getMonthlyEquivalent(pkg.price, pkg.billingPeriod)
          : null

        // Get promotional text
        const promoText = getPromotionalOfferText(pkg)

        return (
          <View key={pkg.id} style={styles.card}>
            {/* Popular badge */}
            {index === 0 && <Badge>Most Popular</Badge>}

            {/* Savings badge for annual */}
            {savings && savings > 0 && (
              <Badge variant="success">Save {savings}%</Badge>
            )}

            {/* Title and description */}
            <Text style={styles.title}>{pkg.title}</Text>
            <Text style={styles.description}>{pkg.description}</Text>

            {/* Promotional offer */}
            {promoText && (
              <View style={styles.promo}>
                <Icon name="gift" />
                <Text style={styles.promoText}>{promoText}</Text>
              </View>
            )}

            {/* Price */}
            <View style={styles.pricing}>
              <Text style={styles.price}>{pkg.priceString}</Text>
              <Text style={styles.period}>/{pkg.billingPeriod}</Text>
            </View>

            {/* Monthly equivalent for annual */}
            {monthlyEquiv && (
              <Text style={styles.equivalent}>
                ≈ ${monthlyEquiv.toFixed(2)}/month
              </Text>
            )}

            {/* CTA button */}
            <Button onPress={() => purchasePackage(pkg)}>
              {pkg.freeTrialPeriod
                ? `Start ${pkg.freeTrialPeriod} Free`
                : 'Subscribe Now'}
            </Button>
          </View>
        )
      })}
    </View>
  )
}
```

### Example 2: Subscription Status Display

```typescript
import {
  formatExpirationStatus,
  getDaysRemaining,
  isExpiringWithin,
  isInGracePeriod,
} from './utils/subscriptionHelpers'
import { useSubscriptionStore } from './stores/subscriptionStore'

function SubscriptionStatus() {
  const isPro = useSubscriptionStore((state) => state.isPro)
  const customerInfo = useSubscriptionStore((state) => state.customerInfo)

  if (!isPro || !customerInfo) return null

  const daysRemaining = getDaysRemaining(customerInfo)
  const expiringSoon = isExpiringWithin(customerInfo, 7)
  const inGracePeriod = isInGracePeriod(customerInfo)
  const statusText = formatExpirationStatus(customerInfo)

  return (
    <View style={styles.status}>
      <Text style={styles.plan}>Pro Member</Text>

      {/* Expiration status */}
      <Text style={styles.expiration}>{statusText}</Text>

      {/* Warning badges */}
      {inGracePeriod && (
        <Alert variant="warning">
          Billing issue - please update payment method
        </Alert>
      )}

      {expiringSoon && !customerInfo.willRenew && (
        <Alert variant="info">
          Your subscription ends in {daysRemaining} days. Renew now!
        </Alert>
      )}

      {/* Trial status */}
      {customerInfo.isTrial && (
        <Badge variant="info">Free Trial</Badge>
      )}
    </View>
  )
}
```

### Example 3: Analytics Integration

```typescript
import { useEffect } from 'react'
import { useSubscriptionStore } from './stores/subscriptionStore'
import { analytics } from './services/analytics'

function SubscriptionAnalytics() {
  const addLifecycleListener = useSubscriptionStore(
    (state) => state.addLifecycleListener
  )

  useEffect(() => {
    const unsubscribe = addLifecycleListener((event) => {
      // Track all lifecycle events
      analytics.track('Subscription Event', {
        event: event.event,
        productId: event.productId,
        expirationDate: event.expirationDate,
        timestamp: event.timestamp,
      })

      // Specific event tracking
      switch (event.event) {
        case 'trial_started':
          analytics.track('Trial Started', {
            productId: event.productId,
          })
          // Set user properties
          analytics.setUserProperty('trial_status', 'active')
          break

        case 'trial_converted':
          analytics.track('Trial Converted', {
            productId: event.productId,
          })
          analytics.setUserProperty('subscription_status', 'paid')
          break

        case 'subscription_cancelled':
          analytics.track('Subscription Cancelled', {
            productId: event.productId,
            reason: event.cancellationReason,
          })
          // Trigger retention campaign
          triggerRetentionEmail()
          break

        case 'billing_issue':
          analytics.track('Billing Issue', {
            productId: event.productId,
          })
          // Send push notification
          sendBillingReminder()
          break
      }
    })

    return unsubscribe
  }, [addLifecycleListener])

  return null // This is a logic-only component
}
```

### Example 4: Mock Mode Testing

The mock RevenueCat service includes example promotional offers for testing:

```typescript
// Monthly: 7-day free trial + $9.99/month
// Annual: 14-day free trial + $49.99 intro year + $99.99/year

// Test the promotional display:
import { useSubscriptionStore } from './stores/subscriptionStore'

function TestPromotions() {
  const packages = useSubscriptionStore((state) => state.packages)

  packages.forEach(pkg => {
    console.log('Package:', pkg.identifier)
    console.log('Free trial:', pkg.freeTrialPeriod)
    console.log('Intro price:', pkg.introPriceString)
    console.log('Regular price:', pkg.priceString)
  })
}
```

## Best Practices

1. **Always display promotional offers prominently**
   - Free trials increase conversion significantly
   - Show savings percentages for annual plans
   - Use clear, benefit-driven copy

2. **Track lifecycle events for retention**
   - Monitor trial conversion rates
   - Reach out to users who cancel
   - Address billing issues promptly

3. **Localize prices properly**
   - Use `formatLocalizedPrice()` for all price displays
   - Respect user's locale and currency preferences
   - Test with different currencies

4. **Test with mock mode first**
   - Mock service includes example promotional offers
   - Test all UI states before production
   - Verify event tracking works correctly

5. **Handle edge cases**
   - Missing promotional offers (graceful degradation)
   - Expired trials
   - Grace periods
   - Billing issues

## Troubleshooting

### Promotional offers not showing

1. **Check RevenueCat Dashboard**:
   - Products must have free trials or intro pricing configured
   - Offerings must include these products

2. **iOS**: Configure in App Store Connect
   - Set up intro pricing for subscriptions
   - Wait for App Store to sync (can take hours)

3. **Android**: Configure in Google Play Console
   - Set free trial period
   - Configure intro pricing

4. **Web**: Configure in RevenueCat Billing
   - Add promotional periods
   - Set intro pricing amounts

### Events not firing

1. **Check listener registration**:
   - Ensure `addLifecycleListener` is called in useEffect
   - Return the unsubscribe function for cleanup

2. **Verify state changes**:
   - Events only fire when subscription state changes
   - Check console logs in dev mode

3. **Test with mock mode**:
   - Toggle subscription on/off to trigger events
   - Verify event detection logic

## Next Steps

- Integrate analytics tracking for lifecycle events
- Customize promotional offer display
- Set up retention campaigns for cancellations
- Monitor conversion rates and optimize pricing
