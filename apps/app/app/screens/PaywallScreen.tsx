import { useEffect, useCallback, useState } from "react"
import { View, Platform, ActivityIndicator } from "react-native"
import { RouteProp, useRoute } from "@react-navigation/native"
import { useTranslation } from "react-i18next"
import { StyleSheet, useUnistyles } from "react-native-unistyles"

import { Text, Container, Button, PricingCard } from "../components"
import { env } from "../config/env"
import type { AppStackParamList } from "../navigators/navigationTypes"
import { resetRoot } from "../navigators/navigationUtilities"
import { isRevenueCatMock } from "../services/revenuecat"
import { useSubscriptionStore } from "../stores/subscriptionStore"
import type { PricingPackage } from "../types/subscription"
import { logger } from "../utils/Logger"

// Conditionally import native RevenueCat SDKs (not available on web or in mock mode)
// Note: isRevenueCatMock is imported from revenuecat service which handles the mock detection logic
type RevenueCatOfferings = { current?: unknown }
type RevenueCatPurchases = { getOfferings: () => Promise<RevenueCatOfferings> }
type RevenueCatPaywalls = {
  presentPaywall: (options: { offering: unknown }) => Promise<unknown>
}

let Purchases: RevenueCatPurchases | null = null
let Paywalls: RevenueCatPaywalls | null = null

// Only load native SDK if not web and not in mock mode
// Mock mode = dev environment without API keys
// We check isRevenueCatMock at runtime in the component, but for module-level imports
// we need to check the same conditions
const mobileApiKey = Platform.select({
  ios: env.revenueCatIosKey,
  android: env.revenueCatAndroidKey,
})
// Load SDK if: not web AND (production OR has API key)
const shouldLoadNativeSDK = Platform.OS !== "web" && (!__DEV__ || mobileApiKey)

if (shouldLoadNativeSDK) {
  try {
    Purchases = require("react-native-purchases").default
    Paywalls = require("react-native-purchases-ui").Paywalls
  } catch (e) {
    if (__DEV__) {
      logger.warn("Failed to load react-native-purchases", { error: e })
    }
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export const PaywallScreen = () => {
  const route = useRoute<RouteProp<AppStackParamList, "Paywall">>()
  const { theme } = useUnistyles()
  const { t } = useTranslation()
  const isPro = useSubscriptionStore((state) => state.isPro)
  const packages = useSubscriptionStore((state) => state.packages)
  const fetchPackages = useSubscriptionStore((state) => state.fetchPackages)
  const purchasePackage = useSubscriptionStore((state) => state.purchasePackage)
  const subscriptionLoading = useSubscriptionStore((state) => state.loading)
  const isWeb = Platform.OS === "web"
  const isMock = isRevenueCatMock
  const isMockMode = isMock || !Purchases || !Paywalls
  const [isPresenting, setIsPresenting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasAutoPresented, setHasAutoPresented] = useState(false)
  const loadErrorMessage = t("paywallScreen:loadFailed")
  const purchaseErrorMessage = t("paywallScreen:purchaseFailed")
  const noWebOfferingMessage = t("paywallScreen:noWebOfferingError")
  const noPackagesMessage = t("paywallScreen:noPackagesError")
  const sdkUnavailableMessage = t("paywallScreen:sdkUnavailableError")

  const isFromOnboarding = route.params?.fromOnboarding === true

  // Navigate to Main after successful purchase or skip
  const navigateToMain = useCallback(() => {
    if (!isFromOnboarding) return
    // Reset root navigation stack to Main screen (Paywall can be mounted under tabs or onboarding)
    resetRoot({
      index: 0,
      routes: [{ name: "Main" }],
    })
  }, [isFromOnboarding])

  // Present RevenueCat Paywall
  const presentPaywall = useCallback(async () => {
    // Web path or Mock mode - use subscription store packages
    if (isWeb || isMockMode) {
      try {
        setIsPresenting(true)
        setError(null)

        // Ensure packages are loaded
        if (!useSubscriptionStore.getState().packages.length) {
          await fetchPackages()
        }

        if (!useSubscriptionStore.getState().packages.length) {
          throw new Error(isWeb ? noWebOfferingMessage : noPackagesMessage)
        }
      } catch (err) {
        logger.error("Failed to load paywall", { error: err })
        setError(err instanceof Error ? err.message : loadErrorMessage)
      } finally {
        setIsPresenting(false)
      }
      return
    }

    // Native path (iOS/Android) with real RevenueCat SDK
    if (!Purchases || !Paywalls) {
      logger.error("RevenueCat native SDK not available")
      setError(sdkUnavailableMessage)
      return
    }

    try {
      setIsPresenting(true)
      setError(null)

      // Get the current offering
      const offerings = await Purchases.getOfferings()
      const currentOffering = offerings.current

      if (!currentOffering) {
        throw new Error(t("paywallScreen:noOfferingError"))
      }

      // Present the paywall configured in RevenueCat dashboard
      const result = await Paywalls.presentPaywall({
        offering: currentOffering,
      })

      // Normalize result shape from SDK
      const resultValue =
        typeof result === "string" ? result : (result as { result?: string } | null)?.result

      // If the SDK returned fresh customer info (e.g., "Test Valid Purchase"/restore),
      // apply it immediately so the Pro state updates without waiting on a fetch.
      // Refresh subscription status after paywall is dismissed (authoritative fetch)
      const service = useSubscriptionStore.getState().getActiveService()
      const subscriptionInfo = await service.getSubscriptionInfo()
      const { platform } = useSubscriptionStore.getState()

      if (platform === "revenuecat-web") {
        useSubscriptionStore.getState().setWebSubscriptionInfo(subscriptionInfo)
      } else {
        useSubscriptionStore.getState().setCustomerInfo(subscriptionInfo)
      }

      // If user purchased or restored, navigate to Main (if from onboarding)
      if ((resultValue === "PURCHASED" || resultValue === "RESTORED") && isFromOnboarding) {
        navigateToMain()
      }

      // Log unexpected results for debugging
      if (resultValue && resultValue !== "PURCHASED" && resultValue !== "RESTORED") {
        logger.info("[Paywall] Unexpected paywall result", { result: resultValue })
      }
    } catch (err) {
      logger.error("Failed to present paywall", { error: err })
      setError(err instanceof Error ? err.message : loadErrorMessage)
    } finally {
      setIsPresenting(false)
    }
  }, [
    fetchPackages,
    isFromOnboarding,
    isWeb,
    isMockMode,
    loadErrorMessage,
    navigateToMain,
    noPackagesMessage,
    noWebOfferingMessage,
    sdkUnavailableMessage,
    t,
  ])

  // Handle purchase flow (web or mock mode)
  const handlePackagePurchase = useCallback(
    async (pkg: PricingPackage) => {
      try {
        setError(null)

        const result = await purchasePackage(pkg)

        if (result.error) {
          throw result.error
        }

        if (isFromOnboarding) {
          navigateToMain()
        }
      } catch (err) {
        logger.error("Purchase failed", { error: err })
        setError(err instanceof Error ? err.message : purchaseErrorMessage)
      }
    },
    [purchaseErrorMessage, purchasePackage, isFromOnboarding, navigateToMain],
  )

  // Auto-present paywall when screen loads (if not Pro)
  useEffect(() => {
    if (!isPro && !isPresenting && !hasAutoPresented) {
      setHasAutoPresented(true)
      presentPaywall()
    }
  }, [isPro, isPresenting, presentPaywall, hasAutoPresented])

  // Auto-navigate to Main if user is already Pro
  useEffect(() => {
    if (isPro && isFromOnboarding) {
      const timer = setTimeout(() => {
        navigateToMain()
      }, 500)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isPro, isFromOnboarding, navigateToMain])

  // Handle manual paywall presentation (for retry or if auto-present failed)
  const handlePresentPaywall = useCallback(() => {
    presentPaywall()
  }, [presentPaywall])

  // Handle skip/continue (only shown if paywall failed to present)
  const handleSkip = useCallback(() => {
    navigateToMain()
  }, [navigateToMain])

  return (
    <Container safeAreaEdges={["top", "bottom"]}>
      <View style={styles.container}>
        {isPro ? (
          // User is already Pro - show success message
          <View style={styles.content}>
            <Text preset="heading" style={styles.title} tx="paywallScreen:welcomeTitle" />
            <Text style={styles.description} tx="paywallScreen:welcomeDescription" />
          </View>
        ) : isPresenting ? (
          // Loading state while presenting paywall
          <View style={styles.content}>
            <ActivityIndicator size="large" color={theme.colors.tint} />
            <Text style={styles.loadingText} tx="paywallScreen:loadingPaywall" />
          </View>
        ) : isWeb || isMockMode ? (
          // Web billing or Mock mode - use packages + custom UI instead of native paywall
          <View style={styles.content}>
            <Text preset="heading" style={styles.title} tx="paywallScreen:upgradeTitle" />
            <Text style={styles.description}>
              {isMock
                ? isWeb
                  ? t("paywallScreen:mockWebDescription")
                  : t("paywallScreen:mockNativeDescription")
                : t("paywallScreen:secureCheckoutDescription")}
            </Text>

            {/* Value proposition */}
            <View style={styles.valueProps}>
              <View style={styles.valuePropRow}>
                <View style={styles.checkIcon}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
                <Text style={styles.valuePropText}>Unlimited projects</Text>
              </View>
              <View style={styles.valuePropRow}>
                <View style={styles.checkIcon}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
                <Text style={styles.valuePropText}>Priority support</Text>
              </View>
              <View style={styles.valuePropRow}>
                <View style={styles.checkIcon}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
                <Text style={styles.valuePropText}>Advanced analytics</Text>
              </View>
              <View style={styles.valuePropRow}>
                <View style={styles.checkIcon}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
                <Text style={styles.valuePropText}>No watermarks</Text>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.packageList}>
              {packages.length === 0 ? (
                <Text style={styles.errorText}>
                  {isWeb ? noWebOfferingMessage : noPackagesMessage}
                </Text>
              ) : (
                packages.map((pricingPkg, index) => {
                  const isPopular = index === 0
                  const isAnnual = pricingPkg.identifier.toLowerCase().includes('annual') ||
                                   pricingPkg.identifier.toLowerCase().includes('year')

                  // Calculate proper display
                  let displayPrice = pricingPkg.priceString || `$${pricingPkg.price.toFixed(2)}`
                  let billingPeriod = "month"
                  let pricePerMonth = undefined
                  let savingsText = undefined
                  let ctaText = undefined

                  if (isAnnual) {
                    // For annual: show yearly price, then monthly breakdown
                    billingPeriod = "year"
                    const monthlyEquivalent = (pricingPkg.price / 12).toFixed(2)
                    pricePerMonth = `≈ $${monthlyEquivalent}/month`
                    savingsText = "Save 40%"
                    ctaText = "Unlock Pro"
                  } else {
                    // For monthly: simpler CTA
                    ctaText = "Choose Monthly"
                  }

                  return (
                    <PricingCard
                      key={pricingPkg.identifier}
                      title={pricingPkg.title}
                      price={displayPrice}
                      description={pricingPkg.description || ""}
                      billingPeriod={billingPeriod}
                      features={[]}
                      isPopular={isPopular}
                      onPress={() => handlePackagePurchase(pricingPkg)}
                      disabled={subscriptionLoading || isPresenting}
                      loading={subscriptionLoading || isPresenting}
                      savingsText={savingsText}
                      pricePerMonth={pricePerMonth}
                      ctaText={ctaText}
                    />
                  )
                })
              )}
            </View>

            {/* Risk reversal */}
            <Text style={styles.riskReversal}>Cancel anytime • Secure App Store checkout</Text>

            {isFromOnboarding && (
              <Button
                text={t("paywallScreen:continueWithFree")}
                onPress={handleSkip}
                variant="ghost"
                style={styles.skipButton}
                disabled={subscriptionLoading || isPresenting}
              />
            )}
          </View>
        ) : error ? (
          // Error state - show error and retry option
          <View style={styles.content}>
            <Text preset="heading" style={styles.title} tx="paywallScreen:unableToLoadTitle" />
            <Text style={styles.errorText}>{error}</Text>
            <View style={styles.buttonContainer}>
              <Button
                text={t("paywallScreen:tryAgain")}
                onPress={handlePresentPaywall}
                variant="filled"
                style={styles.retryButton}
              />
              {isFromOnboarding && (
                <Button
                  text={t("paywallScreen:continueWithFree")}
                  onPress={handleSkip}
                  variant="ghost"
                  style={styles.skipButton}
                />
              )}
            </View>
          </View>
        ) : (
          // Fallback - should not reach here, but show option to present paywall
          <View style={styles.content}>
            <Text preset="heading" style={styles.title} tx="paywallScreen:upgradeTitle" />
            <Text style={styles.description} tx="paywallScreen:upgradeDescription" />
            <Button
              text={t("paywallScreen:viewPlans")}
              onPress={handlePresentPaywall}
              variant="filled"
              style={styles.presentButton}
            />
            {isFromOnboarding && (
              <Button
                text={t("paywallScreen:continueWithFree")}
                onPress={handleSkip}
                variant="ghost"
                style={styles.skipButton}
              />
            )}
          </View>
        )}
      </View>
    </Container>
  )
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 480,
    width: "100%",
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  description: {
    color: theme.colors.foregroundSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
    textAlign: "center",
  },
  valueProps: {
    alignSelf: "stretch",
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 16,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  valuePropRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.palette.success500,
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: {
    color: theme.colors.palette.white,
    fontSize: 14,
    fontWeight: "700",
  },
  valuePropText: {
    color: theme.colors.foreground,
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  loadingText: {
    color: theme.colors.foregroundSecondary,
    fontSize: 14,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: theme.spacing.xl,
    textAlign: "center",
  },
  buttonContainer: {
    alignItems: "center",
    gap: theme.spacing.md,
    width: "100%",
  },
  presentButton: {
    width: "100%",
  },
  retryButton: {
    width: "100%",
  },
  skipButton: {
    marginTop: theme.spacing.md,
  },
  packageList: {
    gap: theme.spacing.lg,
    width: "100%",
    marginTop: theme.spacing.md,
  },
  riskReversal: {
    color: theme.colors.foregroundTertiary,
    fontSize: 13,
    textAlign: "center",
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    fontWeight: "500",
  },
}))
